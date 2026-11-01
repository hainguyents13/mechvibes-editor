import { Info, Play, Square } from 'lucide-react';
import type React from 'react';
import {
  ClearSelectedButton,
  ResetAllButton,
} from '@/components/editor/ClearKeysButtons';
import type { LayoutKey } from '@/components/editor/keyboardLayouts';
import { QuickSelect } from '@/components/editor/QuickSelect';
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
  selectedKeys,
  setSelectedKeys,
  selectedCodes,
  keySounds,
  commitKeySounds,
  onClearSelected,
  hiddenCount,
  keys,
  getKeyId,
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
  selectedKeys: Set<string>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedCodes: string[];
  keySounds: KeySounds;
  commitKeySounds: (
    label: string,
    update: (keySounds: KeySounds) => KeySounds,
  ) => void;
  onClearSelected: () => void;
  hiddenCount: number;
  /** Keys of the current layout for Quick select; none in a mouse pack. */
  keys?: LayoutKey[];
  getKeyId?: (key: LayoutKey, index: number) => string;
}) {
  const count = selectedCodes.length;
  return (
    <>
      <fieldset className="fieldset py-0 px-4 shrink-0 min-w-0">
        <legend className="fieldset-legend">
          <h2 className="text-xs font-medium text-base-content">Sound</h2>
        </legend>
        {/* One row where it fits, so a short panel keeps Quick select in view. */}
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <p className="min-w-0 max-w-full truncate text-sm font-semibold text-base-content">
            {source.file.name}{' '}
            <span className="ml-1 text-xs font-normal text-base-content/70">
              {formatLength(source.duration)}
            </span>
          </p>
          <button
            type="button"
            className={cn('btn btn-sm rounded-box', isPlaying && 'btn-active')}
            onClick={onPlay}
            title={isPlaying ? 'Stop (Space)' : 'Play the sound (Space)'}
          >
            {isPlaying ? (
              <Square className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <p className="min-w-0 text-xs text-base-content/70">
            {codes.length > 0
              ? `Plays on: ${playsOn(codes)}`
              : `No ${noun} uses it yet.`}
          </p>
          <div>
            <button
              type="button"
              className="btn btn-sm btn-primary rounded-box"
              onClick={onGive}
              disabled={count === 0}
              title={`Give ${source.file.name} to the selected ${noun}s, in place of the sound they have`}
            >
              {count === 0
                ? `Give to selected ${noun}s`
                : `Give to ${count} selected ${noun}${count === 1 ? '' : 's'}`}
            </button>
          </div>
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
          <p className="mt-2 flex items-center gap-1.5 text-xs text-base-content/70">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Select {noun}s first.
          </p>
        )}
      </fieldset>

      <QuickSelect
        keys={keys}
        getKeyId={getKeyId}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
      />
    </>
  );
}
