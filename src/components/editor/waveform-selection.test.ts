import { describe, expect, it } from 'vitest';
import {
  getUsageBadges,
  isSameSpan,
  scrollLeftToReveal,
  toRegionSpan,
} from '@/components/editor/waveform-selection';
import { type KeySounds, WHOLE_FILE } from '@/utils/soundPack';

describe('toRegionSpan', () => {
  it.each([
    [{ start: 400, end: 600 }, 3, { start: 0.4, end: 0.6 }],
    [{ start: -50, end: 100 }, 3, { start: 0, end: 0.1 }],
    [{ start: 2500, end: 4000 }, 3, { start: 2.5, end: 3 }],
  ])('draws %o in a %ss file as %o', (selection, duration, span) => {
    expect(toRegionSpan(selection, duration)).toEqual(span);
  });

  it.each([
    ['no selection', { start: 0, end: 0 }, 3],
    ['an end before the start', { start: 600, end: 400 }, 3],
    ['a span wholly past the end', { start: 3500, end: 4000 }, 3],
    ['a file of unknown length', { start: 0, end: 100 }, 0],
    ['a start that is not a number', { start: Number.NaN, end: 100 }, 3],
  ])('draws nothing for %s', (_, selection, duration) => {
    expect(toRegionSpan(selection, duration)).toBeNull();
  });
});

describe('isSameSpan', () => {
  it('matches spans within a microsecond', () => {
    const span = { start: 0.4, end: 0.6 };
    expect(isSameSpan(span, { start: 0.4 + 1e-9, end: 0.6 })).toBe(true);
    expect(isSameSpan(span, { start: 0.401, end: 0.6 })).toBe(false);
  });

  it('matches a region with the selection it reported, so a drag is not drawn back', () => {
    const region = { start: 0.123456789, end: 0.987654321 };
    const selection = { start: region.start * 1000, end: region.end * 1000 };
    const span = toRegionSpan(selection, 3);
    expect(span).not.toBeNull();
    expect(isSameSpan(region, span ?? region)).toBe(true);
  });
});

describe('scrollLeftToReveal', () => {
  const view = {
    pxPerSec: 100,
    scrollLeft: 0,
    clientWidth: 500,
    scrollWidth: 2000,
  };

  it('leaves a span that is already in view', () => {
    expect(
      scrollLeftToReveal({ start: 1, end: 1.5 }, { ...view, scrollLeft: 50 }),
    ).toBeNull();
  });

  it('centres a span that fits', () => {
    expect(scrollLeftToReveal({ start: 10, end: 10.2 }, view)).toBe(760);
  });

  it('counts a span that is partly in view as hidden', () => {
    expect(scrollLeftToReveal({ start: 4.9, end: 5.2 }, view)).toBe(255);
  });

  it('stays within the scroll range', () => {
    expect(scrollLeftToReveal({ start: 19.8, end: 20 }, view)).toBe(1500);
    expect(
      scrollLeftToReveal(
        { start: 0.1, end: 0.2 },
        { ...view, scrollLeft: 800 },
      ),
    ).toBe(0);
  });

  it('aligns a span wider than the view to its start, with a margin', () => {
    expect(scrollLeftToReveal({ start: 2, end: 10 }, view)).toBe(184);
  });

  it('does nothing before the waveform has a scale', () => {
    expect(
      scrollLeftToReveal({ start: 10, end: 10.2 }, { ...view, pxPerSec: 0 }),
    ).toBeNull();
  });
});

describe('getUsageBadges', () => {
  const keySounds: KeySounds = new Map([
    ['KeyA', { source: 's1', press: [100, 200] }],
    ['KeyB', { source: 's1', press: [100, 200], release: [300, 400] }],
    ['KeyC', { source: 's2', press: [100, 200] }],
  ]);

  it('groups the keys of each segment of the file, at its centre', () => {
    expect(getUsageBadges(keySounds, 's1', 50)).toEqual([
      {
        id: 'press:100-200',
        phase: 'press',
        start: 100,
        end: 200,
        keyNames: ['KeyA', 'KeyB'],
        centerPx: 7.5,
      },
      {
        id: 'release:300-400',
        phase: 'release',
        start: 300,
        end: 400,
        keyNames: ['KeyB'],
        centerPx: 17.5,
      },
    ]);
  });

  it.each([
    [10, 1.5, 3.5],
    [100, 15, 35],
    [300, 45, 105],
  ])('places badges at %s px/s, below 100 too', (pxPerSec, press, release) => {
    expect(
      getUsageBadges(keySounds, 's1', pxPerSec).map((badge) => badge.centerPx),
    ).toEqual([press, release]);
  });

  it('marks nothing for a key that plays its whole file of unknown length', () => {
    const whole: KeySounds = new Map([
      ['KeyA', { source: 's1', press: WHOLE_FILE }],
    ]);
    expect(getUsageBadges(whole, 's1', 100)).toEqual([]);
  });

  it('is empty without keys', () => {
    expect(getUsageBadges(new Map(), 's1', 100)).toEqual([]);
  });
});
