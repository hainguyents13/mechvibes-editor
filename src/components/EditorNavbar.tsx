import { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  CircleHelp,
  CloudUpload,
  Discord,
  Download,
  FolderOpen,
  GitHub,
  House,
  Keyboard,
  Loader,
  LogIn,
  Menu,
  MonitorDown,
  Mouse,
  Package,
  Pencil,
  Play,
  Redo2,
  RotateCcw,
  Undo2,
} from '@/components/icons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tip } from '@/components/ui/tooltip';
import {
  discordUrl,
  editorGuideUrl,
  editorRepoUrl,
  websiteUrl,
} from '@/config/siteIdentity';
import type { LibrarySession } from '@/hooks/useLibrarySession';
import { cn, IS_MAC } from '@/lib/utils';
import type { LibraryUser } from '@/lib/websiteApi';
import type { PackType } from '@/utils/soundPack';
import { Logo } from './Logo';

// Website pages, opened in a new tab so the pack being edited stays open.
const WEBSITE_LINKS = [
  { label: 'Home', href: websiteUrl, Icon: House },
  { label: 'Sound packs', href: `${websiteUrl}/sound-packs`, Icon: Package },
  { label: 'Download app', href: `${websiteUrl}/download`, Icon: MonitorDown },
  { label: 'Editor guide', href: editorGuideUrl, Icon: BookOpen },
];
const COMMUNITY_LINKS = [
  { label: 'Discord', href: discordUrl, Icon: Discord },
  { label: 'GitHub', href: editorRepoUrl, Icon: GitHub },
];

const UNDO_SHORTCUT = IS_MAC ? '⌘Z' : 'Ctrl+Z';
const REDO_SHORTCUT = IS_MAC ? '⇧⌘Z' : 'Ctrl+Y';

/** A labelled button of the bar: 36px, as tall as its icon buttons. */
const barButton = (
  variant: 'primary' | 'secondary' | 'outline' | 'ghost',
  className?: string,
) =>
  cn(
    buttonVariants({ variant, size: 'sm' }),
    'h-9 px-2.5 lg:px-3.5',
    className,
  );
const barIcon = (variant: 'outline' | 'ghost') =>
  buttonVariants({ variant, size: 'icon' });

/** The controls for the open pack. */
interface WorkspaceControls {
  packName: string;
  packType: PackType;
  onEditPack: () => void;
  /** Switch to the other pack type; asks first about sounds it would not show. */
  onSwitchPackType: (packType: PackType) => void;
  /** To the start screen, keeping the work behind it; asks nothing. */
  onStartOver: () => void;
  /** Set once a key has a sound, as are Try it's. */
  onDownload?: () => void;
  isDownloading?: boolean;
  onTryIt?: () => void;
  /** Off when no key's sound can be played here. */
  canTryIt?: boolean;
  /** Draw the eye to Try it for a moment, after a pack is opened. */
  emphasizeTryIt?: boolean;
  /** Set while a library pack is open and the visitor is signed in. */
  onUpdate?: () => void;
  isUpdating?: boolean;
  /** Show the guided tour of the editor. */
  onStartTour: () => void;
  onShowShortcuts: () => void;
  /** Name of the action Undo reverts, or null when there is nothing to undo. */
  undoLabel: string | null;
  /** Name of the action Redo applies again, or null when there is nothing to redo. */
  redoLabel: string | null;
  onUndo: () => void;
  onRedo: () => void;
}

interface EditorNavbarProps {
  session: LibrarySession;
  signInHref: string;
  /** Sign in in a new tab, so the work in this one survives the round trip. */
  signInInNewTab: boolean;
  onOpenMyPacks: () => void;
  /** Left out before a pack is open: the start screens show only the logo, the website menu and the account. */
  workspace?: WorkspaceControls;
}

function Avatar({ user }: { user: LibraryUser }) {
  const [failed, setFailed] = useState(false);
  if (user.image && !failed) {
    return (
      <img
        src={user.image}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-7 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mv-fill-strong text-xs font-bold text-mv-ink">
      {user.name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** A thin upright line between groups of the bar. */
function BarDivider() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 hidden h-5 w-px shrink-0 bg-mv-line sm:block"
    />
  );
}

function Spinner() {
  return <Loader aria-hidden="true" className="size-4 animate-spin" />;
}

function PackControls({
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  onStartTour,
  onShowShortcuts,
  onStartOver,
  onTryIt,
  canTryIt = false,
  emphasizeTryIt = false,
  onUpdate,
  isUpdating = false,
  onDownload,
  isDownloading = false,
  packType,
}: WorkspaceControls) {
  const isMouse = packType === 'Mouse';
  return (
    <>
      {/* Icon-only; left out on phones, which cannot edit, so the account
      button keeps its room. The span keeps the tooltip on a disabled button. */}
      <div className="hidden items-center sm:flex">
        <Tip
          label={
            undoLabel
              ? `Undo ${undoLabel} (${UNDO_SHORTCUT})`
              : 'Nothing to undo'
          }
        >
          <span>
            <button
              type="button"
              onClick={onUndo}
              disabled={!undoLabel}
              aria-label={undoLabel ? `Undo ${undoLabel}` : 'Undo'}
              className={barIcon('ghost')}
            >
              <Undo2 className="size-4" />
            </button>
          </span>
        </Tip>
        <Tip
          label={
            redoLabel
              ? `Redo ${redoLabel} (${REDO_SHORTCUT})`
              : 'Nothing to redo'
          }
        >
          <span>
            <button
              type="button"
              onClick={onRedo}
              disabled={!redoLabel}
              aria-label={redoLabel ? `Redo ${redoLabel}` : 'Redo'}
              className={barIcon('ghost')}
            >
              <Redo2 className="size-4" />
            </button>
          </span>
        </Tip>
      </div>
      <BarDivider />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label="Help"
          data-tour="help"
          className={barButton('ghost')}
        >
          <CircleHelp className="size-4" />
          <span className="hidden xl:inline">Help</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onStartTour}>
            Take the tour
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onShowShortcuts}>
            Keyboard shortcuts
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={editorGuideUrl} target="_blank" rel="noopener">
              Editor guide
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tip label="Open another pack or make a new one">
        <button
          type="button"
          onClick={onStartOver}
          aria-label="Start over"
          data-tour="start-over"
          className={barButton('ghost')}
        >
          <RotateCcw className="size-4" />
          {/* Labelled from xl, so the pack name keeps room at lg */}
          <span className="hidden xl:inline">Start over</span>
        </button>
      </Tip>
      {onTryIt && (
        <Tip
          label={
            canTryIt
              ? `Hear the pack as you ${isMouse ? 'click' : 'type'}`
              : `This browser cannot play the sounds of these ${isMouse ? 'buttons' : 'keys'}`
          }
        >
          <span data-tour="try-it">
            <button
              type="button"
              onClick={onTryIt}
              aria-label="Try it"
              disabled={!canTryIt}
              // A pulse that plays out once, or with reduced motion just the outline.
              className={barButton(
                'outline',
                emphasizeTryIt && canTryIt
                  ? 'outline-2 outline-offset-2 outline-mv-ink/40 motion-safe:animate-[try-it-cue_1.4s_ease-out_3]'
                  : undefined,
              )}
            >
              <Play className="size-4" />
              <span className="hidden lg:inline">Try it</span>
            </button>
          </span>
        </Tip>
      )}
      {onUpdate && (
        <Tip label="Publish these changes as the pack's next revision">
          <span data-tour="update">
            <button
              type="button"
              onClick={onUpdate}
              aria-label="Update"
              disabled={isUpdating || isDownloading}
              className={barButton('secondary')}
            >
              {isUpdating ? <Spinner /> : <CloudUpload className="size-4" />}
              <span className="hidden lg:inline">
                {isUpdating ? 'Updating…' : 'Update'}
              </span>
            </button>
          </span>
        </Tip>
      )}
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          aria-label="Download .zip"
          data-tour="download"
          disabled={isDownloading || isUpdating}
          // Update is the library pack's way out, so Download steps back.
          className={barButton(onUpdate ? 'outline' : 'secondary')}
        >
          {isDownloading ? <Spinner /> : <Download className="size-4" />}
          <span className="hidden lg:inline">
            {isDownloading ? 'Making .zip…' : 'Download .zip'}
          </span>
        </button>
      )}
      <BarDivider />
    </>
  );
}

/** What the pack is for, with a menu to switch to the other type. */
function PackTypeChip({
  packType,
  onSwitchPackType,
}: Pick<WorkspaceControls, 'packType' | 'onSwitchPackType'>) {
  const other: PackType = packType === 'Keyboard' ? 'Mouse' : 'Keyboard';
  const Icon = packType === 'Keyboard' ? Keyboard : Mouse;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        data-tour="pack-type"
        className="inline-flex h-[30px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-mv-page px-2.5 text-xs font-bold text-mv-text shadow-[inset_0_0_0_1px_var(--mv-line)] outline-none hover:text-mv-ink hover:shadow-[inset_0_0_0_1px_var(--mv-line-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-line-strong"
      >
        <Icon className="size-3.5" />
        {/* Named at every width: an icon alone does not say this sets the
        pack's type. The pack name beside it gives up room first. */}
        <span>{packType} pack</span>
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem onSelect={() => onSwitchPackType(other)}>
          Switch to {other.toLowerCase()} pack
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The links to mechvibes.com and its community, in a menu. */
function WebsiteMenu() {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label="Mechvibes website"
        className={barIcon('outline')}
      >
        <Menu className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {WEBSITE_LINKS.map(({ label, href, Icon }) => (
          <DropdownMenuItem key={label} asChild>
            <a href={href} target="_blank" rel="noopener">
              <Icon aria-hidden="true" />
              {label}
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {COMMUNITY_LINKS.map(({ label, href, Icon }) => (
          <DropdownMenuItem key={label} asChild>
            <a href={href} target="_blank" rel="noopener">
              <Icon aria-hidden="true" />
              {label}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The bar over every screen, in mechvibes.com's header style: the website
 * menu and the brand, the open pack's name and type, its actions, the
 * light/dark switch and the account.
 */
export function EditorNavbar({
  session,
  signInHref,
  signInInNewTab,
  onOpenMyPacks,
  workspace,
}: EditorNavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full shrink-0 bg-mv-page font-body text-mv-ink shadow-[inset_0_-1px_0_var(--mv-line)]">
      <div className="flex min-h-16 items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
        <div className="flex shrink-0 items-center gap-2.5">
          <WebsiteMenu />
          <Logo compact={workspace !== undefined} />
        </div>

        {/* The pack's name and type, centred in the space left */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          {workspace && (
            <>
              <button
                type="button"
                onClick={workspace.onEditPack}
                data-tour="pack-details"
                // Shrinks before the chip beside it, so a long name is cut short.
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'h-9 min-w-0 shrink px-2.5 text-[15px] text-mv-ink sm:px-3',
                )}
              >
                <span className="truncate">{workspace.packName}</span>
                <Pencil className="size-3.5 shrink-0 text-mv-subtle" />
              </button>
              <PackTypeChip
                packType={workspace.packType}
                onSwitchPackType={workspace.onSwitchPackType}
              />
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 lg:gap-1.5">
          {workspace && <PackControls {...workspace} />}

          <ThemeToggle className={barIcon('outline')} />

          {/* Library account: signing in and out happens on the website */}
          {session.status === 'signed-out' && (
            <a
              href={signInHref}
              target={signInInNewTab ? '_blank' : undefined}
              rel={signInInNewTab ? 'noopener' : undefined}
              aria-label="Sign in"
              data-tour="account"
              className={barButton('secondary')}
            >
              <LogIn className="size-[15px]" />
              <span className="hidden lg:inline">Sign in</span>
            </a>
          )}
          {session.status === 'signed-in' && (
            <button
              type="button"
              onClick={onOpenMyPacks}
              data-tour="account"
              aria-label={`My packs (signed in as ${session.user.name})`}
              title={`Signed in as ${session.user.name}`}
              className={barButton('outline', 'pl-1 lg:pl-1')}
            >
              <Avatar user={session.user} />
              <FolderOpen className="hidden size-4 lg:inline xl:hidden" />
              <span className="hidden xl:inline">My packs</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
