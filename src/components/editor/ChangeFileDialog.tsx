import { useRef } from 'react';
import { getAudioTrackColor } from '@/components/editor/audio-track-colors';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReturnFocus } from '@/hooks/useReturnFocus';
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
 * first file it can take, Esc closes it, and closing it hands focus back to
 * where it was.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpen = keyName !== null;
  const returnFocus = useReturnFocus();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <DialogContent
          {...returnFocus}
          aria-describedby={undefined}
          className="flex max-h-[80vh] flex-col p-[22px]"
        >
          <DialogTitle>Change the file of {keyName}</DialogTitle>
          <ul className="-mx-2 mt-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto">
            {sources.map((source) => {
              const isCurrent = source.id === currentId;
              const isOne = kinds.get(source.id) === 'one';
              const color = getAudioTrackColor(source.colorIndex);
              return (
                <li key={source.id}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-mv-ink outline-none transition-colors hover:bg-mv-fill focus-visible:bg-mv-fill focus-visible:shadow-[inset_0_0_0_1px_var(--mv-line-strong)] disabled:cursor-default disabled:bg-mv-raised"
                    onClick={() => onPick(source.id)}
                    disabled={isCurrent}
                    aria-current={isCurrent || undefined}
                  >
                    <span
                      aria-hidden
                      className={`size-2.5 shrink-0 rounded-full ${color.dot}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">
                      {source.file.name}
                    </span>
                    <span className="shrink-0 font-code text-xs text-mv-subtle">
                      {formatLength(source.duration)} ·{' '}
                      {isOne ? 'one sound' : 'many sounds'}
                      {isCurrent && ' · now'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button
              variant="ghost"
              className="mr-auto"
              onClick={() => inputRef.current?.click()}
            >
              Choose a file…
            </Button>
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
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
