import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeAudio, makePackZip, readPackZip } from '@/test/packZip';
import { getAudioDuration, getDecodedDuration } from '@/utils/audioUtils';
import {
  type AudioSource,
  createAudioSource,
  type KeySound,
  WHOLE_FILE,
} from '@/utils/soundPack';
import { buildSoundPackZip } from '@/utils/soundPackExport';
import {
  findSegmentsPastEnd,
  migrateKeyCode,
  parseSoundPackZip,
} from '@/utils/soundPackImport';

vi.mock('@/utils/audioUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/audioUtils')>()),
  // Node has no media elements to read a length from, nor a decoder.
  getAudioDuration: vi.fn(async () => 1.5),
  getDecodedDuration: vi.fn(async () => 0),
}));

afterEach(() => {
  // Back to the lengths above.
  vi.mocked(getAudioDuration).mockReset();
  vi.mocked(getDecodedDuration).mockReset();
});

/** A multi pack zip from `definitions` and the files they name. */
function multiPack(
  definitions: Record<string, unknown>,
  files: Record<string, Uint8Array<ArrayBuffer>>,
) {
  return makePackZip({
    'config.json': {
      config_version: '2',
      name: 'Multi pack',
      definition_method: 'multi',
      audio_file: Object.keys(files)[0],
      soundpack_type: 'Keyboard',
      definitions,
    },
    ...files,
  });
}

/** A single pack zip whose keys play `definitions` from one file, with `more` files. */
function singlePackWith(
  definitions: Record<string, unknown>,
  more: Record<string, Uint8Array<ArrayBuffer>>,
) {
  return makePackZip({
    'config.json': {
      config_version: '2',
      name: 'Old pack',
      author: 'Tester',
      definition_method: 'single',
      audio_file: 'sound.ogg',
      soundpack_type: 'Keyboard',
      definitions,
    },
    'sound.ogg': fakeAudio('main'),
    ...more,
  });
}

/** A single pack zip whose keys play `definitions` from one file. */
function singlePack(definitions: Record<string, unknown>) {
  return singlePackWith(definitions, {});
}

describe('migrateKeyCode', () => {
  const none = new Set<string>();

  it.each([
    ['Ins', 'Numpad0'],
    ['Del', 'NumpadDecimal'],
    ['Break', 'Pause'],
  ])('renames %s to %s', (code, target) => {
    expect(migrateKeyCode(code, none, 'Keyboard')).toBe(target);
  });

  it('leaves out a code whose key the pack already defines', () => {
    expect(
      migrateKeyCode('Del', new Set(['Del', 'NumpadDecimal']), 'Keyboard'),
    ).toBeNull();
  });

  it.each(['Home', 'Digit5', 'Insert', 'Delete', 'ins', 'constructor'])(
    'keeps %s',
    (code) => {
      expect(migrateKeyCode(code, none, 'Keyboard')).toBe(code);
    },
  );

  it.each([
    ['Escape', 'MouseLeft'],
    ['Digit1', 'MouseRight'],
    ['Digit2', 'MouseMiddle'],
  ])(
    'renames %s in a mouse pack to %s, the button the app plays',
    (code, target) => {
      expect(migrateKeyCode(code, none, 'Mouse')).toBe(target);
    },
  );

  it('keeps those keys in a keyboard pack', () => {
    expect(migrateKeyCode('Escape', none, 'Keyboard')).toBe('Escape');
    expect(migrateKeyCode('Digit1', none, 'Keyboard')).toBe('Digit1');
  });

  it('leaves out an old button whose new name the mouse pack already defines', () => {
    expect(
      migrateKeyCode('Escape', new Set(['Escape', 'MouseLeft']), 'Mouse'),
    ).toBeNull();
  });
});

describe('opening a pack with old key names', () => {
  it('renames them in place and says so', async () => {
    const pack = await parseSoundPackZip(
      await singlePack({
        Ins: [[0, 80]],
        Del: [[100, 180]],
        Break: [[200, 280]],
        Home: [[300, 380]],
        ShiftLeft: [[400, 480]],
      }),
    );

    expect([...pack.keySounds.keys()]).toEqual([
      'Numpad0',
      'NumpadDecimal',
      'Pause',
      'Home',
      'ShiftLeft',
    ]);
    expect([...pack.keySounds.values()].map((sound) => sound.press)).toEqual([
      [0, 80],
      [100, 180],
      [200, 280],
      [300, 380],
      [400, 480],
    ]);
    expect(pack.notes).toEqual([
      'Renamed key names the app does not know: Ins is now Numpad0, Del is now NumpadDecimal, Break is now Pause.',
    ]);
    expect(pack.warnings).toEqual([]);

    const out = await readPackZip(
      await buildSoundPackZip({
        info: pack.info,
        sources: pack.sources,
        keySounds: pack.keySounds,
        extras: pack.extras,
      }),
    );
    expect(Object.keys(out.config.definitions as object)).toEqual([
      'Numpad0',
      'NumpadDecimal',
      'Pause',
      'Home',
      'ShiftLeft',
    ]);
  });

  it('keeps the new name when the pack has both', async () => {
    const pack = await parseSoundPackZip(
      await singlePack({ Del: [[0, 10]], NumpadDecimal: [[20, 30]] }),
    );

    expect([...pack.keySounds.keys()]).toEqual(['NumpadDecimal']);
    expect(pack.keySounds.get('NumpadDecimal')?.press).toEqual([20, 30]);
    expect(pack.warnings).toContain(
      'Left out because the pack already defines the key they stand for: Del.',
    );
    expect(pack.notes).toEqual([]);
  });

  it('does not call a key renamed when it is left out', async () => {
    const pack = await parseSoundPackZip(
      await singlePack({ KeyA: [[0, 10]], Ins: 'not timing' }),
    );

    expect([...pack.keySounds.keys()]).toEqual(['KeyA']);
    expect(pack.warnings).toEqual([
      'Left out because the app cannot read their timing: Numpad0.',
    ]);
    expect(pack.notes).toEqual([]);
  });
});

describe('findSegmentsPastEnd', () => {
  const oneSecond = createAudioSource(new File([], 'a.ogg'), 1);
  const sound = (source: AudioSource, rest: Omit<KeySound, 'source'>) => ({
    source: source.id,
    ...rest,
  });

  it('sorts keys by where their sound ends', () => {
    const keySounds = new Map([
      ['KeyA', sound(oneSecond, { press: [0, 500] })],
      ['KeyB', sound(oneSecond, { press: [900, 1200] })],
      ['KeyC', sound(oneSecond, { press: [0, 100], release: [1000, 1100] })],
      ['KeyD', sound(oneSecond, { press: [900, 1200], release: [1000, 1100] })],
      ['KeyE', sound(oneSecond, { press: [0, 1000] })],
      ['KeyF', sound(oneSecond, { press: [1000, 1100], release: [0, 100] })],
      [
        'KeyG',
        sound(oneSecond, { press: [1000, 1100], release: [1000, 1100] }),
      ],
    ]);

    expect(findSegmentsPastEnd(keySounds, [oneSecond])).toEqual({
      silent: ['KeyC', 'KeyD', 'KeyG'],
      pressPastEnd: ['KeyF'],
      cutShort: ['KeyB'],
    });
  });

  it('allows an end rounded up to the next millisecond, as the editor does', () => {
    const source = createAudioSource(new File([], 'b.ogg'), 0.9996);
    const keySounds = new Map([
      ['KeyA', sound(source, { press: [0, 1000] })],
      ['KeyB', sound(source, { press: [0, 1000.4] })],
    ]);

    expect(findSegmentsPastEnd(keySounds, [source])).toEqual({
      silent: [],
      pressPastEnd: [],
      cutShort: ['KeyB'],
    });
  });

  it('skips files of unknown length, and keys whose file is gone', () => {
    const unknown = createAudioSource(new File([], 'c.ogg'), 0);
    const gone = createAudioSource(new File([], 'd.ogg'), 1);
    const keySounds = new Map([
      ['KeyA', sound(unknown, { press: [5000, 6000] })],
      ['KeyB', sound(unknown, { press: WHOLE_FILE })],
      ['KeyC', sound(gone, { press: [5000, 6000] })],
    ]);

    expect(findSegmentsPastEnd(keySounds, [unknown])).toEqual({
      silent: [],
      pressPastEnd: [],
      cutShort: [],
    });
  });
});

describe('opening a key that plays its whole file', () => {
  it('keeps it without timing when the browser cannot read the file', async () => {
    vi.mocked(getAudioDuration).mockResolvedValue(0);

    const pack = await parseSoundPackZip(
      await multiPack(
        { KeyA: { audio_file: 'a.ogg' } },
        { 'a.ogg': fakeAudio('a') },
      ),
    );

    expect(pack.keySounds.get('KeyA')?.press).toEqual(WHOLE_FILE);
    expect(pack.warnings).toEqual([
      'This browser cannot read the audio of these keys, so you cannot hear or edit them here. They still play their whole file in the app and are exported unchanged: KeyA.',
    ]);
  });

  it('decodes the file when its length is not in the metadata', async () => {
    vi.mocked(getAudioDuration).mockResolvedValue(0);
    vi.mocked(getDecodedDuration).mockResolvedValue(0.25);

    const pack = await parseSoundPackZip(
      await multiPack(
        { KeyA: { audio_file: 'a.ogg' } },
        { 'a.ogg': fakeAudio('a') },
      ),
    );

    expect(pack.keySounds.get('KeyA')?.press).toEqual([0, 250]);
    expect(pack.sources[0].duration).toBe(0.25);
    expect(pack.warnings).toEqual([]);
  });
});

describe('colouring the files of an opened pack', () => {
  it('colours them in list order, so the most used file takes the first colour', async () => {
    const pack = await parseSoundPackZip(
      await multiPack(
        {
          KeyA: { audio_file: 'a.ogg', timing: [[0, 50]] },
          KeyB: { audio_file: 'b.ogg', timing: [[0, 50]] },
          KeyC: { audio_file: 'b.ogg', timing: [[50, 100]] },
        },
        {
          'a.ogg': fakeAudio('a'),
          'b.ogg': fakeAudio('b'),
          'c.ogg': fakeAudio('c'),
        },
      ),
    );

    expect(
      pack.sources.map(({ file, colorIndex }) => [file.name, colorIndex]),
    ).toEqual([
      ['b.ogg', 0],
      ['a.ogg', 1],
      ['c.ogg', 2],
    ]);
    // Keys still point at their files.
    expect(pack.keySounds.get('KeyB')?.source).toBe(pack.sources[0].id);
    expect(pack.keySounds.get('KeyA')?.source).toBe(pack.sources[1].id);
  });
});

describe('opening a pack with files no key uses', () => {
  it('keeps them last and leaves out macOS resource forks', async () => {
    const pack = await parseSoundPackZip(
      await multiPack(
        { KeyA: { audio_file: 'a.ogg', timing: [[0, 50]] } },
        {
          'a.ogg': fakeAudio('a'),
          '__MACOSX/._a.ogg': fakeAudio('fork'),
          'b.ogg': fakeAudio('b'),
        },
      ),
    );

    expect(pack.sources.map((source) => source.file.name)).toEqual([
      'a.ogg',
      'b.ogg',
    ]);
    expect(pack.warnings).toEqual([]);
    expect(pack.notes).toEqual([
      'Kept an audio file that no key uses: b.ogg. You can cut sounds from it here, but Download .zip leaves out files that no key uses.',
    ]);
  });

  it('names several of them, in name order', async () => {
    const pack = await parseSoundPackZip(
      await multiPack(
        { KeyA: { audio_file: 'a.ogg', timing: [[0, 50]] } },
        {
          'a.ogg': fakeAudio('a'),
          'demo.mp3': fakeAudio('demo'),
          'b.ogg': fakeAudio('b'),
          'sounds/._c.ogg': fakeAudio('fork'),
        },
      ),
    );

    expect(pack.sources.map((source) => source.file.name)).toEqual([
      'a.ogg',
      'demo.mp3',
      'b.ogg',
    ]);
    expect(pack.notes).toEqual([
      'Kept 2 audio files that no key uses: b.ogg, demo.mp3. You can cut sounds from them here, but Download .zip leaves out files that no key uses.',
    ]);
  });

  it('keeps a stray file of a single pack, and Download .zip leaves it out', async () => {
    const pack = await parseSoundPackZip(
      await singlePackWith({ KeyA: [[0, 50]] }, { 'demo.mp3': fakeAudio('x') }),
    );

    expect(pack.sources.map((source) => source.file.name)).toEqual([
      'sound.ogg',
      'demo.mp3',
    ]);
    const out = await readPackZip(
      await buildSoundPackZip({
        info: pack.info,
        sources: pack.sources,
        keySounds: pack.keySounds,
        extras: pack.extras,
      }),
    );
    expect(out.names).toEqual(['audio.ogg', 'config.json']);
  });

  it('does not take a resource fork for the file of a single pack', async () => {
    const pack = await parseSoundPackZip(
      await makePackZip({
        'config.json': {
          config_version: '2',
          definition_method: 'single',
          definitions: { KeyA: [[0, 50]] },
        },
        '__MACOSX/._sound.ogg': fakeAudio('fork'),
        'sound.ogg': fakeAudio('main'),
      }),
    );

    expect(pack.sources.map((source) => source.file.name)).toEqual([
      'sound.ogg',
    ]);
  });
});

describe('opening a pack zipped inside a folder', () => {
  const config = (name: string) => ({
    config_version: '2',
    name,
    definition_method: 'single',
    audio_file: 'sound.ogg',
    definitions: { KeyA: [[0, 50]] },
  });

  it('reads the pack from its folder and leaves out files outside it', async () => {
    const pack = await parseSoundPackZip(
      await makePackZip({
        'downloads/Blue/config.json': config('Blue'),
        'downloads/Blue/sound.ogg': fakeAudio('blue'),
        'downloads/Blue/extra.ogg': fakeAudio('extra'),
        'downloads/other.ogg': fakeAudio('outside'),
        '__MACOSX/downloads/Blue/._config.json': 'fork',
      }),
    );

    expect(pack.info.name).toBe('Blue');
    expect(pack.sources.map((source) => source.file.name)).toEqual([
      'sound.ogg',
      'extra.ogg',
    ]);
    expect(pack.keySounds.get('KeyA')?.source).toBe(pack.sources[0].id);
    expect(pack.warnings).toEqual([]);
  });

  it('takes the config.json nearest the top', async () => {
    const pack = await parseSoundPackZip(
      await makePackZip({
        'Blue/config.json': config('Blue'),
        'Blue/sound.ogg': fakeAudio('blue'),
        'Blue/old/config.json': config('Old copy'),
        'Blue/old/sound.ogg': fakeAudio('old'),
      }),
    );

    expect(pack.info.name).toBe('Blue');
    expect(pack.sources.map((source) => source.file.name)).toEqual([
      'sound.ogg',
      'old/sound.ogg',
    ]);
  });

  it('refuses a zip of several packs', async () => {
    const zip = await makePackZip({
      'Blue/config.json': config('Blue'),
      'Blue/sound.ogg': fakeAudio('blue'),
      'Red/config.json': config('Red'),
      'Red/sound.ogg': fakeAudio('red'),
    });

    await expect(parseSoundPackZip(zip)).rejects.toThrow(
      'This .zip holds more than one pack. Zip each pack folder on its own, then open it.',
    );
  });

  it('says a zip without config.json anywhere is not a pack', async () => {
    const zip = await makePackZip({
      'Blue/sound.ogg': fakeAudio('blue'),
      '__MACOSX/Blue/config.json': 'fork',
    });

    await expect(parseSoundPackZip(zip)).rejects.toThrow(
      'This .zip has no config.json, so it is not a Mechvibes pack.',
    );
  });
});

describe('opening a pack whose sounds run past their file', () => {
  it('warns about a sound that starts after the end and notes one cut short', async () => {
    vi.mocked(getAudioDuration).mockResolvedValue(1);

    const pack = await parseSoundPackZip(
      await singlePack({
        KeyA: [[1200, 1300]],
        KeyB: [[900, 1500]],
        KeyC: [[0, 100]],
      }),
    );

    expect([...pack.keySounds.keys()]).toEqual(['KeyA', 'KeyB', 'KeyC']);
    expect(pack.warnings).toEqual([
      'Part of the sound of these keys starts after their audio file ends, so the app plays nothing there: KeyA.',
    ]);
    expect(pack.notes).toEqual([
      'These keys run past the end of their audio file. The app stops them where the file ends: KeyB.',
    ]);
  });

  it('says a multi pack plays the release on press when only the press starts after the end', async () => {
    vi.mocked(getAudioDuration).mockResolvedValue(1);

    const pack = await parseSoundPackZip(
      await multiPack(
        {
          KeyA: {
            audio_file: 'a.ogg',
            timing: [
              [5000, 5100],
              [100, 200],
            ],
          },
          KeyB: {
            audio_file: 'a.ogg',
            timing: [
              [100, 200],
              [5000, 5100],
            ],
          },
        },
        { 'a.ogg': fakeAudio('a') },
      ),
    );

    expect(pack.warnings).toEqual([
      'Part of the sound of these keys starts after their audio file ends, so the app plays nothing there: KeyB.',
      'The press sound of these keys starts after their audio file ends, so the app plays their release sound when the key goes down: KeyA.',
    ]);
  });

  it('says a single pack plays nothing when only the press starts after the end', async () => {
    vi.mocked(getAudioDuration).mockResolvedValue(1);

    const pack = await parseSoundPackZip(
      await singlePack({
        KeyA: [
          [5000, 5100],
          [100, 200],
        ],
      }),
    );

    expect(pack.warnings).toEqual([
      'Part of the sound of these keys starts after their audio file ends, so the app plays nothing there: KeyA.',
    ]);
  });
});

describe('opening a mouse pack converted from Mechvibes V1', () => {
  /** A single pack zip of type `soundpack_type` whose keys play `definitions`. */
  const packOfType = (
    soundpack_type: string | undefined,
    definitions: Record<string, unknown>,
  ) =>
    makePackZip({
      'config.json': {
        config_version: '2',
        name: 'Converted pack',
        definition_method: 'single',
        audio_file: 'sound.ogg',
        soundpack_type,
        definitions,
      },
      'sound.ogg': fakeAudio('main'),
    });

  it('renames its keys to the buttons the app plays them as', async () => {
    const pack = await parseSoundPackZip(
      await packOfType('Mouse', {
        Escape: [[0, 50]],
        Digit1: [[100, 150]],
        Digit2: [[200, 250]],
        Mouse4: [[300, 350]],
      }),
    );

    expect(pack.info.packType).toBe('Mouse');
    expect([...pack.keySounds.keys()]).toEqual([
      'MouseLeft',
      'MouseRight',
      'MouseMiddle',
      'Mouse4',
    ]);
    expect(pack.keySounds.get('MouseRight')?.press).toEqual([100, 150]);
    expect(pack.notes).toEqual([
      'Renamed old button names to the buttons the app plays them as: Escape is now MouseLeft, Digit1 is now MouseRight, Digit2 is now MouseMiddle.',
    ]);
    expect(pack.warnings).toEqual([]);
  });

  it('keeps those keys in a keyboard pack', async () => {
    const pack = await parseSoundPackZip(
      await packOfType(undefined, { Escape: [[0, 50]], Digit1: [[100, 150]] }),
    );

    expect(pack.info.packType).toBe('Keyboard');
    expect([...pack.keySounds.keys()]).toEqual(['Escape', 'Digit1']);
    expect(pack.notes).toEqual([]);
  });
});
