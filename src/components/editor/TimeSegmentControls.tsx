import { Info, Play, RotateCcw, Square } from 'lucide-react';
import React from 'react';
import { KEY_GROUPS } from '@/components/editor/key-groups';
import { cn } from '@/lib/utils';
import {
  applyTimeSegmentToKeys,
  isValidWaveformSelection,
} from '@/utils/audioUtils';

interface TimeSegmentControlsProps {
  waveformSelection: { start: number; end: number };
  setWaveformSelection: React.Dispatch<
    React.SetStateAction<{ start: number; end: number }>
  >;
  isPlaying: boolean;
  playSelectedSegment: () => void;
  selectedKeys: Set<string>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  modifiedKeys: Map<string, [number, number]>;
  setModifiedKeys: React.Dispatch<
    React.SetStateAction<Map<string, [number, number]>>
  >;
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
  modifiedKeys,
  setModifiedKeys,
  keys,
  getKeyId,
}: TimeSegmentControlsProps) {
  const hasValidSelection = isValidWaveformSelection(waveformSelection);
  const canApply = selectedKeys.size > 0 && hasValidSelection;

  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  const applyToKeyIds = (keyIds: Set<string>) => {
    if (keyIds.size === 0 || !hasValidSelection) return;
    setModifiedKeys(
      applyTimeSegmentToKeys(keyIds, waveformSelection, modifiedKeys),
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
              onClick={() => applyToKeyIds(selectedKeys)}
              disabled={!canApply}
              title={`Assign this sound to ${selectedKeys.size} selected key${selectedKeys.size !== 1 ? 's' : ''}`}
            >
              Apply to {selectedKeys.size} key
              {selectedKeys.size !== 1 ? 's' : ''}
            </button>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              className="btn btn-sm btn-error rounded-box"
              onClick={() => setShowResetConfirm(true)}
              disabled={modifiedKeys.size === 0}
              title={`Clear the sound on all ${modifiedKeys.size} mapped key${modifiedKeys.size !== 1 ? 's' : ''}`}
            >
              <RotateCcw className="h-3 w-3" />
              Reset all ({modifiedKeys.size})
            </button>
          </div>
        </div>

        {/* Explain why the apply buttons are disabled */}
        {!canApply && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-base-content/60">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {selectedKeys.size === 0
              ? 'Select at least one key on the keyboard to assign this sound.'
              : 'Drag on the waveform to pick the sound first.'}
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
              This clears the sound on all {modifiedKeys.size} mapped key
              {modifiedKeys.size !== 1 ? 's' : ''}. The audio file itself is
              kept. This cannot be undone.
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
                  setModifiedKeys(new Map());
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
