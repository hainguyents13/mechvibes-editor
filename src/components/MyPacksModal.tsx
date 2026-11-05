import { X } from '@/components/icons';
import { MyPacksList } from '@/components/MyPacksList';
import { TEXT_LINK_CLASS } from '@/components/start/StartPage';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReturnFocus } from '@/hooks/useReturnFocus';
import { cn } from '@/lib/utils';
import type { LibraryPackSummary, LibraryUser } from '@/lib/websiteApi';

interface MyPacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: LibraryUser;
  packs: LibraryPackSummary[];
  /** Pack whose zip is being downloaded, if any. */
  openingId: string | null;
  onOpen: (pack: LibraryPackSummary) => void;
  newPackUrl: string;
}

export function MyPacksModal({
  isOpen,
  onClose,
  user,
  packs,
  openingId,
  onOpen,
  newPackUrl,
}: MyPacksModalProps) {
  const returnFocus = useReturnFocus();
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        {...returnFocus}
        className="flex max-h-[85vh] w-[min(512px,calc(100vw-32px))] flex-col overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-mv-line pt-[18px] pr-14 pb-3.5 pl-5">
          <DialogTitle className="mb-0 text-xl tracking-[-0.015em]">
            My packs
          </DialogTitle>
          <DialogDescription className="truncate text-xs">
            Signed in as {user.name}
          </DialogDescription>
        </div>

        <div className="min-h-0 overflow-y-auto px-5">
          <MyPacksList packs={packs} openingId={openingId} onOpen={onOpen} />
        </div>

        <p className="m-0 shrink-0 border-t border-mv-line bg-mv-raised px-5 py-3.5 text-[13px] text-mv-muted">
          A new pack starts here: export its zip, then{' '}
          <a
            href={newPackUrl}
            target="_blank"
            rel="noopener"
            className={TEXT_LINK_CLASS}
          >
            create it on the website
          </a>
          .
        </p>

        {/* Last, so the focus starts on the first pack rather than here. */}
        <DialogClose
          aria-label="Close"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
            'absolute top-4 right-4',
          )}
        >
          <X className="size-4" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
