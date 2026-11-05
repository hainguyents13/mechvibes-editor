import { useState } from 'react';
import { Loader } from '@/components/icons';
import { MyPacksList } from '@/components/MyPacksList';
import { buttonVariants } from '@/components/ui/button';
import { websiteHost } from '@/config/siteIdentity';
import type { LibrarySession } from '@/hooks/useLibrarySession';
import type { LibraryPackSummary } from '@/lib/websiteApi';
import {
  BackButton,
  CARD_CLASS,
  ErrorLine,
  SCREEN_LABEL_CLASS,
  ScreenHeading,
  StartPage,
  signInTarget,
  TEXT_LINK_CLASS,
} from './StartPage';

/** The visitor's library packs, in place of the start cards. */
export function MyPacksScreen({
  session,
  onRetrySession,
  signInHref,
  signInInNewTab,
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
  /** Sign in in a new tab, so the work kept behind this screen survives it. */
  signInInNewTab: boolean;
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
      <div className="mx-auto max-w-3xl">
        <BackButton onClick={onBack} />
        <div className="mt-6 mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex flex-col gap-3">
            <span className={SCREEN_LABEL_CLASS}>My packs</span>
            <ScreenHeading className="font-display text-[clamp(28px,3.4vw,40px)] font-extrabold leading-[1.1] tracking-[-0.025em] text-mv-ink">
              Your packs on {websiteHost}
            </ScreenHeading>
          </div>
          <p className="m-0 min-w-0 truncate text-sm text-mv-subtle">
            {session.status === 'signed-in' &&
              `Signed in as ${session.user.name}`}
          </p>
        </div>

        {openError && (
          <div className="mb-3">
            <ErrorLine message={openError} />
          </div>
        )}
        <div className={`${CARD_CLASS} px-5`}>
          {session.status === 'signed-in' ? (
            <MyPacksList
              packs={session.packs}
              openingId={openingId}
              onOpen={onOpen}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-mv-muted">
              {session.status === 'loading' && (
                <>
                  <p className="m-0">Checking your account...</p>
                  <Loader className="size-5 animate-spin" aria-hidden="true" />
                </>
              )}
              {session.status === 'signed-out' && (
                <>
                  <p className="m-0">
                    Sign in to see the packs you shared on {websiteHost}.
                  </p>
                  <a
                    href={signInHref}
                    {...signInTarget(signInInNewTab)}
                    className={buttonVariants({
                      variant: 'secondary',
                      size: 'sm',
                    })}
                  >
                    Sign in
                  </a>
                </>
              )}
              {session.status === 'unavailable' && (
                <>
                  <p className="m-0">Can't reach {websiteHost} right now.</p>
                  <button
                    type="button"
                    onClick={retry}
                    disabled={isRetrying}
                    className={buttonVariants({
                      variant: 'secondary',
                      size: 'sm',
                    })}
                  >
                    {isRetrying && (
                      <Loader
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    Try again
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1.5 text-sm text-mv-muted">
          <p className="m-0">
            Pack is only on your computer?{' '}
            <button
              type="button"
              onClick={onChoosePackFile}
              disabled={isOpeningFile}
              className={TEXT_LINK_CLASS}
            >
              {isOpeningFile ? 'Opening…' : 'Open a pack file'}
            </button>
          </p>
          {openFileError && <ErrorLine message={openFileError} />}
          <p className="m-0">
            Want to change someone else's pack? Download it on {websiteHost} and
            open the file. It becomes your own new pack.
          </p>
        </div>
      </div>
    </StartPage>
  );
}
