import {
  isInFolder,
  isSystemFile,
  type PathedFile,
  relativePathOf,
} from '@/lib/folderFiles';
import { mediaTypeOf } from '@/utils/audioUtils';
import { getExtension } from '@/utils/soundPack';

// What dropping something on the page does, decided before and after the drop.
//
// While a drag is over the page the browser tells only the type of each file,
// often an empty one, and no name; the drop then hands over the files
// themselves. The same rules run on both, so the overlay shown during the drag
// says what the drop will do, except when a type alone cannot tell.

/**
 * A dropped file, or one being dragged: its name is empty until the drop. A
 * file from a dropped folder carries its path inside it.
 */
export type DroppedFile = PathedFile & { type: string };

/** What is being dropped: files, and whether it also carries a link. */
export type DropContents<F extends DroppedFile> = {
  files: readonly F[];
  hasLink: boolean;
};

export type DropContext = {
  /** The start screen, where sounds start a new pack instead of joining one. */
  onStart: boolean;
  /**
   * The work a pack would replace, open or kept behind the start screen, has
   * changes that opening another would lose.
   */
  isDirty: boolean;
};

/**
 * - `open-zip`: open the pack in `file`; ask first when `confirm`.
 * - `open-folder`: open the pack folder whose files are `files`, the way its
 *   zip would open; ask first when `confirm`.
 * - `to-type-question`: start a new pack with `files`, asking Keyboard or Mouse.
 * - `add-media`: add `files` to the open pack.
 * - `reject`: nothing happens; `message` says why.
 * - `unknown`: the dragged files' types do not tell yet; only while dragging.
 *
 * `skipped` names the files left out because they are not audio or video.
 */
export type DropRoute<F extends DroppedFile> =
  | { kind: 'open-zip'; file: F; confirm: boolean; message: string }
  | { kind: 'open-folder'; files: F[]; confirm: boolean; message: string }
  | {
      kind: 'to-type-question';
      files: F[];
      skipped: string[];
      message: string;
    }
  | { kind: 'add-media'; files: F[]; skipped: string[]; message: string }
  | { kind: 'reject'; message: string }
  | { kind: 'unknown'; message: string };

export const DROP_MESSAGES = {
  unusable:
    "Can't use these files. Drop audio, video, a .zip pack or a pack folder.",
  link: "Links can't be opened here. Download the video to your computer first, then add the file.",
  oneZip: 'Drop one .zip pack at a time.',
  unknown: 'Drop audio, video, a .zip pack or a pack folder.',
} as const;

type FileKind = 'zip' | 'media' | 'rar' | '7z' | 'other' | 'unknown';

const ZIP_TYPES = new Set([
  'application/zip',
  'application/x-zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
]);
const RAR_TYPES = new Set([
  'application/vnd.rar',
  'application/x-rar',
  'application/x-rar-compressed',
]);
const SEVEN_ZIP_TYPES = new Set(['application/x-7z-compressed']);
/** Types that say nothing about what a file holds; .ogg files can come as the second. */
const VAGUE_TYPES = new Set([
  '',
  'application/octet-stream',
  'application/ogg',
]);

/**
 * A type that names the kind wins; otherwise the extension decides, since
 * Windows often leaves the type empty or generic. A dragged file has no name
 * yet, so with a vague type its kind is unknown.
 */
function kindOf(file: DroppedFile): FileKind {
  const type = file.type.toLowerCase();
  if (ZIP_TYPES.has(type)) return 'zip';
  if (RAR_TYPES.has(type)) return 'rar';
  if (SEVEN_ZIP_TYPES.has(type)) return '7z';
  if (file.name === '') {
    if (mediaTypeOf(file)) return 'media';
    return VAGUE_TYPES.has(type) ? 'unknown' : 'other';
  }
  const extension = getExtension(file.name);
  if (extension === '.zip') return 'zip';
  if (extension === '.rar') return 'rar';
  if (extension === '.7z') return '7z';
  return mediaTypeOf(file) ? 'media' : 'other';
}

const LINK = /^\s*https?:\/\//i;

/**
 * Whether dragged, dropped or pasted data is a link. Browsers mark a link
 * they drag as a URI list; other text counts only when it reads as a link,
 * which a drag tells only on the drop: until then its text reads as empty.
 */
export function carriesLink(data: {
  types: readonly string[];
  getData: (format: string) => string;
}) {
  return (
    data.types.includes('text/uri-list') ||
    LINK.test(data.getData('text/plain'))
  );
}

function archiveMessage(kind: 'rar' | '7z') {
  return `This is a .${kind} file. Unzip it, then open the folder or a .zip.`;
}

const topFolderOf = (file: PathedFile) => relativePathOf(file).split('/')[0];

/** The folders, by name, that hold a config.json at any depth: pack folders. */
function packFoldersOf(files: readonly DroppedFile[]) {
  return new Set(
    files
      .filter(
        (file) =>
          isInFolder(file) &&
          relativePathOf(file).toLowerCase().endsWith('/config.json'),
      )
      .map(topFolderOf),
  );
}

/**
 * How many packs the files of one dropped folder hold: its config.json files
 * at the shallowest depth, as opening the folder's zip counts them.
 */
function packCountOf(files: readonly DroppedFile[]) {
  const depths = files
    .map(relativePathOf)
    .filter((path) => path.toLowerCase().endsWith('/config.json'))
    .map((path) => path.split('/').length);
  const shallowest = Math.min(...depths);
  return depths.filter((depth) => depth === shallowest).length;
}

/** Audio and video, and the names of the other files, which are left out. */
function splitMedia<F extends DroppedFile>(
  files: readonly F[],
  kinds: readonly FileKind[],
) {
  return {
    media: files.filter((_, index) => kinds[index] === 'media'),
    skipped: files
      .filter((_, index) => kinds[index] !== 'media')
      .map((file) => file.name),
  };
}

/**
 * What a drop does. Audio and video win over files the editor cannot use,
 * which are left out and named in `skipped`; a .zip or a pack folder (one
 * with a config.json) opens only on its own, since opening a pack replaces
 * everything else. Files the system leaves in folders are ignored.
 */
export function routeDrop<F extends DroppedFile>(
  { files: dropped, hasLink }: DropContents<F>,
  { onStart, isDirty }: DropContext,
): DropRoute<F> {
  const files = dropped.filter((file) => !isSystemFile(relativePathOf(file)));
  if (files.length === 0) {
    return {
      kind: 'reject',
      message: hasLink ? DROP_MESSAGES.link : DROP_MESSAGES.unusable,
    };
  }
  const kinds = files.map(kindOf);
  if (kinds.includes('unknown')) {
    return { kind: 'unknown', message: DROP_MESSAGES.unknown };
  }
  const packFolders = packFoldersOf(files);
  const isInPack = (file: F) =>
    isInFolder(file) && packFolders.has(topFolderOf(file));
  const rest = files.filter((file) => !isInPack(file));
  const restKinds = kinds.filter((_, index) => !isInPack(files[index]));
  const zips = rest.filter((_, index) => restKinds[index] === 'zip');
  const { media, skipped } = splitMedia(rest, restKinds);

  const packs = zips.length + packFolders.size;
  if (packs > 1 || (packs === 1 && media.length > 0)) {
    return { kind: 'reject', message: DROP_MESSAGES.oneZip };
  }
  if (packFolders.size === 1) {
    const packFiles = files.filter(isInPack);
    // A folder of packs, such as a whole soundpacks folder, opens none.
    const count = packCountOf(packFiles);
    if (count > 1) {
      return {
        kind: 'reject',
        message: `This folder holds ${count} packs. Drop one pack folder.`,
      };
    }
    return {
      kind: 'open-folder',
      files: packFiles,
      confirm: isDirty,
      message: 'Drop to open this pack',
    };
  }
  if (zips.length === 1) {
    return {
      kind: 'open-zip',
      file: zips[0],
      confirm: isDirty,
      message: 'Drop to open this pack',
    };
  }
  if (media.length > 0) {
    const these = media.length === 1 ? 'this sound' : 'these sounds';
    return onStart
      ? {
          kind: 'to-type-question',
          files: media,
          skipped,
          message: `Drop to start a new pack with ${these}`,
        }
      : {
          kind: 'add-media',
          files: media,
          skipped,
          message: `Drop to add ${these}`,
        };
  }
  const archive = kinds.find((kind) => kind === 'rar' || kind === '7z');
  return {
    kind: 'reject',
    message: archive ? archiveMessage(archive) : DROP_MESSAGES.unusable,
  };
}

/**
 * The audio and video of a folder chosen with Choose folder, and the names
 * of its other files, without system files. The person chose to add one
 * file for each key, so a chosen folder never opens a pack: its config.json
 * is one more file left out.
 */
export function sortChosenFolder<F extends DroppedFile>(chosen: readonly F[]) {
  const files = chosen.filter((file) => !isSystemFile(relativePathOf(file)));
  return splitMedia(files, files.map(kindOf));
}
