import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReturnFocus } from '@/hooks/useReturnFocus';
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
      {index > 0 && <span className="text-mv-faint">+</span>}
      <kbd className="inline-flex h-5 items-center rounded-[4px] bg-mv-fill px-1.5 font-code text-[11px] font-medium text-mv-muted">
        {key}
      </kbd>
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
  const returnFocus = useReturnFocus();
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        {...returnFocus}
        aria-describedby={undefined}
        className="p-[22px]"
      >
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-sm">
          {shortcuts.map(([keys, text]) => (
            <div key={text} className="contents">
              <dt className="flex items-center gap-1 whitespace-nowrap text-xs">
                <Keys keys={keys} />
              </dt>
              <dd className="m-0 text-mv-text">{text}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
