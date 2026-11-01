import {
  type AudioSource,
  compareFileNames,
  getExtension,
  isWholeFile,
  type KeySound,
  type KeySounds,
  type Segment,
  WHOLE_FILE,
} from '@/utils/soundPack';

// Types for media files the browser hands over without one: Windows often
// leaves the type of a .flac, .m4a or .mov empty.
const MEDIA_TYPES_BY_EXTENSION: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.weba': 'audio/webm',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

// What a file picker offers for audio or video: the types, plus the
// extensions above for systems that type those files differently.
const pickerAccept = (kind: 'audio' | 'video') =>
  [
    `${kind}/*`,
    ...Object.keys(MEDIA_TYPES_BY_EXTENSION).filter((extension) =>
      MEDIA_TYPES_BY_EXTENSION[extension].startsWith(`${kind}/`),
    ),
  ].join(',');

export const AUDIO_FILE_ACCEPT = pickerAccept('audio');
export const VIDEO_FILE_ACCEPT = pickerAccept('video');

const isMediaType = (type: string) =>
  type.startsWith('audio/') || type.startsWith('video/');

/**
 * The audio or video type of a file, from its declared type or else its
 * extension; null when it is neither.
 */
export function mediaTypeOf(file: { name: string; type: string }) {
  const type = file.type.toLowerCase();
  if (isMediaType(type)) return type;
  return MEDIA_TYPES_BY_EXTENSION[getExtension(file.name)] ?? null;
}

/** Whether a file is audio or video the editor can cut sounds from. */
export const isMediaFile = (file: { name: string; type: string }) =>
  mediaTypeOf(file) !== null;

/**
 * The file with its media type filled in, so code that tells video from
 * audio by type sees what the extension says.
 */
export function withMediaType(file: File) {
  const type = mediaTypeOf(file);
  if (!type || type === file.type) return file;
  return new File([file], file.name, { type, lastModified: file.lastModified });
}

/**
 * Length of an audio or video file in seconds, or 0 when the browser cannot
 * read it.
 */
export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const media: HTMLMediaElement = file.type.startsWith('video/')
      ? document.createElement('video')
      : new Audio();
    const url = URL.createObjectURL(file);

    media.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(media.duration) ? media.duration : 0);
    });

    media.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });

    media.src = url;
  });
};

/**
 * Length in seconds from decoding the whole file, for files whose metadata
 * gives none (some OGG and VBR MP3); 0 when the browser cannot decode it.
 */
export const getDecodedDuration = async (file: File): Promise<number> => {
  try {
    // Offline: decoding needs no output device and no user gesture.
    const context = new OfflineAudioContext(1, 1, 44100);
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    return buffer.duration;
  } catch {
    return 0;
  }
};

/** Play part of a file once, outside preview. Returns a function that stops it. */
export const playFileSegment = (
  file: File,
  [startMs, endMs]: Segment,
): (() => void) => {
  const media: HTMLMediaElement = file.type.startsWith('video/')
    ? document.createElement('video')
    : new Audio();
  const url = URL.createObjectURL(file);
  let timer = 0;
  const stop = () => {
    window.clearTimeout(timer);
    media.pause();
    media.removeAttribute('src');
    URL.revokeObjectURL(url);
  };
  media.addEventListener(
    'loadedmetadata',
    () => {
      media.currentTime = startMs / 1000;
      media.play().catch(stop);
    },
    { once: true },
  );
  media.addEventListener(
    'playing',
    () => {
      if (endMs > startMs) timer = window.setTimeout(stop, endMs - startMs);
    },
    { once: true },
  );
  media.addEventListener('ended', stop, { once: true });
  media.addEventListener('error', stop, { once: true });
  media.src = url;
  return stop;
};

/**
 * Format duration in seconds to MM:SS format
 */
export const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * A file's length in words: "0.3 s", "12 s", "4 min 12 s". Short files read
 * to a tenth of a second, the shortest to a hundredth.
 */
export const formatLength = (seconds: number): string => {
  if (seconds < 0.1) return `${Number(seconds.toFixed(2))} s`;
  if (seconds < 9.95) return `${Number(seconds.toFixed(1))} s`;
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return secs === 0 ? `${mins} min` : `${mins} min ${secs} s`;
};

const isSameSegment = (a: Segment | undefined, b: Segment | undefined) =>
  a === b ||
  (a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1]);

/**
 * Give keys a press sound from `source`. A key that already had a release
 * sound from the same source keeps it; one from another source loses it,
 * because both halves of a key's sound come from one file. Returns
 * `keySounds` itself when every key already plays that sound, so giving it
 * again records no change.
 */
export const applyPressToKeys = (
  keyCodes: string[],
  source: string,
  segment: Segment,
  keySounds: KeySounds,
): KeySounds => {
  let next: KeySounds | null = null;
  for (const code of keyCodes) {
    const current = keySounds.get(code);
    const sound: KeySound = { source, press: segment };
    if (current?.source === source && current.release) {
      sound.release = current.release;
    }
    if (
      current?.source === source &&
      isSameSegment(current.press, sound.press) &&
      isSameSegment(current.release, sound.release)
    ) {
      continue;
    }
    next ??= new Map(keySounds);
    next.set(code, sound);
  }
  return next ?? keySounds;
};

/**
 * The press segment every key that plays `sourceId` shares, or null when no
 * key plays it or they play different parts of it.
 */
export const sharedPressSegment = (
  sourceId: string,
  keySounds: KeySounds,
): Segment | null => {
  let shared: Segment | null = null;
  for (const { source, press } of keySounds.values()) {
    if (source !== sourceId) continue;
    if (shared === null) shared = press;
    else if (!isSameSegment(shared, press)) return null;
  }
  return shared;
};

/**
 * The segment a key gets from a file that is one sound: the part its keys
 * already share, so a new key sounds like them, else the whole file. A file
 * of unknown length plays whole without timing.
 */
export const oneSoundSegment = (
  source: Pick<AudioSource, 'id' | 'duration'>,
  keySounds: KeySounds,
): Segment =>
  sharedPressSegment(source.id, keySounds) ??
  (source.duration > 0 ? [0, source.duration * 1000] : WHOLE_FILE);

/**
 * Give each file the keys its name matched, each as one sound. Returns
 * `keySounds` itself when every key already plays its file.
 */
export const giveFilesToTheirKeys = (
  matches: readonly { source: AudioSource; codes: string[] }[],
  keySounds: KeySounds,
): KeySounds =>
  matches.reduce(
    (next, { source, codes }) =>
      applyPressToKeys(
        codes,
        source.id,
        oneSoundSegment(source, keySounds),
        next,
      ),
    keySounds,
  );

/**
 * The keys a spread or an in-order give fills, in layout order: the selected
 * ones, or with none selected, the drawn keys that have no sound.
 */
export const keysToFill = (
  layoutCodes: Iterable<string>,
  selectedCodes: readonly string[],
  keySounds: KeySounds,
) => {
  const selected = new Set(selectedCodes);
  return [...layoutCodes].filter((code) =>
    selected.size > 0 ? selected.has(code) : !keySounds.has(code),
  );
};

// Files in name order onto `targetCodes`: round and round when `cycle`, else
// one key each until either runs out.
function giveInTurn(
  sources: readonly AudioSource[],
  targetCodes: readonly string[],
  keySounds: KeySounds,
  cycle: boolean,
) {
  const ordered = [...sources].sort((a, b) =>
    compareFileNames(a.file.name, b.file.name),
  );
  if (ordered.length === 0) return keySounds;
  const count = cycle
    ? targetCodes.length
    : Math.min(targetCodes.length, ordered.length);
  const codesBySource = new Map<AudioSource, string[]>();
  for (let index = 0; index < count; index++) {
    const source = ordered[index % ordered.length];
    const codes = codesBySource.get(source) ?? [];
    codes.push(targetCodes[index]);
    codesBySource.set(source, codes);
  }
  let next = keySounds;
  for (const [source, codes] of codesBySource) {
    next = applyPressToKeys(
      codes,
      source.id,
      oneSoundSegment(source, keySounds),
      next,
    );
  }
  return next;
}

/** Spread similar files across keys, in turn, so each key plays one of them. */
export const spreadFilesAcrossKeys = (
  sources: readonly AudioSource[],
  targetCodes: readonly string[],
  keySounds: KeySounds,
): KeySounds => giveInTurn(sources, targetCodes, keySounds, true);

/**
 * Give files to keys one each, in name order (key_2 before key_10). Files
 * left over keep no key; keys left over stay as they are.
 */
export const giveFilesToKeysInOrder = (
  sources: readonly AudioSource[],
  targetCodes: readonly string[],
  keySounds: KeySounds,
): KeySounds => giveInTurn(sources, targetCodes, keySounds, false);

/**
 * Keys that can take a release sound from `source`: those whose press sound
 * comes from it. A key that plays its whole file has no timing to follow.
 */
export const keysAcceptingRelease = (
  keyCodes: string[],
  source: string,
  keySounds: KeySounds,
) =>
  keyCodes.filter((code) => {
    const sound = keySounds.get(code);
    return sound?.source === source && !isWholeFile(sound.press);
  });

/** Give keys a release sound. Keys without a press sound from `source` are left alone. */
export const applyReleaseToKeys = (
  keyCodes: string[],
  source: string,
  segment: Segment,
  keySounds: KeySounds,
): KeySounds => {
  const next = new Map(keySounds);
  for (const code of keysAcceptingRelease(keyCodes, source, keySounds)) {
    const current = keySounds.get(code) as KeySound;
    next.set(code, { ...current, release: segment });
  }
  return next;
};

/** Drop the release sound of the given keys; they go back to a silent release. */
export const removeReleaseFromKeys = (
  keyCodes: string[],
  keySounds: KeySounds,
): KeySounds => {
  const next = new Map(keySounds);
  for (const code of keyCodes) {
    const current = keySounds.get(code);
    if (current?.release) {
      next.set(code, { source: current.source, press: current.press });
    }
  }
  return next;
};

/**
 * Remove the whole sound (press and release) of the given keys; they go back
 * to silent. Returns `keySounds` itself when none of them had a sound, so
 * callers can skip recording a change that did nothing.
 */
export const clearKeySounds = (
  keyCodes: string[],
  keySounds: KeySounds,
): KeySounds => {
  if (!keyCodes.some((code) => keySounds.has(code))) return keySounds;
  const next = new Map(keySounds);
  for (const code of keyCodes) next.delete(code);
  return next;
};

/**
 * Validate waveform selection
 */
export const isValidWaveformSelection = (selection: {
  start: number;
  end: number;
}): boolean => {
  return selection.end > selection.start && selection.start >= 0;
};
