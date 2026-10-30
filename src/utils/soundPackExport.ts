import JSZip from 'jszip';

export type ExportSoundPackParams = {
  /**
   * config.id. Set for library packs and for packs loaded with an id; left out
   * otherwise, so the editor never invents one (the app mints imported-<uuid>).
   */
  id?: string;
  name: string;
  author?: string;
  description: string;
  audioFile: File | null;
  modifiedKeys: Map<string, [number, number]>;
};

// Lossless/uncompressed formats that benefit from re-encoding to OGG Vorbis.
const COMPRESSIBLE_EXTENSIONS = new Set(['.wav', '.flac', '.aiff', '.aif']);

// Vorbis quality in the -0.1..1 range; 0.4 is a good size/quality balance.
const VORBIS_QUALITY = 0.4;

// Samples per encode() call. libvorbis processes the PCM in chunks, so we
// yield to the event loop between chunks to keep the loading UI responsive.
const ENCODE_CHUNK = 4096;
const YIELD_EVERY = 4;

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

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

function buildDefinitions(
  modifiedKeys: Map<string, [number, number]>,
): Record<string, { timing: [number, number][] }> {
  const definitions: Record<string, { timing: [number, number][] }> = {};
  modifiedKeys.forEach(([start, end], keyCode) => {
    definitions[keyCode] = { timing: [[start, end]] };
  });
  return definitions;
}

/**
 * Cut out everything except the selected segments, then concatenate them.
 * Returns the new PCM plus remapped definitions (timing shifted to the
 * concatenated positions).
 */
function trimAndConcat(
  decoded: DecodedPcm,
  modifiedKeys: Map<string, [number, number]>,
): {
  channels: Float32Array[];
  sampleRate: number;
  definitions: Record<string, { timing: [number, number][] }>;
} {
  if (modifiedKeys.size === 0) {
    return {
      channels: decoded.channels,
      sampleRate: decoded.sampleRate,
      definitions: {},
    };
  }

  const sampleRate = decoded.sampleRate;
  const numChannels = decoded.channels.length;
  const samplesPerMs = sampleRate / 1000;

  // Unique segments sorted by start time.
  const segmentKeys = Array.from(
    new Set(Array.from(modifiedKeys.values()).map(([s, e]) => `${s}-${e}`)),
  );
  const segments = segmentKeys
    .map((key) => key.split('-').map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0]);

  // Convert to sample ranges and compute total length.
  const ranges = segments.map(([startMs, endMs]) => {
    const start = Math.round(startMs * samplesPerMs);
    const end = Math.round(endMs * samplesPerMs);
    return { startMs, endMs, start, end, length: end - start };
  });
  const totalSamples = ranges.reduce((sum, r) => sum + r.length, 0);

  const outChannels = Array.from(
    { length: numChannels },
    () => new Float32Array(totalSamples),
  );
  const remap = new Map<string, [number, number]>();

  let offset = 0;
  for (const range of ranges) {
    for (let c = 0; c < numChannels; c++) {
      outChannels[c].set(
        decoded.channels[c].subarray(range.start, range.end),
        offset,
      );
    }
    remap.set(`${range.startMs}-${range.endMs}`, [
      offset / samplesPerMs,
      (offset + range.length) / samplesPerMs,
    ]);
    offset += range.length;
  }

  const definitions: Record<string, { timing: [number, number][] }> = {};
  modifiedKeys.forEach(([start, end], keyCode) => {
    const newSeg = remap.get(`${start}-${end}`) ?? [start, end];
    definitions[keyCode] = { timing: [[newSeg[0], newSeg[1]]] };
  });

  return { channels: outChannels, sampleRate, definitions };
}

/**
 * Compress lossless/uncompressed audio (wav/flac/aiff) to OGG Vorbis.
 * Returns null on failure so the caller can fall back to the original file.
 */
async function compressToOgg(file: File): Promise<Blob | null> {
  try {
    const decoded = await decodeFileToPcm(file);
    return await encodePcmToOgg(decoded.channels, decoded.sampleRate);
  } catch (err) {
    console.warn(
      '[editor] audio compression failed, keeping original file:',
      err,
    );
    return null;
  }
}

/**
 * Build a Mechvibes V2 config.json + zip from current editor settings.
 *
 * - Video files: audio is extracted, unselected parts are cut out, the
 *   selected segments are concatenated, and the result is encoded to OGG.
 * - Lossless/uncompressed audio (wav, flac, aiff) is compressed to OGG Vorbis.
 * - The audio file is renamed to `audio.<ext>`.
 */
export async function buildSoundPackZip({
  id,
  name,
  author,
  description,
  audioFile,
  modifiedKeys,
}: ExportSoundPackParams): Promise<Blob> {
  if (!audioFile) {
    throw new Error('Load an audio file before exporting.');
  }

  let ext = getExtension(audioFile.name) || '.ogg';
  let audioBlob: Blob = audioFile;
  let definitions = buildDefinitions(modifiedKeys);

  const isVideo = audioFile.type.startsWith('video/');

  if (isVideo) {
    let decoded: DecodedPcm;
    try {
      decoded = await decodeFileToPcm(audioFile);
    } catch (err) {
      console.warn('[editor] video audio extraction failed:', err);
      throw new Error('Could not extract audio from this video for export.');
    }

    const trimmed = trimAndConcat(decoded, modifiedKeys);
    audioBlob = await encodePcmToOgg(trimmed.channels, trimmed.sampleRate);
    definitions = trimmed.definitions;
    ext = '.ogg';
  } else if (COMPRESSIBLE_EXTENSIONS.has(ext)) {
    const compressed = await compressToOgg(audioFile);
    if (compressed) {
      audioBlob = compressed;
      ext = '.ogg';
    }
  }

  const audioEntryName = `audio${ext}`;

  const config = {
    config_version: '2',
    ...(id ? { id } : {}),
    name,
    author: author?.trim() || 'Mechvibes Editor',
    description,
    definition_method: 'single',
    audio_file: audioEntryName,
    soundpack_type: 'Keyboard',
    options: { recommended_volume: 1.0, random_pitch: false },
    definitions,
  };

  const zip = new JSZip();
  zip.file('config.json', JSON.stringify(config, null, 2));
  zip.file(
    audioEntryName,
    audioBlob,
    COMPRESSIBLE_EXTENSIONS.has(ext)
      ? { compression: 'DEFLATE', compressionOptions: { level: 9 } }
      : { compression: 'STORE' },
  );

  return zip.generateAsync({ type: 'blob' });
}

/** Build the zip and download it as `<slug>-<uuid>.zip`. */
export async function exportSoundPack(params: ExportSoundPackParams) {
  const blob = await buildSoundPackZip(params);
  downloadBlob(blob, `${slugify(params.name)}-${generateUuid()}.zip`);
}
