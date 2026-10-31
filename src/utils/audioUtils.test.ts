import { describe, expect, it } from 'vitest';
import {
  applyPressToKeys,
  applyReleaseToKeys,
  clearKeySounds,
  formatDuration,
  isMediaFile,
  isValidWaveformSelection,
  keysAcceptingRelease,
  removeReleaseFromKeys,
} from '@/utils/audioUtils';
import type { KeySound, KeySounds } from '@/utils/soundPack';

const keySounds = () =>
  new Map<string, KeySound>([
    ['KeyA', { source: 'a', press: [0, 50], release: [50, 100] }],
    ['KeyB', { source: 'b', press: [0, 40], release: [40, 80] }],
    ['KeyC', { source: 'a', press: [100, 150] }],
  ]);

/** Run `update` and check it left its input alone and returned a new map. */
function updated(input: KeySounds, update: (input: KeySounds) => KeySounds) {
  const before = structuredClone(input);
  const result = update(input);
  expect(input).toEqual(before);
  expect(result).not.toBe(input);
  return result;
}

describe('applyPressToKeys', () => {
  it('gives a key without a sound a press and no release', () => {
    const result = updated(keySounds(), (input) =>
      applyPressToKeys(['KeyD'], 'a', [10, 20], input),
    );
    expect(result.get('KeyD')).toEqual({ source: 'a', press: [10, 20] });
    expect('release' in (result.get('KeyD') as KeySound)).toBe(false);
  });

  it('keeps the release of a key that has one from the same source', () => {
    const result = updated(keySounds(), (input) =>
      applyPressToKeys(['KeyA'], 'a', [10, 20], input),
    );
    expect(result.get('KeyA')).toEqual({
      source: 'a',
      press: [10, 20],
      release: [50, 100],
    });
  });

  it('drops the release of a key that has one from another source', () => {
    const result = updated(keySounds(), (input) =>
      applyPressToKeys(['KeyB'], 'a', [10, 20], input),
    );
    expect(result.get('KeyB')).toEqual({ source: 'a', press: [10, 20] });
  });

  it('leaves other keys as they are', () => {
    const input = keySounds();
    const result = updated(input, () =>
      applyPressToKeys(['KeyA'], 'a', [10, 20], input),
    );
    expect(result.get('KeyB')).toBe(input.get('KeyB'));
    expect(result.get('KeyC')).toBe(input.get('KeyC'));
  });
});

describe('keysAcceptingRelease', () => {
  it('keeps the keys with a press from the source, in order', () => {
    expect(
      keysAcceptingRelease(['KeyC', 'KeyD', 'KeyB', 'KeyA'], 'a', keySounds()),
    ).toEqual(['KeyC', 'KeyA']);
  });
});

describe('applyReleaseToKeys', () => {
  it('sets or replaces the release of keys with a press from the source', () => {
    const result = updated(keySounds(), (input) =>
      applyReleaseToKeys(['KeyA', 'KeyC'], 'a', [200, 250], input),
    );
    expect(result.get('KeyA')).toEqual({
      source: 'a',
      press: [0, 50],
      release: [200, 250],
    });
    expect(result.get('KeyC')).toEqual({
      source: 'a',
      press: [100, 150],
      release: [200, 250],
    });
  });

  it('leaves keys from another source and keys without a sound alone', () => {
    const input = keySounds();
    const result = updated(input, () =>
      applyReleaseToKeys(['KeyB', 'KeyD'], 'a', [200, 250], input),
    );
    expect(result.get('KeyB')).toBe(input.get('KeyB'));
    expect(result.has('KeyD')).toBe(false);
    expect(result.size).toBe(input.size);
  });
});

describe('removeReleaseFromKeys', () => {
  it('takes the release off a key', () => {
    const result = updated(keySounds(), (input) =>
      removeReleaseFromKeys(['KeyA'], input),
    );
    expect(result.get('KeyA')).toEqual({ source: 'a', press: [0, 50] });
    expect('release' in (result.get('KeyA') as KeySound)).toBe(false);
  });

  it('leaves a key without a release as it is and skips unknown keys', () => {
    const input = keySounds();
    const result = updated(input, () =>
      removeReleaseFromKeys(['KeyC', 'KeyD'], input),
    );
    expect(result.get('KeyC')).toBe(input.get('KeyC'));
    expect(result.has('KeyD')).toBe(false);
    expect(result.size).toBe(input.size);
  });
});

describe('clearKeySounds', () => {
  it('takes the press and release off the given keys only', () => {
    const input = keySounds();
    const result = updated(input, () =>
      clearKeySounds(['KeyA', 'KeyB'], input),
    );
    expect([...result.keys()]).toEqual(['KeyC']);
    expect(result.get('KeyC')).toBe(input.get('KeyC'));
  });

  it('returns the same map when none of the keys has a sound', () => {
    const input = keySounds();
    expect(clearKeySounds(['KeyD', 'KeyE'], input)).toBe(input);
    expect(clearKeySounds([], input)).toBe(input);
  });

  it('does not mind repeated or unknown codes', () => {
    const result = updated(keySounds(), (input) =>
      clearKeySounds(['KeyA', 'KeyA', 'KeyZ'], input),
    );
    expect([...result.keys()]).toEqual(['KeyB', 'KeyC']);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [59.9, '0:59'],
    [61, '1:01'],
    [600, '10:00'],
  ])('formats %s seconds as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});

describe('isValidWaveformSelection', () => {
  it('takes a span that starts at or after 0 and ends after it starts', () => {
    expect(isValidWaveformSelection({ start: 0, end: 1 })).toBe(true);
  });

  it.each([
    { start: 1, end: 1 },
    { start: -1, end: 1 },
    { start: 2, end: 1 },
  ])('refuses $start to $end', (selection) => {
    expect(isValidWaveformSelection(selection)).toBe(false);
  });
});

describe('isMediaFile', () => {
  it.each([
    ['audio/ogg', true],
    ['video/mp4', true],
    ['', false],
    ['application/zip', false],
  ])('treats type "%s" as media: %s', (type, isMedia) => {
    expect(isMediaFile(new File([], 'file', { type }))).toBe(isMedia);
  });
});
