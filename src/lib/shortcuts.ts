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

/** Whether a dialog or the guided tour is open; it owns the keyboard. */
function isOverlayOpen() {
  return document.querySelector('.modal-open, .driver-popover') !== null;
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
