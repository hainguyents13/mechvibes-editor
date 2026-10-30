import { Package, X } from 'lucide-react';
import { useState } from 'react';
import type { LibraryPackSummary, LibraryUser } from '@/lib/websiteApi';

/** The pack's icon, or a placeholder when it has none or it fails to load. */
function PackIcon({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-box bg-base-200 object-cover"
      />
    );
  }
  return (
    <div className="h-10 w-10 shrink-0 rounded-box bg-base-200 flex items-center justify-center">
      <Package className="h-5 w-5 text-base-content/40" />
    </div>
  );
}

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

/** Only a published pack has a zip to open; a removed one is off limits. */
export function canOpenPack(pack: LibraryPackSummary) {
  return pack.status === 'PUBLISHED' && pack.revision > 0;
}

function statusLabel(pack: LibraryPackSummary) {
  if (pack.status === 'REMOVED') return 'Removed';
  if (pack.status === 'PUBLISHED')
    return `Published · revision ${pack.revision}`;
  return 'Draft, no zip yet';
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
          {packs.length === 0 ? (
            <p className="py-8 text-center text-sm text-base-content/60">
              You have no packs in the library yet.
            </p>
          ) : (
            <ul className="divide-y divide-base-300">
              {packs.map((pack) => (
                <li key={pack.id} className="flex items-center gap-3 py-3">
                  <PackIcon url={pack.iconUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{pack.name}</p>
                    <p className="text-xs text-base-content/60">
                      {statusLabel(pack)}
                    </p>
                    {pack.status === 'REMOVED' && pack.removedReason && (
                      <p className="text-xs text-error">{pack.removedReason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpen(pack)}
                    disabled={!canOpenPack(pack) || openingId !== null}
                    className="btn btn-sm rounded-box shrink-0"
                  >
                    {openingId === pack.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      'Open'
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
