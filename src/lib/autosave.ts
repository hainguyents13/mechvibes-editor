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
// time, so a crash, a reload or a closed tab does not lose it. Files are
// stored as they are: IndexedDB keeps File objects whole.

const DB_NAME = 'mechvibes-editor';
const STORE = 'work';
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

/** The stored form: maps as arrays of entries, and a version. */
type SavedRecord = {
  version: number;
  savedAt: number;
  unsaved: boolean;
  packInfo: PackSnapshot['packInfo'];
  sources: AudioSource[];
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
    sources: work.snapshot.sources,
    keySounds: [...work.snapshot.keySounds],
    fileKinds: [...work.fileKinds],
    loadedPackId: work.loadedPackId,
    packExtras: work.packExtras,
    libraryPack: work.libraryPack,
    activeSourceId: work.activeSourceId,
  };
}

const isSource = (value: unknown): value is AudioSource =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.file instanceof Blob &&
  typeof value.duration === 'number' &&
  typeof value.colorIndex === 'number';

/**
 * The work in a stored record, or null when it is from another version or
 * does not hold a pack: such a record is not offered.
 */
export function fromSavedRecord(record: unknown): SavedWork | null {
  if (
    !isRecord(record) ||
    record.version !== RECORD_VERSION ||
    typeof record.savedAt !== 'number' ||
    !isRecord(record.packInfo) ||
    !Array.isArray(record.sources) ||
    !record.sources.every(isSource) ||
    !Array.isArray(record.keySounds) ||
    !Array.isArray(record.fileKinds)
  ) {
    return null;
  }
  const sources = record.sources as AudioSource[];
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
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Run one request on the store and close the database after it. */
async function inStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? request.error);
      transaction.onabort = () => reject(transaction.error ?? request.error);
    });
  } finally {
    db.close();
  }
}

/** Keep `work` in place of what was kept. Rejects when the browser refuses, as when it is full. */
export async function saveWork(work: SavedWork) {
  await inStore('readwrite', (store) => store.put(toSavedRecord(work), KEY));
}

/** The kept work, or null when there is none or it cannot be read. */
export async function loadWork(): Promise<SavedWork | null> {
  try {
    return fromSavedRecord(
      await inStore('readonly', (store) => store.get(KEY)),
    );
  } catch {
    return null;
  }
}

/** Forget the kept work. */
export async function clearWork() {
  try {
    await inStore('readwrite', (store) => store.delete(KEY));
  } catch {
    // Nothing kept, or storage is blocked: there is nothing to forget.
  }
}
