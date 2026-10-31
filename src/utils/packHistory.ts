import type { AudioSource, KeySounds, PackInfo } from '@/utils/soundPack';

/** The parts of a pack that Undo and Redo step through. Never mutated. */
export type PackSnapshot = {
  keySounds: KeySounds;
  sources: AudioSource[];
  packInfo: PackInfo;
};

/** A snapshot, and the name of the action that leaves it (in past) or reaches it (in future). */
type HistoryStep = { label: string; snapshot: PackSnapshot };

export type PackHistory = {
  past: HistoryStep[];
  present: PackSnapshot;
  future: HistoryStep[];
};

/** Undo steps kept. Older ones are dropped, and the files they alone hold are freed. */
export const HISTORY_LIMIT = 100;

/**
 * Fields to replace, or a function of the latest state that returns them (null
 * for no change). React runs the function twice in development, so it must be
 * pure: no createAudioSource, no setState.
 */
export type PackChange =
  | Partial<PackSnapshot>
  | ((present: PackSnapshot) => Partial<PackSnapshot> | null);

export type HistoryAction =
  | { type: 'commit'; label: string; change: PackChange }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; snapshot: PackSnapshot };

export function createHistory(snapshot: PackSnapshot): PackHistory {
  return { past: [], present: snapshot, future: [] };
}

/** Whether two snapshots hold the same state. State is never mutated, so references decide. */
export function isSameSnapshot(a: PackSnapshot, b: PackSnapshot) {
  return (
    a.keySounds === b.keySounds &&
    a.sources === b.sources &&
    a.packInfo === b.packInfo
  );
}

export function historyReducer(
  history: PackHistory,
  action: HistoryAction,
): PackHistory {
  switch (action.type) {
    case 'commit': {
      const patch =
        typeof action.change === 'function'
          ? action.change(history.present)
          : action.change;
      if (!patch) return history;
      const next = { ...history.present, ...patch };
      // A change that keeps every field adds no step and keeps Redo.
      if (isSameSnapshot(next, history.present)) return history;
      return {
        past: [
          ...history.past,
          { label: action.label, snapshot: history.present },
        ].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      };
    }
    case 'undo': {
      const step = history.past.at(-1);
      if (!step) return history;
      return {
        past: history.past.slice(0, -1),
        present: step.snapshot,
        future: [
          { label: step.label, snapshot: history.present },
          ...history.future,
        ],
      };
    }
    case 'redo': {
      const [step, ...rest] = history.future;
      if (!step) return history;
      return {
        past: [
          ...history.past,
          { label: step.label, snapshot: history.present },
        ],
        present: step.snapshot,
        future: rest,
      };
    }
    case 'reset':
      return createHistory(action.snapshot);
  }
}

/** Name of the action Undo would revert, or null. */
export const getUndoLabel = (history: PackHistory) =>
  history.past.at(-1)?.label ?? null;

/** Name of the action Redo would apply again, or null. */
export const getRedoLabel = (history: PackHistory) =>
  history.future[0]?.label ?? null;

type ShortcutKeys = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'
>;

/**
 * The history command a key press asks for: Ctrl/Cmd+Z undoes, and
 * Ctrl/Cmd+Shift+Z and Ctrl+Y redo. Cmd+Y opens History in Mac browsers, so it
 * is left alone.
 */
export function getHistoryShortcut(
  event: ShortcutKeys,
): 'undo' | 'redo' | null {
  if (event.altKey || !(event.ctrlKey || event.metaKey)) return null;
  const key = event.key.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey)
    return 'redo';
  return null;
}
