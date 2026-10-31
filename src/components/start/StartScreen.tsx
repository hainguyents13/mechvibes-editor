import { FolderOpen, Globe, type LucideIcon, Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { siteIdentity, websiteHost } from '@/config/siteIdentity';
import type { LibrarySession } from '@/hooks/useLibrarySession';
import { ErrorLine, STRETCHED_ACTION, StartPage } from './StartPage';

const ACTION_CLASS = `btn btn-sm btn-neutral rounded-box ${STRETCHED_ACTION}`;
const CROSS_LINK_CLASS = 'link relative z-10 font-medium';

interface StartScreenProps {
  session: LibrarySession;
  /** Check the website session again. */
  onRetrySession: () => Promise<void>;
  /** The website's sign-in page, coming back to the list of the visitor's packs. */
  signInHref: string;
  /** The sign-in button's label when the link the editor was opened with names a pack. */
  signInLabel: string | null;
  onShowMyPacks: () => void;
  /** Why the library pack the editor was linked to did not open. */
  libraryOpenError: string | null;
  /** Open the file picker for a pack .zip. */
  onChoosePackFile: () => void;
  isOpeningFile: boolean;
  /** Why the last pack file did not open. */
  openFileError: string | null;
  onMakeNewPack: () => void;
}

/** One way in. The card keeps a fixed height whatever its content, so the row does not jump as the account loads. */
function StartCard({
  Icon,
  title,
  children,
  action,
  crossLink,
}: {
  Icon: LucideIcon;
  title: string;
  children: ReactNode;
  /** The main control; it covers the whole card. */
  action?: ReactNode;
  /** A link to the neighbouring card. */
  crossLink?: ReactNode;
}) {
  return (
    <section
      className={`relative flex md:h-[19rem] flex-col rounded-box border border-base-300 bg-base-100 p-5 shadow-sm transition ${action ? 'hover:border-primary/60 hover:shadow-md' : ''}`}
    >
      <Icon className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      <div className="mt-1 text-sm text-base-content/70">{children}</div>
      <div className="mt-auto pt-4">{action}</div>
      <p className="mt-3 min-h-8 text-xs text-base-content/60">{crossLink}</p>
    </section>
  );
}

export function StartScreen({
  session,
  onRetrySession,
  signInHref,
  signInLabel,
  onShowMyPacks,
  libraryOpenError,
  onChoosePackFile,
  isOpeningFile,
  openFileError,
  onMakeNewPack,
}: StartScreenProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const retry = async () => {
    setIsRetrying(true);
    try {
      await onRetrySession();
    } finally {
      setIsRetrying(false);
    }
  };

  const hasPacks = session.status === 'signed-in' && session.packs.length > 0;
  // Where "Edit my pack" leads from the other card: the list, or signing in.
  const editMyPackLink =
    session.status === 'signed-out' ? (
      <a href={signInHref} className={CROSS_LINK_CLASS}>
        Edit my pack
      </a>
    ) : hasPacks ? (
      <button
        type="button"
        onClick={onShowMyPacks}
        className={CROSS_LINK_CLASS}
      >
        Edit my pack
      </button>
    ) : null;
  const openPackFileLink = (
    <button
      type="button"
      onClick={onChoosePackFile}
      className={CROSS_LINK_CLASS}
    >
      Open a pack file
    </button>
  );

  const editMyPack = ((): {
    body: ReactNode;
    action?: ReactNode;
    /** The body already links to the other card. */
    hideCrossLink?: boolean;
  } => {
    switch (session.status) {
      case 'loading':
        return {
          body: (
            <>
              <p>Checking your account...</p>
              <progress
                className="progress mt-3 w-full"
                aria-label="Checking your account"
              />
            </>
          ),
        };
      case 'signed-out':
        return {
          body: <p>A pack you shared on {websiteHost}</p>,
          action: (
            <a href={signInHref} className={ACTION_CLASS}>
              {signInLabel ?? 'Sign in to see them'}
            </a>
          ),
        };
      case 'unavailable':
        return {
          body: (
            <p>
              Can't reach {websiteHost} right now. Download your pack's .zip
              there, then use {openPackFileLink}.
            </p>
          ),
          action: (
            <button
              type="button"
              onClick={retry}
              disabled={isRetrying}
              className={ACTION_CLASS}
            >
              {isRetrying && (
                <span className="loading loading-spinner loading-xs" />
              )}
              Try again
            </button>
          ),
          hideCrossLink: true,
        };
      case 'signed-in':
        if (session.packs.length === 0) {
          return {
            body: <p>You have no packs on {websiteHost} yet.</p>,
            action: (
              <button
                type="button"
                onClick={onMakeNewPack}
                className={ACTION_CLASS}
              >
                Make a new pack
              </button>
            ),
          };
        }
        return {
          body: (
            <>
              <p>A pack you shared on {websiteHost}</p>
              <p className="mt-2 truncate">Signed in as {session.user.name}</p>
            </>
          ),
          action: (
            <button
              type="button"
              onClick={onShowMyPacks}
              className={ACTION_CLASS}
            >
              Show my packs ({session.packs.length})
            </button>
          ),
        };
    }
  })();

  return (
    <StartPage>
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold">
          Make a sound pack for {siteIdentity.productName}
        </h1>
        <p className="mt-2 text-base-content/70">
          Pick where to start, or drop a file anywhere on this page.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3 md:items-start">
        <div>
          <StartCard
            Icon={Globe}
            title="Edit my pack"
            action={editMyPack.action}
            crossLink={
              !editMyPack.hideCrossLink && (
                <>Only on your computer? {openPackFileLink}</>
              )
            }
          >
            {editMyPack.body}
          </StartCard>
          {libraryOpenError && (
            <div className="mt-2">
              <ErrorLine message={libraryOpenError} />
            </div>
          )}
        </div>

        <div>
          <StartCard
            Icon={FolderOpen}
            title="Open a pack file"
            action={
              <button
                type="button"
                onClick={onChoosePackFile}
                disabled={isOpeningFile}
                className={ACTION_CLASS}
              >
                {isOpeningFile && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                {isOpeningFile ? 'Opening…' : 'Choose .zip'}
              </button>
            }
            crossLink={
              editMyPackLink && (
                <>
                  Shared it on {websiteHost}? {editMyPackLink}
                </>
              )
            }
          >
            <p>A .zip on this computer, like one you saved before</p>
          </StartCard>
          {openFileError && (
            <div className="mt-2">
              <ErrorLine message={openFileError} />
            </div>
          )}
        </div>

        <StartCard
          Icon={Plus}
          title="Make a new pack"
          action={
            <button
              type="button"
              onClick={onMakeNewPack}
              className={ACTION_CLASS}
            >
              Start
            </button>
          }
        >
          <p>Start from your own recordings or sound files</p>
        </StartCard>
      </div>

      <p className="mt-10 text-center text-sm text-base-content/60">
        Your work stays in this browser tab only. Download a .zip to keep it.
      </p>
    </StartPage>
  );
}
