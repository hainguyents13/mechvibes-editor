import { editorRepoUrl, siteIdentity, websiteUrl } from '@/config/siteIdentity';

/**
 * mechvibes.com's mark and name, linking to the site, with "Editor" small
 * under the name and the version in a badge on the name's line. The mark is as
 * tall as the two lines. `compact` keeps just the mark below xl, where the
 * open pack's controls need the room.
 */
export const Logo = ({ compact = false }: { compact?: boolean }) => {
  const wide = compact ? 'hidden xl:flex' : 'flex';

  return (
    <div className="flex shrink-0 items-center gap-2">
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
          width={38}
          height={38}
          className="size-[38px]"
        />
        <span className={`${wide} flex-col gap-1`}>
          <span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">
            {siteIdentity.productName}
          </span>
          <span className="text-[11px] font-bold leading-none text-mv-faint">
            Editor
          </span>
        </span>
      </a>
      {/* On the name's line: the link above is centred, the badge sits at its
          top. The releases page rather than this version's own, which is
          missing while its release is still a draft. */}
      <a
        href={`${editorRepoUrl}/releases`}
        target="_blank"
        rel="noopener"
        aria-label={`Version ${__APP_VERSION__}, what's new`}
        title={`Version ${__APP_VERSION__}: see what's new`}
        className={`${compact ? 'hidden xl:inline-flex' : 'inline-flex'} mb-[15px] items-center whitespace-nowrap rounded-full bg-mv-fill px-1.5 font-code text-[11px] font-medium leading-[17px] text-mv-muted no-underline hover:bg-mv-fill-strong hover:text-mv-ink`}
      >
        v{__APP_VERSION__}
      </a>
    </div>
  );
};
