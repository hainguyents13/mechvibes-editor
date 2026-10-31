import {
  BookOpen,
  CircleHelp,
  CloudUpload,
  Download,
  FolderOpen,
  House,
  Import,
  Library,
  LogIn,
  Menu,
  MonitorDown,
  Pencil,
  Play,
  Plus,
  Redo2,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { siteIdentity, websiteUrl } from '@/config/siteIdentity';
import type { LibrarySession } from '@/hooks/useLibrarySession';
import { IS_MAC } from '@/lib/utils';
import type { LibraryUser } from '@/lib/websiteApi';
import type { PackType } from '@/utils/soundPack';
import { Logo } from './Logo';

// Website pages, opened in a new tab so the pack being edited stays open.
const WEBSITE_LINKS = [
  { label: 'Home', href: websiteUrl, Icon: House },
  { label: 'Sound packs', href: `${websiteUrl}/sound-packs`, Icon: Library },
  { label: 'Download app', href: `${websiteUrl}/download`, Icon: MonitorDown },
  { label: 'Guide', href: `${websiteUrl}/guides/editor`, Icon: BookOpen },
];

const UNDO_SHORTCUT = IS_MAC ? '⌘Z' : 'Ctrl+Z';
const REDO_SHORTCUT = IS_MAC ? '⇧⌘Z' : 'Ctrl+Y';

interface EditorNavbarProps {
  packName: string;
  packType: PackType;
  onEditPack: () => void;
  onNewPack: () => void;
  onImport: () => void;
  onExport: () => void;
  isExporting?: boolean;
  onPreview: () => void;
  /** Preview needs a loaded file and at least one mapped key to be useful. */
  canPreview?: boolean;
  session: LibrarySession;
  signInHref: string;
  /** Sign in in a new tab, so the work in this one survives the round trip. */
  signInInNewTab: boolean;
  onOpenMyPacks: () => void;
  /** Set while a library pack is open and the visitor is signed in. */
  onUpdate?: () => void;
  isUpdating?: boolean;
  /** Show the guided tour of the editor. */
  onStartTour: () => void;
  /** Name of the action Undo reverts, or null when there is nothing to undo. */
  undoLabel: string | null;
  /** Name of the action Redo applies again, or null when there is nothing to redo. */
  redoLabel: string | null;
  onUndo: () => void;
  onRedo: () => void;
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

export function EditorNavbar({
  packName,
  packType,
  onEditPack,
  onNewPack,
  onImport,
  onExport,
  isExporting = false,
  onPreview,
  canPreview = false,
  session,
  signInHref,
  signInInNewTab,
  onOpenMyPacks,
  onUpdate,
  isUpdating = false,
  onStartTour,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
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
          <Logo text={`${siteIdentity.productName} Editor`} />
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
        <div className="flex flex-1 items-center justify-center min-w-0">
          <button
            type="button"
            onClick={onEditPack}
            data-tour="pack-details"
            className="btn btn-sm btn-ghost rounded-box flex flex-nowrap items-center gap-2 min-w-0 max-w-full px-2 sm:px-3"
          >
            <span className="font-medium truncate">{packName}</span>
            {/* Shown from xl only: below that the buttons on the right leave the name little room */}
            <span className="badge badge-xs badge-neutral hidden xl:inline-flex shrink-0">
              {packType}
            </span>
            <Pencil className="h-3 w-3 shrink-0" />
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 lg:gap-2 shrink-0">
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
          <div
            className="tooltip tooltip-bottom"
            data-tip="Show where to start"
          >
            <button
              type="button"
              onClick={onStartTour}
              aria-label="Tour"
              className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3"
            >
              <CircleHelp className="h-4 w-4 xl:mr-2" />
              <span className="hidden xl:inline">Tour</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onNewPack}
            aria-label="New pack"
            className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3"
          >
            <Plus className="h-3 w-3" />
            {/* New and Import are labelled from xl, so the pack name keeps room at lg */}
            <span className="hidden xl:inline">New</span>
          </button>
          <div
            className="tooltip tooltip-bottom"
            data-tip="Open a sound pack zip to change it"
            data-tour="import"
          >
            <button
              type="button"
              onClick={onImport}
              aria-label="Import"
              className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3"
            >
              <Import className="h-4 w-4 xl:mr-2" />
              <span className="hidden xl:inline">Import</span>
            </button>
          </div>
          <div
            className="tooltip tooltip-bottom"
            data-tour="preview"
            data-tip={
              canPreview
                ? 'Try the pack on your keyboard'
                : 'Assign a sound to at least one key first'
            }
          >
            <button
              type="button"
              onClick={onPreview}
              aria-label="Preview"
              disabled={!canPreview}
              className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3"
            >
              <Play className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Preview</span>
            </button>
          </div>
          {onUpdate && (
            <div
              className="tooltip tooltip-bottom"
              data-tip="Publish these changes as the pack's next revision"
            >
              <button
                type="button"
                onClick={onUpdate}
                aria-label="Update"
                disabled={isUpdating || isExporting}
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
          <button
            type="button"
            onClick={onExport}
            aria-label="Export"
            data-tour="export"
            disabled={isExporting || isUpdating}
            className="btn btn-sm btn-neutral rounded-box flex items-center space-x-1 px-2 lg:px-3"
          >
            {isExporting ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <Download className="h-4 w-4 lg:mr-2" />
            )}
            <span className="hidden lg:inline">
              {isExporting ? 'Exporting…' : 'Export'}
            </span>
          </button>

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
