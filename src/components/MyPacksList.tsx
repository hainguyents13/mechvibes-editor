import { useId, useState } from 'react';
import { Loader, Package } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
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
        className="size-10 shrink-0 rounded-[10px] bg-mv-fill object-cover"
      />
    );
  }
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-mv-fill">
      <Package className="size-5 text-mv-faint" />
    </div>
  );
}

function statusBadge(pack: LibraryPackSummary) {
  if (pack.status === 'REMOVED') return 'Removed';
  if (pack.status === 'PUBLISHED') return 'Published';
  return 'Draft';
}

function statusDetail(pack: LibraryPackSummary) {
  if (pack.status === 'PUBLISHED') return `revision ${pack.revision}`;
  if (pack.status === 'REMOVED') return null;
  return 'no zip yet';
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
      <p className="m-0 py-8 text-center text-sm text-mv-subtle">
        You have no packs in the library yet.
      </p>
    );
  }
  return (
    <ul className="m-0 list-none p-0">
      {packs.map((pack, index) => {
        const pageUrl = packPageUrl(pack);
        const detail = statusDetail(pack);
        return (
          <li
            key={pack.id}
            className="flex items-center gap-3 py-3.5 not-last:shadow-[inset_0_-1px_0_var(--mv-line)]"
          >
            <PackIcon url={pack.iconUrl} />
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate font-bold text-mv-ink">{pack.name}</p>
              {/* Also read with the button, so it says why it cannot open. */}
              <div
                id={`${statusIdPrefix}-${index}`}
                className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1"
              >
                <Badge
                  variant="soft"
                  className={
                    pack.status === 'REMOVED'
                      ? 'bg-mv-danger-fill text-mv-danger'
                      : undefined
                  }
                >
                  {statusBadge(pack)}
                </Badge>
                {detail && (
                  <span className="font-code text-xs text-mv-subtle">
                    {detail}
                  </span>
                )}
                {pack.status === 'REMOVED' && pack.removedReason && (
                  <span className="text-xs text-mv-danger">
                    {pack.removedReason}
                  </span>
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
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
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
              className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} min-w-[6.75rem]`}
            >
              {openingId === pack.id ? (
                <Loader className="size-4 animate-spin" aria-hidden="true" />
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
