import {
  ClearSelectedButton,
  ResetAllButton,
} from '@/components/editor/ClearKeysButtons';
import { PANEL_LABEL_CLASS } from '@/components/editor/TimeSegmentControls';
import { Info, Play, Square } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { keyLabel } from '@/lib/keyNames';
import { cn } from '@/lib/utils';
import { formatLength } from '@/utils/audioUtils';
import type { AudioSource, KeySounds } from '@/utils/soundPack';

/** The keys that play the file, for "Plays on": the first few, then how many more. */
function playsOn(codes: readonly string[]) {
  const shown = codes.slice(0, 6).map(keyLabel).join(', ');
  return codes.length > 6 ? `${shown} +${codes.length - 6}` : shown;
}

/**
 * The open file when it is one sound: no waveform to cut, only the sound to
 * hear and the keys to give it to. A click on the file in the list gives it
 * too, so trying one file after another on the same keys takes one click each.
 */
export function OneSoundPane({
  source,
  codes,
  noun,
  isPlaying,
  onPlay,
  onGive,
  given,
  selectedCodes,
  keySounds,
  commitKeySounds,
  onClearSelected,
  hiddenCount,
}: {
  source: AudioSource;
  /** Codes of the keys that play the file. */
  codes: readonly string[];
  /** What the pack's keys are called: 'key' or 'button'. */
  noun: string;
  isPlaying: boolean;
  onPlay: () => void;
  /** Give the file to the selected keys. */
  onGive: () => void;
  /** The selected keys play the file already, so giving it changes nothing. */
  given: boolean;
  selectedCodes: string[];
  keySounds: KeySounds;
  commitKeySounds: (
    label: string,
    update: (keySounds: KeySounds) => KeySounds,
  ) => void;
  onClearSelected: () => void;
  hiddenCount: number;
}) {
  const count = selectedCodes.length;
  return (
    <section aria-label="Sound" className="shrink-0 min-w-0 px-5">
      <h2 className={cn(PANEL_LABEL_CLASS, 'm-0 mb-2.5')}>Sound</h2>
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
        <p className="m-0 min-w-0 max-w-full truncate text-sm font-bold text-mv-ink">
          {source.file.name}{' '}
          <span className="ml-1 font-code text-xs font-normal text-mv-subtle">
            {formatLength(source.duration)}
          </span>
        </p>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-9 px-3.5',
            isPlaying && 'bg-mv-fill text-mv-ink',
          )}
          onClick={onPlay}
          title={isPlaying ? 'Stop (Space)' : 'Play the sound (Space)'}
        >
          {isPlaying ? (
            <Square className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        <p className="m-0 min-w-0 text-xs text-mv-subtle">
          {codes.length > 0
            ? `Plays on: ${playsOn(codes)}`
            : `No ${noun} uses it yet.`}
        </p>
        <button
          type="button"
          className={buttonVariants({ variant: 'primary' })}
          onClick={onGive}
          disabled={count === 0 || given}
          title={
            given
              ? `The selected ${noun}s play ${source.file.name} already`
              : `Give ${source.file.name} to the selected ${noun}s, in place of the sound they have`
          }
        >
          {count === 0
            ? `Give to selected ${noun}s`
            : `Give to ${count} selected ${noun}${count === 1 ? '' : 's'}`}
        </button>
        <ClearSelectedButton
          selectedCodes={selectedCodes}
          keySounds={keySounds}
          onClearSelected={onClearSelected}
          noun={noun}
        />
        <ResetAllButton
          keySounds={keySounds}
          hiddenCount={hiddenCount}
          commitKeySounds={commitKeySounds}
          noun={noun}
        />
      </div>
      {count === 0 && (
        <p className="m-0 mt-2.5 flex items-center gap-1.5 text-xs text-mv-subtle">
          <Info className="size-3.5 shrink-0" />
          Select {noun}s first.
        </p>
      )}
    </section>
  );
}
