import { editorRepoUrl, siteIdentity, websiteUrl } from '@/config/siteIdentity';

interface LogoProps {
  text: string;
  /** The navbar leaves the logo out on phones to keep room for its buttons. */
  showOnPhones?: boolean;
  /** Just the mark below xl, where the open pack's controls need the room. */
  compact?: boolean;
}

export const Logo = ({
  text,
  showOnPhones = false,
  compact = false,
}: LogoProps) => {
  const textClass = compact ? 'hidden xl:inline' : '';

  return (
    <div
      className={`${showOnPhones ? 'flex' : 'hidden sm:flex'} shrink-0 items-center`}
    >
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener"
        className="flex items-center space-x-2 whitespace-nowrap"
      >
        <img
          src="/logo.png"
          alt={`${siteIdentity.productName} Logo`}
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className={`font-bold ${textClass}`}>{text}</span>
      </a>
      {/* The releases page rather than this version's own, which is missing
          while its release is still a draft. */}
      <a
        href={`${editorRepoUrl}/releases`}
        target="_blank"
        rel="noopener"
        aria-label={`Version ${__APP_VERSION__}, what's new`}
        title={`Version ${__APP_VERSION__}: see what's new`}
        className={`ml-2 whitespace-nowrap text-xs text-base-content/70 hover:text-base-content hover:underline ${textClass}`}
      >
        v{__APP_VERSION__}
      </a>
    </div>
  );
};
