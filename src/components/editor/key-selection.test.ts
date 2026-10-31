import { describe, expect, it } from 'vitest';
import {
  findNeighbor,
  type KeyBox,
  keyRect,
  keysInRect,
  marqueeSelection,
  rectFromPoints,
  type SelectionState,
  sameSelection,
  selectKey,
  toLayoutPoint,
} from './key-selection';
import {
  keyboardLayouts,
  type LayoutKey,
  parseKeyboardLayout,
} from './keyboardLayouts';

const PLAIN = { range: false, toggle: false };
const TOGGLE = { range: false, toggle: true };
const RANGE = { range: true, toggle: false };
const ORDER = ['a', 'b', 'c', 'd', 'e', 'f'];

const state = (selected: string[], anchor: string | null): SelectionState => ({
  selected: new Set(selected),
  anchor,
});

/** The ids the editor gives keys. */
const keyId = (key: LayoutKey, index: number) =>
  `${key.label || 'key'}-${index}-${key.x}-${key.y}`;

const fullsize = parseKeyboardLayout(keyboardLayouts.fullsize);
const fullsizeIds = fullsize.map(keyId);
const indexOfCode = (code: string) =>
  fullsize.findIndex((key) => key.code === code);
const idOfCode = (code: string) => fullsizeIds[indexOfCode(code)];

describe('selectKey', () => {
  it('selects only the clicked key', () => {
    const next = selectKey(state(['a', 'b'], 'a'), 'd', ORDER, PLAIN);
    expect([...next.selected]).toEqual(['d']);
    expect(next.anchor).toBe('d');
  });

  it('deselects the only selected key when it is clicked again', () => {
    const next = selectKey(state(['d'], 'd'), 'd', ORDER, PLAIN);
    expect(next.selected.size).toBe(0);
    expect(next.anchor).toBe('d');
  });

  it('keeps only the clicked key when others are selected too', () => {
    const next = selectKey(state(['d', 'a'], 'a'), 'd', ORDER, PLAIN);
    expect([...next.selected]).toEqual(['d']);
  });

  it('adds and removes a key with Ctrl or Cmd', () => {
    const added = selectKey(state(['a'], 'a'), 'd', ORDER, TOGGLE);
    expect([...added.selected]).toEqual(['a', 'd']);
    expect(added.anchor).toBe('d');
    const removed = selectKey(added, 'd', ORDER, TOGGLE);
    expect([...removed.selected]).toEqual(['a']);
    expect(removed.anchor).toBe('d');
  });

  it('selects the range from the anchor in layout order, either way', () => {
    const forward = selectKey(state(['b'], 'b'), 'e', ORDER, RANGE);
    expect([...forward.selected]).toEqual(['b', 'c', 'd', 'e']);
    expect(forward.anchor).toBe('b');
    const backward = selectKey(state(['e'], 'e'), 'b', ORDER, RANGE);
    expect(sameSelection(backward.selected, forward.selected)).toBe(true);
    expect(backward.anchor).toBe('e');
  });

  it('adds the range to the selection with Ctrl or Cmd and Shift', () => {
    const next = selectKey(state(['x'], 'b'), 'd', ORDER, {
      range: true,
      toggle: true,
    });
    expect(sameSelection(next.selected, new Set(['x', 'b', 'c', 'd']))).toBe(
      true,
    );
  });

  it('treats a range without a usable anchor as a plain click', () => {
    const noAnchor = selectKey(state(['a'], null), 'c', ORDER, RANGE);
    expect([...noAnchor.selected]).toEqual(['c']);
    expect(noAnchor.anchor).toBe('c');
    const staleAnchor = selectKey(state(['a'], 'gone'), 'c', ORDER, RANGE);
    expect([...staleAnchor.selected]).toEqual(['c']);
    expect(staleAnchor.anchor).toBe('c');
  });

  it('deselects all on a plain click on empty space', () => {
    const next = selectKey(state(['a', 'b'], 'a'), null, ORDER, PLAIN);
    expect(next.selected.size).toBe(0);
    expect(next.anchor).toBeNull();
  });

  it('ignores a modified click on empty space', () => {
    const before = state(['a', 'b'], 'a');
    expect(selectKey(before, null, ORDER, TOGGLE)).toBe(before);
    expect(selectKey(before, null, ORDER, RANGE)).toBe(before);
  });

  it('never changes the selection it is given', () => {
    const before = state(['a', 'c'], 'c');
    const copy = new Set(before.selected);
    selectKey(before, 'b', ORDER, PLAIN);
    selectKey(before, 'c', ORDER, TOGGLE);
    selectKey(before, 'e', ORDER, RANGE);
    selectKey(before, 'e', ORDER, { range: true, toggle: true });
    expect(sameSelection(before.selected, copy)).toBe(true);
  });
});

describe('keyRect', () => {
  it('places keys on the 54 px grid with 3 px gaps', () => {
    expect(keyRect({ x: 0, y: 0, width: 1, height: 1 })).toEqual({
      left: 3,
      top: 3,
      right: 57,
      bottom: 57,
    });
    const wide = keyRect({ x: 1, y: 0, width: 2, height: 1 });
    expect(wide.left).toBe(60);
    expect(wide.right).toBe(171);
  });

  it('draws every full-size key where it was drawn before', () => {
    // The formula keys were positioned with before keyRect existed.
    const unitSize = 54;
    const gap = 3;
    for (const key of fullsize) {
      const box = keyRect(key);
      expect({
        left: box.left,
        top: box.top,
        width: box.right - box.left,
        height: box.bottom - box.top,
      }).toEqual({
        left: key.x * unitSize + key.x * gap + gap,
        top: key.y * unitSize + key.y * gap + gap,
        width: key.width * unitSize + (key.width - 1) * gap,
        height: key.height * unitSize + (key.height - 1) * gap,
      });
    }
  });
});

describe('keysInRect', () => {
  const row: KeyBox[] = [
    { x: 0, y: 0, width: 1, height: 1 },
    { x: 1, y: 0, width: 1, height: 1 },
  ];
  const ids = ['first', 'second'];

  it('finds the key a box lies inside', () => {
    const hit = keysInRect(row, ids, {
      left: 10,
      top: 10,
      right: 20,
      bottom: 20,
    });
    expect([...hit]).toEqual(['first']);
  });

  it('finds nothing in the gap between two keys', () => {
    const hit = keysInRect(row, ids, {
      left: 57.5,
      top: 10,
      right: 59.5,
      bottom: 20,
    });
    expect(hit.size).toBe(0);
  });

  it('does not count a box that only touches a key edge', () => {
    const hit = keysInRect(row, ids, {
      left: 40,
      top: 10,
      right: 60,
      bottom: 20,
    });
    expect([...hit]).toEqual(['first']);
  });

  it('finds every key under a box over the whole layout', () => {
    const hit = keysInRect(fullsize, fullsizeIds, {
      left: 0,
      top: 0,
      right: 10_000,
      bottom: 10_000,
    });
    expect(hit.size).toBe(fullsize.length);
  });

  it('finds the tall numpad Enter from its lower row', () => {
    const enter = keyRect(fullsize[indexOfCode('NumpadEnter')]);
    const lowerRow = enter.bottom - 20;
    const hit = keysInRect(fullsize, fullsizeIds, {
      left: enter.left + 10,
      top: lowerRow,
      right: enter.left + 11,
      bottom: lowerRow + 1,
    });
    expect([...hit]).toEqual([idOfCode('NumpadEnter')]);
  });
});

describe('toLayoutPoint', () => {
  it('undoes the scale and the border', () => {
    expect(
      toLayoutPoint(350, 150, { left: 100, top: 50, width: 500 }, 1000, 1),
    ).toEqual({ x: 499, y: 199 });
  });

  it('gives null for a keyboard drawn at size 0', () => {
    expect(
      toLayoutPoint(10, 10, { left: 0, top: 0, width: 500 }, 0),
    ).toBeNull();
    expect(
      toLayoutPoint(10, 10, { left: 0, top: 0, width: 0 }, 1000),
    ).toBeNull();
  });

  it('finds the key under the pointer on a keyboard scaled down', () => {
    const scale = 0.5;
    const naturalWidth = Math.max(...fullsize.map((key) => keyRect(key).right));
    const w = keyRect(fullsize[indexOfCode('KeyW')]);
    const centre = { x: (w.left + w.right) / 2, y: (w.top + w.bottom) / 2 };
    const point = toLayoutPoint(
      centre.x * scale,
      centre.y * scale,
      { left: 0, top: 0, width: naturalWidth * scale },
      naturalWidth,
    );
    if (!point) throw new Error('No point');
    const hit = keysInRect(
      fullsize,
      fullsizeIds,
      rectFromPoints(point, { x: point.x + 1, y: point.y + 1 }),
    );
    expect([...hit]).toEqual([idOfCode('KeyW')]);
  });
});

describe('rectFromPoints', () => {
  it('normalises a drag that goes up and left', () => {
    expect(rectFromPoints({ x: 50, y: 40 }, { x: 10, y: 5 })).toEqual({
      left: 10,
      top: 5,
      right: 50,
      bottom: 40,
    });
  });
});

describe('marqueeSelection and sameSelection', () => {
  it('adds to the selection or replaces it', () => {
    const base = new Set(['a', 'b']);
    const hit = new Set(['c']);
    expect(
      sameSelection(
        marqueeSelection(base, hit, true),
        new Set(['a', 'b', 'c']),
      ),
    ).toBe(true);
    expect([...marqueeSelection(base, hit, false)]).toEqual(['c']);
  });

  it('compares selections whatever their order', () => {
    expect(sameSelection(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
    expect(sameSelection(new Set(['a']), new Set(['a', 'b']))).toBe(false);
  });
});

describe('findNeighbor', () => {
  // Two rows of three: indexes 0-2 on top, 3-5 below.
  const grid: KeyBox[] = [0, 1].flatMap((y) =>
    [0, 1, 2].map((x) => ({ x, y, width: 1, height: 1 })),
  );

  it('moves to the next key in line', () => {
    expect(findNeighbor(grid, 0, 'right')).toBe(1);
    expect(findNeighbor(grid, 0, 'down')).toBe(3);
  });

  it('stays on the key at an edge', () => {
    expect(findNeighbor(grid, 0, 'left')).toBe(0);
    expect(findNeighbor(grid, 1, 'up')).toBe(1);
  });

  it('moves across the full-size layout by position', () => {
    // 1 sits between Esc and F1 above it; the tie goes to the lower index.
    expect(findNeighbor(fullsize, indexOfCode('Digit1'), 'up')).toBe(
      indexOfCode('Escape'),
    );
    expect(findNeighbor(fullsize, indexOfCode('KeyQ'), 'right')).toBe(
      indexOfCode('KeyW'),
    );
    expect(findNeighbor(fullsize, indexOfCode('KeyQ'), 'down')).toBe(
      indexOfCode('KeyA'),
    );
    expect(findNeighbor(fullsize, indexOfCode('Backspace'), 'right')).toBe(
      indexOfCode('Insert'),
    );
    expect(findNeighbor(fullsize, indexOfCode('NumpadEnter'), 'up')).toBe(
      indexOfCode('NumpadAdd'),
    );
  });
});
