import { Ellipsis, Music, Play, Plus, Square, Video } from 'lucide-react';
import React from 'react';
import { getAudioTrackColor } from '@/components/editor/audio-track-colors';
import { NavbarMenu } from '@/components/NavbarMenu';
import type { FileKind } from '@/lib/fileKinds';
import { keyLabel } from '@/lib/keyNames';
import { cn, plural } from '@/lib/utils';
import { formatDuration, formatLength, isMediaFile } from '@/utils/audioUtils';
import type { AudioSource } from '@/utils/soundPack';

interface AudioFileSelectorProps {
  sources: AudioSource[];
  activeSourceId: string | null;
  /** The kind of each file, which decides how its row reads and what a click does. */
  kinds: ReadonlyMap<string, FileKind>;
  /** Codes of the keys that play each file, in pack order. */
  codesBySource: Map<string, string[]>;
  /** Keys or buttons selected; a click on a file of one sound gives it to them. */
  selectedCount: number;
  /** What the pack's keys are called: 'key' or 'button'. */
  noun: string;
  /** Stacked, the most the list takes before it scrolls, when less than usual. */
  listMaxHeight?: number;
  /** The key card follows in the column: the list gives way to it down to one row. */
  hasKeyCard?: boolean;
  /** The file whose sound is playing from its row, if any. */
  playingSourceId: string | null;
  onPlay: (id: string) => void;
  /** Open a file, or give a file of one sound to the selected keys. */
  onSelect: (id: string) => void;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onSetKind: (id: string, kind: FileKind) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

/** Short format label from a MIME type, e.g. "audio/mpeg" -> "MPEG". */
function formatLabel(file: File): string {
  const subtype = file.type.split('/')[1] ?? '';
  return (subtype.replace(/^x-/, '') || 'unknown').toUpperCase();
}

/** The keys that play a file, for its row: "A", "A, S, D +3", "no key yet". */
function keysText(codes: readonly string[], noun: string) {
  if (codes.length === 0) return `no ${noun} yet`;
  const shown = codes.slice(0, 3).map(keyLabel).join(', ');
  return codes.length > 3 ? `${shown} +${codes.length - 3}` : shown;
}

/** Takes the focus when the first file comes in and the ways to add one go. */
export const SOURCES_HEADING_ID = 'audio-sources-heading';
/** The list of files, which the panel measures. */
export const FILE_LIST_SELECTOR = '[data-file-list]';

// Files dropped here reach the page-wide drop handler, which adds them the
// same way as the file picker.
export function AudioFileSelector({
  sources,
  activeSourceId,
  kinds,
  codesBySource,
  selectedCount,
  noun,
  listMaxHeight,
  hasKeyCard = false,
  playingSourceId,
  onPlay,
  onSelect,
  onAdd,
  onRemove,
  onSetKind,
  videoRef,
}: AudioFileSelectorProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const detailsIdBase = React.useId();
  const [pendingRemoval, setPendingRemoval] =
    React.useState<AudioSource | null>(null);

  // The open file's row stays in view: an add opens a file at the end of a
  // long list, and a selected key opens the file it plays. Only the list
  // scrolls, not the page around it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a file added or removed, or a shorter list, moves the row too, as does the key card taking room
  React.useLayoutEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>('[data-active]');
    if (!list || !row) return;
    const view = list.getBoundingClientRect();
    const { top, bottom } = row.getBoundingClientRect();
    if (top < view.top) list.scrollTop -= view.top - top;
    else if (bottom > view.bottom) list.scrollTop += bottom - view.bottom;
  }, [activeSourceId, sources.length, listMaxHeight, hasKeyCard]);

  const addFiles = (files: FileList | null) => {
    const media = Array.from(files ?? []).filter(isMediaFile);
    if (media.length > 0) onAdd(media);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = '';
  };

  const keyCountOf = (id: string) => codesBySource.get(id)?.length ?? 0;

  const requestRemoval = (source: AudioSource) => {
    if (keyCountOf(source.id) > 0) {
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
  // The clip plays along with the waveform, which only a file of many sounds has.
  const isVideo =
    (activeSource?.file.type.startsWith('video/') ?? false) &&
    kinds.get(activeSource?.id ?? '') !== 'one';

  return (
    <div
      className={cn(
        'flex-1 min-w-0 flex flex-col gap-3',
        // With the card, the column scrolls rather than squeeze the list
        // below its heading and one row, or the heading and the short list
        // over a clip, which gives way first.
        hasKeyCard ? (isVideo ? 'min-h-37' : 'min-h-23') : 'min-h-0',
      )}
    >
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h2
          id={SOURCES_HEADING_ID}
          tabIndex={-1}
          className="text-xs font-medium text-base-content focus:outline-none"
        >
          Your sounds ({sources.length})
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
          shown beside the list. Stacked, a long list scrolls on its own, so
          the open file's controls stay near. */}
      <ul
        ref={listRef}
        data-file-list
        className={cn(
          'min-h-0 overflow-y-auto flex flex-col gap-2',
          isVideo ? 'shrink-0 max-h-28' : 'flex-1 max-lg:max-h-72',
          hasKeyCard && 'min-h-14',
        )}
        // Never taller than max-h-72.
        style={
          listMaxHeight === undefined
            ? undefined
            : { maxHeight: `min(18rem, ${listMaxHeight}px)` }
        }
      >
        {sources.map((source) => {
          const color = getAudioTrackColor(source.colorIndex);
          const isActive = source.id === activeSourceId;
          const codes = codesBySource.get(source.id) ?? [];
          const name = source.file.name;
          const isOne = kinds.get(source.id) === 'one';
          // A file of one sound goes to the selected keys when clicked.
          const gives = isOne && selectedCount > 0;
          const action = gives
            ? `Give ${name} to ${plural(selectedCount, noun)}`
            : isOne
              ? `Show ${name}`
              : `Show ${name} in the waveform`;
          const isPlaying = playingSourceId === source.id;
          const Icon = source.file.type.startsWith('video/') ? Video : Music;
          const sizeMb = `${(source.file.size / (1024 * 1024)).toFixed(1)} MB`;
          // The row is named for what a click does; its length and keys
          // describe it.
          const detailsId = `${detailsIdBase}-${source.id}`;
          return (
            <li
              key={source.id}
              data-active={isActive || undefined}
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
              {isOne && (
                <button
                  type="button"
                  className="shrink-0 ml-1 btn btn-xs btn-ghost btn-square rounded-box"
                  onClick={() => onPlay(source.id)}
                  aria-label={`${isPlaying ? 'Stop' : 'Play'} ${name}`}
                  title={isPlaying ? 'Stop' : 'Play'}
                >
                  {isPlaying ? (
                    <Square className={`h-3 w-3 ${color.text}`} />
                  ) : (
                    <Play className={`h-3 w-3 ${color.text}`} />
                  )}
                </button>
              )}
              <button
                type="button"
                className={cn(
                  'min-w-0 flex-1 flex items-center gap-3 p-2 text-left cursor-pointer',
                  isOne ? 'pl-1' : 'pl-3',
                )}
                onClick={() => onSelect(source.id)}
                aria-pressed={isActive}
                aria-label={action}
                aria-describedby={detailsId}
                title={
                  gives ? `${action}, in place of the sound they have` : action
                }
              >
                {!isOne && (
                  <Icon className={`h-4 w-4 shrink-0 mr-1 ${color.text}`} />
                )}
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'text-xs text-base-content truncate',
                      isActive ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {name}
                  </div>
                  <div
                    id={detailsId}
                    className="text-[10px] text-base-content/70"
                  >
                    {isOne ? (
                      <>
                        {formatLength(source.duration)} •{' '}
                        {keysText(codes, noun)}
                      </>
                    ) : (
                      <>
                        {formatLabel(source.file)} • {sizeMb} •{' '}
                        {formatDuration(source.duration)} •{' '}
                        {plural(codes.length, noun)}
                      </>
                    )}
                  </div>
                </div>
              </button>
              <NavbarMenu
                align="end"
                buttonLabel={`More for ${name}`}
                buttonClassName="shrink-0 mr-1 btn btn-xs btn-ghost btn-square rounded-box"
                items={[
                  isOne
                    ? {
                        label: 'This file has several sounds',
                        onSelect: () => onSetKind(source.id, 'many'),
                      }
                    : {
                        label: 'This file is one sound',
                        onSelect: () => onSetKind(source.id, 'one'),
                      },
                  { label: 'Remove', onSelect: () => requestRemoval(source) },
                ]}
              >
                <Ellipsis className="h-3 w-3" />
              </NavbarMenu>
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
              {keyCountOf(pendingRemoval.id) === 1
                ? `1 ${noun} uses this file and loses its sound.`
                : `${keyCountOf(pendingRemoval.id)} ${noun}s use this file and lose their sound.`}{' '}
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
