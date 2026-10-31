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

/** The narrowest a usage badge is drawn, in px. */
export const USAGE_BADGE_MIN_WIDTH_PX = 20;

/** One press or release segment cut from the file, with the keys that play it. */
export type UsageSegment = {
  phase: 'press' | 'release';
  start: number;
  end: number;
  keyNames: string[];
};

export type UsageBadge = {
  id: string;
  /** 'mixed' when the badge stands for press and release segments together. */
  phase: UsageSegment['phase'] | 'mixed';
  /** The keys of all its segments, a key counted once for each segment. */
  count: number;
  segments: UsageSegment[];
  /** One line for each segment, in the order they lie in the file. */
  tooltip: string;
  /** Centre of the badge in px at the waveform's scale. */
  centerPx: number;
};

function describeSegment({ phase, start, end, keyNames }: UsageSegment) {
  const n = keyNames.length;
  return `${phase === 'press' ? 'Press' : 'Release'} sound of ${n} key${n > 1 ? 's' : ''}: ${keyNames.join(', ')} (${Math.round(start)}ms - ${Math.round(end)}ms)`;
}

/**
 * The usage badges for the press and release segments cut from `sourceId`,
 * placed at `pxPerSec`, which is the zoom value the waveform is drawn at. Each
 * distinct segment has a badge at its centre, kept at least half a badge from
 * the left edge so none is cut off there. Segments whose badges would lie closer
 * than a badge's width share one badge, at the mean of their centres, so short
 * neighbouring segments do not draw badges over each other.
 */
export function getUsageBadges(
  keySounds: KeySounds,
  sourceId: string,
  pxPerSec: number,
): UsageBadge[] {
  const segments = new Map<string, UsageSegment>();
  const add = (
    phase: UsageSegment['phase'],
    [start, end]: Segment,
    keyName: string,
  ) => {
    const id = `${phase}:${start}-${end}`;
    const segment = segments.get(id) ?? { phase, start, end, keyNames: [] };
    segment.keyNames.push(keyName);
    segments.set(id, segment);
  };
  keySounds.forEach((sound, keyName) => {
    // A key of unknown length has no span to mark.
    if (sound.source !== sourceId || isWholeFile(sound.press)) return;
    add('press', sound.press, keyName);
    if (sound.release) add('release', sound.release, keyName);
  });

  const minCenterPx = USAGE_BADGE_MIN_WIDTH_PX / 2;
  const placed = [...segments].map(([id, segment]) => ({
    id,
    segment,
    centerPx: Math.max(
      minCenterPx,
      ((segment.start + segment.end) / 2 / 1000) * pxPerSec,
    ),
  }));
  // Stable, so segments at one spot keep the order the keys came in.
  placed.sort((a, b) => a.centerPx - b.centerPx);

  // Measured from the last centre in a group, so groups lie a badge apart.
  const groups: (typeof placed)[] = [];
  for (const item of placed) {
    const group = groups.at(-1);
    const last = group?.at(-1);
    if (
      group &&
      last &&
      item.centerPx - last.centerPx < USAGE_BADGE_MIN_WIDTH_PX
    ) {
      group.push(item);
    } else {
      groups.push([item]);
    }
  }

  return groups.map((group): UsageBadge => {
    const members = group.map((item) => item.segment);
    const phases = new Set(members.map((segment) => segment.phase));
    return {
      id: group.map((item) => item.id).join(' '),
      phase: phases.size > 1 ? 'mixed' : members[0].phase,
      count: members.reduce((sum, segment) => sum + segment.keyNames.length, 0),
      segments: members,
      tooltip: members.map(describeSegment).join('; '),
      centerPx:
        group.reduce((sum, item) => sum + item.centerPx, 0) / group.length,
    };
  });
}
