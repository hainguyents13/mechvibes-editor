import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReturnFocus } from '@/hooks/useReturnFocus';

/**
 * Asks before work is lost. A modal dialog: the page behind it cannot be
 * reached until it closes, focus starts on the safe choice, and Esc cancels.
 * Closing it hands focus back to where it was.
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
  const returnFocus = useReturnFocus();
  return (
    // Esc and a click beside it count as the safe choice.
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        {...returnFocus}
        className="w-[min(400px,calc(100vw-32px))] p-[22px]"
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="text-sm [overflow-wrap:anywhere]">
          {message}
        </DialogDescription>
        {/* The safe choice comes first, so it takes the focus. */}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmTone === 'primary' ? 'primary' : 'danger'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
