import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { editorRepoUrl, siteIdentity } from '@/config/siteIdentity';

export function Footer() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <footer className="bg-base-200">
      <div className="max-w-4xl p-4 short:py-1 text-xs mx-auto flex flex-col md:flex-row justify-between items-center text-base-content/60">
        <div className=" mb-4 md:mb-0">
          &copy; {new Date().getFullYear()} {siteIdentity.productName}. All
          rights reserved.
        </div>
        <div className="flex items-center space-x-6 ">
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-circle btn-sm btn-ghost"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
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
