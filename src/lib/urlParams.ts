import { libraryOrigins } from '@/config/siteIdentity';

/** Library-issued pack ids: "mv-" + 32 hex. */
const LIBRARY_PACK_ID = /^mv-[0-9a-f]{32}$/;

/**
 * What the Mechvibes website passes when it opens the editor:
 * `?pack=<id>&name=<name>&author=<name>`, plus `&source=<download url>` for a
 * fork. Any other parameter (utm_* and so on) is ignored.
 */
export type EditorParams = {
  /** Library pack being edited. It is written as config.id on export. */
  packId: string | null;
  name: string | null;
  author: string | null;
  /** Zip to start from, served by an allowed library origin. */
  sourceUrl: string | null;
  /** A `source` that was not loaded because its origin is not allowed. */
  rejectedSource: string | null;
};

function nonEmpty(value: string | null) {
  return value?.trim() || null;
}

function isLibraryUrl(value: string) {
  try {
    return libraryOrigins.includes(new URL(value).origin);
  } catch {
    return false;
  }
}

export function readEditorParams(search: string): EditorParams {
  const params = new URLSearchParams(search);
  const pack = params.get('pack');
  const source = nonEmpty(params.get('source'));
  const sourceAllowed = source !== null && isLibraryUrl(source);
  return {
    packId: pack !== null && LIBRARY_PACK_ID.test(pack) ? pack : null,
    name: nonEmpty(params.get('name')),
    author: nonEmpty(params.get('author')),
    sourceUrl: sourceAllowed ? source : null,
    rejectedSource: sourceAllowed ? null : source,
  };
}

/** Read once at startup: the editor is a single page and never changes its URL. */
export const editorParams = readEditorParams(window.location.search);
