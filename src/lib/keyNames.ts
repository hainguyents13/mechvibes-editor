import { getLayoutCodes } from '@/components/editor/hidden-keys';
import {
  keyboardLayouts,
  parseKeyboardLayout,
} from '@/components/editor/keyboardLayouts';
import { compareFileNames, MOUSE_CODE, type PackType } from '@/utils/soundPack';

// Which key or button a file is for, read from its name: a.wav is A,
// shiftright.wav is the right Shift, wheel.wav is both wheel directions.
// Names map to the codes the editor's layouts draw, so a matched file always
// lands on a key the person can see once the keyboard is big enough.

const KEYBOARD_CODES = getLayoutCodes('fullsize');
const MOUSE_CODES = getLayoutCodes('mouse');

// Names checked before anything is stripped, since they are the punctuation.
const PUNCTUATION_CODES: Record<string, string> = {
  '`': 'Backquote',
  '-': 'Minus',
  '=': 'Equal',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  ';': 'Semicolon',
  "'": 'Quote',
  ',': 'Comma',
  '.': 'Period',
};

const SIDES = { left: 'Left', right: 'Right' } as const;
const MODIFIERS: Record<string, string> = {
  shift: 'Shift',
  ctrl: 'Control',
  alt: 'Alt',
  win: 'Meta',
};

function buildNames() {
  const names = new Map<string, string[]>();
  const add = (codes: string | string[], ...aliases: string[]) => {
    for (const alias of aliases) {
      names.set(alias, Array.isArray(codes) ? codes : [codes]);
    }
  };
  // Every code names itself: KeyA, Numpad1, ShiftRight, MouseWheelUp.
  for (const code of [...KEYBOARD_CODES, ...MOUSE_CODES]) {
    add(code, code.toLowerCase());
  }
  for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
    add(`Key${letter.toUpperCase()}`, letter);
  }
  for (let digit = 0; digit <= 9; digit++) {
    add(`Digit${digit}`, `${digit}`);
    add(`Numpad${digit}`, `num${digit}`, `kp${digit}`);
  }
  add('NumpadEnter', 'numenter', 'kpenter');
  add('NumpadAdd', 'numplus');
  add('NumpadSubtract', 'numminus');
  add('NumpadMultiply', 'numstar');
  add('NumpadDivide', 'numslash');
  add('NumpadDecimal', 'numdot', 'numdel');
  add('Space', 'spacebar');
  add('Enter', 'return');
  add('Backspace', 'bksp');
  add('CapsLock', 'caps');
  add('Escape', 'esc');
  add('ContextMenu', 'menu');
  add('Backquote', 'grave', 'tilde');
  add('Minus', 'dash', 'hyphen');
  add('Equal', 'equals');
  add('BracketLeft', 'lbracket', 'leftbracket');
  add('BracketRight', 'rbracket', 'rightbracket');
  add('Backslash', 'pipe');
  add('Quote', 'apostrophe');
  add('Period', 'dot');
  add('Insert', 'ins');
  add('Delete', 'del');
  add('PageUp', 'pgup');
  add('PageDown', 'pgdn');
  add('PrintScreen', 'prtsc', 'print');
  add('Pause', 'break');
  add('ArrowUp', 'up', 'uparrow');
  add('ArrowDown', 'down', 'downarrow');
  add('ArrowLeft', 'leftarrow');
  add('ArrowRight', 'rightarrow');
  for (const [name, modifier] of Object.entries(MODIFIERS)) {
    add([`${modifier}Left`, `${modifier}Right`], name);
    for (const [side, Side] of Object.entries(SIDES)) {
      const s = side[0];
      add(
        `${modifier}${Side}`,
        `${name}${side}`,
        `${side}${name}`,
        `${s}${name}`,
        `${name}${s}`,
      );
    }
  }
  add(['ControlLeft', 'ControlRight'], 'control');
  add(['AltLeft', 'AltRight'], 'option');
  add(['MetaLeft', 'MetaRight'], 'meta', 'cmd', 'command', 'super');
  add('MouseLeft', 'leftclick', 'leftbutton', 'lmb');
  add('MouseRight', 'rightclick', 'rightbutton', 'rmb');
  add(
    'MouseMiddle',
    'middle',
    'middleclick',
    'middlebutton',
    'wheelclick',
    'mmb',
  );
  add(['MouseWheelUp', 'MouseWheelDown'], 'wheel', 'scroll');
  add('MouseWheelUp', 'wheelup', 'scrollup');
  add('MouseWheelDown', 'wheeldown', 'scrolldown');
  for (let button = 4; button <= 8; button++) {
    add(`Mouse${button}`, `button${button}`);
  }
  // Back and Forward are buttons 4 and 5 on most mice.
  add('Mouse4', 'back');
  add('Mouse5', 'forward');
  return names;
}

const NAMES = buildNames();

/**
 * Names that mean something else in the other kind of pack: Backspace or
 * Scroll Lock on a keyboard, the wheel or a press and release on a mouse.
 * In that pack they match nothing and say nothing about the pack's kind.
 */
const TWO_MEANING_NAMES: Record<PackType, ReadonlySet<string>> = {
  Keyboard: new Set(['back', 'forward', 'scroll', 'middle']),
  Mouse: new Set(['up', 'down']),
};

const isTwoMeaning = (name: string) =>
  TWO_MEANING_NAMES.Keyboard.has(name) || TWO_MEANING_NAMES.Mouse.has(name);

/** A file name without its folder and extension: "keys/KeyA_up.wav" is "KeyA_up". */
function baseName(fileName: string) {
  const name = fileName.slice(
    Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\')) + 1,
  );
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

/** Lower case, without `_`, `-` and spaces: "Shift_Right" is "shiftright". */
const normalize = (name: string) => name.toLowerCase().replace(/[\s_-]+/g, '');

const isMouseCodes = (codes: string[]) =>
  codes.every((code) => MOUSE_CODE.test(code));

/** The codes a name stands for in a pack of `packType`, of either kind. */
function codesForName(name: string, packType: PackType): string[] | null {
  if (PUNCTUATION_CODES[name]) return [PUNCTUATION_CODES[name]];
  const normalized = normalize(name);
  if (normalized === 'left' || normalized === 'right') {
    const side = SIDES[normalized];
    return [packType === 'Mouse' ? `Mouse${side}` : `Arrow${side}`];
  }
  if (TWO_MEANING_NAMES[packType].has(normalized)) return null;
  // A lone digit on a mouse is a button number, not a key.
  if (packType === 'Mouse' && /^\d$/.test(normalized)) return null;
  return NAMES.get(normalized) ?? null;
}

const SUFFIX = /^(.+?)[\s_-]+(down|pressed|press|up|released|release)$/i;

/**
 * What a file's name says it is for, in a pack of `packType`:
 * - `press`: the sound of `codes`, keys or buttons of this pack;
 * - `release`: the release of `codes` (KeyA_up.wav), which the app plays
 *   only from the press's own file, so it goes to no key;
 * - `other-kind`: keys in a mouse pack or buttons in a keyboard pack;
 * - `none`: no key's name.
 */
export type NameMatch =
  | { kind: 'press' | 'release' | 'other-kind'; codes: string[] }
  | { kind: 'none' };

export function matchKeyName(fileName: string, packType: PackType): NameMatch {
  const name = baseName(fileName);
  let codes = codesForName(name, packType);
  let isRelease = false;
  // A suffix counts only when the whole name is no key: pageup is PageUp.
  const suffixed = codes ? null : SUFFIX.exec(name);
  if (suffixed) {
    codes = codesForName(suffixed[1], packType);
    isRelease = /^(up|release|released)$/i.test(suffixed[2]);
  }
  if (!codes) return { kind: 'none' };
  if (isMouseCodes(codes) !== (packType === 'Mouse')) {
    return { kind: 'other-kind', codes };
  }
  return { kind: isRelease ? 'release' : 'press', codes };
}

/** A file to match by name, with the id it is known by. */
export type NamedFile = { id: string; name: string };

export type NameMatches = {
  /** Files with the codes each goes to, in name order. */
  matched: { id: string; name: string; codes: string[] }[];
  /** Release files (KeyA_up.wav), which go to no key. */
  release: NamedFile[];
  /** Files named for the other kind of pack. */
  otherKind: NamedFile[];
  /** Files that matched no key, or lost theirs to a closer name. */
  unmatched: NamedFile[];
};

/**
 * Match files to keys by name. When two files name one key, a name for one
 * side wins over a name for both (shiftright.wav over shift.wav on the right
 * Shift); between equal names, the first in name order wins. A file left
 * with no key is unmatched.
 */
export function matchFilesToKeys(
  files: readonly NamedFile[],
  packType: PackType,
): NameMatches {
  const ordered = [...files].sort((a, b) => compareFileNames(a.name, b.name));
  const result: NameMatches = {
    matched: [],
    release: [],
    otherKind: [],
    unmatched: [],
  };
  const presses: { file: NamedFile; codes: string[] }[] = [];
  for (const file of ordered) {
    const match = matchKeyName(file.name, packType);
    if (match.kind === 'press') presses.push({ file, codes: match.codes });
    else if (match.kind === 'release') result.release.push(file);
    else if (match.kind === 'other-kind') result.otherKind.push(file);
    else result.unmatched.push(file);
  }
  // Rank: a name for one key first, then name order.
  const owner = new Map<string, number>();
  const rank = (index: number) =>
    (presses[index].codes.length > 1 ? presses.length : 0) + index;
  presses.forEach(({ codes }, index) => {
    for (const code of codes) {
      const current = owner.get(code);
      if (current === undefined || rank(index) < rank(current)) {
        owner.set(code, index);
      }
    }
  });
  presses.forEach(({ file, codes }, index) => {
    const won = codes.filter((code) => owner.get(code) === index);
    if (won.length > 0) result.matched.push({ ...file, codes: won });
    else result.unmatched.push(file);
  });
  result.unmatched.sort((a, b) => compareFileNames(a.name, b.name));
  return result;
}

/**
 * The kind of pack dropped files are for, when their names say: every name
 * is a key or button of that kind. Lone `left` and `right` fit both and make
 * a mouse pack; beside key names they are the arrow keys. Names with two
 * meanings decide nothing. Null when the names do not tell.
 */
export function guessPackType(names: readonly string[]): PackType | null {
  const telling = names.filter((name) => {
    const base = baseName(name);
    const stem = SUFFIX.exec(base)?.[1] ?? base;
    return !isTwoMeaning(normalize(base)) && !isTwoMeaning(normalize(stem));
  });
  if (telling.length === 0) return null;
  const fits = (packType: PackType) =>
    telling.every((name) => {
      const { kind } = matchKeyName(name, packType);
      return kind === 'press' || kind === 'release';
    });
  if (fits('Mouse')) return 'Mouse';
  return fits('Keyboard') ? 'Keyboard' : null;
}

function buildLabels() {
  const labels = new Map<string, string>();
  for (const layout of [keyboardLayouts.fullsize, keyboardLayouts.mouse]) {
    for (const { code, label } of parseKeyboardLayout(layout)) {
      if (labels.has(code)) continue;
      const [top, bottom] = label.split('\n');
      let text = bottom !== undefined && top.length === 1 ? bottom : top;
      if (code.startsWith('Numpad')) text = `Num ${top}`;
      else if (/^(Shift|Control|Alt|Meta)(Left|Right)$/.test(code)) {
        text = `${code.endsWith('Left') ? 'Left' : 'Right'} ${top}`;
      } else if (code === 'Space') text = 'Space';
      labels.set(code, text);
    }
  }
  return labels;
}

const LABELS = buildLabels();

/**
 * A key or button as the layout draws it, for text: "A", "Right Shift",
 * "Num 1", "Left button". A code no layout draws reads as itself.
 */
export function keyLabel(code: string) {
  return LABELS.get(code) ?? code;
}
