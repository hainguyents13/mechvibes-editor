import { describe, expect, it } from 'vitest';
import {
  fromSavedRecord,
  type SavedWork,
  savedAgo,
  toSavedRecord,
} from '@/lib/autosave';
import { createDefaultPackInfo } from '@/utils/blankPack';
import { createAudioSource, withoutAudio } from '@/utils/soundPack';

function work(): SavedWork {
  const a = createAudioSource(new File(['a'], 'a.ogg'), 1.5, 2);
  const b = withoutAudio(createAudioSource(new File(['b'], 'b.wav'), 1, 3));
  return {
    savedAt: 1_000,
    unsaved: true,
    snapshot: {
      packInfo: { ...createDefaultPackInfo(), name: 'Saved pack' },
      sources: [a, b],
      keySounds: new Map([
        ['KeyA', { source: a.id, press: [0, 50] }],
        ['KeyB', { source: b.id, press: [10, 20], release: [20, 30] }],
      ]),
    },
    fileKinds: new Map([[a.id, 'many']]),
    loadedPackId: 'pack-1',
    packExtras: { config: { version: 3 }, files: [] },
    libraryPack: { id: 'lib-1', name: 'Lib', slug: 'lib', revision: 4 },
    activeSourceId: b.id,
  };
}

/** The files of `kept`, as the file store holds them. */
const filesOf = (kept: SavedWork) =>
  new Map(kept.snapshot.sources.map((source) => [source.id, source.file]));

describe('saved work', () => {
  it('comes back as it was kept', () => {
    const kept = work();
    // IndexedDB stores a structured clone of the record.
    const record = structuredClone(toSavedRecord(kept));
    expect(record.sources.every((source) => !('file' in source))).toBe(true);
    const back = fromSavedRecord(record, filesOf(kept));
    expect(back).toEqual(kept);
    expect(back?.snapshot.sources[1].missing).toBe(true);
  });

  it('leaves out a key whose file is not there', () => {
    const kept = work();
    const record = toSavedRecord(kept);
    record.keySounds.push(['KeyC', { source: 'source-gone', press: [0, 1] }]);
    expect([
      ...(fromSavedRecord(record, filesOf(kept))?.snapshot.keySounds.keys() ??
        []),
    ]).toEqual(['KeyA', 'KeyB']);
  });

  it('opens the first file when the open one is not there', () => {
    const kept = work();
    const record = { ...toSavedRecord(kept), activeSourceId: 'source-gone' };
    expect(fromSavedRecord(record, filesOf(kept))?.activeSourceId).toBe(
      kept.snapshot.sources[0].id,
    );
  });

  it('offers nothing for a record of another version or shape', () => {
    const kept = work();
    const files = filesOf(kept);
    expect(fromSavedRecord(undefined, files)).toBeNull();
    expect(
      fromSavedRecord({ ...toSavedRecord(kept), version: 2 }, files),
    ).toBeNull();
    expect(
      fromSavedRecord(
        { ...toSavedRecord(kept), sources: [{ id: 'x' }] },
        files,
      ),
    ).toBeNull();
    // A file the store lost.
    expect(
      fromSavedRecord(toSavedRecord(kept), new Map([...files].slice(1))),
    ).toBeNull();
  });

  it('gives files added after restoring their own ids', () => {
    const kept = work();
    const record = toSavedRecord(kept);
    record.sources = [{ ...record.sources[0], id: 'source-9000' }];
    fromSavedRecord(
      record,
      new Map([['source-9000', kept.snapshot.sources[0].file]]),
    );
    const next = createAudioSource(new File(['c'], 'c.ogg'), 1);
    expect(Number(next.id.slice('source-'.length))).toBeGreaterThan(9000);
  });
});

describe('savedAgo', () => {
  const minute = 60_000;
  it('says how long ago, roughly', () => {
    expect(savedAgo(0, 30_000)).toBe('just now');
    expect(savedAgo(0, minute)).toBe('1 minute ago');
    expect(savedAgo(0, 45 * minute)).toBe('45 minutes ago');
    expect(savedAgo(0, 3 * 60 * minute)).toBe('3 hours ago');
    expect(savedAgo(0, 2 * 24 * 60 * minute)).toBe('2 days ago');
    // A clock that went back is not "in 5 minutes".
    expect(savedAgo(5 * minute, 0)).toBe('just now');
  });
});
