import { describe, expect, it } from 'vitest';
import { KEY_GROUPS } from './key-groups';
import { keyboardLayouts, parseKeyboardLayout } from './keyboardLayouts';

/** The codes of the keys a group picks on a layout. */
function groupCodes(groupId: string, layout: 'fullsize' | 'tkl' | 'compact') {
  const group = KEY_GROUPS.find((entry) => entry.id === groupId);
  if (!group) throw new Error(`No group ${groupId}`);
  return parseKeyboardLayout(keyboardLayouts[layout])
    .filter((key) => group.matches(key))
    .map((key) => key.code);
}

describe('key groups', () => {
  it.each([
    ['fullsize', { letters: 26, numbers: 20, function: 12, modifiers: 12 }],
    ['tkl', { letters: 26, numbers: 10, function: 12, modifiers: 12 }],
    ['compact', { letters: 26, numbers: 10, function: 0, modifiers: 11 }],
  ] as const)('pick the expected number of keys on %s', (layout, counts) => {
    expect(
      Object.fromEntries(
        KEY_GROUPS.map((group) => [
          group.id,
          groupCodes(group.id, layout).length,
        ]),
      ),
    ).toEqual(counts);
  });

  it('keeps navigation keys out of Numbers', () => {
    const codes = groupCodes('numbers', 'fullsize');
    for (const code of [
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Insert',
      'Delete',
    ]) {
      expect(codes).not.toContain(code);
    }
  });

  it('covers both sides in Mod keys', () => {
    expect(groupCodes('modifiers', 'fullsize')).toEqual(
      expect.arrayContaining([
        'ShiftRight',
        'ControlRight',
        'AltRight',
        'MetaRight',
      ]),
    );
  });
});
