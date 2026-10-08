/**
 * Named key groups for bulk-applying a time segment.
 *
 * Groups match on a key's label, which is the same string used to build its id
 * (`${label}-${index}-${x}-${y}`), so a group can be resolved against whatever
 * layout is currently rendered.
 */

/** Labels are multi-line for dual-legend keys, e.g. "!\n1" — test every line. */
const labelLines = (label: string): string[] => label.split('\n');

const MODIFIER_LABELS = new Set([
  'Ctrl',
  'Shift',
  'Alt',
  'Win',
  'Menu',
  'Caps Lock',
  'Tab',
  'Esc',
]);

export interface KeyGroup {
  id: string;
  label: string;
  /** Example keys shown beside the label, e.g. "A-Z". */
  hint: string;
  /** Decide whether a key belongs to this group. */
  matches: (key: { label?: string }) => boolean;
}

export const KEY_GROUPS: KeyGroup[] = [
  {
    id: 'letters',
    label: 'Letter keys',
    hint: 'A-Z',
    matches: (key) => /^[A-Z]$/.test(key.label ?? ''),
  },
  {
    id: 'numbers',
    label: 'Numbers',
    hint: '0-9',
    // Number row keys carry their symbol above the digit ("!\n1"); numpad keys
    // are bare digits or digit+function ("7\nHome").
    matches: (key) =>
      labelLines(key.label ?? '').some((line) => /^[0-9]$/.test(line)),
  },
  {
    id: 'function',
    label: 'F(x) keys',
    hint: 'F1, F2, F3…',
    matches: (key) => /^F([1-9]|1[0-2])$/.test(key.label ?? ''),
  },
  {
    id: 'modifiers',
    label: 'Mod keys',
    hint: 'Ctrl, Shift, Alt…',
    matches: (key) => MODIFIER_LABELS.has(key.label ?? ''),
  },
];
