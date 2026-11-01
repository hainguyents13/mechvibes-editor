import {
  BookOpen,
  ChevronDown,
  CircleHelp,
  CloudUpload,
  Download,
  FolderOpen,
  House,
  Keyboard,
  Library,
  LogIn,
  Menu,
  MonitorDown,
  Mouse,
  Pencil,
  Play,
  Redo2,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { siteIdentity, websiteUrl } from '@/config/siteIdentity';
import type { LibrarySession } from '@/hooks/useLibrarySession';
import { IS_MAC } from '@/lib/utils';
import type { LibraryUser } from '@/lib/websiteApi';
import type { PackType } from '@/utils/soundPack';
import { Logo } from './Logo';
import { NavbarMenu } from './NavbarMenu';

// Website pages, opened in a new tab so the pack being edited stays open.
const WEBSITE_LINKS = [
  { label: 'Home', href: websiteUrl, Icon: House },
  { label: 'Sound packs', href: `${websiteUrl}/sound-packs`, Icon: Library },
  { label: 'Download app', href: `${websiteUrl}/download`, Icon: MonitorDown },
  { label: 'Guide', href: `${websiteUrl}/guides/editor`, Icon: BookOpen },
];

const UNDO_SHORTCUT = IS_MAC ? '⌘Z' : 'Ctrl+Z';
const REDO_SHORTCUT = IS_MAC ? '⇧⌘Z' : 'Ctrl+Y';

/** The controls for the open pack. */
interface WorkspaceControls {
  packName: string;
  packType: PackType;
  onEditPack: () => void;
  /** Switch to the other pack type; asks first about sounds it would not show. */
  onSwitchPackType: (packType: PackType) => void;
  /** Back to the start screen; asks first when there are unsaved changes. */
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
        className="h-6 w-6 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="h-6 w-6 shrink-0 rounded-full bg-neutral text-neutral-content text-xs font-medium flex items-center justify-center">
      {user.name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
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
}: WorkspaceControls) {
  return (
    <>
      {/* Icon-only; left out on phones, which cannot edit, so the account button keeps its room. The wrapper keeps the tooltip on a disabled button */}
      <div className="hidden sm:flex items-center">
        <div
          className="tooltip tooltip-bottom"
          data-tip={
            undoLabel
              ? `Undo ${undoLabel} (${UNDO_SHORTCUT})`
              : 'Nothing to undo'
          }
        >
          <button
            type="button"
            onClick={onUndo}
            disabled={!undoLabel}
            aria-label={undoLabel ? `Undo ${undoLabel}` : 'Undo'}
            className="btn btn-sm btn-ghost btn-square rounded-box"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>
        <div
          className="tooltip tooltip-bottom"
          data-tip={
            redoLabel
              ? `Redo ${redoLabel} (${REDO_SHORTCUT})`
              : 'Nothing to redo'
          }
        >
          <button
            type="button"
            onClick={onRedo}
            disabled={!redoLabel}
            aria-label={redoLabel ? `Redo ${redoLabel}` : 'Redo'}
            className="btn btn-sm btn-ghost btn-square rounded-box"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <NavbarMenu
        align="end"
        buttonLabel="Help"
        tour="help"
        buttonClassName="btn btn-sm btn-ghost rounded-box flex items-center gap-1 px-2 lg:px-3"
        items={[
          { label: 'Take the tour', onSelect: onStartTour },
          { label: 'Keyboard shortcuts', onSelect: onShowShortcuts },
        ]}
      >
        <CircleHelp className="h-4 w-4" />
        <span className="hidden xl:inline">Help</span>
      </NavbarMenu>
      <div
        className="tooltip tooltip-bottom"
        data-tip="Open another pack or make a new one"
        data-tour="start-over"
      >
        <button
          type="button"
          onClick={onStartOver}
          aria-label="Start over"
          className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3"
        >
          <RotateCcw className="h-4 w-4 xl:mr-2" />
          {/* Labelled from xl, so the pack name keeps room at lg */}
          <span className="hidden xl:inline">Start over</span>
        </button>
      </div>
      {onTryIt && (
        <div
          className="tooltip tooltip-bottom"
          data-tour="try-it"
          data-tip={
            canTryIt
              ? 'Hear the pack as you type'
              : 'This browser cannot play the sounds of these keys'
          }
        >
          <button
            type="button"
            onClick={onTryIt}
            aria-label="Try it"
            disabled={!canTryIt}
            // A pulse that plays out once, or with reduced motion just the outline.
            className={`btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3 ${emphasizeTryIt && canTryIt ? 'outline-2 outline-offset-2 outline-primary/60 motion-safe:animate-[try-it-cue_1.4s_ease-out_3]' : ''}`}
          >
            <Play className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Try it</span>
          </button>
        </div>
      )}
      {onUpdate && (
        <div
          className="tooltip tooltip-bottom"
          data-tip="Publish these changes as the pack's next revision"
        >
          <button
            type="button"
            onClick={onUpdate}
            aria-label="Update"
            disabled={isUpdating || isDownloading}
            className="btn btn-sm btn-primary rounded-box flex items-center space-x-1 px-2 lg:px-3"
          >
            {isUpdating ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <CloudUpload className="h-4 w-4 lg:mr-2" />
            )}
            <span className="hidden lg:inline">
              {isUpdating ? 'Updating…' : 'Update'}
            </span>
          </button>
        </div>
      )}
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          aria-label="Download .zip"
          data-tour="download"
          disabled={isDownloading || isUpdating}
          className="btn btn-sm btn-neutral rounded-box flex items-center space-x-1 px-2 lg:px-3"
        >
          {isDownloading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <Download className="h-4 w-4 lg:mr-2" />
          )}
          <span className="hidden lg:inline">
            {isDownloading ? 'Making .zip…' : 'Download .zip'}
          </span>
        </button>
      )}
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
    <NavbarMenu
      tour="pack-type"
      buttonLabel={`${packType} pack`}
      buttonClassName="btn btn-xs btn-outline rounded-full shrink-0 gap-1 border-base-content/20 font-medium"
      items={[
        {
          label: `Switch to ${other.toLowerCase()} pack`,
          onSelect: () => onSwitchPackType(other),
        },
      ]}
    >
      <Icon className="h-3.5 w-3.5" />
      {/* Named from lg; below that the icon says it and the pack name keeps the room */}
      <span className="hidden lg:inline">{packType} pack</span>
      <ChevronDown className="h-3 w-3" />
    </NavbarMenu>
  );
}

export function EditorNavbar({
  session,
  signInHref,
  signInInNewTab,
  onOpenMyPacks,
  workspace,
}: EditorNavbarProps) {
  return (
    <div className="sticky top-0 z-50 w-full bg-base-200 border-b border-base-300">
      <div className="flex px-2 sm:px-4 py-2 items-center justify-between gap-2">
        {/* Left Section  */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Website links: a menu on narrower screens, inline from 1800px up */}
          <div className="dropdown min-[1800px]:hidden">
            <button
              type="button"
              aria-label="Mechvibes website"
              className="btn btn-sm btn-ghost btn-circle"
            >
              <Menu className="h-4 w-4" />
            </button>
            <ul className="dropdown-content menu menu-sm z-50 mt-2 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
              {WEBSITE_LINKS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener">
                    <Icon className="h-4 w-4" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <Logo
            text={`${siteIdentity.productName} Editor`}
            compact={workspace !== undefined}
          />
          <nav
            aria-label="Mechvibes website"
            className="hidden min-[1800px]:flex items-center gap-1 ml-2"
          >
            {WEBSITE_LINKS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener"
                className="btn btn-sm btn-ghost rounded-box px-3 font-normal"
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* Middle Section - Pack Name & Edit */}
        <div className="flex flex-1 items-center justify-center gap-1 min-w-0">
          {workspace && (
            <>
              <button
                type="button"
                onClick={workspace.onEditPack}
                data-tour="pack-details"
                // Shrinks before the chip beside it, so a long name is cut short.
                className="btn btn-sm btn-ghost rounded-box flex flex-nowrap items-center gap-2 min-w-0 shrink px-2 sm:px-3"
              >
                <span className="font-medium truncate">
                  {workspace.packName}
                </span>
                <Pencil className="h-3 w-3 shrink-0" />
              </button>
              <PackTypeChip
                packType={workspace.packType}
                onSwitchPackType={workspace.onSwitchPackType}
              />
            </>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 lg:gap-2 shrink-0">
          {workspace && <PackControls {...workspace} />}

          {/* Library account: signing in and out happens on the website */}
          {session.status === 'signed-out' && (
            <a
              href={signInHref}
              target={signInInNewTab ? '_blank' : undefined}
              rel={signInInNewTab ? 'noopener' : undefined}
              aria-label="Sign in"
              data-tour="account"
              className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3"
            >
              <LogIn className="h-4 w-4 lg:mr-2" />
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
              className="btn btn-sm btn-ghost rounded-box flex items-center gap-2 px-2 lg:px-3"
            >
              <Avatar user={session.user} />
              {/* Inline only on the widest screens, so the pack name keeps its room; the title and the My packs dialog name the user too */}
              <span className="hidden min-[1800px]:inline max-w-[8rem] truncate font-normal">
                {session.user.name}
              </span>
              <FolderOpen className="h-4 w-4 hidden lg:inline xl:hidden" />
              <span className="hidden xl:inline">My packs</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
