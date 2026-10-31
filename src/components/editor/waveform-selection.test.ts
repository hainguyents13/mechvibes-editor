import { describe, expect, it } from 'vitest';
import {
  getUsageBadges,
  isSameSpan,
  scrollLeftToReveal,
  toRegionSpan,
  USAGE_BADGE_MIN_WIDTH_PX,
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
    expect(getUsageBadges(keySounds, 's1', 200)).toEqual([
      {
        id: 'press:100-200',
        phase: 'press',
        count: 2,
        segments: [
          { phase: 'press', start: 100, end: 200, keyNames: ['KeyA', 'KeyB'] },
        ],
        tooltip: 'Press sound of 2 keys: KeyA, KeyB (100ms - 200ms)',
        centerPx: 30,
      },
      {
        id: 'release:300-400',
        phase: 'release',
        count: 1,
        segments: [
          { phase: 'release', start: 300, end: 400, keyNames: ['KeyB'] },
        ],
        tooltip: 'Release sound of 1 key: KeyB (300ms - 400ms)',
        centerPx: 70,
      },
    ]);
  });

  it.each([
    [100, 15, 35],
    [300, 45, 105],
    [1000, 150, 350],
  ])('places badges at %s px/s', (pxPerSec, press, release) => {
    expect(
      getUsageBadges(keySounds, 's1', pxPerSec).map((badge) => badge.centerPx),
    ).toEqual([press, release]);
  });

  it('shares one badge between short neighbouring segments, so they do not overlap', () => {
    const neighbours: KeySounds = new Map([
      ['KeyA', { source: 's1', press: [0, 100] }],
      ['Numpad0', { source: 's1', press: [100, 200] }],
    ]);
    const badges = getUsageBadges(neighbours, 's1', 100);
    expect(badges).toHaveLength(1);
    expect(badges[0]).toMatchObject({
      id: 'press:0-100 press:100-200',
      phase: 'press',
      count: 2,
      tooltip:
        'Press sound of 1 key: KeyA (0ms - 100ms); Press sound of 1 key: Numpad0 (100ms - 200ms)',
    });
    expect(badges[0].segments.map((segment) => segment.keyNames)).toEqual([
      ['KeyA'],
      ['Numpad0'],
    ]);
    expect(badges[0].centerPx).toBeGreaterThanOrEqual(
      USAGE_BADGE_MIN_WIDTH_PX / 2,
    );
  });

  it('marks a badge of press and release segments together as mixed', () => {
    expect(getUsageBadges(keySounds, 's1', 10)).toEqual([
      expect.objectContaining({ phase: 'mixed', count: 3, centerPx: 10 }),
    ]);
  });

  it('keeps a badge at the left edge whole', () => {
    const early: KeySounds = new Map([
      ['KeyA', { source: 's1', press: [0, 40] }],
    ]);
    expect(getUsageBadges(early, 's1', 100)[0].centerPx).toBe(
      USAGE_BADGE_MIN_WIDTH_PX / 2,
    );
  });

  it('keeps the badges of a run of short segments a badge apart', () => {
    const run: KeySounds = new Map([
      ['KeyA', { source: 's1', press: [0, 100] }],
      ['KeyB', { source: 's1', press: [150, 250] }],
      ['KeyC', { source: 's1', press: [300, 400] }],
      ['KeyD', { source: 's1', press: [450, 550] }],
      ['KeyE', { source: 's1', press: [750, 850] }],
    ]);
    const badges = getUsageBadges(run, 's1', 100);
    expect(badges.map((badge) => badge.count)).toEqual([4, 1]);
    expect(badges[1].centerPx - badges[0].centerPx).toBeGreaterThanOrEqual(
      USAGE_BADGE_MIN_WIDTH_PX,
    );
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
