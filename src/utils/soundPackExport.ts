import JSZip from 'jszip';
import {
  type AudioSource,
  getExtension,
  ICON_TYPES,
  isRecord,
  isWholeFile,
  type KeySounds,
  type PackExtras,
  type PackInfo,
  type Segment,
} from '@/utils/soundPack';

export type ExportSoundPackParams = {
  /**
   * config.id. Set for library packs and for packs loaded with an id; left out
   * otherwise, so the editor never invents one (the app mints imported-<uuid>).
   */
  id?: string;
  info: PackInfo;
  sources: AudioSource[];
  keySounds: KeySounds;
  /** What an imported pack carried that the editor keeps as it was. */
  extras?: PackExtras | null;
};

// Formats written to the zip as they are. The app also plays WAV and FLAC, but
// the library takes MP3, WAV and OGG only and OGG is far smaller than WAV, so
// everything else is encoded to OGG Vorbis.
const KEPT_EXTENSIONS = new Set(['.ogg', '.mp3']);
// Formats the app plays, kept as they are when encoding to OGG fails.
const APP_PLAYABLE_EXTENSIONS = new Set(['.ogg', '.mp3', '.wav', '.flac']);

// Vorbis quality in the -0.1..1 range; 0.4 is a good size/quality balance.
const VORBIS_QUALITY = 0.4;

// Samples per encode() call. libvorbis processes the PCM in chunks, so we
// yield to the event loop between chunks to keep the loading UI responsive.
const ENCODE_CHUNK = 4096;
const YIELD_EVERY = 4;

function slugify(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
  return slug || 'sound-pack';
}

function generateUuid() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function yieldToMainThread() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

type DecodedPcm = {
  channels: Float32Array[];
  sampleRate: number;
};

function getAudioContextCtor(): typeof AudioContext | undefined {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

/**
 * Decode an audio or video file to PCM (per-channel Float32) via the Web Audio API.
 */
async function decodeFileToPcm(file: File): Promise<DecodedPcm> {
  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor) {
    throw new Error('Web Audio API not supported');
  }
  const audioContext = new AudioContextCtor();
  await audioContext.resume();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channels: Float32Array[] = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      channels.push(audioBuffer.getChannelData(c));
    }
    return { channels, sampleRate: audioBuffer.sampleRate };
  } finally {
    audioContext.close().catch(() => {});
  }
}

/**
 * Encode per-channel PCM to OGG Vorbis (libvorbis), yielding between chunks so
 * the UI stays responsive. The encoder is lazy-loaded (~1.5MB asm.js chunk).
 */
async function encodePcmToOgg(
  channels: Float32Array[],
  sampleRate: number,
): Promise<Blob> {
  const { encoder: VorbisEncoder } = await import('vorbis-encoder-js');
  const encoder = new VorbisEncoder(
    sampleRate,
    channels.length,
    VORBIS_QUALITY,
  );

  const length = channels[0]?.length ?? 0;
  let chunkIndex = 0;
  for (let i = 0; i < length; i += ENCODE_CHUNK) {
    encoder.encode(channels.map((data) => data.subarray(i, i + ENCODE_CHUNK)));
    chunkIndex += 1;
    if (chunkIndex % YIELD_EVERY === 0) {
      await yieldToMainThread();
    }
  }

  return encoder.finish();
}

const segmentKey = ([start, end]: Segment) => `${start}-${end}`;

/**
 * Cut out everything except the given segments, then concatenate them.
 * Returns the new PCM plus where each segment landed in it.
 */
function trimAndConcat(
  decoded: DecodedPcm,
  segments: Segment[],
): {
  channels: Float32Array[];
  sampleRate: number;
  moved: Map<string, Segment>;
} {
  const sampleRate = decoded.sampleRate;
  const numChannels = decoded.channels.length;
  const samplesPerMs = sampleRate / 1000;

  // Unique segments sorted by start time.
  const unique = Array.from(
    new Map(segments.map((segment) => [segmentKey(segment), segment])).values(),
  ).sort((a, b) => a[0] - b[0]);

  // Convert to sample ranges and compute total length.
  const ranges = unique.map((segment) => {
    const start = Math.round(segment[0] * samplesPerMs);
    const end = Math.round(segment[1] * samplesPerMs);
    return { segment, start, end, length: Math.max(0, end - start) };
  });
  const totalSamples = ranges.reduce((sum, r) => sum + r.length, 0);

  const outChannels = Array.from(
    { length: numChannels },
    () => new Float32Array(totalSamples),
  );
  const moved = new Map<string, Segment>();

  let offset = 0;
  for (const range of ranges) {
    for (let c = 0; c < numChannels; c++) {
      outChannels[c].set(
        decoded.channels[c].subarray(range.start, range.end),
        offset,
      );
    }
    moved.set(segmentKey(range.segment), [
      offset / samplesPerMs,
      (offset + range.length) / samplesPerMs,
    ]);
    offset += range.length;
  }

  return { channels: outChannels, sampleRate, moved };
}

/** A source as it goes into the zip, plus where its segments moved to. */
type PackedAudio = {
  blob: Blob;
  ext: string;
  moved?: Map<string, Segment>;
};

/**
 * - Video: the audio is extracted, everything but the used segments is cut
 *   out, and the result is encoded to OGG.
 * - OGG and MP3 are kept. Anything else is encoded to OGG.
 */
async function packAudio(
  source: AudioSource,
  segments: Segment[],
): Promise<PackedAudio> {
  const { file } = source;
  const ext = getExtension(file.name);

  if (file.type.startsWith('video/')) {
    let decoded: DecodedPcm;
    try {
      decoded = await decodeFileToPcm(file);
    } catch (err) {
      console.warn('[editor] video audio extraction failed:', err);
      throw new Error(`Could not extract audio from ${file.name} for export.`);
    }
    const trimmed = trimAndConcat(decoded, segments);
    return {
      blob: await encodePcmToOgg(trimmed.channels, trimmed.sampleRate),
      ext: '.ogg',
      moved: trimmed.moved,
    };
  }

  if (KEPT_EXTENSIONS.has(ext)) return { blob: file, ext };

  try {
    const decoded = await decodeFileToPcm(file);
    return {
      blob: await encodePcmToOgg(decoded.channels, decoded.sampleRate),
      ext: '.ogg',
    };
  } catch (err) {
    console.warn('[editor] audio compression failed:', err);
    if (APP_PLAYABLE_EXTENSIONS.has(ext)) return { blob: file, ext };
    throw new Error(
      `Could not convert ${file.name} to OGG. Use an MP3, OGG or WAV file instead.`,
    );
  }
}

/** A zip file name for a source in a multi pack, unique ignoring case. */
function uniqueAudioName(file: File, ext: string, taken: Set<string>) {
  const base =
    file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'audio';
  let name = `${base}${ext}`;
  for (let n = 2; taken.has(name.toLowerCase()); n++) {
    name = `${base}-${n}${ext}`;
  }
  taken.add(name.toLowerCase());
  return name;
}

/**
 * Build a Mechvibes V2 config.json + zip from the editor's pack.
 *
 * Keys cut from one source make a "single" pack whose file is `audio.<ext>`.
 * Keys cut from several make a "multi" pack: each key names its own file, and
 * the most used one is also the pack's main `audio_file`. A key that plays its
 * whole file (WHOLE_FILE) is written without timing, so it makes a multi pack
 * too. Files no key uses are left out.
 */
export async function buildSoundPackZip({
  id,
  info,
  sources,
  keySounds,
  extras,
}: ExportSoundPackParams): Promise<Blob> {
  if (sources.length === 0) {
    throw new Error('Load an audio file before exporting.');
  }
  if (keySounds.size === 0) {
    throw new Error('Give at least one key a sound before exporting.');
  }

  // Sources in use, the most used first, with every segment cut from each.
  const segmentsBySource = new Map<string, Segment[]>();
  keySounds.forEach(({ source, press, release }) => {
    const list = segmentsBySource.get(source) ?? [];
    list.push(press);
    if (release) list.push(release);
    segmentsBySource.set(source, list);
  });
  const usedSources = sources
    .filter((source) => segmentsBySource.has(source.id))
    .sort(
      (a, b) =>
        (segmentsBySource.get(b.id)?.length ?? 0) -
        (segmentsBySource.get(a.id)?.length ?? 0),
    );
  if (usedSources.length !== segmentsBySource.size) {
    throw new Error('Some keys use an audio file that is no longer loaded.');
  }
  // A key that plays its whole file has no timing, which only a multi pack allows.
  const isMulti =
    usedSources.length > 1 ||
    [...keySounds.values()].some(({ press }) => isWholeFile(press));

  const zip = new JSZip();
  const takenNames = new Set(['config.json']);
  const packed = new Map<string, PackedAudio & { name: string }>();
  for (const source of usedSources) {
    const audio = await packAudio(
      source,
      segmentsBySource.get(source.id) ?? [],
    );
    const name = isMulti
      ? uniqueAudioName(source.file, audio.ext, takenNames)
      : `audio${audio.ext}`;
    takenNames.add(name.toLowerCase());
    packed.set(source.id, { ...audio, name });
    zip.file(
      name,
      audio.blob,
      audio.ext === '.wav' || audio.ext === '.flac'
        ? { compression: 'DEFLATE', compressionOptions: { level: 9 } }
        : { compression: 'STORE' },
    );
  }

  const definitions: Record<
    string,
    { audio_file?: string; timing?: Segment[] }
  > = {};
  keySounds.forEach(({ source, press, release }, code) => {
    const audio = packed.get(source);
    if (!audio) return;
    const place = (segment: Segment) =>
      audio.moved?.get(segmentKey(segment)) ?? segment;
    const timing = release ? [place(press), place(release)] : [place(press)];
    definitions[code] = isWholeFile(press)
      ? { audio_file: audio.name }
      : isMulti
        ? { audio_file: audio.name, timing }
        : { timing };
  });

  let iconName: string | undefined;
  if (info.icon) {
    const ext = getExtension(info.icon.name);
    if (ICON_TYPES[ext]) {
      iconName = `icon${ext}`;
      takenNames.add(iconName);
      zip.file(iconName, info.icon, { compression: 'STORE' });
    }
  }

  const extraConfig = extras?.config ?? {};
  const config: Record<string, unknown> = {
    config_version: '2',
    ...(id ? { id } : {}),
    name: info.name,
    author: info.author.trim() || 'Mechvibes Editor',
    description: info.description,
    tags: info.tags,
    definition_method: isMulti ? 'multi' : 'single',
    audio_file: packed.get(usedSources[0].id)?.name,
    ...(iconName ? { icon: iconName } : {}),
    soundpack_type: info.packType,
    options: {
      ...(isRecord(extraConfig.options) ? extraConfig.options : {}),
      recommended_volume: info.recommendedVolume,
      random_pitch: info.randomPitch,
    },
    definitions,
  };
  // Fields the editor does not edit, such as version or created_at, go back as
  // they came in.
  for (const [field, value] of Object.entries(extraConfig)) {
    if (!(field in config)) config[field] = value;
  }
  zip.file('config.json', JSON.stringify(config, null, 2));

  for (const file of extras?.files ?? []) {
    if (!takenNames.has(file.name.toLowerCase())) {
      takenNames.add(file.name.toLowerCase());
      zip.file(file.name, file);
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

/** Build the zip and download it as `<slug>-<uuid>.zip`. */
export async function exportSoundPack(params: ExportSoundPackParams) {
  const blob = await buildSoundPackZip(params);
  downloadBlob(blob, `${slugify(params.info.name)}-${generateUuid()}.zip`);
}
