import { describe, expect, it } from 'vitest';
import {
  keysPastEnd,
  replaceSourceFile,
  replaceWarning,
} from '@/lib/replaceFile';
import {
  type AudioSource,
  type KeySound,
  type KeySounds,
  WHOLE_FILE,
} from '@/utils/soundPack';

const sounds = (entries: Record<string, KeySound>): KeySounds =>
  new Map(Object.entries(entries));

const audio = (name: string) => new File(['x'], name, { type: 'audio/wav' });

const typing: AudioSource = {
  id: 's1',
  file: audio('typing.wav'),
  duration: 3,
  colorIndex: 4,
};

describe('replaceSourceFile', () => {
  it('keeps the id and colour, and takes the new audio and length', () => {
    const file = audio('take2.wav');
    const { source } = replaceSourceFile(typing, file, 2.5, new Map());
    expect(source).toEqual({ id: 's1', file, duration: 2.5, colorIndex: 4 });
  });

  it('keeps the times of parts cut from the file, release too', () => {
    const keySounds = sounds({
      KeyA: { source: 's1', press: [100, 200], release: [300, 400] },
      KeyB: { source: 's2', press: [0, 3000] },
    });
    const result = replaceSourceFile(typing, audio('b.wav'), 5, keySounds);
    expect(result.keySounds).toBe(keySounds);
  });

  it('stretches a key that played all of the old file over the new one', () => {
    const keySounds = sounds({
      KeyA: { source: 's1', press: [0, 3000] },
      // Within the encoder's padding, still all of it.
      KeyS: { source: 's1', press: [0, 2950] },
      KeyD: { source: 's1', press: [0, 1000] },
    });
    const next = replaceSourceFile(
      typing,
      audio('b.wav'),
      4.5,
      keySounds,
    ).keySounds;
    expect(next.get('KeyA')).toEqual({ source: 's1', press: [0, 4500] });
    expect(next.get('KeyS')).toEqual({ source: 's1', press: [0, 4500] });
    expect(next.get('KeyD')).toEqual({ source: 's1', press: [0, 1000] });
  });

  it('keeps the press over all of the old file of a key with a release', () => {
    const short = { ...typing, duration: 0.3 };
    const keySounds = sounds({
      KeyA: { source: 's1', press: [0, 300], release: [150, 300] },
    });
    expect(
      replaceSourceFile(short, audio('b.wav'), 1.5, keySounds).keySounds,
    ).toBe(keySounds);
  });

  it('leaves a whole file without timing as it is', () => {
    const keySounds = sounds({ KeyA: { source: 's1', press: WHOLE_FILE } });
    expect(
      replaceSourceFile(typing, audio('b.wav'), 4.5, keySounds).keySounds,
    ).toBe(keySounds);
  });
});

describe('keysPastEnd', () => {
  it('names the keys of the file that run past its new end', () => {
    const short = { ...typing, duration: 0.4 };
    const keySounds = sounds({
      KeyA: { source: 's1', press: [100, 200] },
      KeyS: { source: 's1', press: [300, 500] },
      KeyD: { source: 's1', press: [100, 200], release: [600, 700] },
      KeyF: { source: 's2', press: [900, 1000] },
    });
    expect(keysPastEnd('s1', [short], keySounds)).toEqual(['KeyS', 'KeyD']);
  });

  it('is none when every part fits', () => {
    const keySounds = sounds({ KeyA: { source: 's1', press: [100, 200] } });
    expect(keysPastEnd('s1', [typing], keySounds)).toEqual([]);
  });
});

describe('replaceWarning', () => {
  const replaced = (duration: number, keySounds: KeySounds) => ({
    source: { ...typing, file: audio('b.wav'), duration },
    keySounds,
  });

  it('names the keys past the end, and the new length', () => {
    const keySounds = sounds({
      KeyA: { source: 's1', press: [100, 600] },
      KeyS: { source: 's1', press: [500, 900] },
      KeyD: { source: 's1', press: [0, 300] },
    });
    expect(
      replaceWarning('a.wav', replaced(0.4, keySounds), false, 'key'),
    ).toEqual({
      title: 'Replace a.wav with b.wav?',
      message:
        '2 keys play past the end of b.wav, which is 0.4\u00a0s long: A, S. They would be cut short or silent.',
      confirmTone: 'error',
    });
  });

  it('speaks of one button', () => {
    const keySounds = sounds({ MouseLeft: { source: 's1', press: [0, 900] } });
    expect(
      replaceWarning('a.wav', replaced(0.4, keySounds), false, 'button')
        ?.message,
    ).toBe(
      '1 button plays past the end of b.wav, which is 0.4\u00a0s long: Left button. It would be cut short or silent.',
    );
  });

  it('counts the keys that would play all of a file past 2 s', () => {
    const keySounds = sounds({
      KeyA: { source: 's1', press: [0, 240000] },
      KeyS: { source: 's1', press: WHOLE_FILE },
      // Cut from the file, so not all of it.
      KeyD: { source: 's1', press: [0, 240000], release: [100, 200] },
      KeyF: { source: 's2', press: [0, 240000] },
    });
    expect(
      replaceWarning('a.wav', replaced(240, keySounds), false, 'key'),
    ).toEqual({
      title: 'Replace a.wav with b.wav?',
      message: 'b.wav is 4\u00a0min long. 2 keys would play all of it.',
      confirmTone: 'primary',
    });
  });

  it('asks for a file of one sound past 2 s that no key plays yet', () => {
    expect(
      replaceWarning('a.wav', replaced(4, new Map()), true, 'button')?.message,
    ).toBe('b.wav is 4\u00a0s long. Every button would play all of it.');
  });

  it('asks nothing up to 2 s, or for parts cut from a recording', () => {
    const whole = sounds({ KeyA: { source: 's1', press: [0, 2000] } });
    expect(replaceWarning('a.wav', replaced(2, whole), true, 'key')).toBeNull();
    const part = sounds({ KeyA: { source: 's1', press: [100, 200] } });
    expect(
      replaceWarning('a.wav', replaced(240, part), false, 'key'),
    ).toBeNull();
  });
});
