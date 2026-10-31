import { useCallback, useReducer } from 'react';
import {
  createHistory,
  getRedoLabel,
  getUndoLabel,
  historyReducer,
  type PackChange,
  type PackSnapshot,
} from '@/utils/packHistory';

/** The pack being edited, with named Undo and Redo steps. */
export function usePackHistory(createInitial: () => PackSnapshot) {
  const [history, dispatch] = useReducer(
    historyReducer,
    createInitial,
    (create) => createHistory(create()),
  );
  /** Change the pack as one undoable step named `label`. */
  const commit = useCallback(
    (label: string, change: PackChange) =>
      dispatch({ type: 'commit', label, change }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  /** Start a new history; Import, Open and New use it. */
  const reset = useCallback(
    (snapshot: PackSnapshot) => dispatch({ type: 'reset', snapshot }),
    [],
  );
  return {
    present: history.present,
    undoLabel: getUndoLabel(history),
    redoLabel: getRedoLabel(history),
    commit,
    undo,
    redo,
    reset,
  };
}
