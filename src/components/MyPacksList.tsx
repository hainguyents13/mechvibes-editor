import { Package } from 'lucide-react';
import { useState } from 'react';
import { canOpenPack, type LibraryPackSummary } from '@/lib/websiteApi';

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

function statusLabel(pack: LibraryPackSummary) {
  if (pack.status === 'REMOVED') return 'Removed';
  if (pack.status === 'PUBLISHED')
    return `Published · revision ${pack.revision}`;
  return 'Draft, no zip yet';
}

/** The visitor's library packs, each with an Open button. */
export function MyPacksList({
  packs,
  openingId,
  onOpen,
}: {
  packs: LibraryPackSummary[];
  /** Pack whose zip is being downloaded, if any. */
  openingId: string | null;
  onOpen: (pack: LibraryPackSummary) => void;
}) {
  if (packs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-base-content/60">
        You have no packs in the library yet.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-base-300">
      {packs.map((pack) => (
        <li key={pack.id} className="flex items-center gap-3 py-3">
          <PackIcon url={pack.iconUrl} />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{pack.name}</p>
            <p className="text-xs text-base-content/60">{statusLabel(pack)}</p>
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
  );
}
