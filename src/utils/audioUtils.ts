import type { KeySound, KeySounds, Segment } from '@/utils/soundPack';

/** Whether a file is audio or video the editor can cut sounds from. */
export const isMediaFile = (file: File) =>
  file.type.startsWith('audio/') || file.type.startsWith('video/');

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
 * Format duration in seconds to MM:SS format
 */
export const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Give keys a press sound from `source`. A key that already had a release
 * sound from the same source keeps it; one from another source loses it,
 * because both halves of a key's sound come from one file.
 */
export const applyPressToKeys = (
  keyCodes: string[],
  source: string,
  segment: Segment,
  keySounds: KeySounds,
): KeySounds => {
  const next = new Map(keySounds);
  for (const code of keyCodes) {
    const current = keySounds.get(code);
    const sound: KeySound = { source, press: segment };
    if (current?.source === source && current.release) {
      sound.release = current.release;
    }
    next.set(code, sound);
  }
  return next;
};

/** Keys that can take a release sound from `source`: those whose press sound comes from it. */
export const keysAcceptingRelease = (
  keyCodes: string[],
  source: string,
  keySounds: KeySounds,
) => keyCodes.filter((code) => keySounds.get(code)?.source === source);

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
