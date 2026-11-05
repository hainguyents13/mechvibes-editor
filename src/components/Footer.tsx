import { ThemeToggle } from '@/components/ThemeToggle';
import { editorRepoUrl, siteIdentity } from '@/config/siteIdentity';

export function Footer() {
  return (
    <footer className="bg-base-200">
      <div className="max-w-4xl p-4 short:py-1 text-xs mx-auto flex flex-col md:flex-row justify-between items-center text-base-content/60">
        <div className=" mb-4 md:mb-0">
          &copy; {new Date().getFullYear()} {siteIdentity.productName}. All
          rights reserved.
        </div>
        <div className="flex items-center space-x-6 ">
          <ThemeToggle className="btn btn-circle btn-sm btn-ghost" />
          <a
            href={editorRepoUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-base-content transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
