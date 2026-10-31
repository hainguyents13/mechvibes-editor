import { describe, expect, it } from 'vitest';
import {
  carriesLink,
  DROP_MESSAGES,
  type DropContext,
  type DroppedFile,
  routeDrop,
} from '@/lib/dropRouting';

const START: DropContext = { onStart: true, isDirty: false };
const WORKSPACE: DropContext = { onStart: false, isDirty: false };
const UNSAVED: DropContext = { onStart: false, isDirty: true };

const file = (name: string, type = ''): DroppedFile => ({ name, type });
/** A file as a drag reports it, before the drop names it. */
const dragged = (type: string): DroppedFile => ({ name: '', type });

const drop = (files: DroppedFile[], context = WORKSPACE, hasLink = false) =>
  routeDrop({ files, hasLink }, context);

describe('routeDrop: pack .zip', () => {
  it.each([
    file('pack.zip', 'application/zip'),
    file('pack.zip', 'application/x-zip-compressed'),
    file('pack.ZIP'),
    file('pack.zip', 'application/octet-stream'),
    file('download', 'application/zip'),
  ])('opens $name ($type)', (zip) => {
    expect(drop([zip])).toEqual({
      kind: 'open-zip',
      file: zip,
      confirm: false,
      message: 'Drop to open this pack',
    });
  });

  it('asks first over unsaved work in the workspace', () => {
    expect(drop([file('pack.zip')], UNSAVED)).toMatchObject({
      kind: 'open-zip',
      confirm: true,
    });
  });

  it('never asks on the start screen, where there is no pack to lose', () => {
    expect(
      drop([file('pack.zip')], { onStart: true, isDirty: true }),
    ).toMatchObject({ kind: 'open-zip', confirm: false });
    expect(drop([file('pack.zip')], START)).toMatchObject({
      kind: 'open-zip',
      confirm: false,
    });
  });

  it('opens the zip and leaves out files it cannot use', () => {
    const zip = file('pack.zip');
    expect(drop([file('readme.txt', 'text/plain'), zip])).toMatchObject({
      kind: 'open-zip',
      file: zip,
    });
  });

  it('opens one zip at a time', () => {
    expect(drop([file('a.zip'), file('b.zip')])).toEqual({
      kind: 'reject',
      message: DROP_MESSAGES.oneZip,
    });
  });

  it('does not mix a zip with sounds', () => {
    expect(drop([file('pack.zip'), file('a.wav', 'audio/wav')])).toEqual({
      kind: 'reject',
      message: DROP_MESSAGES.oneZip,
    });
    expect(drop([file('pack.zip'), file('a.wav')], START)).toEqual({
      kind: 'reject',
      message: DROP_MESSAGES.oneZip,
    });
  });
});

describe('routeDrop: audio and video', () => {
  it('adds sounds to the open pack', () => {
    const files = [file('a.wav', 'audio/wav'), file('clip.mp4', 'video/mp4')];
    expect(drop(files)).toEqual({
      kind: 'add-media',
      files,
      message: 'Drop to add these sounds',
    });
  });

  it('adds them over unsaved work without asking', () => {
    expect(drop([file('a.wav')], UNSAVED)).toMatchObject({
      kind: 'add-media',
    });
  });

  it('starts a new pack from the start screen', () => {
    const files = [file('a.wav', 'audio/wav'), file('b.ogg', 'audio/ogg')];
    expect(drop(files, START)).toEqual({
      kind: 'to-type-question',
      files,
      message: 'Drop to start a new pack with these sounds',
    });
  });

  it('speaks of one sound when there is one', () => {
    expect(drop([file('a.wav')]).message).toBe('Drop to add this sound');
    expect(drop([file('a.wav')], START).message).toBe(
      'Drop to start a new pack with this sound',
    );
  });

  it.each([
    'take.flac',
    'typing.m4a',
    'clip.mov',
    'clip.webm',
    'space.MP3',
    'key.opus',
  ])('accepts %s by its extension when the type is empty', (name) => {
    expect(drop([file(name)])).toMatchObject({ kind: 'add-media' });
  });

  it('reads the extension when the type is generic', () => {
    expect(drop([file('b.ogg', 'application/ogg')])).toMatchObject({
      kind: 'add-media',
    });
    expect(
      drop([file('a.wav', 'application/octet-stream')], START),
    ).toMatchObject({ kind: 'to-type-question' });
  });

  it('accepts a declared audio or video type whatever the extension', () => {
    expect(drop([file('recording', 'audio/x-m4a')])).toMatchObject({
      kind: 'add-media',
    });
  });

  it('keeps the sounds and leaves out the rest, in order', () => {
    const a = file('a.wav');
    const b = file('b.mp3', 'audio/mpeg');
    const result = drop([
      a,
      file('cover.png', 'image/png'),
      file('notes.txt'),
      b,
      file('old.rar'),
    ]);
    expect(result).toMatchObject({ kind: 'add-media', files: [a, b] });
  });

  it('prefers files to a link that comes with them', () => {
    expect(drop([file('a.wav')], WORKSPACE, true)).toMatchObject({
      kind: 'add-media',
    });
  });
});

describe('routeDrop: files the editor cannot use', () => {
  it.each([
    [[file('cover.png', 'image/png')]],
    [[file('notes.txt', 'text/plain'), file('README')]],
    [[file('My Pack')]],
  ])('refuses %j', (files) => {
    expect(drop(files)).toEqual({
      kind: 'reject',
      message: DROP_MESSAGES.unusable,
    });
    expect(drop(files, START)).toEqual({
      kind: 'reject',
      message: DROP_MESSAGES.unusable,
    });
  });

  it.each([
    [
      file('pack.rar'),
      'This is a .rar file. Unzip it, then open the folder or a .zip.',
    ],
    [
      file('pack.RAR', 'application/vnd.rar'),
      'This is a .rar file. Unzip it, then open the folder or a .zip.',
    ],
    [
      file('download', 'application/x-rar-compressed'),
      'This is a .rar file. Unzip it, then open the folder or a .zip.',
    ],
    [
      file('pack.7z'),
      'This is a .7z file. Unzip it, then open the folder or a .zip.',
    ],
    [
      file('pack.7z', 'application/x-7z-compressed'),
      'This is a .7z file. Unzip it, then open the folder or a .zip.',
    ],
  ])('says how to open an archive it cannot read: %j', (archive, message) => {
    expect(drop([archive])).toEqual({ kind: 'reject', message });
    expect(drop([archive, file('notes.txt')], START)).toEqual({
      kind: 'reject',
      message,
    });
  });

  it('refuses a link, which it cannot download', () => {
    expect(drop([], WORKSPACE, true)).toEqual({
      kind: 'reject',
      message:
        "Links can't be opened here. Download the video to your computer first, then add the file.",
    });
    expect(drop([], START, true)).toEqual({
      kind: 'reject',
      message: DROP_MESSAGES.link,
    });
  });

  it('refuses a drop with nothing in it', () => {
    expect(drop([])).toEqual({
      kind: 'reject',
      message: DROP_MESSAGES.unusable,
    });
  });
});

describe('carriesLink', () => {
  /** Data as the browser hands it over; a drag reads as empty until the drop. */
  const data = (
    entries: Record<string, string>,
    types = Object.keys(entries),
  ) => ({
    types,
    getData: (format: string) => entries[format] ?? '',
  });

  it('takes a link the browser marks as one', () => {
    expect(
      carriesLink(
        data({
          'text/uri-list': 'https://youtu.be/abc',
          'text/plain': 'https://youtu.be/abc',
        }),
      ),
    ).toBe(true);
    // While dragging, only the types are known.
    expect(carriesLink(data({}, ['text/uri-list', 'text/plain']))).toBe(true);
  });

  it('takes text that reads as a link', () => {
    expect(
      carriesLink(data({ 'text/plain': ' http://example.com/a.mp3' })),
    ).toBe(true);
  });

  it('does not take other text for a link', () => {
    expect(carriesLink(data({ 'text/plain': 'my cool pack' }))).toBe(false);
    expect(carriesLink(data({ 'text/plain': 'me@example.com' }))).toBe(false);
    // While dragging, plain text cannot tell yet.
    expect(carriesLink(data({}, ['text/plain', 'text/html']))).toBe(false);
  });
});

describe('routeDrop: while dragging, before the files are named', () => {
  it('tells zips, archives and media apart by type', () => {
    expect(drop([dragged('application/x-zip-compressed')])).toMatchObject({
      kind: 'open-zip',
      message: 'Drop to open this pack',
    });
    expect(drop([dragged('audio/wav'), dragged('video/mp4')])).toMatchObject({
      kind: 'add-media',
      message: 'Drop to add these sounds',
    });
    expect(drop([dragged('audio/wav')], START)).toMatchObject({
      kind: 'to-type-question',
    });
    expect(drop([dragged('application/vnd.rar')])).toMatchObject({
      kind: 'reject',
    });
    expect(drop([dragged('image/png')])).toEqual({
      kind: 'reject',
      message: DROP_MESSAGES.unusable,
    });
  });

  it('cannot tell a file whose type is empty or generic', () => {
    for (const type of ['', 'application/octet-stream', 'application/ogg']) {
      expect(drop([dragged(type)])).toEqual({
        kind: 'unknown',
        message: DROP_MESSAGES.unknown,
      });
      expect(drop([dragged('audio/wav'), dragged(type)], START)).toEqual({
        kind: 'unknown',
        message: DROP_MESSAGES.unknown,
      });
    }
  });

  it('agrees with the drop once the files are named', () => {
    const cases: [DroppedFile, DroppedFile][] = [
      [dragged('application/zip'), file('pack.zip', 'application/zip')],
      [dragged('audio/mpeg'), file('a.mp3', 'audio/mpeg')],
      [dragged('image/png'), file('cover.png', 'image/png')],
    ];
    for (const [during, after] of cases) {
      for (const context of [START, WORKSPACE, UNSAVED]) {
        const { kind, message } = drop([during], context);
        expect(drop([after], context)).toMatchObject({ kind, message });
      }
    }
  });
});
