export const siteIdentity = { productName: 'Mechvibes' };

/**
 * The Mechvibes website: home page, guides, the sound pack library and the API
 * the editor publishes through. VITE_WEBSITE_URL is inlined at build time.
 */
export const websiteUrl = (
  import.meta.env.VITE_WEBSITE_URL || 'https://mechvibes.com'
).replace(/\/+$/, '');

export const editorRepoUrl =
  'https://github.com/hainguyents13/mechvibes-editor';
