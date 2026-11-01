import { useEffect, useId, useRef } from 'react';
import { MOD_LABEL } from '@/lib/utils';

// Every selection shortcut of the keyboard and the mouse drawing.
const ALL_SHORTCUTS: [string[], string][] = [
  [['Click'], 'Select a key, or deselect the only selected key'],
  [[MOD_LABEL, 'Click'], 'Add or remove a key'],
  [['Shift', 'Click'], 'Select a range of keys'],
  [['Drag'], 'Select keys in a box'],
  [['Shift', 'Drag'], 'Add keys in a box'],
  [[MOD_LABEL, 'A'], 'Select all keys'],
  [['Arrows'], 'Move between keys'],
  [['Enter'], 'Select or deselect the focused key'],
  [['Delete'], 'Clear the sound of the selected keys'],
  [['Esc'], 'Deselect all'],
];

function Keys({ keys }: { keys: string[] }) {
  return keys.map((key, index) => (
    <span key={key} className="contents">
      {index > 0 && <span>+</span>}
      <kbd className="kbd kbd-xs">{key}</kbd>
    </span>
  ));
}

/**
 * The selection shortcuts, opened from the Help menu. A modal dialog, so the
 * shortcuts it lists stay off while it is open, and focus goes back to where
 * it was.
 */
export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
  isMousePack,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** A mouse pack has buttons rather than keys. */
  isMousePack: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // The mouse drawing has buttons, and no box to drag.
  const shortcuts = isMousePack
    ? ALL_SHORTCUTS.filter(([keys]) => !keys.includes('Drag')).map(
        ([keys, text]): [string[], string] => [
          keys,
          text.replace(/\bkey/g, 'button'),
        ],
      )
    : ALL_SHORTCUTS;

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClose={onClose}
    >
      {isOpen && (
        <div className="modal-box max-w-md">
          <h2 id={titleId} className="text-lg font-semibold">
            Keyboard shortcuts
          </h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {shortcuts.map(([keys, text]) => (
              <div key={text} className="contents">
                <dt className="flex items-center gap-1 whitespace-nowrap text-xs">
                  <Keys keys={keys} />
                </dt>
                <dd className="text-base-content/80">{text}</dd>
              </div>
            ))}
          </dl>
          <div className="modal-action">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-sm rounded-box"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
    </dialog>
  );
}
