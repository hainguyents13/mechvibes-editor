import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The mv-* colour tokens (index.css), so text-mv-ink is merged as a colour and
// never replaces text-sm.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'mv-page',
        'mv-raised',
        'mv-fill',
        'mv-fill-strong',
        'mv-line',
        'mv-line-strong',
        'mv-ink',
        'mv-text',
        'mv-muted',
        'mv-subtle',
        'mv-faint',
        'mv-label',
        'mv-up',
        'mv-primary',
        'mv-on-primary',
        'mv-danger',
        'mv-danger-solid',
        'mv-danger-fill',
        'mv-chart',
        'mv-press',
        'mv-release',
      ],
    },
  },
});

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
