import { ChevronDown, Info, Play, Square } from 'lucide-react';
import React from 'react';
import {
  ClearSelectedButton,
  ResetAllButton,
} from '@/components/editor/ClearKeysButtons';
import type { LayoutKey } from '@/components/editor/keyboardLayouts';
import { QuickSelect } from '@/components/editor/QuickSelect';
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
  /** Remove the press and release sounds of the selected keys. */
  onClearSelected: () => void;
  /** Mapped keys the current layout does not draw; Reset all clears them too. */
  hiddenCount: number;
  /** The source shown in the waveform; applied sounds are cut from it. */
  activeSourceId: string;
  /** Length of the active source in seconds. */
  audioDuration: number;
  slot: SoundSlot;
  setSlot: (slot: SoundSlot) => void;
  /** Show the Press / Release switch; without it the controls assign press sounds. */
  showSlotSwitch: boolean;
  /** The Start, End and Duration fields are open under More. */
  showExactTimes: boolean;
  setShowExactTimes: (open: boolean) => void;
  /** Keys of the current layout, used to resolve the group-select buttons. */
  keys?: LayoutKey[];
  /** Same id builder the keyboard uses, so group ids match selection ids. */
  getKeyId?: (key: LayoutKey, index: number) => string;
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
  onClearSelected,
  hiddenCount,
  activeSourceId,
  audioDuration,
  slot,
  setSlot,
  showSlotSwitch,
  showExactTimes,
  setShowExactTimes,
  keys,
  getKeyId,
}: TimeSegmentControlsProps) {
  const exactTimesId = React.useId();
  const exactTimesRef = React.useRef<HTMLDivElement>(null);
  const hasValidSelection = isValidWaveformSelection(waveformSelection);
  // A sound may end at the exact length; typed ends are whole milliseconds.
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
      {/* Right under the waveform, with Quick select below, so a short panel
      leaves the chips below its fold rather than Apply. A panel too short
      even for this row pins it to its bottom while what is above it
      scrolls. The bottom padding is the panel's own, lent to the pinned row
      and handed back below it; side by side, the row pins over that padding
      too. A wrapper carries the background, which a fieldset leaves off
      above its legend's middle. */}
      <div className="panel-pinned-row sticky bottom-0 lg:-bottom-3 z-10 -mb-3 shrink-0 min-w-0">
        <div className="editor-panel-surface pb-3">
          <fieldset className="fieldset py-0 px-4 min-w-0">
            <legend className="fieldset-legend">
              <h2 className="text-xs font-medium text-base-content">Sound</h2>
            </legend>
            {/* Labels sit beside the controls, not above, so a wrapped row stays short. */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Release needs a press first, so the switch waits for a selected key that has one. */}
              {showSlotSwitch && (
                <div className="flex items-center gap-2">
                  <span className="label text-xs text-base-content/70">
                    Plays on
                  </span>
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
              )}
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
                  title={isPlaying ? 'Stop (Space)' : 'Test selection (Space)'}
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
              <ClearSelectedButton
                selectedCodes={selectedCodes}
                keySounds={keySounds}
                onClearSelected={onClearSelected}
              />
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost rounded-box"
                  aria-expanded={showExactTimes}
                  aria-controls={exactTimesId}
                  onClick={() => {
                    setShowExactTimes(!showExactTimes);
                    // A short panel opens them below its fold; scroll them into view.
                    if (!showExactTimes) {
                      requestAnimationFrame(() =>
                        exactTimesRef.current?.scrollIntoView({
                          block: 'nearest',
                        }),
                      );
                    }
                  }}
                  title="Exact times in milliseconds, and the Auto detect threshold"
                >
                  More
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform',
                      showExactTimes ? 'rotate-180' : '',
                    )}
                  />
                </button>
              </div>
              <ResetAllButton
                keySounds={keySounds}
                hiddenCount={hiddenCount}
                commitKeySounds={commitKeySounds}
              />
            </div>

            <div
              ref={exactTimesRef}
              id={exactTimesId}
              hidden={!showExactTimes}
              className="mt-2 flex flex-wrap items-end gap-3"
            >
              <div className="w-24">
                <label
                  className="label text-xs text-base-content/70"
                  htmlFor="start-time"
                >
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
                    setWaveformSelection((prev) => ({
                      ...prev,
                      start: startTime,
                    }));
                  }}
                />
              </div>
              <div className="w-24">
                <label
                  className="label text-xs text-base-content/70"
                  htmlFor="end-time"
                >
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
                <label
                  className="label text-xs text-base-content/70"
                  htmlFor="duration-time"
                >
                  Duration (ms)
                </label>
                <input
                  id="duration-time"
                  type="number"
                  className="input input-sm input-bordered w-full"
                  placeholder="0"
                  value={
                    Math.round(
                      waveformSelection.end - waveformSelection.start,
                    ) || ''
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
            </div>

            {/* Explain why the apply button is disabled */}
            {hint && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-base-content/70">
                <Info className="h-3.5 w-3.5 shrink-0" />
                {hint}
              </p>
            )}
          </fieldset>
        </div>
      </div>

      <QuickSelect
        keys={keys}
        getKeyId={getKeyId}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
      />
    </>
  );
}
