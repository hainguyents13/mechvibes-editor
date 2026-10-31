import { useState } from 'react';
import { MyPacksList } from '@/components/MyPacksList';
import { websiteHost } from '@/config/siteIdentity';
import type { LibrarySession } from '@/hooks/useLibrarySession';
import type { LibraryPackSummary } from '@/lib/websiteApi';
import { BackButton, ErrorLine, ScreenHeading, StartPage } from './StartPage';

/** The visitor's library packs, in place of the start cards. */
export function MyPacksScreen({
  session,
  onRetrySession,
  signInHref,
  onBack,
  openingId,
  onOpen,
  openError,
  onChoosePackFile,
  isOpeningFile,
  openFileError,
}: {
  session: LibrarySession;
  onRetrySession: () => Promise<void>;
  signInHref: string;
  onBack: () => void;
  /** Pack whose zip is being downloaded, if any. */
  openingId: string | null;
  onOpen: (pack: LibraryPackSummary) => void;
  /** Why the last library pack did not open. */
  openError: string | null;
  onChoosePackFile: () => void;
  isOpeningFile: boolean;
  /** Why the last pack file did not open. */
  openFileError: string | null;
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const retry = async () => {
    setIsRetrying(true);
    try {
      await onRetrySession();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <StartPage>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <BackButton onClick={onBack} />
        <ScreenHeading className="flex-1 text-center text-xl md:text-2xl font-bold">
          Your packs on {websiteHost}
        </ScreenHeading>
        <p className="min-w-16 max-w-48 truncate text-right text-sm text-base-content/60">
          {session.status === 'signed-in' &&
            `Signed in as ${session.user.name}`}
        </p>
      </div>

      <div className="mx-auto mt-6 max-w-3xl">
        {openError && (
          <div className="mb-3">
            <ErrorLine message={openError} />
          </div>
        )}
        <div className="rounded-box border border-base-300 bg-base-100 px-4 shadow-sm">
          {session.status === 'signed-in' ? (
            <MyPacksList
              packs={session.packs}
              openingId={openingId}
              onOpen={onOpen}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-base-content/70">
              {session.status === 'loading' && (
                <>
                  <p>Checking your account...</p>
                  <span className="loading loading-spinner loading-sm" />
                </>
              )}
              {session.status === 'signed-out' && (
                <>
                  <p>Sign in to see the packs you shared on {websiteHost}.</p>
                  <a
                    href={signInHref}
                    className="btn btn-sm btn-neutral rounded-box"
                  >
                    Sign in
                  </a>
                </>
              )}
              {session.status === 'unavailable' && (
                <>
                  <p>Can't reach {websiteHost} right now.</p>
                  <button
                    type="button"
                    onClick={retry}
                    disabled={isRetrying}
                    className="btn btn-sm btn-neutral rounded-box"
                  >
                    {isRetrying && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                    Try again
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1 text-sm text-base-content/70">
          <p>
            Pack is only on your computer?{' '}
            <button
              type="button"
              onClick={onChoosePackFile}
              disabled={isOpeningFile}
              className="link font-medium"
            >
              {isOpeningFile ? 'Opening…' : 'Open a pack file'}
            </button>
          </p>
          {openFileError && <ErrorLine message={openFileError} />}
          <p>
            Want to change someone else's pack? Download it on {websiteHost} and
            open the file. It becomes your own new pack.
          </p>
        </div>
      </div>
    </StartPage>
  );
}
