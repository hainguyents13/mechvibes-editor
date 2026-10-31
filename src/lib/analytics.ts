/**
 * Google Analytics 4, on the same measurement ID as the website so a visitor who moves between the two
 * counts as one. VITE_GA_MEASUREMENT_ID is inlined at build time; without it nothing loads, which keeps
 * local builds out of the reports.
 *
 * The tag is added from here rather than as an inline script in index.html, so the page's CSP can keep
 * refusing inline scripts. Page changes inside the editor are picked up by GA's enhanced measurement
 * (browser history events), so no page_view calls are needed.
 */
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? '';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

export function startAnalytics() {
  if (!GA_ID) return;
  window.dataLayer = window.dataLayer || [];
  // gtag.js reads the arguments object itself, so this must stay a plain function, not an arrow.
  function gtag(..._args: unknown[]) {
    // biome-ignore lint/complexity/noArguments: gtag.js expects the arguments object.
    window.dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', GA_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
}
