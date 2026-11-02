import { describe, expect, it } from 'vitest';
import {
  addSources,
  compareFileNames,
  createAudioSource,
  isSamePackInfo,
  isWholeFile,
  type KeySounds,
  listKeys,
  nextColorIndexes,
  type PackInfo,
  SOURCE_COLOR_COUNT,
  sourcesInUse,
  WHOLE_FILE,
} from '@/utils/soundPack';

describe('isWholeFile', () => {
  it('tells the whole-file marker from a segment', () => {
    expect(isWholeFile(WHOLE_FILE)).toBe(true);
    expect(isWholeFile([0, 0])).toBe(true);
    expect(isWholeFile([0, 1])).toBe(false);
    expect(isWholeFile([10, 10])).toBe(false);
  });
});

describe('listKeys', () => {
  it('lists every code up to 8', () => {
    expect(listKeys(['KeyA'])).toBe('KeyA');
    expect(listKeys(['KeyA', 'KeyB', 'KeyC'])).toBe('KeyA, KeyB, KeyC');
  });

  it('shows 8 codes, then an ellipsis', () => {
    const codes = Array.from({ length: 10 }, (_, i) => `Digit${i}`);
    expect(listKeys(codes)).toBe(
      'Digit0, Digit1, Digit2, Digit3, Digit4, Digit5, Digit6, Digit7, …',
    );
    expect(listKeys(codes.slice(0, 8))).toBe(
      'Digit0, Digit1, Digit2, Digit3, Digit4, Digit5, Digit6, Digit7',
    );
  });
});

const info: PackInfo = {
  name: 'Cream',
  author: 'Hai',
  description: 'Lubed linears.',
  tags: ['linear', 'thocky'],
  packType: 'Keyboard',
  recommendedVolume: 1,
  randomPitch: false,
  icon: new File(['png'], 'icon.png', { type: 'image/png' }),
};

describe('isSamePackInfo', () => {
  it('matches an equal copy with a new tags array', () => {
    expect(isSamePackInfo(info, { ...info, tags: [...info.tags] })).toBe(true);
  });

  it('tells tags in another order apart', () => {
    expect(isSamePackInfo(info, { ...info, tags: ['thocky', 'linear'] })).toBe(
      false,
    );
  });

  it('tells another name apart', () => {
    expect(isSamePackInfo(info, { ...info, name: 'Cream 2' })).toBe(false);
  });

  it('tells another icon file apart, even with the same name', () => {
    const icon = new File(['png'], 'icon.png', { type: 'image/png' });
    expect(isSamePackInfo(info, { ...info, icon })).toBe(false);
  });
});

const slots = (...indexes: number[]) =>
  indexes.map((colorIndex) => ({ colorIndex }));
const everySlot = () =>
  slots(...Array.from({ length: SOURCE_COLOR_COUNT }, (_, slot) => slot));

describe('nextColorIndexes', () => {
  it('takes the lowest free slots', () => {
    expect(nextColorIndexes([], 3)).toEqual([0, 1, 2]);
    expect(nextColorIndexes(slots(0, 2), 2)).toEqual([1, 3]);
  });

  it('reuses the least used slots once all are taken', () => {
    expect(nextColorIndexes(everySlot(), 2)).toEqual([0, 1]);
    expect(nextColorIndexes([...everySlot(), ...slots(0)], 1)).toEqual([1]);
  });

  it('picks nothing for no sources', () => {
    expect(nextColorIndexes(slots(0, 1), 0)).toEqual([]);
  });

  it('counts a slot past the palette as the one it cycles to', () => {
    expect(nextColorIndexes(slots(12), 1)).toEqual([0]);
  });
});

describe('createAudioSource', () => {
  it('keeps the colour slot it is given, with a new id each time', () => {
    const file = new File(['a'], 'a.wav', { type: 'audio/wav' });
    const first = createAudioSource(file, 1, 4);
    const second = createAudioSource(file, 1);
    expect(first.colorIndex).toBe(4);
    expect(second.colorIndex).toBe(0);
    expect(first.id).not.toBe(second.id);
  });
});

describe('addSources', () => {
  const source = (name: string) =>
    createAudioSource(new File([name], name, { type: 'audio/wav' }), 1);

  it('gives a removed file colour to the next one added, and keeps the others', () => {
    const [a, b, c] = addSources([], [source('a'), source('b'), source('c')]);
    expect([a, b, c].map((s) => s.colorIndex)).toEqual([0, 1, 2]);
    const added = source('d');
    // b is removed, so d takes its colour.
    const next = addSources([a, c], [added]);
    expect(next.map((s) => s.colorIndex)).toEqual([0, 2, 1]);
    expect(next[0]).toBe(a);
    expect(next[1]).toBe(c);
    expect(next[2]).toMatchObject({ id: added.id, file: added.file });
    expect(added.colorIndex).toBe(0);
  });
});

describe('sourcesInUse', () => {
  const source = (name: string) =>
    createAudioSource(new File([name], name, { type: 'audio/wav' }), 1);

  it('keeps the files a key plays, in list order, and leaves out the rest', () => {
    const [a, b, c] = [source('a'), source('b'), source('c')];
    const keySounds: KeySounds = new Map([
      ['KeyA', { source: c.id, press: [0, 10] }],
      ['KeyB', { source: a.id, press: [0, 10] }],
      ['KeyC', { source: a.id, press: [20, 30] }],
    ]);
    expect(sourcesInUse([a, b, c], keySounds)).toEqual([a, c]);
    expect(sourcesInUse([a, b, c], new Map())).toEqual([]);
  });
});

describe('compareFileNames', () => {
  it('orders numbers by value, case aside, and a name before its longer forms', () => {
    const names = [
      'key_10.wav',
      'Key_2.wav',
      'a_down.wav',
      'key_1.wav',
      'B.wav',
      'a.wav',
    ];
    expect([...names].sort(compareFileNames)).toEqual([
      'a.wav',
      'a_down.wav',
      'B.wav',
      'key_1.wav',
      'Key_2.wav',
      'key_10.wav',
    ]);
  });
});
