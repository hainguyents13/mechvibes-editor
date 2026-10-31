import { Music, Plus, Video, X } from 'lucide-react';
import React from 'react';
import { getAudioTrackColor } from '@/components/editor/audio-track-colors';
import { cn } from '@/lib/utils';
import { formatDuration, isMediaFile } from '@/utils/audioUtils';
import type { AudioSource } from '@/utils/soundPack';

interface AudioFileSelectorProps {
  sources: AudioSource[];
  activeSourceId: string | null;
  /** How many keys use each source. */
  keyCounts: Map<string, number>;
  onSelect: (id: string) => void;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

/** Short format label from a MIME type, e.g. "audio/mpeg" -> "MPEG". */
function formatLabel(file: File): string {
  const subtype = file.type.split('/')[1] ?? '';
  return (subtype.replace(/^x-/, '') || 'unknown').toUpperCase();
}

// Files dropped here reach the page-wide drop handler, which adds them the
// same way as the file picker.
export function AudioFileSelector({
  sources,
  activeSourceId,
  keyCounts,
  onSelect,
  onAdd,
  onRemove,
  videoRef,
}: AudioFileSelectorProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pendingRemoval, setPendingRemoval] =
    React.useState<AudioSource | null>(null);

  const addFiles = (files: FileList | null) => {
    const media = Array.from(files ?? []).filter(isMediaFile);
    if (media.length > 0) onAdd(media);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = '';
  };

  const requestRemoval = (source: AudioSource) => {
    if ((keyCounts.get(source.id) ?? 0) > 0) {
      setPendingRemoval(source);
    } else {
      onRemove(source.id);
    }
  };

  const fileInput = (
    <input
      ref={inputRef}
      id="audio-file-input"
      type="file"
      className="hidden"
      accept="audio/*,video/*"
      multiple
      onChange={handleInputChange}
    />
  );

  // Before the first file the workspace offers its own ways to add one.
  if (sources.length === 0) return null;

  const activeSource = sources.find((source) => source.id === activeSourceId);
  const isVideo = activeSource?.file.type.startsWith('video/') ?? false;

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-xs font-medium text-base-content">
          Audio sources ({sources.length})
        </h2>
        <button
          type="button"
          className="btn btn-xs btn-ghost rounded-box"
          onClick={() => inputRef.current?.click()}
          title="Add audio or video files. Keys can each use a different file."
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
        {fileInput}
      </div>

      {/* One row per source in its own fixed colour; the selected one is
          shown in the waveform. */}
      <ul
        className={cn(
          'min-h-0 overflow-y-auto flex flex-col gap-2',
          isVideo ? 'shrink-0 max-h-28' : 'flex-1',
        )}
      >
        {sources.map((source) => {
          const color = getAudioTrackColor(source.colorIndex);
          const isActive = source.id === activeSourceId;
          const keyCount = keyCounts.get(source.id) ?? 0;
          const Icon = source.file.type.startsWith('video/') ? Video : Music;
          const sizeMb = `${(source.file.size / (1024 * 1024)).toFixed(1)} MB`;
          return (
            <li
              key={source.id}
              className={cn(
                'flex items-center gap-1 rounded-box border border-l-4',
                color.bg,
                isActive
                  ? 'border-base-content/40 ring-1 ring-base-content/20'
                  : 'border-base-content/10',
                // After the border colour, or cn drops it as overridden.
                color.border,
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 flex items-center gap-3 p-2 pl-3 text-left cursor-pointer"
                onClick={() => onSelect(source.id)}
                aria-pressed={isActive}
                title={`Show ${source.file.name} in the waveform`}
              >
                <Icon className={`h-4 w-4 shrink-0 mr-1 ${color.text}`} />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'text-xs text-base-content truncate',
                      isActive ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {source.file.name}
                  </div>
                  <div className="text-[10px] text-base-content/60">
                    {formatLabel(source.file)} • {sizeMb} •{' '}
                    {formatDuration(source.duration)} •{' '}
                    {keyCount === 1 ? '1 key' : `${keyCount} keys`}
                  </div>
                </div>
              </button>
              <button
                type="button"
                className="shrink-0 mr-1 btn btn-xs btn-ghost btn-square rounded-box text-error"
                onClick={() => requestRemoval(source)}
                title={`Remove ${source.file.name}`}
                aria-label={`Remove ${source.file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          );
        })}
      </ul>

      {isVideo && (
        /* Video: the preview takes the rest of the panel so portrait clips stay as large as possible */
        <div className="flex-1 min-h-0 rounded-box flex items-center justify-center overflow-hidden">
          {/* src is assigned by CombinedWaveform, which uses this element as its media source */}
          {/* biome-ignore lint/a11y/useMediaCaption: user-supplied video, no captions exist */}
          <video
            ref={videoRef}
            controls
            className="max-w-full max-h-full rounded-box object-contain"
          />
        </div>
      )}

      {pendingRemoval && (
        <dialog
          className="modal modal-open"
          onClose={() => setPendingRemoval(null)}
        >
          <div className="modal-box">
            <h3 className="text-base font-semibold">
              Remove {pendingRemoval.file.name}?
            </h3>
            <p className="py-3 text-sm text-base-content/70">
              {keyCounts.get(pendingRemoval.id) === 1
                ? '1 key uses this file and loses its sound.'
                : `${keyCounts.get(pendingRemoval.id)} keys use this file and lose their sound.`}{' '}
              You can undo this.
            </p>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-sm rounded-box"
                onClick={() => setPendingRemoval(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-error rounded-box"
                onClick={() => {
                  onRemove(pendingRemoval.id);
                  setPendingRemoval(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label="Close"
            onClick={() => setPendingRemoval(null)}
          />
        </dialog>
      )}
    </div>
  );
}
