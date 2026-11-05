import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReturnFocus } from '@/hooks/useReturnFocus';
import { plural } from '@/lib/utils';
import { listKeys, type PackType } from '@/utils/soundPack';

/**
 * Asks what to do with sounds the new pack type neither shows nor plays. A
 * modal dialog: the page behind it cannot be reached until it closes, and
 * focus goes back to the pack-type button.
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
  const type = packType?.toLowerCase();
  const n = codes.length;
  const them = n === 1 ? 'it' : 'them';
  const returnFocus = useReturnFocus();

  return (
    // Esc closes it, which counts as Cancel. It closes on the key press, so
    // the page owns the keyboard again before the next one.
    <Dialog
      open={packType !== null}
      onOpenChange={(open) => !open && onCancel()}
    >
      {packType && (
        <DialogContent {...returnFocus} className="p-[22px]">
          <DialogTitle>Switch to a {type} pack?</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-2 text-sm">
              <p className="m-0">
                {plural(
                  n,
                  packType === 'Mouse' ? 'keyboard key' : 'mouse button',
                )}{' '}
                in this pack {n === 1 ? 'has' : 'have'} a sound:{' '}
                {listKeys(codes)}. A {type} pack does not show or play {them}.
              </p>
              <p className="m-0">
                Keep {them} to get {them} back if you switch again. Kept sounds
                are still exported.
              </p>
            </div>
          </DialogDescription>
          {/* Three choices may not fit a phone's width on one line. */}
          <DialogFooter className="flex-wrap">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={onKeep}>
              Keep {them}
            </Button>
            <Button variant="danger" onClick={onRemove}>
              Remove {plural(n, 'sound')}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
