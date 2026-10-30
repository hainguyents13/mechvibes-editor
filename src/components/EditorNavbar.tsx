import {
  ArrowLeft,
  BookOpen,
  Download,
  Import,
  Pencil,
  Play,
  Plus,
} from 'lucide-react';
import { siteIdentity, websiteUrl } from '@/config/siteIdentity';
import { Logo } from './Logo';

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
}: EditorNavbarProps) {
  return (
    <div className="sticky top-0 z-50 w-full bg-base-200 border-b border-base-300">
      <div className="flex px-2 sm:px-4 py-2 items-center justify-between gap-2">
        {/* Left Section  */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <a
            href={websiteUrl}
            aria-label="Back to the Mechvibes website"
            className="btn btn-sm btn-ghost btn-circle"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <Logo text={`${siteIdentity.productName} Editor`} />
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
          <a
            href={`${websiteUrl}/guides/editor`}
            aria-label="Guide"
            className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3"
          >
            <BookOpen className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Guide</span>
          </a>
          <button
            type="button"
            onClick={onNewPack}
            aria-label="New pack"
            className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1 px-2 lg:px-3"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden lg:inline">New</span>
          </button>
          <div className="tooltip tooltip-bottom" data-tip="Coming soon">
            <button
              type="button"
              onClick={onImport}
              aria-label="Import"
              disabled
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
          <button
            type="button"
            onClick={onExport}
            aria-label="Export"
            disabled={isExporting}
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
        </div>
      </div>
    </div>
  );
}
