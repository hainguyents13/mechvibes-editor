import { describe, expect, it } from 'vitest';
import { clearKeySounds } from '@/utils/audioUtils';
import {
  createHistory,
  getHistoryShortcut,
  getRedoLabel,
  getUndoLabel,
  HISTORY_LIMIT,
  type HistoryAction,
  historyReducer,
  isSameSnapshot,
  type PackHistory,
  type PackSnapshot,
} from '@/utils/packHistory';
import {
  type AudioSource,
  createAudioSource,
  type KeySounds,
  type PackInfo,
} from '@/utils/soundPack';

const packInfo = (name = 'Pack'): PackInfo => ({
  name,
  author: '',
  description: '',
  tags: [],
  packType: 'Keyboard',
  recommendedVolume: 1,
  randomPitch: false,
  icon: null,
});

const source = (name: string): AudioSource =>
  createAudioSource(new File([name], name, { type: 'audio/wav' }), 1);

const snapshot = (patch: Partial<PackSnapshot> = {}): PackSnapshot => ({
  keySounds: new Map(),
  sources: [],
  packInfo: packInfo(),
  ...patch,
});

const run = (history: PackHistory, ...actions: HistoryAction[]) =>
  actions.reduce(historyReducer, history);

const commit = (
  label: string,
  change: Extract<HistoryAction, { type: 'commit' }>['change'],
): HistoryAction => ({ type: 'commit', label, change });

const UNDO: HistoryAction = { type: 'undo' };
const REDO: HistoryAction = { type: 'redo' };

/** Freeze the history, its step lists and its snapshots, so a mutation throws. */
function freeze(history: PackHistory) {
  for (const step of [...history.past, ...history.future]) {
    Object.freeze(step.snapshot.sources);
    Object.freeze(step.snapshot);
    Object.freeze(step);
  }
  Object.freeze(history.present.sources);
  Object.freeze(history.present);
  Object.freeze(history.past);
  Object.freeze(history.future);
  return Object.freeze(history);
}

describe('historyReducer', () => {
  it('moves the old state to past under its label on commit, and clears future', () => {
    const start = snapshot();
    const renamed = packInfo('Renamed');
    const history = run(
      createHistory(start),
      commit('A', { packInfo: packInfo('A') }),
      UNDO,
      commit('Edit pack details', { packInfo: renamed }),
    );

    expect(history.past).toEqual([
      { label: 'Edit pack details', snapshot: start },
    ]);
    expect(history.past[0].snapshot).toBe(start);
    expect(history.present.packInfo).toBe(renamed);
    expect(history.present.sources).toBe(start.sources);
    expect(history.future).toEqual([]);
  });

  it('adds no step for a change that returns null or keeps every field', () => {
    const start = snapshot();
    const history = run(
      createHistory(start),
      commit('A', { packInfo: packInfo('A') }),
      UNDO,
    );

    expect(
      historyReducer(
        history,
        commit('Nothing', () => null),
      ),
    ).toBe(history);
    expect(
      historyReducer(
        history,
        commit('Same', {
          keySounds: start.keySounds,
          packInfo: start.packInfo,
        }),
      ),
    ).toBe(history);
    expect(
      historyReducer(
        history,
        commit('Same', (current) => ({ sources: current.sources })),
      ),
    ).toBe(history);
    // Redo is still there.
    expect(getRedoLabel(history)).toBe('A');
  });

  it('gives a change function the latest state, so commits compose', () => {
    const a = source('a.wav');
    const b = source('b.wav');
    const history = run(
      createHistory(snapshot()),
      commit('Add a.wav', (current) => ({ sources: [...current.sources, a] })),
      commit('Add b.wav', (current) => ({ sources: [...current.sources, b] })),
    );

    expect(history.present.sources).toEqual([a, b]);
    expect(history.past.map((step) => step.label)).toEqual([
      'Add a.wav',
      'Add b.wav',
    ]);
  });

  it('brings back the exact objects on undo and redo, and moves the labels', () => {
    const start = snapshot();
    const keySounds: KeySounds = new Map([
      ['KeyA', { source: 'source-1', press: [0, 100] }],
    ]);
    const after = run(
      createHistory(start),
      commit('Apply to 1 key', { keySounds }),
    );
    const undone = historyReducer(after, UNDO);

    expect(undone.present.keySounds).toBe(start.keySounds);
    expect(undone.present.sources).toBe(start.sources);
    expect(undone.present.packInfo).toBe(start.packInfo);
    expect(undone.past).toEqual([]);
    expect(undone.future.map((step) => step.label)).toEqual(['Apply to 1 key']);

    const redone = historyReducer(undone, REDO);
    expect(redone.present.keySounds).toBe(keySounds);
    expect(redone.present.sources).toBe(start.sources);
    expect(redone.present.packInfo).toBe(start.packInfo);
    expect(redone.past.map((step) => step.label)).toEqual(['Apply to 1 key']);
    expect(redone.future).toEqual([]);
  });

  it('returns the same history for undo with no past and redo with no future', () => {
    const history = createHistory(snapshot());
    expect(historyReducer(history, UNDO)).toBe(history);
    expect(historyReducer(history, REDO)).toBe(history);
  });

  it('drops future on a commit after an undo', () => {
    const history = run(
      createHistory(snapshot()),
      commit('A', { packInfo: packInfo('A') }),
      commit('B', { packInfo: packInfo('B') }),
      UNDO,
      commit('C', { packInfo: packInfo('C') }),
    );

    expect(history.future).toEqual([]);
    expect(history.past.map((step) => step.label)).toEqual(['A', 'C']);
    expect(historyReducer(history, REDO)).toBe(history);
  });

  it(`keeps the last ${HISTORY_LIMIT} steps`, () => {
    const commits = Array.from({ length: HISTORY_LIMIT + 1 }, (_, index) =>
      commit(`Step ${index + 1}`, { packInfo: packInfo(`Name ${index + 1}`) }),
    );
    const history = run(createHistory(snapshot()), ...commits);

    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0].label).toBe('Step 2');

    const oldest = run(
      history,
      ...Array.from({ length: HISTORY_LIMIT }, () => UNDO),
    );
    expect(oldest.present.packInfo.name).toBe('Name 1');
    expect(getUndoLabel(oldest)).toBeNull();
  });

  it('starts over on reset', () => {
    const next = snapshot({ packInfo: packInfo('Imported') });
    const history = run(
      createHistory(snapshot()),
      commit('A', { packInfo: packInfo('A') }),
      commit('B', { packInfo: packInfo('B') }),
      UNDO,
      { type: 'reset', snapshot: next },
    );

    expect(history.past).toEqual([]);
    expect(history.future).toEqual([]);
    expect(history.present).toBe(next);
  });

  it('removes a file and its sounds as one step, and Undo brings back the same file', () => {
    const fileB = new File(['b'], 'b.wav', { type: 'audio/wav' });
    const a = source('a.wav');
    const b = createAudioSource(fileB, 2);
    const keySounds: KeySounds = new Map([
      ['KeyA', { source: a.id, press: [0, 100] }],
      ['KeyB', { source: b.id, press: [0, 100] }],
      ['KeyC', { source: b.id, press: [100, 200], release: [200, 300] }],
    ]);
    const start = snapshot({ sources: [a, b], keySounds });

    // The same change handleRemoveSource commits.
    const removed = historyReducer(
      createHistory(start),
      commit(`Remove ${b.file.name}`, (current) => {
        const nextSounds = new Map(current.keySounds);
        nextSounds.forEach((sound, code) => {
          if (sound.source === b.id) nextSounds.delete(code);
        });
        return {
          sources: current.sources.filter((s) => s.id !== b.id),
          keySounds: nextSounds,
        };
      }),
    );

    expect(removed.present.sources).toEqual([a]);
    expect([...removed.present.keySounds.keys()]).toEqual(['KeyA']);
    expect(getUndoLabel(removed)).toBe('Remove b.wav');

    const undone = historyReducer(removed, UNDO);
    expect(undone.present.sources[1]).toBe(b);
    expect(undone.present.sources[1].file).toBe(fileB);
    expect(undone.present.sources[1].id).toBe(b.id);
    expect(undone.present.keySounds).toBe(keySounds);
    expect(keySounds.size).toBe(3);
  });

  it('never changes the history it is given', () => {
    const history = freeze(
      run(
        createHistory(snapshot()),
        commit('A', { packInfo: packInfo('A') }),
        commit('B', { packInfo: packInfo('B') }),
        UNDO,
      ),
    );
    const { past, present, future } = history;

    expect(() =>
      historyReducer(
        history,
        commit('C', (current) => ({ sources: [...current.sources] })),
      ),
    ).not.toThrow();
    expect(() => historyReducer(history, UNDO)).not.toThrow();
    expect(() => historyReducer(history, REDO)).not.toThrow();
    expect(history.past).toBe(past);
    expect(history.past.map((step) => step.label)).toEqual(['A']);
    expect(history.present).toBe(present);
    expect(history.future).toBe(future);
    expect(history.future.map((step) => step.label)).toEqual(['B']);
  });
});

describe('getUndoLabel and getRedoLabel', () => {
  it('name the step each would take, or null', () => {
    const empty = createHistory(snapshot());
    expect(getUndoLabel(empty)).toBeNull();
    expect(getRedoLabel(empty)).toBeNull();

    const history = run(
      empty,
      commit('A', { packInfo: packInfo('A') }),
      commit('B', { packInfo: packInfo('B') }),
      commit('C', { packInfo: packInfo('C') }),
      UNDO,
      UNDO,
    );
    expect(getUndoLabel(history)).toBe('A');
    expect(getRedoLabel(history)).toBe('B');
  });
});

describe('isSameSnapshot', () => {
  it('compares by reference', () => {
    const a = snapshot({
      keySounds: new Map([['KeyA', { source: 's', press: [0, 1] }]]),
    });
    expect(isSameSnapshot(a, { ...a })).toBe(true);
    expect(isSameSnapshot(a, { ...a, keySounds: new Map(a.keySounds) })).toBe(
      false,
    );
  });
});

describe('getHistoryShortcut', () => {
  const press = (
    key: string,
    mods: Partial<
      Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>
    > = {},
  ) =>
    getHistoryShortcut({
      key,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      ...mods,
    });

  it('undoes on Ctrl+Z and Cmd+Z', () => {
    expect(press('z', { ctrlKey: true })).toBe('undo');
    expect(press('z', { metaKey: true })).toBe('undo');
  });

  it('redoes on Ctrl+Shift+Z, Cmd+Shift+Z and Ctrl+Y', () => {
    expect(press('Z', { ctrlKey: true, shiftKey: true })).toBe('redo');
    expect(press('Z', { metaKey: true, shiftKey: true })).toBe('redo');
    expect(press('y', { ctrlKey: true })).toBe('redo');
  });

  it('leaves other keys alone', () => {
    expect(press('y', { metaKey: true })).toBeNull();
    expect(press('z', { ctrlKey: true, altKey: true })).toBeNull();
    expect(press('z')).toBeNull();
    expect(press('Z', { shiftKey: true })).toBeNull();
    expect(press('x', { ctrlKey: true })).toBeNull();
  });
});

describe('clearing key sounds', () => {
  const clear = (codes: string[]) =>
    commit('Clear 2 keys', (present) => ({
      keySounds: clearKeySounds(codes, present.keySounds),
    }));

  it('comes back exactly as it was on Undo', () => {
    const keySounds: KeySounds = new Map([
      ['KeyA', { source: 's', press: [0, 50], release: [50, 90] }],
      ['KeyS', { source: 's', press: [100, 150] }],
      ['KeyD', { source: 's', press: [200, 250] }],
    ]);
    const expected = structuredClone(keySounds);
    const cleared = run(
      createHistory(snapshot({ keySounds })),
      clear(['KeyA', 'KeyS']),
    );
    expect([...cleared.present.keySounds.keys()]).toEqual(['KeyD']);
    expect(getUndoLabel(cleared)).toBe('Clear 2 keys');
    const undone = run(cleared, UNDO);
    expect(undone.present.keySounds).toBe(keySounds);
    expect(undone.present.keySounds).toEqual(expected);
  });

  it('adds no step when none of the keys has a sound', () => {
    const start = createHistory(
      snapshot({
        keySounds: new Map([['KeyD', { source: 's', press: [0, 50] }]]),
      }),
    );
    expect(run(start, clear(['KeyA', 'KeyS']))).toBe(start);
  });
});
