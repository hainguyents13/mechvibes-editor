import { websiteHost, websiteUrl } from '@/config/siteIdentity';

// Client for the website's editor API (docs/editor-api.md in the website repo).
// Requests carry the visitor's own website session cookie; the editor never
// reads or stores it.

export type LibraryUser = { name: string; image: string | null };

export type LibraryPackStatus = 'DRAFT' | 'PUBLISHED' | 'REMOVED';

export type LibraryPackSummary = {
  id: string;
  slug: string;
  name: string;
  status: LibraryPackStatus;
  revision: number;
  iconUrl: string | null;
  removedReason: string | null;
  updatedAt: string;
};

export class WebsiteApiError extends Error {
  /** HTTP status, or 0 when the website could not be reached. */
  readonly status: number;
  /** Why a zip was refused (400). */
  readonly reasons: string[];
  /** The pack's current revision (409). */
  readonly revision: number | null;
  /** Seconds to wait before retrying (429). */
  readonly retryAfter: number | null;

  constructor(
    status: number,
    message: string,
    extra: {
      reasons?: string[];
      revision?: number | null;
      retryAfter?: number | null;
    } = {},
  ) {
    super(message);
    this.status = status;
    this.reasons = extra.reasons ?? [];
    this.revision = extra.revision ?? null;
    this.retryAfter = extra.retryAfter ?? null;
  }
}

/** The website's sign-in page, returning to `returnTo` afterwards. */
export function signInUrl(returnTo: string) {
  return `${websiteUrl}/login?next=${encodeURIComponent(returnTo)}`;
}

async function request(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`${websiteUrl}${path}`, {
      ...init,
      credentials: 'include',
    });
  } catch {
    throw new WebsiteApiError(
      0,
      `Could not reach ${websiteHost}. Check your connection and try again.`,
    );
  }
  if (response.ok) return response;

  let body: Record<string, unknown> = {};
  try {
    body = await response.json();
  } catch {
    // Some failures (proxies, timeouts) have no JSON body.
  }
  const retryAfter = Number(response.headers.get('Retry-After'));
  throw new WebsiteApiError(
    response.status,
    typeof body.error === 'string'
      ? body.error
      : `The website answered ${response.status}.`,
    {
      reasons: Array.isArray(body.reasons)
        ? body.reasons.filter((r): r is string => typeof r === 'string')
        : [],
      revision: typeof body.revision === 'number' ? body.revision : null,
      retryAfter: retryAfter > 0 ? retryAfter : null,
    },
  );
}

/** Who is signed in and their packs, newest first. Throws a 401 error when signed out. */
export async function listMyPacks(): Promise<{
  user: LibraryUser;
  packs: LibraryPackSummary[];
}> {
  const response = await request('/api/my/sound-packs');
  return response.json();
}

/** The current zip of one of the visitor's packs. Does not count as a download. */
export async function downloadPackZip(id: string): Promise<Blob> {
  const response = await request(
    `/api/my/sound-packs/${encodeURIComponent(id)}/zip`,
  );
  return response.blob();
}

/** Publishes `zip` as the next revision of a pack opened at `revision`. */
export async function updatePackZip(
  id: string,
  zip: Blob,
  revision: number,
): Promise<LibraryPackSummary> {
  const body = new FormData();
  body.append('file', new File([zip], 'pack.zip', { type: 'application/zip' }));
  body.append('revision', String(revision));
  const response = await request(
    `/api/my/sound-packs/${encodeURIComponent(id)}/zip`,
    { method: 'PUT', body },
  );
  const result: { pack: LibraryPackSummary } = await response.json();
  return result.pack;
}
