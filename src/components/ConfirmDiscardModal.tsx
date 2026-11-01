import { useEffect, useId, useRef } from 'react';

/**
 * Asks before work is lost. A modal dialog: the page behind it cannot be
 * reached until it closes, focus starts on the safe choice, and Esc cancels.
 */
export function ConfirmDiscardModal({
  isOpen,
  onCancel,
  onConfirm,
  title = 'Discard changes?',
  message = 'Changes you have not downloaded or updated will be lost.',
  cancelLabel = 'Cancel',
  confirmLabel = 'Discard',
  confirmTone = 'error',
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  /** The confirm button's colour: red for losing work, primary for a choice that loses none. */
  confirmTone?: 'error' | 'primary';
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  // Stays in the page, so closing it hands focus back to where it was.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    // Esc closes it, which counts as the safe choice.
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={onCancel}
      onClose={onCancel}
    >
      {isOpen && (
        <div className="modal-box max-w-sm">
          <h2 id={titleId} className="text-lg font-semibold break-words">
            {title}
          </h2>
          <p
            id={messageId}
            className="text-sm text-base-content/70 mt-2 break-words"
          >
            {message}
          </p>
          {/* The safe choice comes first, so it takes the focus. */}
          <div className="modal-action">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-sm btn-ghost rounded-box"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`btn btn-sm rounded-box ${confirmTone === 'primary' ? 'btn-primary' : 'btn-error'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close"
        onClick={onCancel}
      />
    </dialog>
  );
}
