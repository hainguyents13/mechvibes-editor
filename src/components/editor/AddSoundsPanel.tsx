import {
  AudioLines,
  ChevronRight,
  CircleAlert,
  Files,
  type LucideIcon,
  Video,
} from 'lucide-react';
import { useRef } from 'react';
import { STRETCHED_ACTION } from '@/components/start/StartPage';
import { sortChosenFolder } from '@/lib/dropRouting';
import type { AddTile as TileKind } from '@/lib/fileKinds';
import {
  AUDIO_FILE_ACCEPT,
  isMediaFile,
  VIDEO_FILE_ACCEPT,
} from '@/utils/audioUtils';
import type { PackType } from '@/utils/soundPack';

/** How files came in: the tile chosen, and the names of files left out. */
export type AddOptions = { tile?: TileKind; skipped?: string[] };

interface Tile {
  kind: TileKind;
  Icon: LucideIcon;
  title: string;
  hint: string;
  action: string;
  accept: string;
  multiple: boolean;
}

function tilesFor(packType: PackType): Tile[] {
  const isMouse = packType === 'Mouse';
  return [
    {
      kind: 'recording',
      Icon: AudioLines,
      title: isMouse ? 'One recording of clicks' : 'One recording of typing',
      hint: isMouse
        ? 'One audio file with many clicks'
        : 'One audio file with many key presses',
      action: 'Choose file',
      accept: AUDIO_FILE_ACCEPT,
      multiple: false,
    },
    {
      kind: 'per-key',
      Icon: Files,
      title: isMouse ? 'One file for each button' : 'One file for each key',
      hint: isMouse
        ? 'Short files, like left.wav, right.wav, wheel.wav'
        : 'Short files, like a.wav, space.wav, enter.mp3',
      action: 'Choose files',
      accept: AUDIO_FILE_ACCEPT,
      multiple: true,
    },
    {
      kind: 'video',
      Icon: Video,
      title: isMouse ? 'A video of clicking' : 'A video of typing',
      hint: 'Only its sound goes in the pack',
      action: 'Choose video',
      accept: VIDEO_FILE_ACCEPT,
      multiple: false,
    },
  ];
}

function recordingTips(packType: PackType) {
  return packType === 'Mouse'
    ? {
        title: 'How to record your mouse',
        steps: [
          'Put your phone next to the mouse in a quiet room.',
          'Click each button once, slowly, then turn the wheel one step each way.',
          'Send the recording to this computer, then choose "One recording of clicks".',
        ],
      }
    : {
        title: 'How to record your keyboard',
        steps: [
          'Put your phone next to the keyboard in a quiet room.',
          'Press each key once, slowly, row by row from the top left.',
          'Send the recording to this computer, then choose "One recording of typing".',
        ],
      };
}

function AddTile({
  tile,
  inputId,
  onAdd,
}: {
  tile: Tile;
  inputId?: string;
  onAdd: (files: File[], options: AddOptions) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { Icon } = tile;
  // The tile of files for each key also takes a whole folder of them.
  const takesFolder = tile.kind === 'per-key';
  return (
    <section className="relative flex flex-col rounded-box border border-base-300 bg-base-100 p-4 shadow-sm transition hover:border-primary/60 hover:shadow-md">
      <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
      <h3 className="mt-2 text-sm font-semibold">{tile.title}</h3>
      <p className="mt-0.5 text-xs text-base-content/70">{tile.hint}</p>
      <div className="mt-auto pt-3 flex flex-wrap gap-2">
        <button
          type="button"
          // Named with its tile, so the three tell apart in a list of
          // buttons: Choose file and Choose files differ by one letter.
          aria-label={`${tile.action}: ${tile.title}`}
          // The workspace opens under the pointer that chose Keyboard or
          // Mouse, so the second click of a double click would land here.
          onClick={(event) => {
            if (event.detail > 1) return;
            inputRef.current?.click();
          }}
          className={`btn btn-sm btn-neutral rounded-box ${STRETCHED_ACTION}`}
        >
          {tile.action}
        </button>
        {takesFolder && (
          <button
            type="button"
            aria-label={`Choose folder: ${tile.title}`}
            onClick={(event) => {
              if (event.detail > 1) return;
              folderInputRef.current?.click();
            }}
            // Above the overlay that makes the whole tile choose files.
            className="relative z-10 btn btn-sm btn-ghost rounded-box"
          >
            Choose folder
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="hidden"
        accept={tile.accept}
        multiple={tile.multiple}
        onChange={(event) => {
          const media = Array.from(event.target.files ?? []).filter(
            isMediaFile,
          );
          event.target.value = '';
          if (media.length > 0) onAdd(media, { tile: tile.kind });
        }}
      />
      {takesFolder && (
        <input
          // React has no prop for it yet. A folder picker ignores accept, so
          // the files are sorted here.
          ref={(input) => {
            folderInputRef.current = input;
            if (input) input.webkitdirectory = true;
          }}
          type="file"
          className="hidden"
          multiple
          onChange={(event) => {
            const chosen = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (chosen.length === 0) return;
            // The tile said one file for each key, so a pack folder's
            // config.json is only one more file left out.
            const { media, skipped } = sortChosenFolder(chosen);
            onAdd(media, { tile: tile.kind, skipped });
          }}
        />
      )}
    </section>
  );
}
/** Takes the focus when the last file goes and these ways in come back. */
export const ADD_SOUNDS_HEADING_ID = 'add-sounds-heading';

/**
 * The empty workspace: ways to add the pack's first sounds, each opening a
 * file picker that fits it. A drop anywhere on the page works too.
 */
export function AddSoundsPanel({
  packType,
  onAdd,
  status,
}: {
  packType: PackType;
  onAdd: (files: File[], options: AddOptions) => void;
  /** Files being read, or why some could not be added: under the tiles. */
  status: { tone: 'info' | 'error'; text: string } | null;
}) {
  const tips = recordingTips(packType);
  return (
    <div
      data-tour="add-sounds"
      className="shrink-0 max-h-[60dvh] overflow-y-auto editor-panel-surface border-t-2 border-base-content/20"
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-4">
        <h2
          id={ADD_SOUNDS_HEADING_ID}
          tabIndex={-1}
          className="text-center text-sm font-semibold focus:outline-none"
        >
          What sounds do you have?
        </h2>
        <div data-tour="add-tiles" className="mt-3 grid gap-3 md:grid-cols-3">
          {tilesFor(packType).map((tile) => (
            <AddTile
              key={tile.title}
              tile={tile}
              // The same id as the file list's Add input, which takes over once
              // a file is in.
              inputId={tile.multiple ? 'audio-file-input' : undefined}
              onAdd={onAdd}
            />
          ))}
        </div>
        {status &&
          (status.tone === 'error' ? (
            <p
              role="alert"
              className="mt-3 flex items-start justify-center gap-1.5 text-sm text-error-strong"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{status.text}</span>
            </p>
          ) : (
            <output className="mt-3 block text-center text-sm text-base-content/70">
              {status.text}
            </output>
          ))}
        <div className="mt-3 flex flex-col items-center gap-1 text-center text-xs text-base-content/70">
          <p data-tour="drop">
            Or drop files anywhere. MP3, WAV, OGG, FLAC, M4A, MP4, WEBM, MOV
          </p>
          {packType === 'Mouse' && (
            <p>Wheel sounds play on Linux only for now.</p>
          )}
          <p>Recorded on your phone? Send the file to this computer first.</p>
          <p>Only have a YouTube link? Download the video first.</p>
          <details className="group">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              No recording yet?{' '}
              <span className="link font-medium text-base-content/80">
                {tips.title}
              </span>
              <ChevronRight
                className="ml-0.5 inline h-3 w-3 transition-transform group-open:rotate-90"
                aria-hidden="true"
              />
            </summary>
            <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-left text-base-content/70">
              {tips.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}
