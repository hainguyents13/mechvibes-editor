// Rules shared by the editor's page-wide keyboard shortcuts.

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/** Whether a key event goes to a field that edits text, where Ctrl+Z, Delete or Space edit the text instead. */
export function isTextEntry(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }
  return (
    target instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(target.type)
  );
}

/** Controls that Space operates when they have focus. */
const SPACE_OPERATED =
  'input:not([type="range"]), button, a[href], summary, [role="button"]';

/**
 * Whether Space operates the focused control rather than playing the sound:
 * buttons, links, checkboxes and the like. Keyboard keys and mouse buttons
 * take Enter, and a range slider ignores Space, so Space still plays after
 * either.
 */
export function spaceOperatesTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-key-id]')) return false;
  return target.closest(SPACE_OPERATED) !== null;
}

/** Whether a popover is open. A browser without popovers has none open. */
function isPopoverOpen() {
  try {
    return document.querySelector(':popover-open') !== null;
  } catch {
    return false;
  }
}

/** Whether a dialog, a popover or the guided tour is open; it owns the keyboard. */
function isOverlayOpen() {
  return (
    document.querySelector('.modal-open, dialog[open], .driver-popover') !==
      null || isPopoverOpen()
  );
}

/** Whether a page-wide shortcut should leave this key press alone. */
export function shouldIgnoreShortcut(
  event: Pick<KeyboardEvent, 'defaultPrevented' | 'isComposing' | 'target'>,
) {
  return (
    event.defaultPrevented ||
    event.isComposing ||
    isTextEntry(event.target) ||
    isOverlayOpen()
  );
}
