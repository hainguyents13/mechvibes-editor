import { describe, expect, it } from 'vitest';
import {
  keyboardLayouts,
  type LayoutKey,
  parseKeyboardLayout,
} from './keyboardLayouts';

/**
 * Keyboard codes the Mechvibes app plays under, from its input listeners
 * (mechvibes-dx: src/libs/input_listener.rs, rawinput_listener.rs and
 * evdev_input_listener.rs). The app looks a code up as it is, so a key with
 * any other code stays silent there.
 */
const APP_KEY_CODES = new Set([
  'Escape',
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
  'PrintScreen',
  'ScrollLock',
  'Pause',
  'Backquote',
  ...Array.from({ length: 10 }, (_, i) => `Digit${i}`),
  'Minus',
  'Equal',
  'Backspace',
  'Tab',
  ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (letter) => `Key${letter}`),
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'IntlBackslash',
  'CapsLock',
  'Semicolon',
  'Quote',
  'Enter',
  'ShiftLeft',
  'ShiftRight',
  'Comma',
  'Period',
  'Slash',
  'ControlLeft',
  'ControlRight',
  'MetaLeft',
  'MetaRight',
  'AltLeft',
  'AltRight',
  'Space',
  'Insert',
  'Delete',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'NumLock',
  ...Array.from({ length: 10 }, (_, i) => `Numpad${i}`),
  'NumpadDivide',
  'NumpadMultiply',
  'NumpadSubtract',
  'NumpadAdd',
  'NumpadEnter',
  'NumpadDecimal',
]);

const KEYBOARD_LAYOUTS = ['fullsize', 'tkl', 'compact'] as const;

const fullsize = parseKeyboardLayout(keyboardLayouts.fullsize);

/** The code of the key with this legend, at this x when the legend repeats. */
function codeOf(keys: LayoutKey[], label: string, x?: number) {
  const matches = keys.filter(
    (key) => key.label === label && (x === undefined || key.x === x),
  );
  expect(matches).toHaveLength(1);
  return matches[0].code;
}

describe('keyboard layouts', () => {
  it.each(KEYBOARD_LAYOUTS)('give each key its own code on %s', (name) => {
    const keys = parseKeyboardLayout(keyboardLayouts[name]);
    expect(new Set(keys.map((key) => key.code)).size).toBe(keys.length);
  });

  it.each(KEYBOARD_LAYOUTS)('use codes the app listens for on %s', (name) => {
    const codes = parseKeyboardLayout(keyboardLayouts[name]).map(
      (key) => key.code,
    );
    expect(codes.filter((code) => !APP_KEY_CODES.has(code))).toEqual([
      'ContextMenu',
    ]);
  });

  it('give numpad keys numpad codes', () => {
    expect(
      Object.fromEntries(
        (
          [
            ['7\nHome'],
            ['8\n↑'],
            ['9\nPgUp'],
            ['4\n←'],
            ['5', 19.5],
            ['6\n→'],
            ['1\nEnd'],
            ['2\n↓'],
            ['3\nPgDn'],
            ['0\nIns'],
            ['.\nDel'],
            ['/', 19.5],
            ['*', 20.5],
            ['-', 21.5],
            ['+'],
            ['Enter', 21.5],
            ['Num Lock'],
          ] as const
        ).map(([label, x]) => [label, codeOf(fullsize, label, x)]),
      ),
    ).toEqual({
      '7\nHome': 'Numpad7',
      '8\n↑': 'Numpad8',
      '9\nPgUp': 'Numpad9',
      '4\n←': 'Numpad4',
      '5': 'Numpad5',
      '6\n→': 'Numpad6',
      '1\nEnd': 'Numpad1',
      '2\n↓': 'Numpad2',
      '3\nPgDn': 'Numpad3',
      '0\nIns': 'Numpad0',
      '.\nDel': 'NumpadDecimal',
      '/': 'NumpadDivide',
      '*': 'NumpadMultiply',
      '-': 'NumpadSubtract',
      '+': 'NumpadAdd',
      Enter: 'NumpadEnter',
      'Num Lock': 'NumLock',
    });
  });

  it.each(KEYBOARD_LAYOUTS)(
    'tell left and right modifiers apart on %s',
    (name) => {
      const keys = parseKeyboardLayout(keyboardLayouts[name]);
      for (const [label, base] of [
        ['Shift', 'Shift'],
        ['Ctrl', 'Control'],
        ['Alt', 'Alt'],
        ['Win', 'Meta'],
      ]) {
        const sides = keys
          .filter((key) => key.label === label)
          .sort((a, b) => a.x - b.x)
          .map((key) => key.code);
        expect(sides).toEqual([`${base}Left`, `${base}Right`]);
      }
      expect(codeOf(keys, 'Menu')).toBe('ContextMenu');
    },
  );

  it.each(['fullsize', 'tkl'] as const)('give Pause its code on %s', (name) => {
    const keys = parseKeyboardLayout(keyboardLayouts[name]);
    expect(codeOf(keys, 'Pause\nBreak')).toBe('Pause');
  });

  it('keep the codes of the main block', () => {
    expect(codeOf(fullsize, '!\n1')).toBe('Digit1');
    expect(codeOf(fullsize, '%\n5')).toBe('Digit5');
    expect(codeOf(fullsize, '_\n-')).toBe('Minus');
    expect(codeOf(fullsize, '?\n/')).toBe('Slash');
    expect(codeOf(fullsize, 'Enter', 12.75)).toBe('Enter');
    expect(codeOf(fullsize, '')).toBe('Space');
    expect(codeOf(fullsize, 'PrtSc')).toBe('PrintScreen');
    expect(codeOf(fullsize, 'Insert')).toBe('Insert');
    expect(codeOf(fullsize, 'Home', 16.25)).toBe('Home');
  });

  // Shift ranges follow this order and the arrow keys follow the drawing, so
  // the two must agree.
  it('give the mouse buttons their codes, in the order the drawing goes through them', () => {
    expect(
      parseKeyboardLayout(keyboardLayouts.mouse).map((key) => key.code),
    ).toEqual([
      'MouseLeft',
      'MouseRight',
      'MouseWheelUp',
      'MouseMiddle',
      'MouseWheelDown',
      'Mouse5',
      'Mouse4',
      'Mouse6',
      'Mouse7',
      'Mouse8',
    ]);
  });
});

describe('parseKeyboardLayout', () => {
  it('applies a code prop to the next key only', () => {
    expect(
      parseKeyboardLayout([[{ code: 'Numpad7' }, '7\nHome', 'Home']]).map(
        (key) => key.code,
      ),
    ).toEqual(['Numpad7', 'Home']);

    const keys = parseKeyboardLayout([
      [{ w: 2, code: 'Numpad0' }, '0\nIns', '.\nDel'],
    ]);
    expect(keys.map((key) => key.width)).toEqual([2, 1]);
    expect(keys.map((key) => key.code)).toEqual(['Numpad0', 'Del']);
  });

  it('keeps keys that carry a code where they were', () => {
    const at = (code: string) => {
      const { x, y, width, height } = fullsize.find(
        (key) => key.code === code,
      ) as LayoutKey;
      return { x, y, width, height };
    };
    expect(at('Numpad0')).toEqual({ x: 18.5, y: 5.5, width: 2, height: 1 });
    expect(at('NumpadEnter')).toEqual({
      x: 21.5,
      y: 4.5,
      width: 1,
      height: 2,
    });
    expect(at('ShiftRight')).toEqual({
      x: 12.25,
      y: 4.5,
      width: 2.75,
      height: 1,
    });
  });

  it.each([...KEYBOARD_LAYOUTS, 'mouse'] as const)(
    'keeps the geometry of the %s layout',
    (name) => {
      const geometry = parseKeyboardLayout(keyboardLayouts[name]).map(
        (key) => `${key.x},${key.y} ${key.width}x${key.height}`,
      );
      expect(geometry).toMatchSnapshot();
    },
  );
});
