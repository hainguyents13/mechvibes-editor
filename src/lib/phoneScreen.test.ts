import { describe, expect, it } from 'vitest';
import { isPhoneScreen } from '@/lib/phoneScreen';

describe('isPhoneScreen', () => {
  it('turns away anything narrower than 768px, whatever the pointer', () => {
    expect(
      isPhoneScreen({ width: 390, height: 844, coarsePointer: true }),
    ).toBe(true);
    expect(
      isPhoneScreen({ width: 767, height: 1000, coarsePointer: false }),
    ).toBe(true);
  });

  it('lets in 768px and wider with a mouse, however short', () => {
    expect(
      isPhoneScreen({ width: 768, height: 1024, coarsePointer: false }),
    ).toBe(false);
    expect(
      isPhoneScreen({ width: 1280, height: 400, coarsePointer: false }),
    ).toBe(false);
  });

  it('turns away a touch screen shorter than 500px: a phone held sideways', () => {
    expect(
      isPhoneScreen({ width: 844, height: 390, coarsePointer: true }),
    ).toBe(true);
    expect(
      isPhoneScreen({ width: 932, height: 499, coarsePointer: true }),
    ).toBe(true);
  });

  it('lets in a touch screen 500px tall or more: a tablet', () => {
    expect(
      isPhoneScreen({ width: 1024, height: 500, coarsePointer: true }),
    ).toBe(false);
    expect(
      isPhoneScreen({ width: 768, height: 1024, coarsePointer: true }),
    ).toBe(false);
  });
});
