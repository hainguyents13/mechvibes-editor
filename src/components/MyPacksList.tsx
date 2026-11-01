import { Package } from 'lucide-react';
import { useId, useState } from 'react';
import {
  canOpenPack,
  type LibraryPackSummary,
  packPageUrl,
} from '@/lib/websiteApi';

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

/** The visitor's library packs, each to open here or see on the website. */
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
  const statusIdPrefix = useId();
  if (packs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-base-content/60">
        You have no packs in the library yet.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-base-300">
      {packs.map((pack, index) => {
        const pageUrl = packPageUrl(pack);
        return (
          <li key={pack.id} className="flex items-center gap-3 py-3">
            <PackIcon url={pack.iconUrl} />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{pack.name}</p>
              {/* Also read with the button, so it says why it cannot open. */}
              <div id={`${statusIdPrefix}-${index}`}>
                <p className="text-xs text-base-content/60">
                  {statusLabel(pack)}
                </p>
                {pack.status === 'REMOVED' && pack.removedReason && (
                  <p className="text-xs text-error-strong">
                    {pack.removedReason}
                  </p>
                )}
              </div>
            </div>
            {/* Every row has the same buttons, so the name tells them apart. */}
            {pageUrl && (
              <a
                href={pageUrl}
                target="_blank"
                rel="noopener"
                aria-label={`View details of ${pack.name}`}
                className="btn btn-sm btn-ghost rounded-box shrink-0"
              >
                View details
              </a>
            )}
            <button
              type="button"
              onClick={() => onOpen(pack)}
              disabled={!canOpenPack(pack) || openingId !== null}
              aria-label={
                openingId === pack.id
                  ? `Opening ${pack.name}`
                  : `Open to edit: ${pack.name}`
              }
              aria-describedby={`${statusIdPrefix}-${index}`}
              className="btn btn-sm rounded-box shrink-0 min-w-[6.75rem]"
            >
              {openingId === pack.id ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                'Open to edit'
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
