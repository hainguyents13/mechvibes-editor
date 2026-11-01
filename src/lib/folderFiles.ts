import JSZip from 'jszip';

// Files from a folder the person chose or dropped. Each keeps its path inside
// the folder, folder name first ("My Pack/sounds/a.wav"), the way a chosen
// folder's files carry it in webkitRelativePath.

/** A file that may carry its path inside a chosen or dropped folder. */
export type PathedFile = { name: string; webkitRelativePath?: string };

/** A file's path inside its folder, or its name when it came on its own. */
export const relativePathOf = (file: PathedFile) =>
  file.webkitRelativePath || file.name;

/** Whether a file came inside a folder. */
export const isInFolder = (file: PathedFile) =>
  relativePathOf(file).includes('/');

const SYSTEM_FILES = new Set(['thumbs.db', 'desktop.ini']);

/**
 * Files the system leaves in folders, which no one means to add: hidden ones
 * (.DS_Store, ._a.wav, anything in .git/), Thumbs.db, desktop.ini, and the
 * __MACOSX folder of zips made on a Mac.
 */
export function isSystemFile(path: string) {
  const parts = path.split('/');
  const name = parts.at(-1)?.toLowerCase() ?? '';
  return (
    SYSTEM_FILES.has(name) ||
    parts.some((part) => part.startsWith('.') || part === '__MACOSX')
  );
}

/** A copy of `file` that carries its path inside a dropped folder. */
export function withRelativePath(file: File, path: string): File {
  const copy = new File([file], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  });
  Object.defineProperty(copy, 'webkitRelativePath', { value: path });
  return copy;
}

/** The entry types of a drop that this reads, from the File and Directory Entries API. */
type Entry = Pick<FileSystemEntry, 'isFile' | 'isDirectory' | 'fullPath'>;
type FileEntry = Entry & Pick<FileSystemFileEntry, 'file'>;
type DirectoryEntry = Entry & {
  createReader: () => Pick<FileSystemDirectoryReader, 'readEntries'>;
};

const fileOf = (entry: FileEntry) =>
  new Promise<File>((resolve, reject) => entry.file(resolve, reject));

// A directory reader hands its entries over in batches until one is empty.
async function childrenOf(entry: DirectoryEntry) {
  const reader = entry.createReader();
  const children: Entry[] = [];
  for (;;) {
    const batch = await new Promise<Entry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) return children;
    children.push(...batch);
  }
}

/**
 * Every file under dropped entries, each carrying its path, without system
 * files. The entries must be taken from the drop event as it fires
 * (webkitGetAsEntry), since the browser lets go of them afterwards; reading
 * them can wait.
 */
export async function readDroppedEntries(
  entries: readonly Entry[],
): Promise<File[]> {
  const files: File[] = [];
  const visit = async (entry: Entry) => {
    const path = entry.fullPath.replace(/^\//, '');
    if (isSystemFile(path)) return;
    if (entry.isFile) {
      const file = await fileOf(entry as FileEntry);
      files.push(path.includes('/') ? withRelativePath(file, path) : file);
    } else if (entry.isDirectory) {
      for (const child of await childrenOf(entry as DirectoryEntry)) {
        await visit(child);
      }
    }
  };
  for (const entry of entries) await visit(entry);
  return files;
}

/**
 * A folder's files as a .zip in memory, each at its path, named after the
 * folder: a pack folder then opens the way its zip would.
 */
export async function zipFolder(files: readonly File[]): Promise<File> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(relativePathOf(file), file, { compression: 'STORE' });
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const first = files[0];
  const folder =
    first && isInFolder(first) ? relativePathOf(first).split('/')[0] : 'pack';
  return new File([blob], `${folder}.zip`, { type: 'application/zip' });
}
