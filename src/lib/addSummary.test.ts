import { describe, expect, it } from 'vitest';
import {
  type AddSummaryLine,
  changeKindLabels,
  summarizeAdd,
} from '@/lib/addSummary';
import type { FileKind } from '@/lib/fileKinds';
import type {
  AudioSource,
  KeySound,
  KeySounds,
  PackType,
} from '@/utils/soundPack';

const source = (name: string, duration = 0.3, type = ''): AudioSource => ({
  id: `id-${name}`,
  file: new File([], name, { type }),
  duration,
  colorIndex: 0,
});

/** The summary of adding `files`, each of one sound unless `kinds` says. */
function summary({
  files,
  kinds = {},
  keySounds = new Map(),
  packType = 'Keyboard',
  skipped = [],
}: {
  files: AudioSource[];
  kinds?: Record<string, FileKind>;
  keySounds?: KeySounds;
  packType?: PackType;
  skipped?: string[];
}) {
  return summarizeAdd({
    batch: { ids: files.map((file) => file.id), skipped },
    sources: files,
    kinds: new Map(
      files.map((file) => [file.id, kinds[file.file.name] ?? 'one']),
    ),
    keySounds,
    packType,
  });
}

const sources = (...names: string[]) => names.map((name) => source(name));
const lineOf = (lines: AddSummaryLine[] | undefined, kind: string) =>
  lines?.find((line) => line.kind === kind);
const kindsOf = (lines: AddSummaryLine[] | undefined) =>
  lines?.map((line) => line.kind);
const plays = (id: string): KeySound => ({ source: id, press: [0, 300] });

describe('summarizeAdd: the heading', () => {
  it('says each short file looks like one sound', () => {
    const forty = Array.from({ length: 40 }, (_, n) => source(`k${n}.wav`));
    expect(summary({ files: forty })?.heading).toBe(
      'Added 40 files. Each looks like one key sound.',
    );
    expect(summary({ files: forty, packType: 'Mouse' })?.heading).toBe(
      'Added 40 files. Each looks like one button sound.',
    );
    expect(summary({ files: sources('a.wav') })?.heading).toBe(
      'Added a.wav. It looks like one key sound.',
    );
  });

  it('gives a recording or a video its length', () => {
    const take = source('typing.m4a', 252, 'audio/mp4');
    expect(
      summary({ files: [take], kinds: { 'typing.m4a': 'many' } })?.heading,
    ).toBe('typing.m4a · 4 min 12 s · a recording with many key presses.');
    expect(
      summary({
        files: [take],
        kinds: { 'typing.m4a': 'many' },
        packType: 'Mouse',
      })?.heading,
    ).toBe('typing.m4a · 4 min 12 s · a recording with many clicks.');
    const clip = source('clip.mp4', 12, 'video/mp4');
    expect(
      summary({ files: [clip], kinds: { 'clip.mp4': 'many' } })?.heading,
    ).toBe('clip.mp4 · 12 s · a video. Only its sound goes in the pack.');
  });

  it('says which files of a mixed add look like what', () => {
    const files = [...sources('a.wav', 'b.wav'), source('typing.m4a', 252)];
    expect(summary({ files, kinds: { 'typing.m4a': 'many' } })?.heading).toBe(
      'Added 3 files. 2 look like one key sound. typing.m4a has many key presses.',
    );
    expect(
      summary({
        files,
        kinds: { 'b.wav': 'many', 'typing.m4a': 'many' },
      })?.heading,
    ).toBe(
      'Added 3 files. 1 looks like one key sound. 2 have many key presses.',
    );
    expect(
      summary({
        files,
        kinds: { 'a.wav': 'many', 'b.wav': 'many', 'typing.m4a': 'many' },
      })?.heading,
    ).toBe('Added 3 files. Each has many key presses.');
  });

  it('goes away once none of the files is left, as after an Undo', () => {
    const files = sources('a.wav');
    expect(
      summarizeAdd({
        batch: { ids: ['id-a.wav'], skipped: [] },
        sources: [],
        kinds: new Map(),
        keySounds: new Map(),
        packType: 'Keyboard',
      }),
    ).toBeNull();
    // A file removed since counts no more.
    expect(
      summarizeAdd({
        batch: { ids: ['id-a.wav', 'id-gone.wav'], skipped: [] },
        sources: files,
        kinds: new Map([['id-a.wav', 'one']]),
        keySounds: new Map(),
        packType: 'Keyboard',
      })?.heading,
    ).toBe('Added a.wav. It looks like one key sound.');
  });
});

describe('changeKindLabels', () => {
  it('names one file or each file, and buttons and clicks on a mouse', () => {
    expect(changeKindLabels(1, 'Keyboard')).toEqual({
      one: 'This file is one key sound',
      many: 'This file has many key presses',
    });
    expect(changeKindLabels(3, 'Keyboard')).toEqual({
      one: 'Each file is one key sound',
      many: 'Each file has many key presses',
    });
    expect(changeKindLabels(2, 'Mouse')).toEqual({
      one: 'Each file is one button sound',
      many: 'Each file has many clicks',
    });
  });
});

describe('summarizeAdd: files that match keys', () => {
  const files = sources(
    'space.wav',
    'a.wav',
    'b.wav',
    'notes 1.wav',
    'x y.wav',
  );

  it('counts the matched files with two examples and offers to give them', () => {
    const line = lineOf(summary({ files })?.lines, 'matched');
    expect(line).toEqual({
      kind: 'matched',
      text: '3 match key names (a.wav -> A, b.wav -> B).',
      action: 'Give them to their keys',
      done: false,
      matches: [
        { id: 'id-a.wav', codes: ['KeyA'] },
        { id: 'id-b.wav', codes: ['KeyB'] },
        { id: 'id-space.wav', codes: ['Space'] },
      ],
    });
  });

  it('names both sides for a name of both, and buttons on a mouse', () => {
    expect(
      lineOf(summary({ files: sources('shift.wav') })?.lines, 'matched')?.text,
    ).toBe('1 matches key names (shift.wav -> Left Shift and Right Shift).');
    const mouse = summary({ files: sources('left.wav'), packType: 'Mouse' });
    expect(lineOf(mouse?.lines, 'matched')).toMatchObject({
      text: '1 matches button names (left.wav -> Left button).',
      action: 'Give it to its button',
    });
  });

  it('warns on a line of its own that keys with a sound get theirs replaced', () => {
    const keySounds = new Map([
      ['KeyA', plays('rec')],
      ['Space', plays('rec')],
      ['KeyB', plays('id-b.wav')],
    ]);
    const { lines } = summary({ files, keySounds }) ?? { lines: [] };
    expect(lines.slice(0, 2)).toMatchObject([
      { kind: 'matched', text: '3 match key names (a.wav -> A, b.wav -> B).' },
      {
        kind: 'replaced',
        text: '2 of these keys have a sound now. It gets replaced.',
      },
    ]);
    expect(lineOf(summary({ files })?.lines, 'replaced')).toBeUndefined();
  });

  it('says it gave them once each key plays its file, and offers again after an Undo', () => {
    const given = new Map([
      ['KeyA', plays('id-a.wav')],
      ['KeyB', plays('id-b.wav')],
      ['Space', plays('id-space.wav')],
    ]);
    const done = lineOf(summary({ files, keySounds: given })?.lines, 'matched');
    expect(done).toMatchObject({
      text: 'Gave 3 files to their keys.',
      done: true,
    });
    expect(done && 'action' in done ? done.action : undefined).toBeUndefined();
    const undone = lineOf(summary({ files })?.lines, 'matched');
    expect(undone).toMatchObject({ done: false });
  });

  it('counts the files that still need a key', () => {
    const result = summary({ files });
    expect(lineOf(result?.lines, 'need-key')?.text).toBe(
      '2 need a key: select keys, then click a file.',
    );
    const oneUsed = summary({
      files,
      keySounds: new Map([['KeyQ', plays('id-x y.wav')]]),
    });
    expect(lineOf(oneUsed?.lines, 'need-key')?.text).toBe(
      '1 needs a key: select keys, then click a file.',
    );
    const mouse = summary({
      files: sources('left.wav', 'thing.wav'),
      packType: 'Mouse',
    });
    expect(lineOf(mouse?.lines, 'need-key')?.text).toBe(
      '1 needs a button: select buttons, then click a file.',
    );
  });

  it('looks at the names of files of one sound only', () => {
    const result = summary({
      files: sources('a.wav', 'b.wav'),
      kinds: { 'a.wav': 'many', 'b.wav': 'many' },
    });
    expect(result?.lines).toEqual([]);
  });
});

describe('summarizeAdd: lines for name patterns', () => {
  it('says a release file will not be used as a release', () => {
    const result = summary({ files: sources('KeyA_down.wav', 'KeyA_up.wav') });
    expect(kindsOf(result?.lines)).toEqual(['matched', 'release']);
    expect(lineOf(result?.lines, 'release')?.text).toBe(
      "Mechvibes plays a release sound only from the same file as the press. Files like KeyA_up.wav won't be used as release.",
    );
  });

  it.each([2, 5, 10])('offers to spread %i numbered clicks', (count) => {
    const clicks = Array.from({ length: count }, (_, n) =>
      source(`click${n + 1}.wav`),
    );
    const line = lineOf(summary({ files: clicks })?.lines, 'similar');
    expect(line).toMatchObject({
      text: `${count} similar clicks found.`,
      action: 'Spread them across keys',
    });
    expect(line && 'ids' in line ? line.ids : []).toHaveLength(count);
  });

  it.each([1, 11])('takes %i numbered files for no set of clicks', (count) => {
    const clicks = Array.from({ length: count }, (_, n) =>
      source(`click${n + 1}.wav`),
    );
    expect(
      lineOf(summary({ files: clicks })?.lines, 'similar'),
    ).toBeUndefined();
  });

  it('groups numbered names with a separator, apart from other names', () => {
    const result = summary({
      files: sources('tap-1.wav', 'tap-2.wav', 'a.wav', 'other.wav'),
    });
    const line = lineOf(result?.lines, 'similar');
    expect(line && 'ids' in line ? line.ids : []).toEqual([
      'id-tap-1.wav',
      'id-tap-2.wav',
    ]);
  });

  it('offers one group of takes at a time, the largest first', () => {
    const files = sources(
      'click1.wav',
      'click2.wav',
      'tap1.wav',
      'tap2.wav',
      'tap3.wav',
    );
    const idsOf = (keySounds: KeySounds = new Map()) => {
      const line = lineOf(summary({ files, keySounds })?.lines, 'similar');
      return line && 'ids' in line ? line.ids : [];
    };
    expect(idsOf()).toEqual(['id-tap1.wav', 'id-tap2.wav', 'id-tap3.wav']);
    const tapsGiven = new Map(
      ['tap1', 'tap2', 'tap3'].map((name, n) => [
        `F${n + 1}`,
        plays(`id-${name}.wav`),
      ]),
    );
    expect(idsOf(tapsGiven)).toEqual(['id-click1.wav', 'id-click2.wav']);
  });

  it('hides the spread once every click plays on a key', () => {
    const files = sources('click1.wav', 'click2.wav');
    const keySounds = new Map([
      ['KeyQ', plays('id-click1.wav')],
      ['KeyW', plays('id-click2.wav')],
    ]);
    expect(
      lineOf(summary({ files, keySounds })?.lines, 'similar'),
    ).toBeUndefined();
  });

  it('says files for the other kind of pack need a pack of their own', () => {
    const keyboard = summary({ files: sources('a.wav', 'wheel.wav') });
    expect(lineOf(keyboard?.lines, 'other-kind')?.text).toBe(
      'Some files look like mouse buttons. A pack is for a keyboard or a mouse. Make a second pack for those.',
    );
    const mouse = summary({
      files: sources('left.wav', 'space.wav'),
      packType: 'Mouse',
    });
    expect(lineOf(mouse?.lines, 'other-kind')?.text).toBe(
      'Some files look like keyboard keys. A pack is for a keyboard or a mouse. Make a second pack for those.',
    );
  });

  it('does not take names with two meanings for the other kind', () => {
    const keyboard = summary({
      files: sources('a.wav', 'back.wav', 'scroll.wav'),
    });
    expect(lineOf(keyboard?.lines, 'other-kind')).toBeUndefined();
    expect(lineOf(keyboard?.lines, 'need-key')?.text).toMatch(/^2 need a key/);
    const mouse = summary({
      files: sources('left.wav', 'up.wav', 'down.wav', '1.wav'),
      packType: 'Mouse',
    });
    expect(lineOf(mouse?.lines, 'other-kind')).toBeUndefined();
  });

  it('offers keys in order when no name matches, in place of the count', () => {
    const files = Array.from({ length: 12 }, (_, n) =>
      source(`key_${String(n + 1).padStart(2, '0')}.wav`),
    );
    const result = summary({ files });
    expect(kindsOf(result?.lines)).toEqual(['no-match']);
    expect(lineOf(result?.lines, 'no-match')).toMatchObject({
      text: 'None of the names match a key. Select keys and click a file, or',
      action: 'Give them to keys in order',
    });
    const given = new Map(
      files.map((file, n) => [`F${n + 1}`, plays(file.id)]),
    );
    expect(summary({ files, keySounds: given })?.lines).toEqual([]);
  });

  it('gives in order only the files no key plays yet', () => {
    const files = sources('key_01.wav', 'key_02.wav', 'key_03.wav');
    const result = summary({
      files,
      keySounds: new Map([['KeyB', plays(files[0].id)]]),
    });
    expect(lineOf(result?.lines, 'no-match')).toMatchObject({
      ids: [files[1].id, files[2].id],
    });
  });

  it('names the files it skipped', () => {
    const result = summary({
      files: sources('a.wav'),
      skipped: ['notes.txt', 'cover.png'],
    });
    expect(lineOf(result?.lines, 'skipped')?.text).toBe(
      '2 files skipped: notes.txt, cover.png',
    );
  });
});
