import {
  BookOpen,
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
} from 'lucide-react';
import { useState } from 'react';
import { siteIdentity, websiteUrl } from '@/config/siteIdentity';
import type { LibrarySession } from '@/hooks/useLibrarySession';
import type { LibraryUser } from '@/lib/websiteApi';
import { Logo } from './Logo';

// Website pages, opened in a new tab so the pack being edited stays open.
const WEBSITE_LINKS = [
  { label: 'Home', href: websiteUrl, Icon: House },
  { label: 'Sound packs', href: `${websiteUrl}/sound-packs`, Icon: Library },
  { label: 'Download app', href: `${websiteUrl}/download`, Icon: MonitorDown },
  { label: 'Guide', href: `${websiteUrl}/guides/editor`, Icon: BookOpen },
];

interface EditorNavbarProps {
  packName: string;
  editMode: 'time' | 'file';
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
  editMode,
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
}: EditorNavbarProps) {
  return (
    <div className="sticky top-0 z-50 w-full bg-base-200 border-b border-base-300">
      <div className="flex px-2 sm:px-4 py-2 items-center justify-between gap-2">
        {/* Left Section  */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Website links: a menu on narrower screens, inline from 2xl up */}
          <div className="dropdown 2xl:hidden">
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
            className="hidden 2xl:flex items-center gap-1 ml-2"
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
            className="btn btn-sm btn-ghost rounded-box flex flex-nowrap items-center gap-2 min-w-0 max-w-full px-2 sm:px-3"
          >
            <span className="font-medium truncate">{packName}</span>
            <span className="badge badge-xs badge-neutral hidden sm:inline-flex">
              {editMode === 'time' ? 'Time' : 'File'}
            </span>
            <Pencil className="h-3 w-3 shrink-0" />
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 lg:gap-2 shrink-0">
          <button
            type="button"
            onClick={onNewPack}
            aria-label="New pack"
            className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden lg:inline">New</span>
          </button>
          <div
            className="tooltip tooltip-bottom"
            data-tip="Open a sound pack zip to change it"
          >
            <button
              type="button"
              onClick={onImport}
              aria-label="Import"
              className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3"
            >
              <Import className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Import</span>
            </button>
          </div>
          <div
            className="tooltip tooltip-bottom"
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
              aria-label={`My packs (signed in as ${session.user.name})`}
              title={`Signed in as ${session.user.name}`}
              className="btn btn-sm btn-ghost rounded-box flex items-center gap-2 px-2 lg:px-3"
            >
              <Avatar user={session.user} />
              <span className="hidden xl:inline max-w-[8rem] truncate font-normal">
                {session.user.name}
              </span>
              <FolderOpen className="h-4 w-4 hidden lg:inline xl:hidden" />
              <span className="hidden lg:inline">My packs</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
