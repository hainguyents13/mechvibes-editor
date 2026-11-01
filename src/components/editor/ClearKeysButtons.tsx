import { RotateCcw } from 'lucide-react';
import React from 'react';
import { plural } from '@/lib/utils';
import type { KeySounds } from '@/utils/soundPack';

// Clear and Reset all, shared by the waveform's controls and the pane of a
// file of one sound.

/** Takes the press and release sounds off the selected keys (Delete does too). */
export function ClearSelectedButton({
  selectedCodes,
  keySounds,
  onClearSelected,
}: {
  selectedCodes: readonly string[];
  keySounds: KeySounds;
  onClearSelected: () => void;
}) {
  const withSound = selectedCodes.filter((code) => keySounds.has(code)).length;
  return (
    <div>
      <button
        type="button"
        className="btn btn-sm rounded-box"
        onClick={onClearSelected}
        disabled={withSound === 0}
        title="Remove the press and release sounds of the selected keys (Delete)"
      >
        Clear {plural(withSound, 'key')}
      </button>
    </div>
  );
}

/** Clears every key's sound, after asking. */
export function ResetAllButton({
  keySounds,
  hiddenCount,
  commitKeySounds,
}: {
  keySounds: KeySounds;
  /** Mapped keys the current layout does not draw; Reset all clears them too. */
  hiddenCount: number;
  /** Change the key sounds as one undoable step named `label`. */
  commitKeySounds: (
    label: string,
    update: (keySounds: KeySounds) => KeySounds,
  ) => void;
}) {
  const [showConfirm, setShowConfirm] = React.useState(false);
  return (
    <div className="ml-auto">
      <button
        type="button"
        className="btn btn-sm btn-error rounded-box"
        onClick={() => setShowConfirm(true)}
        disabled={keySounds.size === 0}
        title={`Clear the sound on all ${plural(keySounds.size, 'mapped key')}`}
      >
        <RotateCcw className="h-3 w-3" />
        Reset all ({keySounds.size})
      </button>

      {showConfirm && (
        <dialog
          className="modal modal-open"
          onClose={() => setShowConfirm(false)}
        >
          <div className="modal-box">
            <h3 className="text-base font-semibold">Reset all key mappings?</h3>
            <p className="py-3 text-sm text-base-content/70">
              This clears the sound on all{' '}
              {plural(keySounds.size, 'mapped key')}
              {hiddenCount > 0 &&
                `, including ${hiddenCount} not shown on this layout`}
              . The audio files themselves are kept. You can undo this.
            </p>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-sm rounded-box"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-error rounded-box"
                onClick={() => {
                  // An empty pack has nothing to reset, so no step.
                  commitKeySounds(
                    `Reset all ${plural(keySounds.size, 'key')}`,
                    (current) => (current.size === 0 ? current : new Map()),
                  );
                  setShowConfirm(false);
                }}
              >
                Reset all
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label="Close"
            onClick={() => setShowConfirm(false)}
          />
        </dialog>
      )}
    </div>
  );
}
