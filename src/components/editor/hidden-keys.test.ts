import { describe, expect, it } from 'vitest';
import {
  codesOfOtherKind,
  findHiddenKeys,
  getLayoutCodes,
  inferKeyboardSize,
  widenKeyboardSize,
} from './hidden-keys';

describe('getLayoutCodes', () => {
  it.each(['Escape', 'F1', 'ArrowUp', 'Home'])(
    'leaves %s to TKL and Full size',
    (code) => {
      expect(getLayoutCodes('compact').has(code)).toBe(false);
      expect(getLayoutCodes('tkl').has(code)).toBe(true);
      expect(getLayoutCodes('fullsize').has(code)).toBe(true);
    },
  );

  it.each(['NumLock', 'Numpad0', 'NumpadEnter'])(
    'leaves %s to Full size',
    (code) => {
      expect(getLayoutCodes('tkl').has(code)).toBe(false);
      expect(getLayoutCodes('fullsize').has(code)).toBe(true);
    },
  );

  it('draws the mouse buttons on the mouse only', () => {
    expect(getLayoutCodes('mouse').has('MouseLeft')).toBe(true);
    expect(getLayoutCodes('fullsize').has('MouseLeft')).toBe(false);
  });
});

describe('findHiddenKeys', () => {
  it('says which layout draws a key that compact leaves out', () => {
    expect(
      findHiddenKeys(['KeyA', 'F1', 'Numpad1', 'MouseLeft'], 'compact'),
    ).toEqual([
      { code: 'F1', reason: 'bigger-layout', layout: 'tkl' },
      { code: 'Numpad1', reason: 'bigger-layout', layout: 'fullsize' },
      { code: 'MouseLeft', reason: 'not-a-key' },
    ]);
  });

  it('tells keyboard keys from unknown buttons on the mouse', () => {
    expect(findHiddenKeys(['MouseLeft', 'KeyA', 'ButtonX'], 'mouse')).toEqual([
      { code: 'KeyA', reason: 'not-a-mouse-button' },
      { code: 'ButtonX', reason: 'no-layout' },
    ]);
  });

  it('marks a key no layout draws', () => {
    expect(findHiddenKeys(['F13', 'IntlBackslash'], 'fullsize')).toEqual([
      { code: 'F13', reason: 'no-layout' },
      { code: 'IntlBackslash', reason: 'no-layout' },
    ]);
  });

  it('keeps the order of the mapping', () => {
    expect(
      findHiddenKeys(['ArrowUp', 'Escape', 'F12'], 'compact').map(
        ({ code }) => code,
      ),
    ).toEqual(['ArrowUp', 'Escape', 'F12']);
  });

  it('finds nothing when the layout draws every key', () => {
    expect(
      findHiddenKeys(['KeyA', 'Numpad5', 'ShiftRight', 'Pause'], 'fullsize'),
    ).toEqual([]);
    expect(findHiddenKeys([], 'compact')).toEqual([]);
  });
});

describe('codesOfOtherKind', () => {
  const codes = ['KeyA', 'MouseLeft', 'Mouse4', 'WheelUp'];

  it('finds the keyboard keys of a mouse pack', () => {
    expect(codesOfOtherKind(codes, 'Mouse')).toEqual(['KeyA']);
  });

  it('finds the mouse buttons of a keyboard pack', () => {
    expect(codesOfOtherKind(codes, 'Keyboard')).toEqual([
      'MouseLeft',
      'Mouse4',
      'WheelUp',
    ]);
  });
});

describe('inferKeyboardSize', () => {
  it.each([
    [['KeyA', 'Numpad5', 'F1'], 'compact', 'fullsize'],
    [['NumLock'], 'tkl', 'fullsize'],
    [['Escape', 'KeyA'], 'compact', 'tkl'],
    [['ArrowUp'], 'fullsize', 'tkl'],
    [['KeyA', 'Space'], 'fullsize', 'compact'],
    [['KeyA', 'Space'], 'compact', 'compact'],
    [['KeyA', 'F13', 'MouseLeft'], 'tkl', 'compact'],
  ] as const)(
    'picks the smallest size that draws %j',
    (codes, current, size) => {
      expect(inferKeyboardSize(codes, current)).toBe(size);
    },
  );

  it.each([
    [[], 'tkl'],
    [['F13'], 'compact'],
    [['MouseLeft', 'MouseRight'], 'fullsize'],
  ] as const)('keeps the size when no layout draws %j', (codes, current) => {
    expect(inferKeyboardSize(codes, current)).toBe(current);
  });
});

describe('widenKeyboardSize', () => {
  it('grows to the size that draws keys just given a sound', () => {
    expect(widenKeyboardSize(['KeyA', 'Numpad1'], 'tkl')).toBe('fullsize');
    expect(widenKeyboardSize(['F1'], 'compact')).toBe('tkl');
  });

  it('never shrinks the keyboard for keys a smaller size also draws', () => {
    expect(widenKeyboardSize(['KeyA', 'KeyB'], 'fullsize')).toBe('fullsize');
    expect(widenKeyboardSize(['MouseLeft'], 'tkl')).toBe('tkl');
  });
});
