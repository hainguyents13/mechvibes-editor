import { describe, expect, it } from 'vitest';
import {
  autoTourFlow,
  hasSeenTour,
  markTourSeen,
  TOUR_SEEN_STORAGE_KEY,
} from '@/lib/editorTourFlow';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

const blocked = () => {
  throw new DOMException('The operation is insecure.', 'SecurityError');
};

describe('autoTourFlow', () => {
  it('shows the ways to add sounds for an empty pack', () => {
    expect(autoTourFlow('no-files')).toBe('new-pack');
  });

  it('shows where to hear and save a pack that makes sound', () => {
    expect(autoTourFlow('has-sounds')).toBe('opened-pack');
  });

  it('opens nothing for a pack with files but no sound', () => {
    expect(autoTourFlow('no-sounds')).toBeNull();
  });
});

describe('tour seen flag', () => {
  it('is unseen until marked, then seen', () => {
    const storage = memoryStorage();
    expect(hasSeenTour(() => storage)).toBe(false);
    markTourSeen(() => storage);
    expect(hasSeenTour(() => storage)).toBe(true);
    expect(storage.getItem(TOUR_SEEN_STORAGE_KEY)).toBe('1');
  });

  it('counts unreadable storage as seen', () => {
    expect(hasSeenTour(blocked)).toBe(true);
    expect(
      hasSeenTour(() => ({
        getItem: () => {
          throw new Error('denied');
        },
      })),
    ).toBe(true);
  });

  it('marks without throwing when storage cannot be written', () => {
    expect(() => markTourSeen(blocked)).not.toThrow();
    expect(() =>
      markTourSeen(() => ({
        setItem: () => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        },
      })),
    ).not.toThrow();
  });
});
