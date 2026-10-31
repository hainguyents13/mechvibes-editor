// Pure helpers for the waveform's selection region and the usage badges under it.
import { isWholeFile, type KeySounds, type Segment } from '@/utils/soundPack';

/** A selection in milliseconds, as the editor keeps it. */
export type SelectionMs = { start: number; end: number };
/** A span in seconds, as WaveSurfer regions take it. */
export type SpanSec = { start: number; end: number };

/**
 * The region to draw for a selection, clamped to the file, or null when there is
 * nothing to draw: no selection (0-0), an end at or before the start, or a span
 * that lies wholly past the end of the file.
 */
export function toRegionSpan(
  selection: SelectionMs,
  durationSec: number,
): SpanSec | null {
  if (!(durationSec > 0)) return null;
  if (!Number.isFinite(selection.start) || !Number.isFinite(selection.end)) {
    return null;
  }
  const start = Math.max(0, selection.start / 1000);
  const end = Math.min(durationSec, selection.end / 1000);
  return end > start ? { start, end } : null;
}

/** Whether two spans match to within a microsecond, the ms-to-s rounding. */
export function isSameSpan(a: SpanSec, b: SpanSec) {
  return Math.abs(a.start - b.start) < 1e-6 && Math.abs(a.end - b.end) < 1e-6;
}

const REVEAL_MARGIN_PX = 16;

/**
 * The scrollLeft that brings a span into view, or null when it is already fully
 * visible. A span that fits is centred; a wider one is aligned to its start.
 */
export function scrollLeftToReveal(
  span: SpanSec,
  view: {
    pxPerSec: number;
    scrollLeft: number;
    clientWidth: number;
    scrollWidth: number;
  },
): number | null {
  const { pxPerSec, scrollLeft, clientWidth, scrollWidth } = view;
  if (!(pxPerSec > 0) || !(clientWidth > 0)) return null;
  const left = span.start * pxPerSec;
  const right = span.end * pxPerSec;
  if (left >= scrollLeft && right <= scrollLeft + clientWidth) return null;
  const target =
    right - left <= clientWidth - 2 * REVEAL_MARGIN_PX
      ? (left + right) / 2 - clientWidth / 2
      : left - REVEAL_MARGIN_PX;
  return Math.max(0, Math.min(target, Math.max(0, scrollWidth - clientWidth)));
}

export type UsageBadge = {
  id: string;
  phase: 'press' | 'release';
  start: number;
  end: number;
  keyNames: string[];
  /** Centre of the segment in px at the waveform's scale. */
  centerPx: number;
};

/**
 * One badge for each distinct press or release segment cut from `sourceId`, with
 * the keys that play it, placed at the segment's centre at `pxPerSec`, which is
 * the zoom value the waveform is drawn at.
 */
export function getUsageBadges(
  keySounds: KeySounds,
  sourceId: string,
  pxPerSec: number,
): UsageBadge[] {
  const badges = new Map<string, UsageBadge>();
  const add = (
    phase: UsageBadge['phase'],
    [start, end]: Segment,
    keyName: string,
  ) => {
    const id = `${phase}:${start}-${end}`;
    const badge = badges.get(id) ?? {
      id,
      phase,
      start,
      end,
      keyNames: [],
      centerPx: ((start + end) / 2 / 1000) * pxPerSec,
    };
    badge.keyNames.push(keyName);
    badges.set(id, badge);
  };
  keySounds.forEach((sound, keyName) => {
    // A key of unknown length has no span to mark.
    if (sound.source !== sourceId || isWholeFile(sound.press)) return;
    add('press', sound.press, keyName);
    if (sound.release) add('release', sound.release, keyName);
  });
  return [...badges.values()];
}
