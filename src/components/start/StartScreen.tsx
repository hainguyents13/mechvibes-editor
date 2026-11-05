import { type ReactNode, useId, useState } from 'react';
import {
  ArrowRight,
  FolderOpen,
  Globe,
  type IconComponent,
  Loader,
  Plus,
  RotateCcw,
} from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { siteIdentity, websiteHost } from '@/config/siteIdentity';
import type { LibrarySession } from '@/hooks/useLibrarySession';
import { cn } from '@/lib/utils';
import {
  BackButton,
  ErrorLine,
  SCREEN_LABEL_CLASS,
  SCREEN_TITLE_CLASS,
  ScreenHeading,
  STRETCHED_ACTION,
  StartPage,
  signInTarget,
  TEXT_LINK_CLASS,
} from './StartPage';

const CROSS_LINK_CLASS = `${TEXT_LINK_CLASS} relative z-10 whitespace-nowrap`;

// The card takes the raised colour while its action is hovered or
// keyboard-focused. Keyed on the action rather than the card, so hovering a
// cross link leaves it at rest.
const LIFT_WITH_ACTION_CLASS =
  'has-[[data-card-action]:not(:disabled):hover]:bg-mv-raised has-[[data-card-action]:focus-visible]:bg-mv-raised';

/** What clicking a card does, named on a button at its foot. */
type CardAction = {
  label: string;
  /** Working on it: the card shows a spinner and cannot be clicked again. */
  busy?: boolean;
  /** The one card whose button is filled: making a new pack. */
  filled?: boolean;
} & ({ href: string; newTab?: boolean } | { onClick: () => void });

interface StartScreenProps {
  session: LibrarySession;
  /** Check the website session again. */
  onRetrySession: () => Promise<void>;
  /** The website's sign-in page, coming back to the list of the visitor's packs. */
  signInHref: string;
  /** Sign in in a new tab, so the work kept behind this screen survives it. */
  signInInNewTab: boolean;
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
  /** The work Start over kept, and the way back to it; null when there is none. */
  keptWork: { packName: string; onReturn: () => void } | null;
  /** The work this browser kept from an earlier visit; null when there is none. */
  savedWork: {
    packName: string;
    /** When it was kept: "5 minutes ago". */
    savedAgo: string;
    /** How many keys or buttons have a sound. */
    keyCount: number;
    /** What the pack's keys are called: 'key' or 'button'. */
    noun: string;
    onContinue: () => void;
  } | null;
}

/**
 * One way in, a cell of the ruled grid. With an action the whole card is the
 * button; without one (while the account loads) it is plain text. The cells
 * of a row share one height, so the row does not jump as the account loads.
 */
function StartCard({
  Icon,
  title,
  children,
  action,
  crossLink,
  error,
}: {
  Icon: IconComponent;
  title: string;
  children: ReactNode;
  action?: CardAction;
  /** A link to the neighbouring card. */
  crossLink?: ReactNode;
  /** Why the card's action did not work. */
  error?: string | null;
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
          <Loader className="size-4 animate-spin" aria-hidden="true" />
        )}
        <span id={labelId} className="whitespace-normal text-left">
          {action.label}
        </span>
        {!action.busy && (
          <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
        )}
      </>
    );
    // Screen readers hear the card's title with what it does.
    const shared = {
      'data-card-action': '',
      'aria-labelledby': `${titleId} ${labelId}`,
      'aria-describedby': bodyId,
      className: cn(
        buttonVariants({
          variant: action.filled ? 'secondary' : 'outline',
          size: 'sm',
        }),
        'h-auto min-h-9 max-w-full px-3.5 py-2',
        STRETCHED_ACTION,
      ),
    };
    actionControl =
      'href' in action ? (
        <a
          href={action.href}
          {...signInTarget(action.newTab ?? false)}
          // Space follows the link too, as it presses the other cards.
          onKeyDown={(event) => {
            if (event.key !== ' ') return;
            event.preventDefault();
            event.currentTarget.click();
          }}
          {...shared}
        >
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
      className={cn(
        'relative flex min-h-[17rem] flex-col gap-2 p-6 shadow-[inset_-1px_0_0_var(--mv-line),inset_0_-1px_0_var(--mv-line)] transition-colors',
        action && LIFT_WITH_ACTION_CLASS,
      )}
    >
      <Icon className="size-[22px] shrink-0 text-mv-ink" aria-hidden="true" />
      <h2
        id={titleId}
        className="m-0 mt-2.5 font-display text-[21px] font-bold tracking-[-0.015em] text-mv-ink"
      >
        {title}
      </h2>
      <div id={bodyId} className="text-sm text-mv-muted">
        {children}
      </div>
      <div className="mt-auto flex flex-col items-start gap-2.5 pt-4">
        {actionControl}
        <p className="m-0 min-h-4 text-xs text-mv-subtle">{crossLink}</p>
        {error && <ErrorLine message={error} />}
      </div>
    </section>
  );
}

export function StartScreen({
  session,
  onRetrySession,
  signInHref,
  signInInNewTab,
  signInLabel,
  onShowMyPacks,
  libraryOpenError,
  onChoosePackFile,
  isOpeningFile,
  openFileError,
  onMakeNewPack,
  keptWork,
  savedWork,
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
      <a
        href={signInHref}
        {...signInTarget(signInInNewTab)}
        className={CROSS_LINK_CLASS}
      >
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
            <p className="m-0 flex items-center gap-2">
              <Loader className="size-4 animate-spin" aria-hidden="true" />
              Checking your account...
            </p>
          ),
        };
      case 'signed-out':
        return {
          body: <p className="m-0">A pack you shared on {websiteHost}</p>,
          action: {
            label: signInLabel ?? 'Sign in to see them',
            href: signInHref,
            newTab: signInInNewTab,
          },
        };
      case 'unavailable':
        return {
          body: <p className="m-0">A pack you shared on {websiteHost}</p>,
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
            body: (
              <p className="m-0">You have no packs on {websiteHost} yet.</p>
            ),
            action: { label: 'Make a new pack', onClick: onMakeNewPack },
          };
        }
        return {
          body: (
            <>
              <p className="m-0">A pack you shared on {websiteHost}</p>
              <p className="m-0 mt-2 truncate">
                Signed in as {session.user.name}
              </p>
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
      <div className="flex flex-col gap-3">
        <span className={SCREEN_LABEL_CLASS}>Sound pack editor</span>
        <ScreenHeading className={SCREEN_TITLE_CLASS}>
          Make a sound pack for {siteIdentity.productName}
        </ScreenHeading>
        <p className="m-0 max-w-[620px] text-[17px] text-mv-muted">
          Pick where to start, or drop a file anywhere on this page.
        </p>
      </div>

      {/* After the heading, which takes the focus, so Tab and a screen reader
      reach the way back first. */}
      {keptWork && (
        <div className="mt-7">
          <BackButton
            label={`Back to "${keptWork.packName}"`}
            onClick={keptWork.onReturn}
          />
        </div>
      )}
      {savedWork && (
        <section
          aria-labelledby="saved-work-title"
          className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3.5 rounded-[14px] bg-mv-raised px-5 py-[18px] shadow-[inset_0_0_0_1px_var(--mv-line)]"
        >
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-mv-page text-mv-chart shadow-[inset_0_0_0_1px_var(--mv-line)]"
          >
            <RotateCcw className="size-[18px]" />
          </span>
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
            <h2
              id="saved-work-title"
              className="m-0 text-base font-bold text-mv-ink"
            >
              Continue where you left off
            </h2>
            <p className="m-0 truncate font-code text-xs text-mv-subtle">
              {savedWork.packName} · kept {savedWork.savedAgo}
              {savedWork.keyCount > 0 &&
                ` · ${savedWork.keyCount} ${savedWork.noun}${savedWork.keyCount === 1 ? ' has' : 's have'} a sound`}
            </p>
          </div>
          <button
            type="button"
            className={buttonVariants({ variant: 'primary' })}
            onClick={savedWork.onContinue}
          >
            Continue
          </button>
        </section>
      )}
      <div
        className={cn(
          keptWork || savedWork ? 'mt-3' : 'mt-7',
          'grid overflow-hidden rounded-[14px] outline -outline-offset-1 outline-mv-line md:grid-cols-3',
        )}
      >
        <StartCard
          Icon={Globe}
          title="Edit my pack"
          action={editMyPack.action}
          crossLink={<>Only on your computer? {openPackFileLink}</>}
          error={libraryOpenError}
        >
          {editMyPack.body}
        </StartCard>
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
          error={openFileError}
        >
          <p className="m-0">
            A .zip on this computer, like one you saved before
          </p>
        </StartCard>
        <StartCard
          Icon={Plus}
          title="Make a new pack"
          action={{ label: 'Start', onClick: onMakeNewPack, filled: true }}
        >
          <p className="m-0">Start from your own recordings or sound files</p>
        </StartCard>
      </div>

      <p className="m-0 mt-7 text-[13px] text-mv-subtle">
        Your work is kept in this browser as you go. Download a .zip to share it
        or keep it elsewhere.
      </p>
    </StartPage>
  );
}
