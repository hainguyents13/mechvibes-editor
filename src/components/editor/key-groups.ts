/**
 * Named key groups for bulk-applying a time segment.
 *
 * Groups match on a key's code, so a group resolves against whatever layout is
 * rendered.
 */

const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'ContextMenu',
  'CapsLock',
  'Tab',
  'Escape',
]);

export interface KeyGroup {
  id: string;
  label: string;
  /** Example keys shown beside the label, e.g. "A-Z". */
  hint: string;
  /** Decide whether a key belongs to this group. */
  matches: (key: { code: string }) => boolean;
}

export const KEY_GROUPS: KeyGroup[] = [
  {
    id: 'letters',
    label: 'Letter keys',
    hint: 'A-Z',
    matches: (key) => /^Key[A-Z]$/.test(key.code),
  },
  {
    id: 'numbers',
    label: 'Numbers',
    hint: '0-9',
    // Number row and numpad digits, not the numpad's navigation legends.
    matches: (key) => /^(Digit|Numpad)[0-9]$/.test(key.code),
  },
  {
    id: 'function',
    label: 'F(x) keys',
    hint: 'F1, F2, F3…',
    matches: (key) => /^F([1-9]|1[0-2])$/.test(key.code),
  },
  {
    id: 'modifiers',
    label: 'Mod keys',
    hint: 'Ctrl, Shift, Alt…',
    matches: (key) => MODIFIER_CODES.has(key.code),
  },
];
