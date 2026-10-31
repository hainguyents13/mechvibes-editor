import { describe, expect, it } from 'vitest';
import {
  createBlankSnapshot,
  createDefaultPackInfo,
  hasUnsavedChanges,
  isBlankPack,
} from '@/utils/blankPack';
import {
  createHistory,
  type HistoryAction,
  historyReducer,
  type PackHistory,
} from '@/utils/packHistory';
import { addSources, createAudioSource } from '@/utils/soundPack';

const run = (history: PackHistory, ...actions: HistoryAction[]) =>
  actions.reduce(historyReducer, history);

const audio = (name: string) =>
  createAudioSource(new File([name], name, { type: 'audio/wav' }), 1);

describe('createBlankSnapshot', () => {
  it('starts a pack of the chosen type with nothing in it', () => {
    const blank = createBlankSnapshot('Mouse');
    expect(blank.packInfo).toEqual(createDefaultPackInfo('Mouse'));
    expect(blank.sources).toEqual([]);
    expect(blank.keySounds.size).toBe(0);
  });

  it('makes a keyboard pack by default', () => {
    expect(createBlankSnapshot().packInfo.packType).toBe('Keyboard');
  });
});

describe('isBlankPack', () => {
  it('holds for a new pack of either type', () => {
    expect(isBlankPack(createBlankSnapshot('Keyboard'))).toBe(true);
    expect(isBlankPack(createBlankSnapshot('Mouse'))).toBe(true);
  });

  it('does not hold once a file or a detail is added', () => {
    const blank = createBlankSnapshot();
    expect(isBlankPack({ ...blank, sources: [audio('a.wav')] })).toBe(false);
    expect(
      isBlankPack({ ...blank, packInfo: { ...blank.packInfo, name: 'Mine' } }),
    ).toBe(false);
  });
});

describe('hasUnsavedChanges', () => {
  // Choosing Keyboard or Mouse starts the history from a blank pack of that
  // type, which is also what counts as saved.
  const startFrom = (packType: 'Keyboard' | 'Mouse') => {
    const snapshot = createBlankSnapshot(packType);
    return { history: createHistory(snapshot), saved: snapshot };
  };

  it('has none right after choosing Mouse', () => {
    const { history, saved } = startFrom('Mouse');
    expect(hasUnsavedChanges(history.present, saved)).toBe(false);
  });

  it('has some once files are added on top, and none after undoing that', () => {
    const { history, saved } = startFrom('Mouse');
    const added = run(history, {
      type: 'commit',
      label: 'Add 2 files',
      change: (current) => ({
        sources: addSources(current.sources, [audio('a.wav'), audio('b.wav')]),
      }),
    });
    expect(hasUnsavedChanges(added.present, saved)).toBe(true);
    expect(hasUnsavedChanges(run(added, { type: 'undo' }).present, saved)).toBe(
      false,
    );
  });

  it('has none when an empty pack only switches type', () => {
    const { history, saved } = startFrom('Keyboard');
    const switched = run(history, {
      type: 'commit',
      label: 'Switch to Mouse pack',
      change: (current) => ({
        packInfo: { ...current.packInfo, packType: 'Mouse' },
      }),
    });
    expect(hasUnsavedChanges(switched.present, saved)).toBe(false);
  });

  it('has some when an opened pack is changed', () => {
    const opened = { ...createBlankSnapshot(), sources: [audio('main.ogg')] };
    const renamed = run(createHistory(opened), {
      type: 'commit',
      label: 'Edit pack details',
      change: { packInfo: { ...opened.packInfo, name: 'Renamed' } },
    });
    expect(hasUnsavedChanges(opened, opened)).toBe(false);
    expect(hasUnsavedChanges(renamed.present, opened)).toBe(true);
  });
});
