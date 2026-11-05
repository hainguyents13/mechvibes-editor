import React from 'react';
import {
  ClearSelectedButton,
  ResetAllButton,
} from '@/components/editor/ClearKeysButtons';
import { ChevronDown, Info, Play, Square } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { pillList, pillTab } from '@/components/ui/tabs';
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

/** The small mono heading of a block in the sound panel. */
export const PANEL_LABEL_CLASS =
  'font-code text-[11px] font-bold uppercase tracking-[0.12em] text-mv-subtle';

interface TimeSegmentControlsProps {
  waveformSelection: { start: number; end: number };
  setWaveformSelection: React.Dispatch<
    React.SetStateAction<{ start: number; end: number }>
  >;
  isPlaying: boolean;
  playSelectedSegment: () => void;
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
  /** What the pack's keys are called: 'key' or 'button'. */
  noun?: string;
}

/** A field of the exact times: its label above a mono number input. */
function TimeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex w-24 flex-col gap-0.5">
      <label className="text-[11px] text-mv-subtle" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        className="mv-field font-code text-[13px]"
        placeholder="0"
        value={Math.round(value) || ''}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10) || 0)}
      />
    </div>
  );
}

export function TimeSegmentControls({
  waveformSelection,
  setWaveformSelection,
  isPlaying,
  playSelectedSegment,
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
  noun = 'key',
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
      `${slot === 'press' ? 'Apply' : 'Apply release'} to ${plural(targetCodes.length, noun)}`,
      (current) =>
        slot === 'press'
          ? applyPressToKeys(targetCodes, activeSourceId, segment, current)
          : applyReleaseToKeys(targetCodes, activeSourceId, segment, current),
    );
  };

  let hint: string | null = null;
  if (selectedCodes.length === 0) {
    hint = `Select at least one ${noun} to assign this sound.`;
  } else if (slot === 'release' && targetCodes.length === 0) {
    hint = `A release sound plays when the ${noun} comes up. Give the selected ${noun}s a press sound from this file first.`;
  } else if (!hasValidSelection) {
    hint = 'Drag on the waveform to pick the sound first.';
  } else if (endsPastFile) {
    hint = `The sound ends after the file does. This file is ${fileLengthMs} ms long.`;
  }

  const slotButton = (value: SoundSlot, label: string, title: string) => (
    <button
      type="button"
      className={cn(
        pillTab,
        'inline-flex items-center gap-1.5',
        slot === value && 'bg-mv-fill font-bold text-mv-ink',
      )}
      aria-pressed={slot === value}
      onClick={() => setSlot(value)}
      title={title}
    >
      {/* The half of the keys' edge this sound shows on */}
      <span
        aria-hidden="true"
        className={cn(
          'h-1 w-3 rounded-full',
          value === 'press' ? 'bg-mv-press' : 'bg-mv-release',
        )}
      />
      {label}
    </button>
  );

  return (
    // Right under the waveform. A panel too short even for this row pins it
    // to its bottom while what is above it scrolls. The bottom padding is the
    // panel's own, lent to the pinned row and handed back below it; side by
    // side, the row pins over that padding too.
    <div className="panel-pinned-row sticky bottom-0 lg:-bottom-3 z-10 -mb-3 shrink-0 min-w-0">
      <section
        aria-labelledby={`${exactTimesId}-title`}
        className="editor-panel-surface px-5 pt-3.5 pb-3 shadow-[inset_0_1px_0_var(--mv-line)]"
      >
        {/* Labels sit beside the controls, not above, so a wrapped row stays short. */}
        <div className="flex flex-wrap items-center gap-2.5">
          <h2
            id={`${exactTimesId}-title`}
            className={cn(PANEL_LABEL_CLASS, 'm-0 mr-1.5')}
          >
            Sound
          </h2>
          {/* Release needs a press first, so the switch waits for a selected key that has one. */}
          {showSlotSwitch && (
            // biome-ignore lint/a11y/useSemanticElements: two toggle buttons, not a form group
            <div role="group" aria-label="Plays on" className={pillList}>
              {slotButton(
                'press',
                'Press',
                'Assign the sound a key plays when it goes down',
              )}
              {slotButton(
                'release',
                'Release',
                'Assign the sound a key plays when it comes up',
              )}
            </div>
          )}
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-9 px-3.5',
              isPlaying && 'bg-mv-fill text-mv-ink',
            )}
            onClick={playSelectedSegment}
            disabled={
              !waveformSelection.end ||
              waveformSelection.end <= waveformSelection.start
            }
            title={isPlaying ? 'Stop (Space)' : 'Test selection (Space)'}
          >
            {isPlaying ? (
              <Square className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
            {isPlaying ? 'Stop' : 'Test'}
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: 'primary' })}
            onClick={applySelection}
            disabled={!canApply}
            title={`Assign this ${slot} sound to ${plural(targetCodes.length, noun)}`}
          >
            {slot === 'press' ? 'Apply' : 'Apply release'} to{' '}
            {plural(targetCodes.length, noun)}
          </button>
          {slot === 'release' && (
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'h-9',
              )}
              onClick={() =>
                commitKeySounds(
                  `Remove release from ${plural(codesWithRelease.length, noun)}`,
                  (current) => removeReleaseFromKeys(codesWithRelease, current),
                )
              }
              disabled={codesWithRelease.length === 0}
              title={`Make the selected ${noun}s silent when they come up`}
            >
              Remove release ({codesWithRelease.length})
            </button>
          )}
          <ClearSelectedButton
            selectedCodes={selectedCodes}
            keySounds={keySounds}
            onClearSelected={onClearSelected}
            noun={noun}
          />
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'h-9',
            )}
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
                'size-3 transition-transform',
                showExactTimes ? 'rotate-180' : '',
              )}
            />
          </button>
          <ResetAllButton
            keySounds={keySounds}
            hiddenCount={hiddenCount}
            commitKeySounds={commitKeySounds}
            noun={noun}
          />
        </div>

        <div
          ref={exactTimesRef}
          id={exactTimesId}
          hidden={!showExactTimes}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <TimeField
            id="start-time"
            label="Start (ms)"
            value={waveformSelection.start}
            onChange={(start) =>
              setWaveformSelection((prev) => ({ ...prev, start }))
            }
          />
          <TimeField
            id="end-time"
            label="End (ms)"
            value={waveformSelection.end}
            onChange={(end) =>
              setWaveformSelection((prev) => ({ ...prev, end }))
            }
          />
          <TimeField
            id="duration-time"
            label="Duration (ms)"
            value={waveformSelection.end - waveformSelection.start}
            onChange={(duration) => {
              if (waveformSelection.start >= 0) {
                setWaveformSelection((prev) => ({
                  ...prev,
                  end: prev.start + duration,
                }));
              }
            }}
          />
        </div>

        {/* Explain why the apply button is disabled */}
        {hint && (
          <p className="m-0 mt-2.5 flex items-center gap-1.5 text-xs text-mv-subtle">
            <Info className="size-3.5 shrink-0" />
            {hint}
          </p>
        )}
      </section>
    </div>
  );
}
