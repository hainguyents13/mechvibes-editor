import { editorRepoUrl, siteIdentity, websiteUrl } from '@/config/siteIdentity';

/**
 * mechvibes.com's mark and name, linking to the site, with "Editor" small
 * under the name and the version in a badge beside it. `compact` keeps just
 * the mark below xl, where the open pack's controls need the room.
 */
export const Logo = ({ compact = false }: { compact?: boolean }) => {
  const wide = compact ? 'hidden xl:flex' : 'flex';

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
        <span className={`${wide} flex-col leading-none`}>
          <span className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
            {siteIdentity.productName}
          </span>
          <span className="mt-0.5 text-[11px] font-bold text-mv-subtle">
            Editor
          </span>
        </span>
      </a>
      {/* The releases page rather than this version's own, which is missing
          while its release is still a draft. */}
      <a
        href={`${editorRepoUrl}/releases`}
        target="_blank"
        rel="noopener"
        aria-label={`Version ${__APP_VERSION__}, what's new`}
        title={`Version ${__APP_VERSION__}: see what's new`}
        className={`${compact ? 'hidden xl:inline-flex' : 'inline-flex'} items-center whitespace-nowrap rounded-full bg-mv-fill px-2 py-0.5 font-code text-xs font-medium text-mv-muted no-underline hover:bg-mv-fill-strong hover:text-mv-ink`}
      >
        v{__APP_VERSION__}
      </a>
    </div>
  );
};
