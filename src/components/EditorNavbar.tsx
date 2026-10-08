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
      <div className="flex px-4 py-2 items-center justify-between">
        {/* Left Section  */}
        <div className="flex items-center space-x-2">
          <a href={websiteUrl} className="btn btn-sm btn-ghost btn-circle">
            <ArrowLeft className="h-4 w-4" />
          </a>
          <Logo text={`${siteIdentity.productName} Editor`} />
        </div>

        {/* Middle Section - Pack Name & Edit */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onEditPack}
            className="btn btn-sm btn-ghost rounded-box flex items-center space-x-2"
          >
            <span className="font-medium">{packName}</span>
            <span className="badge badge-xs badge-neutral">
              {editMode === 'time' ? 'Time' : 'File'}
            </span>
            <Pencil className="h-3 w-3" />
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          <a
            href={`${websiteUrl}/guides/editor`}
            className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Guide
          </a>
          <button
            type="button"
            onClick={onNewPack}
            className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1"
          >
            <Plus className="h-3 w-3" />
            New
          </button>
          <div className="tooltip tooltip-bottom" data-tip="Coming soon">
            <button
              type="button"
              onClick={onImport}
              disabled
              className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1"
            >
              <Import className="h-4 w-4 mr-2" />
              Import
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
              disabled={!canPreview}
              className="btn btn-sm btn-ghost rounded-box flex items-center space-x-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Preview
            </button>
          </div>
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting}
            className="btn btn-sm btn-neutral rounded-box flex items-center space-x-1"
          >
            {isExporting ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
