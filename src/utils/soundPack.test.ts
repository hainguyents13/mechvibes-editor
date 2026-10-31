import { describe, expect, it } from 'vitest';
import {
  isSamePackInfo,
  isWholeFile,
  listKeys,
  type PackInfo,
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
