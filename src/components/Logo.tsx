import { editorRepoUrl, siteIdentity, websiteUrl } from '@/config/siteIdentity';

/**
 * mechvibes.com's mark and name, linking to the site, then the editor's badge
 * and version. `compact` keeps just the mark and badge below xl, where the
 * open pack's controls need the room.
 */
export const Logo = ({ compact = false }: { compact?: boolean }) => {
  const wide = compact ? 'hidden xl:inline-flex' : 'inline-flex';

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener"
        aria-label={`${siteIdentity.productName} website`}
        className="flex shrink-0 items-center gap-2.5 text-mv-ink no-underline"
      >
        <img
          src="/logo-mark.png"
          alt=""
          width={30}
          height={30}
          className="size-[30px]"
        />
        <span
          className={`${wide} font-display text-[17px] font-extrabold tracking-[-0.02em]`}
        >
          {siteIdentity.productName}
        </span>
      </a>
      <span className="inline-flex h-[22px] items-center rounded-md bg-mv-fill px-2 font-code text-[11px] font-bold uppercase tracking-[0.08em] text-mv-ink">
        Editor
      </span>
      {/* The releases page rather than this version's own, which is missing
          while its release is still a draft. */}
      <a
        href={`${editorRepoUrl}/releases`}
        target="_blank"
        rel="noopener"
        aria-label={`Version ${__APP_VERSION__}, what's new`}
        title={`Version ${__APP_VERSION__}: see what's new`}
        className={`${wide} whitespace-nowrap font-code text-xs font-medium text-mv-subtle no-underline hover:text-mv-ink`}
      >
        v{__APP_VERSION__}
      </a>
    </div>
  );
};
