import { useEffect } from 'react';
import { plural } from '@/lib/utils';
import { listKeys, type PackType } from '@/utils/soundPack';

/** Asks what to do with sounds the new pack type neither shows nor plays. */
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
  useEffect(() => {
    if (!packType) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [packType, onCancel]);

  if (!packType) return null;

  const type = packType.toLowerCase();
  const n = codes.length;
  const them = n === 1 ? 'it' : 'them';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold">Switch to a {type} pack?</h2>
        <p className="text-sm text-base-content/70 mt-2">
          {plural(n, packType === 'Mouse' ? 'keyboard key' : 'mouse button')} in
          this pack {n === 1 ? 'has' : 'have'} a sound: {listKeys(codes)}. A{' '}
          {type} pack does not show or play {them}.
        </p>
        <p className="text-sm text-base-content/70 mt-2">
          Keep {them} to get {them} back if you switch again. Kept sounds are
          still exported.
        </p>
        <div className="flex justify-end space-x-2 mt-6">
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
    </div>
  );
}
