import { describe, expect, it } from 'vitest';
import {
  AUDIO_FILE_ACCEPT,
  addFileToKeys,
  applyPressToKeys,
  applyReleaseToKeys,
  clearKeySounds,
  formatDuration,
  formatLength,
  giveFilesToKeysInOrder,
  giveFilesToTheirKeys,
  giveOneSoundToKeys,
  isMediaFile,
  isValidWaveformSelection,
  keysAcceptingRelease,
  keysToFill,
  mediaTypeOf,
  oneSoundSegment,
  removeReleaseFromKeys,
  sharedPressSegment,
  spreadFilesAcrossKeys,
  swapPressAndRelease,
  VIDEO_FILE_ACCEPT,
  withMediaType,
} from '@/utils/audioUtils';
import {
  type AudioSource,
  type KeySound,
  type KeySounds,
  WHOLE_FILE,
} from '@/utils/soundPack';

const keySounds = () =>
  new Map<string, KeySound>([
    ['KeyA', { source: 'a', press: [0, 50], release: [50, 100] }],
    ['KeyB', { source: 'b', press: [0, 40], release: [40, 80] }],
    ['KeyC', { source: 'a', press: [100, 150] }],
  ]);

/** Run `update` and check it left its input alone and returned a new map. */
function updated(input: KeySounds, update: (input: KeySounds) => KeySounds) {
  const before = structuredClone(input);
  const result = update(input);
  expect(input).toEqual(before);
  expect(result).not.toBe(input);
  return result;
}

describe('applyPressToKeys', () => {
  it('gives a key without a sound a press and no release', () => {
    const result = updated(keySounds(), (input) =>
      applyPressToKeys(['KeyD'], 'a', [10, 20], input),
    );
    expect(result.get('KeyD')).toEqual({ source: 'a', press: [10, 20] });
    expect('release' in (result.get('KeyD') as KeySound)).toBe(false);
  });

  it('keeps the release of a key that has one from the same source', () => {
    const result = updated(keySounds(), (input) =>
      applyPressToKeys(['KeyA'], 'a', [10, 20], input),
    );
    expect(result.get('KeyA')).toEqual({
      source: 'a',
      press: [10, 20],
      release: [50, 100],
    });
  });

  it('drops the release of a key that has one from another source', () => {
    const result = updated(keySounds(), (input) =>
      applyPressToKeys(['KeyB'], 'a', [10, 20], input),
    );
    expect(result.get('KeyB')).toEqual({ source: 'a', press: [10, 20] });
  });

  it('leaves other keys as they are', () => {
    const input = keySounds();
    const result = updated(input, () =>
      applyPressToKeys(['KeyA'], 'a', [10, 20], input),
    );
    expect(result.get('KeyB')).toBe(input.get('KeyB'));
    expect(result.get('KeyC')).toBe(input.get('KeyC'));
  });
  it('returns the same map when every key already plays that sound', () => {
    const input = keySounds();
    // KeyA keeps its release from the same file, so nothing changes.
    expect(applyPressToKeys(['KeyA'], 'a', [0, 50], input)).toBe(input);
    expect(applyPressToKeys(['KeyC', 'KeyC'], 'a', [100, 150], input)).toBe(
      input,
    );
    expect(applyPressToKeys([], 'a', [0, 50], input)).toBe(input);
  });

  it('changes a key whose sound differs in any part', () => {
    const input = keySounds();
    expect(applyPressToKeys(['KeyC'], 'a', [100, 151], input)).not.toBe(input);
    expect(applyPressToKeys(['KeyC'], 'b', [100, 150], input)).not.toBe(input);
    // Same press from another file's key: that key loses its release.
    const withRelease = new Map(input).set('KeyD', {
      source: 'b',
      press: [100, 150],
      release: [150, 200],
    });
    const result = applyPressToKeys(['KeyD'], 'a', [100, 150], withRelease);
    expect(result.get('KeyD')).toEqual({ source: 'a', press: [100, 150] });
  });
});

describe('keysAcceptingRelease', () => {
  it('keeps the keys with a press from the source, in order', () => {
    expect(
      keysAcceptingRelease(['KeyC', 'KeyD', 'KeyB', 'KeyA'], 'a', keySounds()),
    ).toEqual(['KeyC', 'KeyA']);
  });

  it('leaves out a key that plays its whole file', () => {
    const input = keySounds();
    input.set('KeyW', { source: 'a', press: WHOLE_FILE });
    expect(keysAcceptingRelease(['KeyW', 'KeyC'], 'a', input)).toEqual([
      'KeyC',
    ]);
  });
});

describe('applyReleaseToKeys', () => {
  it('sets or replaces the release of keys with a press from the source', () => {
    const result = updated(keySounds(), (input) =>
      applyReleaseToKeys(['KeyA', 'KeyC'], 'a', [200, 250], input),
    );
    expect(result.get('KeyA')).toEqual({
      source: 'a',
      press: [0, 50],
      release: [200, 250],
    });
    expect(result.get('KeyC')).toEqual({
      source: 'a',
      press: [100, 150],
      release: [200, 250],
    });
  });

  it('leaves keys from another source and keys without a sound alone', () => {
    const input = keySounds();
    const result = updated(input, () =>
      applyReleaseToKeys(['KeyB', 'KeyD'], 'a', [200, 250], input),
    );
    expect(result.get('KeyB')).toBe(input.get('KeyB'));
    expect(result.has('KeyD')).toBe(false);
    expect(result.size).toBe(input.size);
  });

  it('leaves a key that plays its whole file without a release', () => {
    const input = keySounds();
    input.set('KeyW', { source: 'a', press: WHOLE_FILE });
    const result = updated(input, () =>
      applyReleaseToKeys(['KeyW', 'KeyC'], 'a', [200, 250], input),
    );
    expect(result.get('KeyW')).toBe(input.get('KeyW'));
    expect(result.get('KeyC')?.release).toEqual([200, 250]);
  });
});

describe('removeReleaseFromKeys', () => {
  it('takes the release off a key', () => {
    const result = updated(keySounds(), (input) =>
      removeReleaseFromKeys(['KeyA'], input),
    );
    expect(result.get('KeyA')).toEqual({ source: 'a', press: [0, 50] });
    expect('release' in (result.get('KeyA') as KeySound)).toBe(false);
  });

  it('leaves a key without a release as it is and skips unknown keys', () => {
    const input = keySounds();
    const result = updated(input, () =>
      removeReleaseFromKeys(['KeyC', 'KeyD'], input),
    );
    expect(result.get('KeyC')).toBe(input.get('KeyC'));
    expect(result.has('KeyD')).toBe(false);
    expect(result.size).toBe(input.size);
  });
});

describe('clearKeySounds', () => {
  it('takes the press and release off the given keys only', () => {
    const input = keySounds();
    const result = updated(input, () =>
      clearKeySounds(['KeyA', 'KeyB'], input),
    );
    expect([...result.keys()]).toEqual(['KeyC']);
    expect(result.get('KeyC')).toBe(input.get('KeyC'));
  });

  it('returns the same map when none of the keys has a sound', () => {
    const input = keySounds();
    expect(clearKeySounds(['KeyD', 'KeyE'], input)).toBe(input);
    expect(clearKeySounds([], input)).toBe(input);
  });

  it('does not mind repeated or unknown codes', () => {
    const result = updated(keySounds(), (input) =>
      clearKeySounds(['KeyA', 'KeyA', 'KeyZ'], input),
    );
    expect([...result.keys()]).toEqual(['KeyB', 'KeyC']);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [59.9, '0:59'],
    [61, '1:01'],
    [600, '10:00'],
  ])('formats %s seconds as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});

describe('isValidWaveformSelection', () => {
  it('takes a span that starts at or after 0 and ends after it starts', () => {
    expect(isValidWaveformSelection({ start: 0, end: 1 })).toBe(true);
  });

  it.each([
    { start: 1, end: 1 },
    { start: -1, end: 1 },
    { start: 2, end: 1 },
  ])('refuses $start to $end', (selection) => {
    expect(isValidWaveformSelection(selection)).toBe(false);
  });
});

describe('file picker accept lists', () => {
  it('offer each kind by type and by extension, apart', () => {
    expect(AUDIO_FILE_ACCEPT.split(',')).toEqual(
      expect.arrayContaining(['audio/*', '.mp3', '.wav', '.flac', '.m4a']),
    );
    expect(VIDEO_FILE_ACCEPT.split(',')).toEqual(
      expect.arrayContaining(['video/*', '.mp4', '.webm', '.mov']),
    );
    expect(AUDIO_FILE_ACCEPT).not.toContain('.mov');
    expect(VIDEO_FILE_ACCEPT).not.toContain('.mp3');
  });
});

describe('isMediaFile', () => {
  it.each([
    ['audio/ogg', true],
    ['video/mp4', true],
    ['', false],
    ['application/zip', false],
  ])('treats type "%s" as media: %s', (type, isMedia) => {
    expect(isMediaFile(new File([], 'file', { type }))).toBe(isMedia);
  });

  it.each([
    ['take.FLAC', true],
    ['clip.mov', true],
    ['typing.m4a', true],
    ['notes.txt', false],
    ['pack.zip', false],
  ])('falls back on the extension of %s: %s', (name, isMedia) => {
    expect(isMediaFile({ name, type: '' })).toBe(isMedia);
    expect(isMediaFile({ name, type: 'application/octet-stream' })).toBe(
      isMedia,
    );
  });
});

describe('mediaTypeOf', () => {
  it('keeps a declared audio or video type', () => {
    expect(mediaTypeOf({ name: 'a.bin', type: 'audio/x-wav' })).toBe(
      'audio/x-wav',
    );
    expect(mediaTypeOf({ name: 'a.wav', type: 'Video/MP4' })).toBe('video/mp4');
  });

  it('infers the type from the extension when none is declared', () => {
    expect(mediaTypeOf({ name: 'space.wav', type: '' })).toBe('audio/wav');
    expect(mediaTypeOf({ name: 'clip.MOV', type: '' })).toBe('video/quicktime');
    expect(mediaTypeOf({ name: 'cover.png', type: 'image/png' })).toBeNull();
    expect(mediaTypeOf({ name: 'README', type: '' })).toBeNull();
  });
});

describe('withMediaType', () => {
  it('fills in a missing type and keeps the name and contents', async () => {
    const file = new File(['abc'], 'clip.mov', { lastModified: 42 });
    const typed = withMediaType(file);
    expect(typed.type).toBe('video/quicktime');
    expect(typed.name).toBe('clip.mov');
    expect(typed.lastModified).toBe(42);
    expect(await typed.text()).toBe('abc');
  });

  it('returns the same file when its type is already right or unknown', () => {
    const typed = new File([], 'a.wav', { type: 'audio/wav' });
    const other = new File([], 'notes.txt');
    expect(withMediaType(typed)).toBe(typed);
    expect(withMediaType(other)).toBe(other);
  });
});

describe('formatLength', () => {
  it.each([
    [0.04, '0.04 s'],
    [0.3, '0.3 s'],
    [0.25, '0.3 s'],
    [1, '1 s'],
    [1.5, '1.5 s'],
    [9.96, '10 s'],
    [12.4, '12 s'],
    [59.6, '1 min'],
    [252, '4 min 12 s'],
    [600, '10 min'],
  ])('reads %s seconds as %s', (seconds, text) => {
    expect(formatLength(seconds)).toBe(text);
  });
});

const source = (id: string, name: string, duration: number): AudioSource => ({
  id,
  file: new File([], name, { type: 'audio/wav' }),
  duration,
  colorIndex: 0,
});

describe('sharedPressSegment and oneSoundSegment', () => {
  it('finds the one part every key of a file plays', () => {
    const sounds: KeySounds = new Map([
      ['KeyA', { source: 'a', press: [10, 300] }],
      ['KeyB', { source: 'a', press: [10, 300] }],
      ['KeyC', { source: 'b', press: [0, 50] }],
    ]);
    expect(sharedPressSegment('a', sounds)).toEqual([10, 300]);
    expect(oneSoundSegment(source('a', 'a.wav', 0.5), sounds)).toEqual([
      10, 300,
    ]);
  });

  it('plays the whole file when keys differ or none plays it', () => {
    const sounds: KeySounds = new Map([
      ['KeyA', { source: 'a', press: [0, 100] }],
      ['KeyB', { source: 'a', press: [100, 200] }],
    ]);
    expect(sharedPressSegment('a', sounds)).toBeNull();
    expect(sharedPressSegment('b', sounds)).toBeNull();
    expect(oneSoundSegment(source('a', 'a.wav', 0.5), sounds)).toEqual([
      0, 500,
    ]);
    expect(oneSoundSegment(source('b', 'b.wav', 0.25), sounds)).toEqual([
      0, 250,
    ]);
  });

  it('plays a file of unknown length whole, without timing', () => {
    expect(oneSoundSegment(source('a', 'a.wav', 0), new Map())).toEqual(
      WHOLE_FILE,
    );
  });
});

describe('giveOneSoundToKeys', () => {
  const typing = source('t', 'typing.wav', 3);

  it('drops a release the key had cut from the same file', () => {
    const input: KeySounds = new Map([
      ['KeyA', { source: 't', press: [100, 200], release: [300, 400] }],
      ['KeyS', { source: 't', press: [500, 600], release: [700, 800] }],
    ]);
    const result = updated(input, () =>
      giveOneSoundToKeys(['KeyA'], typing, input),
    );
    expect(result.get('KeyA')).toEqual({ source: 't', press: [0, 3000] });
    expect(result.get('KeyS')).toBe(input.get('KeyS'));
  });

  it('drops the release also where the press stays the part keys share', () => {
    const input: KeySounds = new Map([
      ['KeyA', { source: 't', press: [100, 200], release: [300, 400] }],
    ]);
    const result = giveOneSoundToKeys(['KeyA', 'KeyB'], typing, input);
    expect(result.get('KeyA')).toEqual({ source: 't', press: [100, 200] });
    expect(result.get('KeyB')).toEqual({ source: 't', press: [100, 200] });
  });

  it('returns the same map when every key already plays the file', () => {
    const input: KeySounds = new Map([
      ['KeyA', { source: 't', press: [0, 3000] }],
    ]);
    expect(giveOneSoundToKeys(['KeyA'], typing, input)).toBe(input);
  });
});

describe('giveFilesToTheirKeys', () => {
  const a = source('a', 'a.wav', 0.3);
  const shift = source('shift', 'shift.wav', 0.2);

  it('gives each file the keys its name matched, whole', () => {
    const result = giveFilesToTheirKeys(
      [
        { source: a, codes: ['KeyA'] },
        { source: shift, codes: ['ShiftLeft', 'ShiftRight'] },
      ],
      new Map(),
    );
    expect(Object.fromEntries(result)).toEqual({
      KeyA: { source: 'a', press: [0, 300] },
      ShiftLeft: { source: 'shift', press: [0, 200] },
      ShiftRight: { source: 'shift', press: [0, 200] },
    });
  });

  it('replaces the sound a key had, release and all', () => {
    const input: KeySounds = new Map([
      ['KeyA', { source: 'rec', press: [0, 50], release: [50, 90] }],
    ]);
    const result = giveFilesToTheirKeys(
      [{ source: a, codes: ['KeyA'] }],
      input,
    );
    expect(result.get('KeyA')).toEqual({ source: 'a', press: [0, 300] });
  });

  it('reuses the part the file already plays on its keys', () => {
    const input: KeySounds = new Map([
      ['KeyQ', { source: 'a', press: [20, 120] }],
    ]);
    const result = giveFilesToTheirKeys(
      [{ source: a, codes: ['KeyA'] }],
      input,
    );
    expect(result.get('KeyA')).toEqual({ source: 'a', press: [20, 120] });
  });

  it('returns the same map when every key already plays its file', () => {
    const input = giveFilesToTheirKeys(
      [{ source: a, codes: ['KeyA'] }],
      new Map(),
    );
    expect(giveFilesToTheirKeys([{ source: a, codes: ['KeyA'] }], input)).toBe(
      input,
    );
  });
});

describe('keysToFill', () => {
  const layout = ['KeyQ', 'KeyW', 'KeyE', 'KeyA'];
  const sounds: KeySounds = new Map([['KeyW', { source: 'a', press: [0, 1] }]]);

  it('fills the selected keys, in layout order', () => {
    expect(keysToFill(layout, ['KeyA', 'KeyW'], sounds)).toEqual([
      'KeyW',
      'KeyA',
    ]);
  });

  it('fills the silent keys when none is selected', () => {
    expect(keysToFill(layout, [], sounds)).toEqual(['KeyQ', 'KeyE', 'KeyA']);
  });
});

describe('spreadFilesAcrossKeys and giveFilesToKeysInOrder', () => {
  const clicks = [
    source('c10', 'click10.wav', 0.1),
    source('c2', 'click2.wav', 0.1),
    source('c1', 'click1.wav', 0.1),
  ];
  const keys = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'];
  const sourceOf = (sounds: KeySounds) =>
    Object.fromEntries([...sounds].map(([code, { source }]) => [code, source]));

  it('spreads files round the keys in name order', () => {
    const result = spreadFilesAcrossKeys(clicks, keys, new Map());
    expect(sourceOf(result)).toEqual({
      KeyQ: 'c1',
      KeyW: 'c2',
      KeyE: 'c10',
      KeyR: 'c1',
      KeyT: 'c2',
    });
    expect(result.get('KeyQ')).toEqual({ source: 'c1', press: [0, 100] });
  });

  it('gives files one key each and leaves the rest of either alone', () => {
    const input: KeySounds = new Map([
      ['KeyT', { source: 'x', press: [0, 5] }],
    ]);
    const fewerKeys = giveFilesToKeysInOrder(clicks, ['KeyQ', 'KeyW'], input);
    expect(sourceOf(fewerKeys)).toEqual({ KeyQ: 'c1', KeyW: 'c2', KeyT: 'x' });
    const moreKeys = giveFilesToKeysInOrder(clicks, keys, input);
    expect(sourceOf(moreKeys)).toEqual({
      KeyQ: 'c1',
      KeyW: 'c2',
      KeyE: 'c10',
      KeyT: 'x',
    });
  });

  it('drops a release from another file, as giving a press does', () => {
    const input: KeySounds = new Map([
      ['KeyQ', { source: 'rec', press: [0, 50], release: [50, 90] }],
    ]);
    const result = spreadFilesAcrossKeys(clicks, ['KeyQ'], input);
    expect(result.get('KeyQ')).toEqual({ source: 'c1', press: [0, 100] });
  });

  it('returns the same map when nothing changes', () => {
    const input = spreadFilesAcrossKeys(clicks, keys, new Map());
    expect(spreadFilesAcrossKeys(clicks, keys, input)).toBe(input);
    expect(giveFilesToKeysInOrder([], keys, input)).toBe(input);
    expect(spreadFilesAcrossKeys(clicks, [], input)).toBe(input);
  });
});

describe('swapPressAndRelease', () => {
  it('swaps the two halves of keys that have both, from the same file', () => {
    const input = keySounds();
    const result = updated(input, (sounds) =>
      swapPressAndRelease(['KeyA', 'KeyC'], sounds),
    );
    expect(result.get('KeyA')).toEqual({
      source: 'a',
      press: [50, 100],
      release: [0, 50],
    });
    // Without a release there is nothing to swap.
    expect(result.get('KeyC')).toBe(input.get('KeyC'));
    expect(result.get('KeyB')).toBe(input.get('KeyB'));
  });

  it('returns the same map when no key has a release', () => {
    const input = keySounds();
    expect(swapPressAndRelease(['KeyC', 'KeyZ'], input)).toBe(input);
  });
});

describe('addFileToKeys', () => {
  it('adds the file and gives it to the keys as one change', () => {
    const a = { ...source('a', 'a.wav', 0.3), colorIndex: 0 };
    const b = source('b', 'b.wav', 0.2);
    const current = {
      sources: [a],
      keySounds: new Map<string, KeySound>([
        ['KeyA', { source: 'a', press: [0, 300] }],
      ]),
    };
    const result = addFileToKeys(current, b, ['KeyS', 'Numpad1']);
    expect(
      result.sources.map(({ id, colorIndex }) => [id, colorIndex]),
    ).toEqual([
      ['a', 0],
      ['b', 1],
    ]);
    expect(result.keySounds.get('KeyS')).toEqual({
      source: 'b',
      press: [0, 200],
    });
    // A key the drawn layout leaves out takes it too.
    expect(result.keySounds.get('Numpad1')).toEqual({
      source: 'b',
      press: [0, 200],
    });
    expect(result.keySounds.get('KeyA')).toBe(current.keySounds.get('KeyA'));
    expect(current.sources).toEqual([a]);
  });

  it('drops the release a key had from its old file', () => {
    const fresh = source('fresh', 'fresh.wav', 0.25);
    const result = addFileToKeys(
      { sources: [], keySounds: keySounds() },
      fresh,
      ['KeyA'],
    );
    expect(result.keySounds.get('KeyA')).toEqual({
      source: 'fresh',
      press: [0, 250],
    });
  });
});
