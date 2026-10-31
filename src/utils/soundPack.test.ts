import { describe, expect, it } from 'vitest';
import { isSamePackInfo, type PackInfo } from '@/utils/soundPack';

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
