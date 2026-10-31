import type { KeySounds, PackType } from '@/utils/soundPack';

// The library's key rules for a keyboard pack, mirrored from the website
// (mechvibes-website src/lib/soundPackSafety.ts) so the editor can say what
// to fix before someone uploads a zip the library would refuse.
const MIN_KEYBOARD_KEYS = 60;
const MAX_SILENT_LETTERS = 5;
const MOUSE_KEY = /^(Mouse|Button|Wheel)/;
const LETTER_KEYS = Array.from(
  { length: 26 },
  (_, i) => `Key${String.fromCharCode(65 + i)}`,
);

/** Why the library would refuse this pack's keys, or an empty list. */
export function libraryKeyProblems(
  packType: PackType,
  keySounds: KeySounds,
): string[] {
  if (packType === 'Mouse') return [];
  const problems: string[] = [];
  const keys = [...keySounds.keys()].filter((code) => !MOUSE_KEY.test(code));
  if (keys.length < MIN_KEYBOARD_KEYS) {
    problems.push(
      `Only ${keys.length} keys have a sound. The library needs at least ${MIN_KEYBOARD_KEYS}.`,
    );
  }
  const silent = LETTER_KEYS.filter((code) => !keySounds.has(code));
  if (silent.length > MAX_SILENT_LETTERS) {
    problems.push(
      `${silent.length} letter keys play nothing (${silent.map((code) => code.slice(3)).join('')}). The library allows at most ${MAX_SILENT_LETTERS}.`,
    );
  }
  return problems;
}
