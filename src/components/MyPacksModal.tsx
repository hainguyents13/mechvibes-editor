import { X } from 'lucide-react';
import { MyPacksList } from '@/components/MyPacksList';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">My packs</h2>
            <p className="text-xs text-base-content/60 truncate">
              Signed in as {user.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-sm btn-ghost btn-circle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4">
          <MyPacksList packs={packs} openingId={openingId} onOpen={onOpen} />
        </div>

        <p className="p-4 border-t border-base-300 text-xs text-base-content/60">
          A new pack starts here: export its zip, then{' '}
          <a href={newPackUrl} target="_blank" rel="noopener" className="link">
            create it on the website
          </a>
          .
        </p>
      </div>
    </div>
  );
}
