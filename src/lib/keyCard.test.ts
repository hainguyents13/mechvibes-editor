import { describe, expect, it } from 'vitest';
import {
  keyCardName,
  keyCardOffer,
  sameSoundCount,
  segmentSeconds,
} from '@/lib/keyCard';
import { type KeySound, type KeySounds, WHOLE_FILE } from '@/utils/soundPack';

const sounds = (entries: Record<string, KeySound>): KeySounds =>
  new Map(Object.entries(entries));

describe('keyCardName', () => {
  it('calls a keyboard key by its label', () => {
    expect(keyCardName('KeyA', 'Keyboard')).toBe('Key A');
    expect(keyCardName('Space', 'Keyboard')).toBe('Key Space');
  });

  it('calls a mouse button as the drawing does', () => {
    expect(keyCardName('MouseLeft', 'Mouse')).toBe('Left button');
  });
});

describe('sameSoundCount', () => {
  const press: [number, number] = [100, 200];

  it('counts the other keys that play the same part of the same file', () => {
    const keySounds = sounds({
      KeyA: { source: 's1', press },
      KeyS: { source: 's1', press: [100, 200] },
      KeyD: { source: 's1', press },
      KeyF: { source: 's2', press },
    });
    expect(sameSoundCount('KeyA', keySounds)).toBe(2);
    expect(sameSoundCount('KeyF', keySounds)).toBe(0);
  });

  it('leaves out another part of the same file', () => {
    const keySounds = sounds({
      KeyA: { source: 's1', press },
      KeyS: { source: 's1', press: [100, 250] },
    });
    expect(sameSoundCount('KeyA', keySounds)).toBe(0);
  });

  it('leaves out a key with another release, or with none', () => {
    const keySounds = sounds({
      KeyA: { source: 's1', press, release: [300, 400] },
      KeyS: { source: 's1', press, release: [300, 450] },
      KeyD: { source: 's1', press },
      KeyF: { source: 's1', press, release: [300, 400] },
    });
    expect(sameSoundCount('KeyA', keySounds)).toBe(1);
    expect(sameSoundCount('KeyD', keySounds)).toBe(0);
  });

  it('counts keys the drawn layout leaves out', () => {
    const keySounds = sounds({
      KeyA: { source: 's1', press },
      Numpad1: { source: 's1', press },
      F13: { source: 's1', press },
    });
    expect(sameSoundCount('KeyA', keySounds)).toBe(2);
  });

  it('is none for a silent key', () => {
    expect(sameSoundCount('KeyA', sounds({}))).toBe(0);
  });
});

describe('keyCardOffer', () => {
  const file = { duration: 3 };

  it('offers a release for a key that plays part of its file', () => {
    expect(
      keyCardOffer({ source: 's1', press: [100, 200] }, file, 'many'),
    ).toBe('add-release');
    // A part of a short file of one sound, as a zip can hold.
    expect(
      keyCardOffer(
        { source: 's1', press: [10, 200] },
        { duration: 0.5 },
        'one',
      ),
    ).toBe('add-release');
  });

  it('offers nothing more for a key that has a release', () => {
    expect(
      keyCardOffer(
        { source: 's1', press: [100, 200], release: [300, 400] },
        file,
        'many',
      ),
    ).toBeNull();
  });

  it('offers to split a whole file of one sound, never a release', () => {
    expect(keyCardOffer({ source: 's1', press: [0, 3000] }, file, 'one')).toBe(
      'split',
    );
    expect(keyCardOffer({ source: 's1', press: WHOLE_FILE }, file, 'one')).toBe(
      'split',
    );
  });

  it('says to cut a whole file already shown on the waveform', () => {
    expect(keyCardOffer({ source: 's1', press: [0, 3000] }, file, 'many')).toBe(
      'cut',
    );
    expect(
      keyCardOffer({ source: 's1', press: WHOLE_FILE }, file, 'many'),
    ).toBe('cut');
  });
});

describe('segmentSeconds', () => {
  it('reads the length of a part, or of the whole file without timing', () => {
    expect(segmentSeconds([100, 220], { duration: 3 })).toBeCloseTo(0.12);
    expect(segmentSeconds(WHOLE_FILE, { duration: 0.4 })).toBe(0.4);
  });
});
