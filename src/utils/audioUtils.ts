import { getKeyCode } from '@/components/editor/keyboardLayouts';

/**
 * Get audio duration from a File object
 */
export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });

    audio.src = url;
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
 * Apply time segment to selected keys
 */
export const applyTimeSegmentToKeys = (
  selectedKeys: Set<string>,
  waveformSelection: { start: number; end: number },
  modifiedKeys: Map<string, [number, number]>,
): Map<string, [number, number]> => {
  const newModifiedKeys = new Map(modifiedKeys);
  selectedKeys.forEach((keyId) => {
    const keyCode = getKeyCode(keyId.split('-')[0]);
    newModifiedKeys.set(keyCode, [
      waveformSelection.start,
      waveformSelection.end,
    ]);
  });
  return newModifiedKeys;
};

/**
 * Apply entire audio file to selected keys (file mode)
 */
export const applyAudioFileToKeys = (
  selectedKeys: Set<string>,
  audioDuration: number,
  modifiedKeys: Map<string, [number, number]>,
): Map<string, [number, number]> => {
  const newModifiedKeys = new Map(modifiedKeys);
  selectedKeys.forEach((keyId) => {
    const keyCode = getKeyCode(keyId.split('-')[0]);
    // Use 0 to full duration for file mode
    newModifiedKeys.set(keyCode, [0, audioDuration * 1000]);
  });
  return newModifiedKeys;
};

/**
 * Check if a file is a valid audio file
 */
export const isValidAudioFile = (file: File): boolean => {
  return file.type.startsWith('audio/');
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
