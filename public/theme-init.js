// The saved light/dark choice, set before the first paint so a dark page
// never flashes light. A file rather than an inline script, which the site's
// Content-Security-Policy blocks. ThemeToggle keeps the choice from here on.
try {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
} catch {}
