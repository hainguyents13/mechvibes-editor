/**
 * Mapped codes the drawn layout leaves out, and the keyboard size an imported
 * pack calls for.
 */

import { MOUSE_CODE, type PackType } from '@/utils/soundPack';
import {
  type KeyboardSize,
  keyboardLayouts,
  type LayoutName,
  parseKeyboardLayout,
} from './keyboardLayouts';

const layoutCodes = new Map<LayoutName, Set<string>>();

/** Key codes a layout draws. */
export function getLayoutCodes(layout: LayoutName) {
  let codes = layoutCodes.get(layout);
  if (!codes) {
    codes = new Set(
      parseKeyboardLayout(keyboardLayouts[layout]).map((key) => key.code),
    );
    layoutCodes.set(layout, codes);
  }
  return codes;
}

export type HiddenKey =
  | { code: string; reason: 'bigger-layout'; layout: KeyboardSize }
  | { code: string; reason: 'not-a-mouse-button' | 'not-a-key' | 'no-layout' };

// Smallest first, so a key points at the smallest layout that draws it.
const KEYBOARD_SIZES: KeyboardSize[] = ['compact', 'tkl', 'fullsize'];

/** Mapped codes the layout does not draw, in mapping order, with why. */
export function findHiddenKeys(
  codes: Iterable<string>,
  layout: LayoutName,
): HiddenKey[] {
  const shown = getLayoutCodes(layout);
  const hidden: HiddenKey[] = [];
  for (const code of codes) {
    if (shown.has(code)) continue;
    const isMouse = MOUSE_CODE.test(code);
    if (layout === 'mouse') {
      hidden.push({
        code,
        reason: isMouse ? 'no-layout' : 'not-a-mouse-button',
      });
    } else if (isMouse) {
      hidden.push({ code, reason: 'not-a-key' });
    } else {
      const bigger = KEYBOARD_SIZES.find((size) =>
        getLayoutCodes(size).has(code),
      );
      hidden.push(
        bigger
          ? { code, reason: 'bigger-layout', layout: bigger }
          : { code, reason: 'no-layout' },
      );
    }
  }
  return hidden;
}

/** Codes a pack of this type neither draws nor plays: keys in a mouse pack, buttons in a keyboard pack. */
export function codesOfOtherKind(codes: Iterable<string>, packType: PackType) {
  return [...codes].filter(
    (code) => MOUSE_CODE.test(code) !== (packType === 'Mouse'),
  );
}

/**
 * The smallest keyboard size that draws every mapped key an imported pack has.
 * Codes no size draws (mouse buttons, F13) do not count; `current` when none is left.
 */
export function inferKeyboardSize(
  codes: Iterable<string>,
  current: KeyboardSize,
): KeyboardSize {
  const drawable = [...codes].filter((code) =>
    KEYBOARD_SIZES.some((size) => getLayoutCodes(size).has(code)),
  );
  if (drawable.length === 0) return current;
  return (
    KEYBOARD_SIZES.find((size) =>
      drawable.every((code) => getLayoutCodes(size).has(code)),
    ) ?? current
  );
}

/**
 * `current`, or the bigger size that draws keys just given a sound, so they
 * show on the keyboard rather than in the hidden-keys tray. Never smaller.
 */
export function widenKeyboardSize(
  codes: Iterable<string>,
  current: KeyboardSize,
): KeyboardSize {
  const needed = inferKeyboardSize(codes, current);
  return KEYBOARD_SIZES.indexOf(needed) > KEYBOARD_SIZES.indexOf(current)
    ? needed
    : current;
}
