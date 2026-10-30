import { useCallback, useEffect, useState } from 'react';
import {
  type LibraryPackSummary,
  type LibraryUser,
  listMyPacks,
  WebsiteApiError,
} from '@/lib/websiteApi';

export type LibrarySession =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: LibraryUser; packs: LibraryPackSummary[] }
  /** The website could not be reached; the editor keeps working offline. */
  | { status: 'unavailable' };

/** The visitor's website session and packs, read through the editor API. */
export function useLibrarySession() {
  const [session, setSession] = useState<LibrarySession>({
    status: 'loading',
  });

  const refresh = useCallback(async () => {
    try {
      const { user, packs } = await listMyPacks();
      setSession({ status: 'signed-in', user, packs });
    } catch (error) {
      setSession(
        error instanceof WebsiteApiError && error.status === 401
          ? { status: 'signed-out' }
          : { status: 'unavailable' },
      );
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Signing in happens on the website, often in another tab, so check again
  // whenever the editor comes back into view while signed out.
  const signedIn = session.status === 'signed-in';
  useEffect(() => {
    if (signedIn) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [signedIn, refresh]);

  return { session, refresh };
}
