export function ConfirmDiscardModal({
  isOpen,
  onCancel,
  onConfirm,
  title = 'Discard changes?',
  message = 'Changes you have not exported or updated will be lost.',
  cancelLabel = 'Cancel',
  confirmLabel = 'Discard',
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-base-content/70 mt-2">{message}</p>
        <div className="flex justify-end space-x-2 mt-6">
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
            className="btn btn-sm btn-error rounded-box"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
