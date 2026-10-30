export const siteIdentity = { productName: 'Mechvibes' };

const DEFAULT_LIBRARY_ORIGIN = 'https://mechvibes.com';

function parseOrigins(value: string | undefined) {
  const origins = (value ?? '').split(',').flatMap((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return [];
    try {
      return [new URL(trimmed).origin];
    } catch {
      return [];
    }
  });
  return origins.length > 0 ? origins : [DEFAULT_LIBRARY_ORIGIN];
}

/**
 * Sites the editor may load packs from through `?source=`, from the
 * comma-separated VITE_LIBRARY_ORIGINS. Vite inlines it at build time, so it
 * must be set when building, not when the container runs.
 */
export const libraryOrigins = parseOrigins(
  import.meta.env.VITE_LIBRARY_ORIGINS,
);

/** The Mechvibes website (the first library origin): home page, guides and the sound pack library. */
export const websiteUrl = libraryOrigins[0];

export const editorRepoUrl =
  'https://github.com/hainguyents13/mechvibes-editor';
