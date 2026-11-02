import { describe, expect, it } from 'vitest';
import {
  guessPackType,
  keyLabel,
  matchFilesToKeys,
  matchKeyName,
} from '@/lib/keyNames';
import type { PackType } from '@/utils/soundPack';

const pressOf = (name: string, packType: PackType = 'Keyboard') => {
  const match = matchKeyName(name, packType);
  return match.kind === 'press' ? match.codes : match.kind;
};

describe('matchKeyName: keyboard names', () => {
  it.each([
    ['a.wav', ['KeyA']],
    ['Z.mp3', ['KeyZ']],
    ['KeyQ.ogg', ['KeyQ']],
    ['key_q.ogg', ['KeyQ']],
    ['1.wav', ['Digit1']],
    ['digit0.wav', ['Digit0']],
    ['num1.wav', ['Numpad1']],
    ['Numpad 9.wav', ['Numpad9']],
    ['kp0.wav', ['Numpad0']],
    ['numenter.wav', ['NumpadEnter']],
    ['NumpadEnter.wav', ['NumpadEnter']],
    ['kpenter.wav', ['NumpadEnter']],
    ['numplus.wav', ['NumpadAdd']],
    ['numpadadd.wav', ['NumpadAdd']],
    ['numminus.wav', ['NumpadSubtract']],
    ['numpadsubtract.wav', ['NumpadSubtract']],
    ['numstar.wav', ['NumpadMultiply']],
    ['numpadmultiply.wav', ['NumpadMultiply']],
    ['numslash.wav', ['NumpadDivide']],
    ['numpaddivide.wav', ['NumpadDivide']],
    ['numdot.wav', ['NumpadDecimal']],
    ['numdel.wav', ['NumpadDecimal']],
    ['numpaddecimal.wav', ['NumpadDecimal']],
    ['numlock.wav', ['NumLock']],
    ['f1.wav', ['F1']],
    ['F12.wav', ['F12']],
    ['space.wav', ['Space']],
    ['spacebar.mp4', ['Space']],
    ['enter.mp3', ['Enter']],
    ['return.wav', ['Enter']],
    ['backspace.wav', ['Backspace']],
    ['bksp.wav', ['Backspace']],
    ['tab.wav', ['Tab']],
    ['caps.wav', ['CapsLock']],
    ['Caps Lock.wav', ['CapsLock']],
    ['esc.wav', ['Escape']],
    ['escape.wav', ['Escape']],
    ['menu.wav', ['ContextMenu']],
    ['contextmenu.wav', ['ContextMenu']],
    ['backquote.wav', ['Backquote']],
    ['grave.wav', ['Backquote']],
    ['tilde.wav', ['Backquote']],
    ['minus.wav', ['Minus']],
    ['dash.wav', ['Minus']],
    ['hyphen.wav', ['Minus']],
    ['equal.wav', ['Equal']],
    ['equals.wav', ['Equal']],
    ['bracketleft.wav', ['BracketLeft']],
    ['lbracket.wav', ['BracketLeft']],
    ['left_bracket.wav', ['BracketLeft']],
    ['bracketright.wav', ['BracketRight']],
    ['rbracket.wav', ['BracketRight']],
    ['rightbracket.wav', ['BracketRight']],
    ['backslash.wav', ['Backslash']],
    ['pipe.wav', ['Backslash']],
    ['semicolon.wav', ['Semicolon']],
    ['quote.wav', ['Quote']],
    ['apostrophe.wav', ['Quote']],
    ['comma.wav', ['Comma']],
    ['period.wav', ['Period']],
    ['dot.wav', ['Period']],
    ['slash.wav', ['Slash']],
    ['insert.wav', ['Insert']],
    ['ins.wav', ['Insert']],
    ['delete.wav', ['Delete']],
    ['del.wav', ['Delete']],
    ['home.wav', ['Home']],
    ['end.wav', ['End']],
    ['pageup.wav', ['PageUp']],
    ['page_up.wav', ['PageUp']],
    ['pgup.wav', ['PageUp']],
    ['pagedown.wav', ['PageDown']],
    ['pgdn.wav', ['PageDown']],
    ['printscreen.wav', ['PrintScreen']],
    ['prtsc.wav', ['PrintScreen']],
    ['print.wav', ['PrintScreen']],
    ['scrolllock.wav', ['ScrollLock']],
    ['pause.wav', ['Pause']],
    ['break.wav', ['Pause']],
    ['up.wav', ['ArrowUp']],
    ['arrowup.wav', ['ArrowUp']],
    ['uparrow.wav', ['ArrowUp']],
    ['down.wav', ['ArrowDown']],
    ['arrow_down.wav', ['ArrowDown']],
    ['downarrow.wav', ['ArrowDown']],
    ['arrowleft.wav', ['ArrowLeft']],
    ['leftarrow.wav', ['ArrowLeft']],
    ['arrowright.wav', ['ArrowRight']],
    ['rightarrow.wav', ['ArrowRight']],
    ['left.wav', ['ArrowLeft']],
    ['right.wav', ['ArrowRight']],
  ])('%s is %j', (name, codes) => {
    expect(pressOf(name)).toEqual(codes);
  });

  it.each([
    ['`', 'Backquote'],
    ['-', 'Minus'],
    ['=', 'Equal'],
    ['[', 'BracketLeft'],
    [']', 'BracketRight'],
    [';', 'Semicolon'],
    ["'", 'Quote'],
    [',', 'Comma'],
    ['.', 'Period'],
  ])('reads the single character %s before stripping it', (name, code) => {
    expect(pressOf(`${name}.wav`)).toEqual([code]);
  });

  it('reads the name without its folder', () => {
    expect(pressOf('My Pack/sounds/a.wav')).toEqual(['KeyA']);
    expect(pressOf('C:\\packs\\space.wav')).toEqual(['Space']);
  });

  it('gives a name for both sides to both, and a sided name to one', () => {
    expect(pressOf('shift.wav')).toEqual(['ShiftLeft', 'ShiftRight']);
    expect(pressOf('ctrl.wav')).toEqual(['ControlLeft', 'ControlRight']);
    expect(pressOf('control.wav')).toEqual(['ControlLeft', 'ControlRight']);
    expect(pressOf('alt.wav')).toEqual(['AltLeft', 'AltRight']);
    expect(pressOf('option.wav')).toEqual(['AltLeft', 'AltRight']);
    for (const name of ['win', 'meta', 'cmd', 'command', 'super']) {
      expect(pressOf(`${name}.wav`)).toEqual(['MetaLeft', 'MetaRight']);
    }
    for (const name of ['shiftleft', 'leftshift', 'lshift', 'shiftl']) {
      expect(pressOf(`${name}.wav`)).toEqual(['ShiftLeft']);
    }
    for (const name of ['ShiftRight', 'right_shift', 'rshift', 'shiftr']) {
      expect(pressOf(`${name}.wav`)).toEqual(['ShiftRight']);
    }
    expect(pressOf('rctrl.wav')).toEqual(['ControlRight']);
    expect(pressOf('ControlLeft.wav')).toEqual(['ControlLeft']);
    expect(pressOf('lalt.wav')).toEqual(['AltLeft']);
    expect(pressOf('altr.wav')).toEqual(['AltRight']);
    expect(pressOf('winleft.wav')).toEqual(['MetaLeft']);
    expect(pressOf('MetaRight.wav')).toEqual(['MetaRight']);
  });

  it('matches no key the layout does not draw', () => {
    expect(matchKeyName('f13.wav', 'Keyboard')).toEqual({ kind: 'none' });
    expect(matchKeyName('notes.wav', 'Keyboard')).toEqual({ kind: 'none' });
  });

  it('does not take click names for mouse buttons', () => {
    for (const name of ['click.wav', 'click1.wav', 'tap-2.wav']) {
      expect(matchKeyName(name, 'Keyboard')).toEqual({ kind: 'none' });
      expect(matchKeyName(name, 'Mouse')).toEqual({ kind: 'none' });
    }
  });
});

describe('matchKeyName: mouse names', () => {
  it.each([
    ['left.wav', ['MouseLeft']],
    ['right.wav', ['MouseRight']],
    ['mouseleft.wav', ['MouseLeft']],
    ['left_click.wav', ['MouseLeft']],
    ['Left button.wav', ['MouseLeft']],
    ['lmb.wav', ['MouseLeft']],
    ['mouseright.wav', ['MouseRight']],
    ['rightclick.wav', ['MouseRight']],
    ['rightbutton.wav', ['MouseRight']],
    ['rmb.wav', ['MouseRight']],
    ['middle.wav', ['MouseMiddle']],
    ['mousemiddle.wav', ['MouseMiddle']],
    ['middleclick.wav', ['MouseMiddle']],
    ['wheelclick.wav', ['MouseMiddle']],
    ['mmb.wav', ['MouseMiddle']],
    ['wheel.wav', ['MouseWheelUp', 'MouseWheelDown']],
    ['scroll.wav', ['MouseWheelUp', 'MouseWheelDown']],
    ['wheelup.wav', ['MouseWheelUp']],
    ['wheel_up.wav', ['MouseWheelUp']],
    ['scrollup.wav', ['MouseWheelUp']],
    ['mousewheelup.wav', ['MouseWheelUp']],
    ['wheeldown.wav', ['MouseWheelDown']],
    ['scroll-down.wav', ['MouseWheelDown']],
    ['mousewheeldown.wav', ['MouseWheelDown']],
    ['mouse4.wav', ['Mouse4']],
    ['button4.wav', ['Mouse4']],
    ['Mouse8.wav', ['Mouse8']],
    ['button 8.wav', ['Mouse8']],
    ['back.wav', ['Mouse4']],
    ['forward.wav', ['Mouse5']],
  ])('%s is %j in a mouse pack', (name, codes) => {
    expect(pressOf(name, 'Mouse')).toEqual(codes);
  });

  it('takes a lone digit on a mouse for no key at all', () => {
    expect(matchKeyName('1.wav', 'Mouse')).toEqual({ kind: 'none' });
    expect(matchKeyName('2.wav', 'Mouse')).toEqual({ kind: 'none' });
  });
});

describe('matchKeyName: the other kind of pack', () => {
  it('marks mouse-only names in a keyboard pack', () => {
    for (const name of ['mouseleft', 'lmb', 'wheel', 'wheelup', 'button4']) {
      expect(matchKeyName(`${name}.wav`, 'Keyboard').kind).toBe('other-kind');
    }
  });

  it('marks letters and key names in a mouse pack, but not digits', () => {
    for (const name of ['a', 'space', 'enter', 'digit1', 'num1', 'f1']) {
      expect(matchKeyName(`${name}.wav`, 'Mouse').kind).toBe('other-kind');
    }
    expect(matchKeyName('1.wav', 'Mouse').kind).toBe('none');
  });

  it('leaves names with two meanings unmatched, not of the other kind', () => {
    // Backspace or the Back button; Scroll Lock or the wheel.
    for (const name of ['back', 'forward', 'scroll', 'middle']) {
      expect(matchKeyName(`${name}.wav`, 'Keyboard')).toEqual({
        kind: 'none',
      });
    }
    // The wheel, or the press and release of one button.
    for (const name of ['up', 'down']) {
      expect(matchKeyName(`${name}.wav`, 'Mouse')).toEqual({ kind: 'none' });
    }
  });
});

describe('matchKeyName: press and release suffixes', () => {
  it('reads down and press as the key itself', () => {
    expect(pressOf('KeyA_down.wav')).toEqual(['KeyA']);
    expect(pressOf('space-press.wav')).toEqual(['Space']);
    expect(pressOf('enter pressed.wav')).toEqual(['Enter']);
    expect(pressOf('left_down.wav', 'Mouse')).toEqual(['MouseLeft']);
  });

  it('reads up and release as a release file', () => {
    expect(matchKeyName('KeyA_up.wav', 'Keyboard')).toEqual({
      kind: 'release',
      codes: ['KeyA'],
    });
    expect(matchKeyName('space-release.wav', 'Keyboard')).toEqual({
      kind: 'release',
      codes: ['Space'],
    });
    expect(matchKeyName('a released.wav', 'Keyboard').kind).toBe('release');
    expect(matchKeyName('left_up.wav', 'Mouse')).toEqual({
      kind: 'release',
      codes: ['MouseLeft'],
    });
  });

  it('does not split a name that is a key as a whole', () => {
    expect(pressOf('pageup.wav')).toEqual(['PageUp']);
    expect(pressOf('wheelup.wav', 'Mouse')).toEqual(['MouseWheelUp']);
    expect(pressOf('wheeldown.wav', 'Mouse')).toEqual(['MouseWheelDown']);
    expect(pressOf('arrow-up.wav')).toEqual(['ArrowUp']);
  });

  it('needs a separator before the suffix', () => {
    expect(matchKeyName('keyaup.wav', 'Keyboard')).toEqual({ kind: 'none' });
  });

  it('keeps a suffixed name of the other kind of pack apart', () => {
    expect(matchKeyName('KeyA_up.wav', 'Mouse')).toEqual({
      kind: 'other-kind',
      codes: ['KeyA'],
    });
  });
});

describe('matchFilesToKeys', () => {
  const files = (...names: string[]) =>
    names.map((name, index) => ({ id: `s${index}`, name }));

  it('sorts files by what their names say', () => {
    const result = matchFilesToKeys(
      files(
        'space.wav',
        'a.wav',
        'KeyA_up.wav',
        'wheel.wav',
        'key_01.wav',
        'click1.wav',
      ),
      'Keyboard',
    );
    expect(result.matched).toEqual([
      { id: 's1', name: 'a.wav', codes: ['KeyA'] },
      { id: 's0', name: 'space.wav', codes: ['Space'] },
    ]);
    expect(result.release.map((file) => file.name)).toEqual(['KeyA_up.wav']);
    expect(result.otherKind.map((file) => file.name)).toEqual(['wheel.wav']);
    expect(result.unmatched.map((file) => file.name)).toEqual([
      'click1.wav',
      'key_01.wav',
    ]);
  });

  it('lets a sided name win over a name for both sides', () => {
    const result = matchFilesToKeys(
      files('shift.wav', 'shiftright.wav'),
      'Keyboard',
    );
    expect(result.matched).toEqual([
      { id: 's0', name: 'shift.wav', codes: ['ShiftLeft'] },
      { id: 's1', name: 'shiftright.wav', codes: ['ShiftRight'] },
    ]);
    expect(result.unmatched).toEqual([]);
  });

  it('gives a key named twice to the first file in name order', () => {
    const result = matchFilesToKeys(
      files('KeyA.wav', 'a.wav', 'a_down.wav'),
      'Keyboard',
    );
    expect(result.matched).toEqual([
      { id: 's1', name: 'a.wav', codes: ['KeyA'] },
    ]);
    expect(result.unmatched.map((file) => file.name)).toEqual([
      'a_down.wav',
      'KeyA.wav',
    ]);
  });

  it('splits the wheel between a name for both and a name for one', () => {
    const result = matchFilesToKeys(files('wheel.wav', 'wheelup.wav'), 'Mouse');
    expect(result.matched).toEqual([
      { id: 's0', name: 'wheel.wav', codes: ['MouseWheelDown'] },
      { id: 's1', name: 'wheelup.wav', codes: ['MouseWheelUp'] },
    ]);
  });

  it('loses a name for both sides entirely when each side has its own', () => {
    const result = matchFilesToKeys(
      files('ctrl.wav', 'lctrl.wav', 'rctrl.wav'),
      'Keyboard',
    );
    expect(result.matched.map((file) => file.name)).toEqual([
      'lctrl.wav',
      'rctrl.wav',
    ]);
    expect(result.unmatched.map((file) => file.name)).toEqual(['ctrl.wav']);
  });

  it('matches nothing when no name is a key', () => {
    const result = matchFilesToKeys(
      files('key_02.wav', 'key_10.wav', 'key_01.wav'),
      'Keyboard',
    );
    expect(result.matched).toEqual([]);
    expect(result.unmatched.map((file) => file.name)).toEqual([
      'key_01.wav',
      'key_02.wav',
      'key_10.wav',
    ]);
  });
});

describe('guessPackType', () => {
  it('takes names that are all mouse buttons for a mouse pack', () => {
    expect(guessPackType(['left.wav', 'wheel.wav'])).toBe('Mouse');
    expect(guessPackType(['left.wav'])).toBe('Mouse');
    expect(guessPackType(['left.wav', 'right.wav', 'mouse4.wav'])).toBe(
      'Mouse',
    );
    expect(guessPackType(['left_down.wav', 'left_up.wav'])).toBe('Mouse');
  });

  it('takes names that are all keys for a keyboard pack', () => {
    expect(guessPackType(['a.wav', 'space.wav', 'enter.mp3'])).toBe('Keyboard');
    // Beside key names, left and right are the arrow keys.
    expect(guessPackType(['left.wav', 'a.wav'])).toBe('Keyboard');
    expect(guessPackType(['KeyA_down.wav', 'KeyA_up.wav'])).toBe('Keyboard');
  });

  it('asks when the names mix kinds or are not all keys', () => {
    expect(guessPackType(['a.wav', 'wheel.wav'])).toBeNull();
    expect(guessPackType(['a.wav', 'notes.wav'])).toBeNull();
    expect(guessPackType(['click1.wav', 'click2.wav'])).toBeNull();
    // Model O: two buttons and their releases under names of its own.
    expect(guessPackType(['1.wav', '2.wav', 'R2.wav', 'R3.wav'])).toBeNull();
    expect(guessPackType([])).toBeNull();
  });

  it('lets names with two meanings decide nothing', () => {
    expect(guessPackType(['back.wav', 'forward.wav'])).toBeNull();
    expect(guessPackType(['up.wav', 'down.wav'])).toBeNull();
    expect(guessPackType(['scroll.wav', 'middle.wav'])).toBeNull();
    expect(guessPackType(['a.wav', 'back.wav'])).toBe('Keyboard');
    expect(guessPackType(['wheel.wav', 'up.wav'])).toBe('Mouse');
    expect(guessPackType(['left.wav', 'back.wav'])).toBe('Mouse');
  });
});

describe('keyLabel', () => {
  it.each([
    ['KeyA', 'A'],
    ['Digit1', '1'],
    ['Backquote', '`'],
    ['Backslash', '\\'],
    ['Space', 'Space'],
    ['Escape', 'Esc'],
    ['ShiftLeft', 'Left Shift'],
    ['ShiftRight', 'Right Shift'],
    ['ControlRight', 'Right Ctrl'],
    ['MetaLeft', 'Left Win'],
    ['AltRight', 'Right Alt'],
    ['Numpad1', 'Num 1'],
    ['NumpadEnter', 'Num Enter'],
    ['NumpadDecimal', 'Num .'],
    ['NumLock', 'Num Lock'],
    ['Enter', 'Enter'],
    ['Pause', 'Pause'],
    ['PageUp', 'PgUp'],
    ['ContextMenu', 'Menu'],
    ['MouseLeft', 'Left button'],
    ['MouseWheelUp', 'Wheel up'],
    ['Mouse4', 'Button 4'],
  ])('reads %s as %s', (code, label) => {
    expect(keyLabel(code)).toBe(label);
  });

  it('reads a code no layout draws as itself', () => {
    expect(keyLabel('F13')).toBe('F13');
  });
});
