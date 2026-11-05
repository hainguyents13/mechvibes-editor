import React from 'react';
import { RotateCcw } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReturnFocus } from '@/hooks/useReturnFocus';
import { cn, plural } from '@/lib/utils';
import type { KeySounds } from '@/utils/soundPack';

// Clear and Reset all, shared by the waveform's controls and the pane of a
// file of one sound.

/** Takes the press and release sounds off the selected keys (Delete does too). */
export function ClearSelectedButton({
  selectedCodes,
  keySounds,
  onClearSelected,
  noun = 'key',
}: {
  selectedCodes: readonly string[];
  keySounds: KeySounds;
  onClearSelected: () => void;
  /** What the pack's keys are called: 'key' or 'button'. */
  noun?: string;
}) {
  const withSound = selectedCodes.filter((code) => keySounds.has(code)).length;
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-9')}
      onClick={onClearSelected}
      disabled={withSound === 0}
      title={`Remove the press and release sounds of the selected ${noun}s (Delete)`}
    >
      Clear {plural(withSound, noun)}
    </button>
  );
}

/** Clears every key's sound, after asking. */
export function ResetAllButton({
  keySounds,
  hiddenCount,
  commitKeySounds,
  noun = 'key',
}: {
  keySounds: KeySounds;
  /** Mapped keys the current layout does not draw; Reset all clears them too. */
  hiddenCount: number;
  /** Change the key sounds as one undoable step named `label`. */
  commitKeySounds: (
    label: string,
    update: (keySounds: KeySounds) => KeySounds,
  ) => void;
  /** What the pack's keys are called: 'key' or 'button'. */
  noun?: string;
}) {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const returnFocus = useReturnFocus();
  return (
    <>
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'ml-auto h-9 text-mv-muted',
        )}
        onClick={() => setShowConfirm(true)}
        disabled={keySounds.size === 0}
        title={`Clear the sound on all ${plural(keySounds.size, `mapped ${noun}`)}`}
      >
        <RotateCcw className="size-3.5" />
        Reset all ({keySounds.size})
      </button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent {...returnFocus}>
          <DialogHeader>
            <DialogTitle>Reset all {noun} mappings?</DialogTitle>
            <DialogDescription>
              This clears the sound on all{' '}
              {plural(keySounds.size, `mapped ${noun}`)}
              {hiddenCount > 0 &&
                `, including ${hiddenCount} not shown on this layout`}
              . The audio files themselves are kept. You can undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: 'outline' })}>
              Cancel
            </DialogClose>
            <button
              type="button"
              className={buttonVariants({ variant: 'danger' })}
              onClick={() => {
                // An empty pack has nothing to reset, so no step.
                commitKeySounds(
                  `Reset all ${plural(keySounds.size, noun)}`,
                  (current) => (current.size === 0 ? current : new Map()),
                );
                setShowConfirm(false);
              }}
            >
              Reset all
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
