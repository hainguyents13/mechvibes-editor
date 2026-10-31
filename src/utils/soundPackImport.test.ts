import { describe, expect, it, vi } from 'vitest';
import { fakeAudio, makePackZip, readPackZip } from '@/test/packZip';
import { buildSoundPackZip } from '@/utils/soundPackExport';
import { migrateKeyCode, parseSoundPackZip } from '@/utils/soundPackImport';

vi.mock('@/utils/audioUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/audioUtils')>()),
  // Node has no media elements to read a length from.
  getAudioDuration: vi.fn(async () => 1.5),
}));

/** A single pack zip whose keys play `definitions` from one file. */
function singlePack(definitions: Record<string, unknown>) {
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
  });
}

describe('migrateKeyCode', () => {
  const none = new Set<string>();

  it.each([
    ['Ins', 'Numpad0'],
    ['Del', 'NumpadDecimal'],
    ['Break', 'Pause'],
  ])('renames %s to %s', (code, target) => {
    expect(migrateKeyCode(code, none)).toBe(target);
  });

  it('leaves out a code whose key the pack already defines', () => {
    expect(migrateKeyCode('Del', new Set(['Del', 'NumpadDecimal']))).toBeNull();
  });

  it.each(['Home', 'Digit5', 'Insert', 'Delete', 'ins', 'constructor'])(
    'keeps %s',
    (code) => {
      expect(migrateKeyCode(code, none)).toBe(code);
    },
  );
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
