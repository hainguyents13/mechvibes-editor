import { describe, expect, it } from 'vitest';
import {
  AUDIO_TRACK_COLORS,
  getAudioTrackColor,
} from '@/components/editor/audio-track-colors';
import { SOURCE_COLOR_COUNT } from '@/utils/soundPack';

describe('AUDIO_TRACK_COLORS', () => {
  it('has a colour for every slot a source can take', () => {
    expect(AUDIO_TRACK_COLORS).toHaveLength(SOURCE_COLOR_COUNT);
  });

  it.each(AUDIO_TRACK_COLORS.map((color, index) => [index, color] as const))(
    'uses one hue for the row and the dots of slot %s',
    (_, color) => {
      const hues = Object.values(color).map(
        (className) => className.match(/-([a-z]+)-500/)?.[1],
      );
      expect(hues[0]).toBeTruthy();
      expect(new Set(hues).size).toBe(1);
      expect(color.dot.startsWith('bg-')).toBe(true);
      expect(color.fill.startsWith('fill-')).toBe(true);
    },
  );

  it('gives every slot its own hue', () => {
    const hues = AUDIO_TRACK_COLORS.map((color) => color.dot);
    expect(new Set(hues).size).toBe(AUDIO_TRACK_COLORS.length);
  });

  it('cycles past the last slot', () => {
    expect(getAudioTrackColor(SOURCE_COLOR_COUNT)).toBe(getAudioTrackColor(0));
  });
});
