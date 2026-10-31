import { describe, expect, it, vi } from 'vitest';
import { fakeAudio, makePackZip, readPackZip } from '@/test/packZip';
import { buildSoundPackZip } from '@/utils/soundPackExport';
import { parseSoundPackZip } from '@/utils/soundPackImport';

vi.mock('@/utils/audioUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/audioUtils')>()),
  // Node has no media elements to read a length from.
  getAudioDuration: vi.fn(async () => 1.5),
}));

/** Open a pack and export it again, the way Import then Export does. */
async function reexport(file: File) {
  const pack = await parseSoundPackZip(file);
  const blob = await buildSoundPackZip({
    id: pack.id ?? undefined,
    info: pack.info,
    sources: pack.sources,
    keySounds: pack.keySounds,
    extras: pack.extras,
  });
  return { pack, blob, out: await readPackZip(blob) };
}

/** Export, open the export and export it again: the second zip must equal the first. */
async function roundTrip(files: Parameters<typeof makePackZip>[0]) {
  const first = await reexport(await makePackZip(files));
  const second = await reexport(
    new File([first.blob], 'pack.zip', { type: 'application/zip' }),
  );
  expect(second.out.configText).toBe(first.out.configText);
  expect(second.out.names).toEqual(first.out.names);
  for (const name of first.out.names) {
    expect(await second.out.bytes(name)).toEqual(await first.out.bytes(name));
  }
  expect(second.pack.warnings).toEqual([]);
  return first;
}

/** A config.json for a single pack, with `fields` added or replaced. */
function packConfig(fields: Record<string, unknown>) {
  return {
    config_version: '2',
    name: 'Test pack',
    author: 'Tester',
    description: 'A pack for tests',
    tags: ['test'],
    definition_method: 'single',
    audio_file: 'sound.ogg',
    soundpack_type: 'Keyboard',
    options: { recommended_volume: 1, random_pitch: false },
    definitions: { KeyA: { timing: [[0, 50]] } },
    ...fields,
  };
}

/** What the editor writes for `packConfig({})`, with `fields` added or replaced. */
function exportedConfig(fields: Record<string, unknown>) {
  return packConfig({ audio_file: 'audio.ogg', ...fields });
}

const PNG_BYTES = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

describe('import then export', () => {
  it('keeps a single pack as it is', async () => {
    const { pack, out } = await roundTrip({
      'config.json': packConfig({
        definitions: {
          KeyA: { timing: [[0, 50]] },
          KeyB: { timing: [[50, 100]] },
        },
      }),
      'sound.ogg': fakeAudio('main'),
    });

    expect(pack.warnings).toEqual([]);
    expect(out.names).toEqual(['audio.ogg', 'config.json']);
    expect(out.config).toEqual(
      exportedConfig({
        definitions: {
          KeyA: { timing: [[0, 50]] },
          KeyB: { timing: [[50, 100]] },
        },
      }),
    );
    expect(await out.bytes('audio.ogg')).toEqual(fakeAudio('main'));
  });

  it('keeps press and release segments', async () => {
    const { pack, out } = await roundTrip({
      'config.json': packConfig({
        definitions: {
          KeyA: {
            timing: [
              [0, 50],
              [50, 100],
            ],
          },
          KeyB: [[100, 150.5]],
          KeyC: {
            timing: [
              [0, 10],
              [10, 20],
              [20, 30],
            ],
          },
        },
      }),
      'sound.ogg': fakeAudio('main'),
    });

    const source = pack.sources[0].id;
    expect(pack.keySounds.get('KeyA')).toEqual({
      source,
      press: [0, 50],
      release: [50, 100],
    });
    expect(pack.keySounds.get('KeyB')).toEqual({ source, press: [100, 150.5] });
    expect('release' in (pack.keySounds.get('KeyB') ?? {})).toBe(false);
    expect(pack.keySounds.has('KeyC')).toBe(false);
    expect(pack.warnings).toEqual([
      'Left out because they have no sound or more than two, which the app plays as silence: KeyC.',
    ]);
    expect(out.config.definitions).toEqual({
      KeyA: {
        timing: [
          [0, 50],
          [50, 100],
        ],
      },
      KeyB: { timing: [[100, 150.5]] },
    });
  });

  it('keeps a multi pack and renames its files', async () => {
    const { pack, out } = await roundTrip({
      'config.json': packConfig({
        definition_method: 'multi',
        audio_file: 'sounds/a.ogg',
        definitions: {
          KeyA: { audio_file: 'sounds/a.ogg', timing: [[0, 40]] },
          KeyB: {
            audio_file: 'sounds\\B.mp3',
            timing: [
              [0, 40],
              [40, 80],
            ],
          },
          KeyC: { audio_file: './sounds/a.ogg' },
          KeyD: { timing: [[10, 20]] },
          KeyE: { audio_file: 'missing.ogg', timing: [[0, 10]] },
        },
      }),
      'sounds/a.ogg': fakeAudio('a'),
      'sounds/b.mp3': fakeAudio('b'),
    });

    expect(pack.warnings).toEqual([
      'Left out because their audio is not in the zip: KeyE.',
    ]);
    expect(out.names).toEqual(['config.json', 'sounds-a.ogg', 'sounds-b.mp3']);
    expect(out.config).toEqual(
      exportedConfig({
        definition_method: 'multi',
        audio_file: 'sounds-a.ogg',
        definitions: {
          KeyA: { audio_file: 'sounds-a.ogg', timing: [[0, 40]] },
          KeyB: {
            audio_file: 'sounds-b.mp3',
            timing: [
              [0, 40],
              [40, 80],
            ],
          },
          // A key without timing plays its whole file, 1.5 s here.
          KeyC: { audio_file: 'sounds-a.ogg', timing: [[0, 1500]] },
          KeyD: { audio_file: 'sounds-a.ogg', timing: [[10, 20]] },
        },
      }),
    );
    expect(await out.bytes('sounds-a.ogg')).toEqual(fakeAudio('a'));
    expect(await out.bytes('sounds-b.mp3')).toEqual(fakeAudio('b'));
  });

  it('gives same-named files their own names', async () => {
    const { out } = await roundTrip({
      'config.json': packConfig({
        definition_method: 'multi',
        audio_file: 'click.ogg',
        definitions: {
          KeyA: { audio_file: 'click.ogg', timing: [[0, 10]] },
          KeyB: { audio_file: 'Click.ogg', timing: [[0, 10]] },
        },
      }),
      'click.ogg': fakeAudio('lower'),
      'Click.ogg': fakeAudio('upper'),
    });

    expect(out.names).toEqual(['Click-2.ogg', 'click.ogg', 'config.json']);
    expect(out.config.definitions).toEqual({
      KeyA: { audio_file: 'click.ogg', timing: [[0, 10]] },
      KeyB: { audio_file: 'Click-2.ogg', timing: [[0, 10]] },
    });
    expect(await out.bytes('click.ogg')).toEqual(fakeAudio('lower'));
    expect(await out.bytes('Click-2.ogg')).toEqual(fakeAudio('upper'));
  });

  it.each([
    {
      name: 'a pack that says it is a mouse pack',
      soundpack_type: 'mouse',
      codes: ['MouseLeft', 'MouseRight'],
      packType: 'Mouse',
    },
    {
      name: 'a pack with mouse buttons only',
      soundpack_type: undefined,
      codes: ['MouseLeft', 'MouseWheelUp'],
      packType: 'Mouse',
    },
    {
      name: 'a pack with keys and mouse buttons',
      soundpack_type: undefined,
      codes: ['KeyA', 'MouseLeft'],
      packType: 'Keyboard',
    },
  ])('keeps the type of $name', async ({ soundpack_type, codes, packType }) => {
    const { pack, out } = await roundTrip({
      'config.json': packConfig({
        soundpack_type,
        definitions: Object.fromEntries(
          codes.map((code) => [code, { timing: [[0, 50]] }]),
        ),
      }),
      'sound.ogg': fakeAudio('main'),
    });

    expect(pack.info.packType).toBe(packType);
    expect(out.config.soundpack_type).toBe(packType);
  });

  it('keeps the icon it names', async () => {
    const { out } = await roundTrip({
      'config.json': packConfig({ icon: 'img/Logo.PNG' }),
      'sound.ogg': fakeAudio('main'),
      'img/Logo.PNG': PNG_BYTES,
    });

    expect(out.names).toEqual(['audio.ogg', 'config.json', 'icon.png']);
    expect(out.config.icon).toBe('icon.png');
    expect(await out.bytes('icon.png')).toEqual(PNG_BYTES);
  });

  it('keeps an icon the config does not name', async () => {
    const { out } = await roundTrip({
      'config.json': packConfig({}),
      'sound.ogg': fakeAudio('main'),
      'art.webp': PNG_BYTES,
    });

    expect(out.names).toEqual(['audio.ogg', 'config.json', 'icon.webp']);
    expect(out.config.icon).toBe('icon.webp');
  });

  it('leaves out an icon of a type the library does not take', async () => {
    const { out } = await roundTrip({
      'config.json': packConfig({ icon: 'logo.gif' }),
      'sound.ogg': fakeAudio('main'),
      'logo.gif': PNG_BYTES,
    });

    expect(out.names).toEqual(['audio.ogg', 'config.json']);
    expect('icon' in out.config).toBe(false);
  });

  it('keeps options and the order they came in', async () => {
    const { out } = await roundTrip({
      'config.json': packConfig({
        options: {
          random_pitch: true,
          recommended_volume: 0.5,
          future_option: 'x',
        },
      }),
      'sound.ogg': fakeAudio('main'),
    });

    expect(out.config.options).toEqual({
      random_pitch: true,
      recommended_volume: 0.5,
      future_option: 'x',
    });
    expect(Object.keys(out.config.options as object)).toEqual([
      'random_pitch',
      'recommended_volume',
      'future_option',
    ]);
  });

  it.each([
    { name: 'a volume out of range', options: { recommended_volume: 5 } },
    { name: 'no options', options: undefined },
  ])('adds missing options to $name', async ({ options }) => {
    const { out } = await roundTrip({
      'config.json': packConfig({ options }),
      'sound.ogg': fakeAudio('main'),
    });

    expect(out.config.options).toEqual({
      recommended_volume: 1,
      random_pitch: false,
    });
  });

  it('writes back config fields the editor does not edit', async () => {
    const config: Record<string, unknown> = {
      config_version: '2',
      config_version_num: 2,
      name: 'Extras',
      m_author: 'Me',
      description: '',
      tags: ['a', 1],
      definition_method: 'single',
      audio_file: 'sound.ogg',
      soundpack_type: 'Keyboard',
      version: '1.2',
      created_at: '2024-05-01T10:00:00.000Z',
      author_url: 'https://example.com/me',
      nested: { a: [1, 2] },
      defs: { KeyA: [[0, 50]] },
    };
    const { out } = await roundTrip({
      'config.json': config,
      'sound.ogg': fakeAudio('main'),
    });

    expect(Object.keys(out.config)).toEqual([
      'config_version',
      'name',
      'author',
      'description',
      'tags',
      'definition_method',
      'audio_file',
      'soundpack_type',
      'options',
      'definitions',
      'version',
      'created_at',
      'author_url',
      'nested',
    ]);
    expect(out.config).toEqual({
      config_version: '2',
      name: 'Extras',
      author: 'Me',
      description: '',
      tags: ['a'],
      definition_method: 'single',
      audio_file: 'audio.ogg',
      soundpack_type: 'Keyboard',
      options: { recommended_volume: 1, random_pitch: false },
      definitions: { KeyA: { timing: [[0, 50]] } },
      version: config.version,
      created_at: config.created_at,
      author_url: config.author_url,
      nested: config.nested,
    });
  });

  it('names the editor as author when the pack has none', async () => {
    const { out } = await roundTrip({
      'config.json': packConfig({ author: '  ' }),
      'sound.ogg': fakeAudio('main'),
    });

    expect(out.config.author).toBe('Mechvibes Editor');
  });

  it('keeps license files', async () => {
    const { out } = await roundTrip({
      'config.json': packConfig({}),
      'sound.ogg': fakeAudio('main'),
      LICENSE: 'MIT',
      'license.md': '# CC-BY',
      'docs/LICENSE': 'Not the pack license',
      'readme.md': 'Read me',
    });

    expect(out.names).toEqual([
      'LICENSE',
      'audio.ogg',
      'config.json',
      'license.md',
    ]);
    expect(await out.text('LICENSE')).toBe('MIT');
    expect(await out.text('license.md')).toBe('# CC-BY');
  });

  it('keeps one license file when two have the same name', async () => {
    const { out } = await roundTrip({
      'config.json': packConfig({}),
      'sound.ogg': fakeAudio('main'),
      LICENSE: 'MIT',
      license: 'MIT too',
    });

    expect(
      out.names.filter((name) => name.toLowerCase() === 'license'),
    ).toHaveLength(1);
  });

  it.each([
    { name: 'its id', id: 'pack-123', expected: 'pack-123' },
    { name: 'no id', id: undefined, expected: null },
    { name: 'a blank id', id: '  ', expected: null },
  ])(
    'keeps the pack id and never makes one up: $name',
    async ({ id, expected }) => {
      const { pack, out } = await roundTrip({
        'config.json': packConfig({ id }),
        'sound.ogg': fakeAudio('main'),
      });

      expect(pack.id).toBe(expected);
      if (expected) {
        expect(out.config.id).toBe(expected);
      } else {
        expect('id' in out.config).toBe(false);
      }
    },
  );
});
