import { useEffect, useId, useRef } from 'react';
import { plural } from '@/lib/utils';
import { listKeys, type PackType } from '@/utils/soundPack';

/**
 * Asks what to do with sounds the new pack type neither shows nor plays. A
 * modal dialog: the page behind it cannot be reached until it closes, and
 * focus goes back to where it was.
 */
export function ConfirmPackTypeModal({
  packType,
  codes,
  onCancel,
  onKeep,
  onRemove,
}: {
  /** The type being switched to; null hides the dialog. */
  packType: PackType | null;
  /** Mapped codes the new type neither shows nor plays. */
  codes: string[];
  onCancel: () => void;
  onKeep: () => void;
  onRemove: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Stays in the page, so closing it hands focus back to the pack-type button.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (packType && !dialog.open) dialog.showModal();
    else if (!packType && dialog.open) dialog.close();
  }, [packType]);

  const type = packType?.toLowerCase();
  const n = codes.length;
  const them = n === 1 ? 'it' : 'them';

  return (
    // Esc closes it, which counts as Cancel. The cancel event comes with the
    // key press, so the page owns the keyboard again before the next one.
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onCancel={onCancel}
      onClose={onCancel}
    >
      {packType && (
        <div className="modal-box max-w-md">
          <h2 id={titleId} className="text-lg font-semibold">
            Switch to a {type} pack?
          </h2>
          <p className="text-sm text-base-content/70 mt-2">
            {plural(n, packType === 'Mouse' ? 'keyboard key' : 'mouse button')}{' '}
            in this pack {n === 1 ? 'has' : 'have'} a sound: {listKeys(codes)}.
            A {type} pack does not show or play {them}.
          </p>
          <p className="text-sm text-base-content/70 mt-2">
            Keep {them} to get {them} back if you switch again. Kept sounds are
            still exported.
          </p>
          <div className="modal-action">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-sm btn-ghost rounded-box"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onKeep}
              className="btn btn-sm rounded-box"
            >
              Keep {them}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="btn btn-sm btn-error rounded-box"
            >
              Remove {plural(n, 'sound')}
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
