import { ExternalMark } from '@/components/icons';
import {
  discordUrl,
  editorGuideUrl,
  editorRepoUrl,
  siteIdentity,
} from '@/config/siteIdentity';

const LINKS = [
  { label: 'Editor guide', href: editorGuideUrl },
  { label: 'Discord', href: discordUrl },
  { label: 'GitHub', href: editorRepoUrl },
];

/** Under the screens before a pack is open; the edit screen gives its room to the keyboard. */
export function Footer() {
  return (
    <footer className="shrink-0 bg-mv-page font-body shadow-[inset_0_1px_0_var(--mv-line)]">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 short:py-2 text-[13px] text-mv-subtle">
        <span>
          &copy; {new Date().getFullYear()} {siteIdentity.productName}
        </span>
        {LINKS.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener"
            className="text-mv-muted no-underline hover:text-mv-ink"
          >
            {label}
            <ExternalMark />
          </a>
        ))}
      </div>
    </footer>
  );
}
