import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "1 key", "2 keys". */
export const plural = (count: number, word: string) =>
  `${count} ${word}${count !== 1 ? 's' : ''}`;

/** Mac keyboards use Cmd where others use Ctrl. */
export const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);

/** The modifier key shortcuts use, as its keycap reads. */
export const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl';
