// Selection rules and key geometry for the keyboard and mouse displays. Pure,
// so they can be tested without a browser.

import type { LayoutKey } from './keyboardLayouts';

export const KEY_UNIT = 54;
export const KEY_GAP = 3;

/** Where a key sits in the layout, in layout units. */
export type KeyBox = Pick<LayoutKey, 'x' | 'y' | 'width' | 'height'>;

/** A box in the keyboard's own (unscaled) pixels. */
export type LayoutRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type Point = { x: number; y: number };

/** Where a key is drawn, in unscaled pixels; KeyButton positions keys with it. */
export function keyRect(key: KeyBox): LayoutRect {
  const left = key.x * (KEY_UNIT + KEY_GAP) + KEY_GAP;
  const top = key.y * (KEY_UNIT + KEY_GAP) + KEY_GAP;
  return {
    left,
    top,
    right: left + key.width * KEY_UNIT + (key.width - 1) * KEY_GAP,
    bottom: top + key.height * KEY_UNIT + (key.height - 1) * KEY_GAP,
  };
}

/**
 * A pointer position in the keyboard's unscaled pixels. `box` is the element's
 * getBoundingClientRect (scaled by CSS transforms), `layoutWidth` its
 * offsetWidth (not scaled) and `border` its clientLeft. Null when the keyboard
 * is drawn at size 0.
 */
export function toLayoutPoint(
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number },
  layoutWidth: number,
  border = 0,
): Point | null {
  const scale = layoutWidth > 0 ? box.width / layoutWidth : 0;
  if (!(scale > 0)) return null;
  return {
    x: (clientX - box.left) / scale - border,
    y: (clientY - box.top) / scale - border,
  };
}

/** The box between two points, whichever way the drag went. */
export function rectFromPoints(a: Point, b: Point): LayoutRect {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  };
}

/** Ids of the keys a marquee overlaps; touching an edge is not overlapping. */
export function keysInRect(
  keys: KeyBox[],
  ids: string[],
  rect: LayoutRect,
): Set<string> {
  const hit = new Set<string>();
  keys.forEach((key, index) => {
    const box = keyRect(key);
    if (
      box.left < rect.right &&
      box.right > rect.left &&
      box.top < rect.bottom &&
      box.bottom > rect.top
    ) {
      hit.add(ids[index]);
    }
  });
  return hit;
}

export type SelectModifiers = {
  /** Shift: select the range from the anchor. */
  range: boolean;
  /** Ctrl or Cmd, or Enter on a focused key: add or remove one key. */
  toggle: boolean;
};

export type SelectionState = {
  selected: ReadonlySet<string>;
  anchor: string | null;
};

/**
 * The selection after clicking a key, like a file manager:
 * - click: select only that key, or deselect it when it is the only one selected;
 * - Ctrl/Cmd+click: add or remove it;
 * - Shift+click: select every key from the anchor to it in layout order;
 *   Ctrl/Cmd+Shift+click adds that range to the selection.
 * `keyId` null is a click on empty space: a plain click there deselects all.
 * `order` is every key id in layout order.
 */
export function selectKey(
  state: SelectionState,
  keyId: string | null,
  order: string[],
  modifiers: SelectModifiers,
): SelectionState {
  if (keyId === null) {
    return modifiers.range || modifiers.toggle
      ? state
      : { selected: new Set(), anchor: null };
  }
  const anchorIndex = state.anchor === null ? -1 : order.indexOf(state.anchor);
  const keyIndex = order.indexOf(keyId);
  if (modifiers.range && anchorIndex >= 0 && keyIndex >= 0) {
    const range = order.slice(
      Math.min(anchorIndex, keyIndex),
      Math.max(anchorIndex, keyIndex) + 1,
    );
    const selected = modifiers.toggle
      ? new Set([...state.selected, ...range])
      : new Set(range);
    return { selected, anchor: state.anchor };
  }
  if (modifiers.toggle) {
    const selected = new Set(state.selected);
    if (selected.has(keyId)) selected.delete(keyId);
    else selected.add(keyId);
    return { selected, anchor: keyId };
  }
  const isOnlySelected = state.selected.size === 1 && state.selected.has(keyId);
  return {
    selected: isOnlySelected ? new Set() : new Set([keyId]),
    anchor: keyId,
  };
}

/** The selection while dragging a marquee: replace, or add to what was selected when the drag began. */
export function marqueeSelection(
  base: ReadonlySet<string>,
  hit: ReadonlySet<string>,
  additive: boolean,
): Set<string> {
  return additive ? new Set([...base, ...hit]) : new Set(hit);
}

export function sameSelection(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

export type ArrowDirection = 'up' | 'down' | 'left' | 'right';

export const ARROW_DIRECTIONS: Partial<Record<string, ArrowDirection>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/**
 * The key an arrow press moves focus to, by position: the nearest key on that
 * side, preferring the one most in line with this key's centre. Returns
 * `index` when there is no key that way.
 */
export function findNeighbor(
  keys: KeyBox[],
  index: number,
  direction: ArrowDirection,
): number {
  const from = keys[index];
  const cx = from.x + from.width / 2;
  const cy = from.y + from.height / 2;
  const horizontal = direction === 'left' || direction === 'right';
  let best = index;
  let bestScore: [number, number] | null = null;
  keys.forEach((key, i) => {
    if (i === index) return;
    // Gap along the arrow (must be ahead) and miss across it (0 when in line).
    let gap: number;
    if (direction === 'right') gap = key.x - (from.x + from.width);
    else if (direction === 'left') gap = from.x - (key.x + key.width);
    else if (direction === 'down') gap = key.y - (from.y + from.height);
    else gap = from.y - (key.y + key.height);
    if (gap < -1e-6) return;
    const [start, size, centre] = horizontal
      ? [key.y, key.height, cy]
      : [key.x, key.width, cx];
    const miss =
      centre < start
        ? start - centre
        : centre > start + size
          ? centre - (start + size)
          : 0;
    // Nearest row or column first, then the most in line; ties keep the lower index.
    const score: [number, number] = [Math.round(gap * 100) / 100, miss];
    if (
      !bestScore ||
      score[0] < bestScore[0] ||
      (score[0] === bestScore[0] && score[1] < bestScore[1])
    ) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}
