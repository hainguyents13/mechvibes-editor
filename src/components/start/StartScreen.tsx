import {
  ArrowRight,
  FolderOpen,
  Globe,
  type LucideIcon,
  Plus,
} from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { siteIdentity, websiteHost } from '@/config/siteIdentity';
import type { LibrarySession } from '@/hooks/useLibrarySession';
import {
  CARD_CLASS,
  ErrorLine,
  ScreenHeading,
  STRETCHED_ACTION,
  StartPage,
} from './StartPage';

const ACTION_CLASS = `${STRETCHED_ACTION} cursor-pointer text-left text-sm font-semibold focus-visible:outline-none disabled:cursor-default disabled:text-base-content/60`;
const CROSS_LINK_CLASS = 'link relative z-10 font-medium';

// The card lifts while its action is hovered or keyboard-focused. Keyed on the
// action rather than the card, so hovering a cross link leaves it at rest.
const LIFT_WITH_ACTION_CLASS =
  'has-[[data-card-action]:not(:disabled):hover]:border-primary/60 has-[[data-card-action]:not(:disabled):hover]:shadow-md has-[[data-card-action]:focus-visible]:border-primary/60 has-[[data-card-action]:focus-visible]:shadow-md has-[[data-card-action]:focus-visible]:outline-2 outline-offset-2 outline-primary';

/** What clicking a card does, named in a line at its foot. */
type CardAction = {
  label: string;
  /** Working on it: the card shows a spinner and cannot be clicked again. */
  busy?: boolean;
} & ({ href: string } | { onClick: () => void });

interface StartScreenProps {
  session: LibrarySession;
  /** Check the website session again. */
  onRetrySession: () => Promise<void>;
  /** The website's sign-in page, coming back to the list of the visitor's packs. */
  signInHref: string;
  /** The sign-in action's label when the link the editor was opened with names a pack. */
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

/**
 * One way in. With an action the whole card is the button; without one (while
 * the account loads) it is plain text. The card keeps a fixed height whatever
 * its content, so the row does not jump as the account loads.
 */
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
  action?: CardAction;
  /** A link to the neighbouring card. */
  crossLink?: ReactNode;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  const labelId = `${id}-label`;

  let actionControl: ReactNode = null;
  if (action) {
    const content = (
      <>
        {action.busy && (
          <span
            className="loading loading-spinner loading-xs mr-1.5 align-middle"
            aria-hidden="true"
          />
        )}
        <span id={labelId}>{action.label}</span>
        {!action.busy && (
          <ArrowRight
            className="ml-1 inline h-4 w-4 align-[-0.2em] text-primary"
            aria-hidden="true"
          />
        )}
      </>
    );
    // Screen readers hear the card's title with what it does.
    const shared = {
      'data-card-action': '',
      'aria-labelledby': `${titleId} ${labelId}`,
      'aria-describedby': bodyId,
      className: ACTION_CLASS,
    };
    actionControl =
      'href' in action ? (
        <a href={action.href} {...shared}>
          {content}
        </a>
      ) : (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.busy}
          {...shared}
        >
          {content}
        </button>
      );
  }

  return (
    <section
      className={`relative flex md:h-[17rem] flex-col p-5 ${CARD_CLASS} ${action ? LIFT_WITH_ACTION_CLASS : ''}`}
    >
      <Icon className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
      <h2 id={titleId} className="mt-3 text-lg font-semibold">
        {title}
      </h2>
      <div id={bodyId} className="mt-1 text-sm text-base-content/70">
        {children}
      </div>
      <div className="mt-auto pt-4">{actionControl}</div>
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

  const editMyPack = ((): { body: ReactNode; action?: CardAction } => {
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
          action: {
            label: signInLabel ?? 'Sign in to see them',
            href: signInHref,
          },
        };
      case 'unavailable':
        return {
          body: <p>A pack you shared on {websiteHost}</p>,
          action: isRetrying
            ? { label: 'Trying again…', busy: true, onClick: retry }
            : {
                label: `Can't reach ${websiteHost}. Click to try again.`,
                onClick: retry,
              },
        };
      case 'signed-in': {
        const count = session.packs.length;
        if (count === 0) {
          return {
            body: <p>You have no packs on {websiteHost} yet.</p>,
            action: { label: 'Make a new pack', onClick: onMakeNewPack },
          };
        }
        return {
          body: (
            <>
              <p>A pack you shared on {websiteHost}</p>
              <p className="mt-2 truncate">Signed in as {session.user.name}</p>
            </>
          ),
          action: {
            label: `${count} ${count === 1 ? 'pack' : 'packs'}`,
            onClick: onShowMyPacks,
          },
        };
      }
    }
  })();

  return (
    <StartPage centered>
      <div className="text-center">
        <img
          src="/logo.png"
          alt=""
          width={56}
          height={56}
          className="mx-auto mb-4 h-14 w-14"
        />
        <ScreenHeading className="text-2xl md:text-3xl font-bold">
          Make a sound pack for {siteIdentity.productName}
        </ScreenHeading>
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
            crossLink={<>Only on your computer? {openPackFileLink}</>}
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
              isOpeningFile
                ? { label: 'Opening…', busy: true, onClick: onChoosePackFile }
                : { label: 'Choose a .zip', onClick: onChoosePackFile }
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
          action={{ label: 'Start', onClick: onMakeNewPack }}
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
