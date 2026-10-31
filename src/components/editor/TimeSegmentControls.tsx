import { Info, Play, RotateCcw, Square } from 'lucide-react';
import React from 'react';
import { KEY_GROUPS } from '@/components/editor/key-groups';
import { cn, plural } from '@/lib/utils';
import {
  applyPressToKeys,
  applyReleaseToKeys,
  isValidWaveformSelection,
  keysAcceptingRelease,
  removeReleaseFromKeys,
} from '@/utils/audioUtils';
import type { KeySounds } from '@/utils/soundPack';

/** Which half of a key's sound the controls assign. */
export type SoundSlot = 'press' | 'release';

interface TimeSegmentControlsProps {
  waveformSelection: { start: number; end: number };
  setWaveformSelection: React.Dispatch<
    React.SetStateAction<{ start: number; end: number }>
  >;
  isPlaying: boolean;
  playSelectedSegment: () => void;
  selectedKeys: Set<string>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Key codes of the selected keys. */
  selectedCodes: string[];
  keySounds: KeySounds;
  /** Change the key sounds as one undoable step named `label`. */
  commitKeySounds: (
    label: string,
    update: (keySounds: KeySounds) => KeySounds,
  ) => void;
  /** The source shown in the waveform; applied sounds are cut from it. */
  activeSourceId: string;
  /** Length of the active source in seconds. */
  audioDuration: number;
  slot: SoundSlot;
  setSlot: (slot: SoundSlot) => void;
  /** Keys of the current layout, used to resolve the group-select buttons. */
  keys?: any[];
  /** Same id builder the keyboard uses, so group ids match selection ids. */
  getKeyId?: (key: any, index: number) => string;
}

export function TimeSegmentControls({
  waveformSelection,
  setWaveformSelection,
  isPlaying,
  playSelectedSegment,
  selectedKeys,
  setSelectedKeys,
  selectedCodes,
  keySounds,
  commitKeySounds,
  activeSourceId,
  audioDuration,
  slot,
  setSlot,
  keys,
  getKeyId,
}: TimeSegmentControlsProps) {
  const hasValidSelection = isValidWaveformSelection(waveformSelection);
  // Whole file ends at the exact length; typed ends are whole milliseconds.
  const fileLengthMs = Math.ceil(audioDuration * 1000);
  const endsPastFile =
    audioDuration > 0 && waveformSelection.end > fileLengthMs;
  // A release sound needs a press sound from the same file on the key.
  const targetCodes =
    slot === 'press'
      ? selectedCodes
      : keysAcceptingRelease(selectedCodes, activeSourceId, keySounds);
  const canApply = targetCodes.length > 0 && hasValidSelection && !endsPastFile;
  const codesWithRelease = selectedCodes.filter(
    (code) => keySounds.get(code)?.release,
  );

  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  const applySelection = () => {
    if (!canApply) return;
    const segment: [number, number] = [
      waveformSelection.start,
      waveformSelection.end,
    ];
    commitKeySounds(
      `${slot === 'press' ? 'Apply' : 'Apply release'} to ${plural(targetCodes.length, 'key')}`,
      (current) =>
        slot === 'press'
          ? applyPressToKeys(targetCodes, activeSourceId, segment, current)
          : applyReleaseToKeys(targetCodes, activeSourceId, segment, current),
    );
  };

  // Resolve each group against the current layout once per render.
  const groupMatches = React.useMemo(() => {
    if (!keys || !getKeyId) return [];
    return KEY_GROUPS.map((group) => {
      const ids = new Set<string>();
      keys.forEach((key, index) => {
        if (group.matches(key)) ids.add(getKeyId(key, index));
      });
      return { group, ids };
    }).filter((entry) => entry.ids.size > 0);
  }, [keys, getKeyId]);

  const isGroupSelected = (ids: Set<string>) =>
    selectedKeys.size === ids.size &&
    Array.from(ids).every((id) => selectedKeys.has(id));

  // Clicking a fully-selected group clears it, so the same button toggles.
  const selectGroup = (ids: Set<string>) => {
    setSelectedKeys(isGroupSelected(ids) ? new Set() : new Set(ids));
  };

  let hint: string | null = null;
  if (selectedCodes.length === 0) {
    hint = 'Select at least one key to assign this sound.';
  } else if (slot === 'release' && targetCodes.length === 0) {
    hint =
      'A release sound plays when the key comes up. Give the selected keys a press sound from this file first.';
  } else if (!hasValidSelection) {
    hint = 'Drag on the waveform to pick the sound first.';
  } else if (endsPastFile) {
    hint = `The sound ends after the file does. This file is ${fileLengthMs} ms long.`;
  }

  return (
    <>
      {groupMatches.length > 0 && (
        <fieldset className="fieldset py-0 px-4 shrink-0 min-w-0">
          <legend className="fieldset-legend">
            <h2 className="text-xs font-medium text-base-content">
              Quick select
            </h2>
          </legend>
          <div className="flex flex-wrap items-center gap-2">
            {groupMatches.map(({ group, ids }) => (
              <button
                type="button"
                key={group.id}
                className={cn(
                  'btn btn-sm rounded-box',
                  isGroupSelected(ids) ? 'btn-active' : '',
                )}
                onClick={() => selectGroup(ids)}
                title={`Select all ${ids.size} ${group.label}`}
              >
                {group.label} ({group.hint})
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="fieldset py-0 px-4 shrink-0 min-w-0">
        <legend className="fieldset-legend">
          <h2 className="text-xs font-medium text-base-content">Sound</h2>
        </legend>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <span className="label text-xs">Plays on</span>
            <div className="join">
              <button
                type="button"
                className={cn(
                  'btn btn-sm join-item',
                  slot === 'press' ? 'btn-active' : '',
                )}
                aria-pressed={slot === 'press'}
                onClick={() => setSlot('press')}
                title="Assign the sound a key plays when it goes down"
              >
                Press
              </button>
              <button
                type="button"
                className={cn(
                  'btn btn-sm join-item',
                  slot === 'release' ? 'btn-active' : '',
                )}
                aria-pressed={slot === 'release'}
                onClick={() => setSlot('release')}
                title="Assign the sound a key plays when it comes up"
              >
                Release
              </button>
            </div>
          </div>
          <div className="w-24">
            <label className="label text-xs" htmlFor="start-time">
              Start (ms)
            </label>
            <input
              id="start-time"
              type="number"
              className="input input-sm input-bordered w-full"
              placeholder="0"
              value={Math.round(waveformSelection.start) || ''}
              onChange={(e) => {
                const startTime = parseInt(e.target.value) || 0;
                setWaveformSelection((prev) => ({ ...prev, start: startTime }));
              }}
            />
          </div>
          <div className="w-24">
            <label className="label text-xs" htmlFor="end-time">
              End (ms)
            </label>
            <input
              id="end-time"
              type="number"
              className="input input-sm input-bordered w-full"
              placeholder="0"
              value={Math.round(waveformSelection.end) || ''}
              onChange={(e) => {
                const endTime = parseInt(e.target.value) || 0;
                setWaveformSelection((prev) => ({ ...prev, end: endTime }));
              }}
            />
          </div>
          <div className="w-24">
            <label className="label text-xs" htmlFor="duration-time">
              Duration (ms)
            </label>
            <input
              id="duration-time"
              type="number"
              className="input input-sm input-bordered w-full"
              placeholder="0"
              value={
                Math.round(waveformSelection.end - waveformSelection.start) ||
                ''
              }
              onChange={(e) => {
                const duration = parseInt(e.target.value) || 0;
                if (waveformSelection.start >= 0) {
                  setWaveformSelection((prev) => ({
                    ...prev,
                    end: prev.start + duration,
                  }));
                }
              }}
            />
          </div>
          <div>
            <button
              type="button"
              className="btn btn-sm rounded-box"
              onClick={() =>
                setWaveformSelection({ start: 0, end: audioDuration * 1000 })
              }
              disabled={!(audioDuration > 0)}
              title="Select the whole file, for a file that holds one sound"
            >
              Whole file
            </button>
          </div>
          <div>
            <button
              type="button"
              className={cn(
                'btn btn-sm rounded-box',
                isPlaying ? 'btn-active' : '',
              )}
              onClick={playSelectedSegment}
              disabled={
                !waveformSelection.end ||
                waveformSelection.end <= waveformSelection.start
              }
              title={isPlaying ? 'Stop' : 'Test selection'}
            >
              {isPlaying ? (
                <div className="flex items-center gap-1">
                  <Square className="h-3 w-3" />
                  Stop
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  Test
                </div>
              )}
            </button>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-sm btn-primary rounded-box"
              onClick={applySelection}
              disabled={!canApply}
              title={`Assign this ${slot} sound to ${plural(targetCodes.length, 'key')}`}
            >
              {slot === 'press' ? 'Apply' : 'Apply release'} to{' '}
              {plural(targetCodes.length, 'key')}
            </button>
          </div>
          {slot === 'release' && (
            <div>
              <button
                type="button"
                className="btn btn-sm rounded-box"
                onClick={() =>
                  commitKeySounds(
                    `Remove release from ${plural(codesWithRelease.length, 'key')}`,
                    (current) =>
                      removeReleaseFromKeys(codesWithRelease, current),
                  )
                }
                disabled={codesWithRelease.length === 0}
                title="Make the selected keys silent when they come up"
              >
                Remove release ({codesWithRelease.length})
              </button>
            </div>
          )}
          <div className="ml-auto">
            <button
              type="button"
              className="btn btn-sm btn-error rounded-box"
              onClick={() => setShowResetConfirm(true)}
              disabled={keySounds.size === 0}
              title={`Clear the sound on all ${plural(keySounds.size, 'mapped key')}`}
            >
              <RotateCcw className="h-3 w-3" />
              Reset all ({keySounds.size})
            </button>
          </div>
        </div>

        {/* Explain why the apply button is disabled */}
        {hint && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-base-content/60">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {hint}
          </p>
        )}
      </fieldset>

      {showResetConfirm && (
        <dialog
          className="modal modal-open"
          onClose={() => setShowResetConfirm(false)}
        >
          <div className="modal-box">
            <h3 className="text-base font-semibold">Reset all key mappings?</h3>
            <p className="py-3 text-sm text-base-content/70">
              This clears the sound on all{' '}
              {plural(keySounds.size, 'mapped key')}. The audio files themselves
              are kept. You can undo this.
            </p>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-sm rounded-box"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-error rounded-box"
                onClick={() => {
                  // An empty pack has nothing to reset, so no step.
                  commitKeySounds(
                    `Reset all ${plural(keySounds.size, 'key')}`,
                    (current) => (current.size === 0 ? current : new Map()),
                  );
                  setShowResetConfirm(false);
                }}
              >
                Reset all
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label="Close"
            onClick={() => setShowResetConfirm(false)}
          />
        </dialog>
      )}
    </>
  );
}
