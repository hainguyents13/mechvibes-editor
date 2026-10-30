// The editor's model of a Mechvibes V2 pack (mechvibes-dx docs/soundpack-config-v2.md).

/** A [start, end] span in milliseconds within a source file. */
export type Segment = [number, number];

/**
 * What one key plays. `press` plays when the key goes down and `release`, when
 * set, when it comes up. Both are cut from the same source, as V2 requires.
 */
export type KeySound = {
  source: string;
  press: Segment;
  release?: Segment;
};

/** Key code (e.g. "KeyA", "MouseLeft") to its sound. */
export type KeySounds = Map<string, KeySound>;

/** An audio or video file that key sounds are cut from. */
export type AudioSource = {
  id: string;
  file: File;
  /** Length in seconds; 0 when the browser cannot tell. */
  duration: number;
};

export type PackType = 'Keyboard' | 'Mouse';

/** The pack details the editor edits. */
export type PackInfo = {
  name: string;
  author: string;
  description: string;
  tags: string[];
  packType: PackType;
  /** options.recommended_volume, 0 to 2. */
  recommendedVolume: number;
  /** options.random_pitch. */
  randomPitch: boolean;
  icon: File | null;
};

/**
 * Parts of an imported pack the editor does not edit, written back unchanged
 * on export: config fields such as version, created_at or author_url, extra
 * options, and the license file.
 */
export type PackExtras = {
  config: Record<string, unknown>;
  files: File[];
};

/** Codes the app treats as mouse buttons when it detects a pack's type. */
export const MOUSE_CODE = /^(Mouse|Button|Wheel)/;

export const ICON_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** The library refuses larger icons. */
export const MAX_ICON_BYTES = 512 * 1024;

export const LICENSE_FILE_NAMES = new Set([
  'license',
  'license.txt',
  'license.md',
]);

export function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

let lastSourceId = 0;

export function createAudioSource(file: File, duration: number): AudioSource {
  lastSourceId += 1;
  return { id: `source-${lastSourceId}`, file, duration };
}

/** How many keys use each source. */
export function countKeysBySource(keySounds: KeySounds) {
  const counts = new Map<string, number>();
  keySounds.forEach(({ source }) => {
    counts.set(source, (counts.get(source) ?? 0) + 1);
  });
  return counts;
}
