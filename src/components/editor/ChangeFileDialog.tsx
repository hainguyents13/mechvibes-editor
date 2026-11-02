import { useEffect, useId, useRef } from 'react';
import { getAudioTrackColor } from '@/components/editor/audio-track-colors';
import type { FileKind } from '@/lib/fileKinds';
import {
  AUDIO_FILE_ACCEPT,
  formatLength,
  isMediaFile,
  VIDEO_FILE_ACCEPT,
} from '@/utils/audioUtils';
import type { AudioSource } from '@/utils/soundPack';

/**
 * Gives one key another file: one of the pack's, or one from the computer.
 * A modal dialog, so the pack cannot change behind it; focus starts on the
 * first file it can take, and Esc closes it.
 */
export function ChangeFileDialog({
  keyName,
  sources,
  kinds,
  currentId,
  onPick,
  onChooseFile,
  onClose,
}: {
  /** The key or button whose file changes, as it reads ("A", "Left button"); null while closed. */
  keyName: string | null;
  sources: readonly AudioSource[];
  kinds: ReadonlyMap<string, FileKind>;
  /** The file the key plays now, which it cannot be given again. */
  currentId: string | null;
  onPick: (id: string) => void;
  onChooseFile: (file: File) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const isOpen = keyName !== null;

  // Stays in the page, so closing it hands focus back to where it was.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClose={onClose}
    >
      {isOpen && (
        <div className="modal-box max-w-md flex flex-col max-h-[80vh]">
          <h2 id={titleId} className="text-lg font-semibold">
            Change the file of {keyName}
          </h2>
          <ul className="mt-3 -mx-2 min-h-0 overflow-y-auto flex flex-col gap-1">
            {sources.map((source) => {
              const isCurrent = source.id === currentId;
              const isOne = kinds.get(source.id) === 'one';
              const color = getAudioTrackColor(source.colorIndex);
              return (
                <li key={source.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 rounded-box px-2 py-2 text-left cursor-pointer hover:bg-base-200 focus-visible:bg-base-200 disabled:cursor-default disabled:hover:bg-transparent"
                    onClick={() => onPick(source.id)}
                    disabled={isCurrent}
                    aria-current={isCurrent || undefined}
                  >
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {source.file.name}
                    </span>
                    <span className="shrink-0 text-xs text-base-content/70">
                      {formatLength(source.duration)} ·{' '}
                      {isOne ? 'one sound' : 'many sounds'}
                      {isCurrent && ' · now'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-sm btn-ghost rounded-box mr-auto"
              onClick={() => inputRef.current?.click()}
            >
              Choose a file…
            </button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={`${AUDIO_FILE_ACCEPT},${VIDEO_FILE_ACCEPT}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file && isMediaFile(file)) onChooseFile(file);
              }}
            />
            <button
              type="button"
              className="btn btn-sm rounded-box"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
    </dialog>
  );
}
