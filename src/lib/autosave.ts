import type { FileKind } from '@/lib/fileKinds';
import type { PackSnapshot } from '@/utils/packHistory';
import {
  type AudioSource,
  isRecord,
  type KeySound,
  type PackExtras,
  reserveSourceIds,
} from '@/utils/soundPack';

// The pack being worked on is kept in this browser's IndexedDB, one pack at a
// time, so a crash, a reload or a closed tab does not lose it. The audio
// files sit in a store of their own, by source id, so a save writes only the
// files that are new or replaced, not every file every time.

const DB_NAME = 'mechvibes-editor';
const DB_VERSION = 1;
const WORK_STORE = 'work';
const FILE_STORE = 'files';
const KEY = 'latest';
/** Bumped when the stored shape changes; an older record is not restored. */
const RECORD_VERSION = 1;

/** The library pack the work publishes to with Update. */
export type SavedLibraryPack = {
  id: string;
  name: string;
  slug: string;
  revision: number;
};

/** The work as it is kept and restored. */
export type SavedWork = {
  savedAt: number;
  snapshot: PackSnapshot;
  /** Changes not yet downloaded or published, which leaving would lose. */
  unsaved: boolean;
  fileKinds: ReadonlyMap<string, FileKind>;
  loadedPackId: string | null;
  packExtras: PackExtras | null;
  libraryPack: SavedLibraryPack | null;
  activeSourceId: string | null;
};

/** A source as stored: its file is in the file store under its id. */
type StoredSource = Omit<AudioSource, 'file'>;

/** The stored form: maps as arrays of entries, and a version. */
type SavedRecord = {
  version: number;
  savedAt: number;
  unsaved: boolean;
  packInfo: PackSnapshot['packInfo'];
  sources: StoredSource[];
  keySounds: [string, KeySound][];
  fileKinds: [string, FileKind][];
  loadedPackId: string | null;
  packExtras: PackExtras | null;
  libraryPack: SavedLibraryPack | null;
  activeSourceId: string | null;
};

export function toSavedRecord(work: SavedWork): SavedRecord {
  return {
    version: RECORD_VERSION,
    savedAt: work.savedAt,
    unsaved: work.unsaved,
    packInfo: work.snapshot.packInfo,
    sources: work.snapshot.sources.map(({ file: _file, ...source }) => source),
    keySounds: [...work.snapshot.keySounds],
    fileKinds: [...work.fileKinds],
    loadedPackId: work.loadedPackId,
    packExtras: work.packExtras,
    libraryPack: work.libraryPack,
    activeSourceId: work.activeSourceId,
  };
}

const isStoredSource = (value: unknown): value is StoredSource =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.duration === 'number' &&
  typeof value.colorIndex === 'number';

/**
 * The work in a stored record, with each source's file from `files`, or null
 * when the record is from another version, does not hold a pack, or a file
 * is not there: such a record is not offered.
 */
export function fromSavedRecord(
  record: unknown,
  files: ReadonlyMap<string, File>,
): SavedWork | null {
  if (
    !isRecord(record) ||
    record.version !== RECORD_VERSION ||
    typeof record.savedAt !== 'number' ||
    !isRecord(record.packInfo) ||
    !Array.isArray(record.sources) ||
    !record.sources.every(isStoredSource) ||
    !Array.isArray(record.keySounds) ||
    !Array.isArray(record.fileKinds)
  ) {
    return null;
  }
  const sources: AudioSource[] = [];
  for (const stored of record.sources as StoredSource[]) {
    const file = files.get(stored.id);
    if (!file) return null;
    sources.push({ ...stored, file });
  }
  // Files added after restoring must not take these ids.
  reserveSourceIds(sources);
  const ids = new Set(sources.map((source) => source.id));
  // A key whose file is not there would break the editor; it is left out.
  const keySounds = new Map(
    (record.keySounds as [string, KeySound][]).filter(([, sound]) =>
      ids.has(sound?.source),
    ),
  );
  return {
    savedAt: record.savedAt,
    unsaved: record.unsaved === true,
    snapshot: {
      packInfo: record.packInfo as PackSnapshot['packInfo'],
      sources,
      keySounds,
    },
    fileKinds: new Map(record.fileKinds as [string, FileKind][]),
    loadedPackId:
      typeof record.loadedPackId === 'string' ? record.loadedPackId : null,
    packExtras: (record.packExtras as PackExtras | null) ?? null,
    libraryPack: (record.libraryPack as SavedLibraryPack | null) ?? null,
    activeSourceId:
      typeof record.activeSourceId === 'string' &&
      ids.has(record.activeSourceId)
        ? record.activeSourceId
        : (sources[0]?.id ?? null),
  };
}

/** When the work was saved, for the start screen: "just now", "5 minutes ago". */
export function savedAgo(savedAt: number, now: number) {
  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 60) return 'just now';
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'always' });
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return format.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format.format(-hours, 'hour');
  return format.format(-Math.round(hours / 24), 'day');
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of [WORK_STORE, FILE_STORE]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** One transaction over both stores; the database closes after it. */
async function inStores(
  mode: IDBTransactionMode,
  run: (work: IDBObjectStore, files: IDBObjectStore) => void,
) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([WORK_STORE, FILE_STORE], mode);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      run(
        transaction.objectStore(WORK_STORE),
        transaction.objectStore(FILE_STORE),
      );
    });
  } finally {
    db.close();
  }
}

// The file each source id has in the store, as far as this page knows: a
// save writes a file only when it is not the one stored.
const storedFiles = new Map<string, File>();

/**
 * Keep `work` in place of what was kept, in one transaction: its new or
 * replaced files, the record, and the removal of files it no longer has.
 * Rejects when the browser refuses, as when its storage is full.
 */
export async function saveWork(work: SavedWork) {
  const { sources } = work.snapshot;
  const ids = new Set(sources.map((source) => source.id));
  await inStores('readwrite', (workStore, fileStore) => {
    for (const source of sources) {
      if (storedFiles.get(source.id) !== source.file) {
        fileStore.put(source.file, source.id);
      }
    }
    const keys = fileStore.getAllKeys();
    keys.onsuccess = () => {
      for (const key of keys.result) {
        if (!ids.has(String(key))) fileStore.delete(key);
      }
    };
    workStore.put(toSavedRecord(work), KEY);
  });
  storedFiles.clear();
  for (const source of sources) storedFiles.set(source.id, source.file);
}

/** The kept work, or null when there is none or it cannot be read. */
export async function loadWork(): Promise<SavedWork | null> {
  try {
    let record: unknown;
    const files = new Map<string, File>();
    await inStores('readonly', (workStore, fileStore) => {
      const read = workStore.get(KEY);
      read.onsuccess = () => {
        record = read.result;
      };
      const cursor = fileStore.openCursor();
      cursor.onsuccess = () => {
        const at = cursor.result;
        if (!at) return;
        if (at.value instanceof File) files.set(String(at.key), at.value);
        at.continue();
      };
    });
    const work = fromSavedRecord(record, files);
    // The restored sources hold these very files, so they are not written again.
    if (work) {
      for (const source of work.snapshot.sources) {
        storedFiles.set(source.id, source.file);
      }
    }
    return work;
  } catch {
    return null;
  }
}
