import { describe, expect, it, vi } from 'vitest';
import {
  isInFolder,
  isSystemFile,
  readDroppedEntries,
  relativePathOf,
  withRelativePath,
  zipFolder,
} from '@/lib/folderFiles';
import { fakeAudio } from '@/test/packZip';
import { parseSoundPackZip } from '@/utils/soundPackImport';

vi.mock('@/utils/audioUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/audioUtils')>()),
  // Node has no media elements to read a length from, nor a decoder.
  getAudioDuration: vi.fn(async () => 1.5),
  getDecodedDuration: vi.fn(async () => 0),
}));

describe('isSystemFile', () => {
  it.each([
    '.DS_Store',
    'Pack/.DS_Store',
    'Pack/._a.wav',
    'Pack/.git/config',
    'Pack/Thumbs.db',
    'Pack/thumbs.db',
    'Pack/desktop.ini',
    '__MACOSX/Pack/a.wav',
    'Pack/__MACOSX/a.wav',
  ])('leaves out %s', (path) => {
    expect(isSystemFile(path)).toBe(true);
  });

  it.each(['a.wav', 'Pack/a.wav', 'Pack/sounds/config.json', ''])(
    'keeps %j',
    (path) => {
      expect(isSystemFile(path)).toBe(false);
    },
  );
});

describe('withRelativePath', () => {
  it('copies the file with its path inside the folder', async () => {
    const file = new File(['abc'], 'a.wav', { type: 'audio/wav' });
    const copy = withRelativePath(file, 'Pack/a.wav');
    expect(copy).not.toBe(file);
    expect(copy.name).toBe('a.wav');
    expect(copy.type).toBe('audio/wav');
    expect(await copy.text()).toBe('abc');
    expect(relativePathOf(copy)).toBe('Pack/a.wav');
    expect(isInFolder(copy)).toBe(true);
  });

  it('reads a file on its own by its name', () => {
    const file = new File([], 'a.wav');
    expect(relativePathOf(file)).toBe('a.wav');
    expect(isInFolder(file)).toBe(false);
  });
});

// Stand-ins for the entries a drop hands over (webkitGetAsEntry).
const fileEntry = (path: string, content = path) => ({
  isFile: true,
  isDirectory: false,
  fullPath: `/${path}`,
  file: (done: (file: File) => void) =>
    done(new File([content], path.split('/').at(-1) ?? path)),
});

/** A folder whose reader hands its entries over two at a time. */
const folderEntry = (path: string, children: object[]) => ({
  isFile: false,
  isDirectory: true,
  fullPath: `/${path}`,
  createReader: () => {
    let next = 0;
    return {
      readEntries: (done: (entries: object[]) => void) => {
        done(children.slice(next, next + 2));
        next += 2;
      },
    };
  },
});

describe('readDroppedEntries', () => {
  it('reads every file under a folder, each with its path', async () => {
    const pack = folderEntry('Pack', [
      fileEntry('Pack/a.wav'),
      fileEntry('Pack/b.wav'),
      fileEntry('Pack/config.json'),
      folderEntry('Pack/more', [fileEntry('Pack/more/c.wav')]),
      fileEntry('Pack/.DS_Store'),
      fileEntry('Pack/Thumbs.db'),
      folderEntry('Pack/__MACOSX', [fileEntry('Pack/__MACOSX/._a.wav')]),
    ]);
    const files = await readDroppedEntries([pack, fileEntry('loose.wav')]);
    expect(files.map(relativePathOf)).toEqual([
      'Pack/a.wav',
      'Pack/b.wav',
      'Pack/config.json',
      'Pack/more/c.wav',
      'loose.wav',
    ]);
    expect(files.map((file) => file.name)).toEqual([
      'a.wav',
      'b.wav',
      'config.json',
      'c.wav',
      'loose.wav',
    ]);
    expect(isInFolder(files[4])).toBe(false);
    expect(await files[3].text()).toBe('Pack/more/c.wav');
  });

  it('reads an empty folder as no files', async () => {
    expect(await readDroppedEntries([folderEntry('Empty', [])])).toEqual([]);
  });
});

describe('zipFolder', () => {
  const pathed = (path: string, content: string | Uint8Array<ArrayBuffer>) =>
    withRelativePath(new File([content], path.split('/').at(-1) ?? path), path);

  it('makes a pack folder open the way its zip would', async () => {
    const config = {
      config_version: '2',
      definition_method: 'multi',
      soundpack_type: 'Keyboard',
      definitions: {
        KeyA: { audio_file: 'sounds/a.ogg', timing: [[0, 100]] },
        Space: { audio_file: 'sounds/space.ogg', timing: [[0, 200]] },
      },
    };
    const zip = await zipFolder([
      pathed('Cherry Pack/config.json', JSON.stringify(config)),
      pathed('Cherry Pack/sounds/a.ogg', fakeAudio('a')),
      pathed('Cherry Pack/sounds/space.ogg', fakeAudio('space')),
    ]);
    expect(zip.name).toBe('Cherry Pack.zip');
    expect(zip.type).toBe('application/zip');
    const pack = await parseSoundPackZip(zip);
    // A config without a name takes the folder's.
    expect(pack.info.name).toBe('Cherry Pack');
    expect(pack.sources.map((source) => source.file.name).sort()).toEqual([
      'sounds/a.ogg',
      'sounds/space.ogg',
    ]);
    expect([...pack.keySounds.keys()].sort()).toEqual(['KeyA', 'Space']);
  });

  it('keeps the error a V1 pack folder gets as a zip', async () => {
    const zip = await zipFolder([
      pathed('Model O/config.json', JSON.stringify({ defines: { 1: 'a' } })),
      pathed('Model O/1.wav', fakeAudio('1')),
    ]);
    await expect(parseSoundPackZip(zip)).rejects.toThrow(
      'This is a classic Mechvibes (V1) pack.',
    );
  });
});
