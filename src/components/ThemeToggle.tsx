import { useEffect, useState } from 'react';
import { Moon, Sun } from '@/components/icons';

type Theme = 'light' | 'dark';

/**
 * The light/dark switch. Every copy follows the page's data-theme, so switching
 * in one place turns the others' icons too; the choice is kept in localStorage
 * under the same key as on mechvibes.com.
 */
export function ThemeToggle({ className }: { className: string }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const root = document.documentElement;
    let saved: Theme = 'light';
    try {
      saved = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    } catch {
      // Without storage the page starts light
    }
    root.setAttribute('data-theme', saved);
    setTheme(saved);
    const watch = new MutationObserver(() =>
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'),
    );
    watch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => watch.disconnect();
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('theme', next);
    } catch {
      // The switch still works for this visit
    }
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
      }
      title={theme === 'light' ? 'Dark mode' : 'Light mode'}
      className={className}
    >
      {theme === 'light' ? (
        <Moon aria-hidden="true" className="size-4" />
      ) : (
        <Sun aria-hidden="true" className="size-4" />
      )}
    </button>
  );
}
