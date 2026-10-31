import { mediaTypeOf } from '@/utils/audioUtils';
import { getExtension } from '@/utils/soundPack';

// What dropping something on the page does, decided before and after the drop.
//
// While a drag is over the page the browser tells only the type of each file,
// often an empty one, and no name; the drop then hands over the files
// themselves. The same rules run on both, so the overlay shown during the drag
// says what the drop will do, except when a type alone cannot tell.

/** A dropped file, or one being dragged: its name is empty until the drop. */
export type DroppedFile = { name: string; type: string };

/** What is being dropped: files, and whether it also carries a link. */
export type DropContents<F extends DroppedFile> = {
  files: readonly F[];
  hasLink: boolean;
};

export type DropContext = {
  /** The start screen, where there is no pack yet. */
  onStart: boolean;
  /** The open pack has changes that opening another would lose. */
  isDirty: boolean;
};

/**
 * - `open-zip`: open the pack in `file`; ask first when `confirm`.
 * - `to-type-question`: start a new pack with `files`, asking Keyboard or Mouse.
 * - `add-media`: add `files` to the open pack.
 * - `reject`: nothing happens; `message` says why.
 * - `unknown`: the dragged files' types do not tell yet; only while dragging.
 */
export type DropRoute<F extends DroppedFile> =
  | { kind: 'open-zip'; file: F; confirm: boolean; message: string }
  | { kind: 'to-type-question'; files: F[]; message: string }
  | { kind: 'add-media'; files: F[]; message: string }
  | { kind: 'reject'; message: string }
  | { kind: 'unknown'; message: string };

export const DROP_MESSAGES = {
  unusable: "Can't use these files. Drop audio, video, or a .zip pack.",
  link: "Links can't be opened here. Download the video to your computer first, then add the file.",
  oneZip: 'Drop one .zip pack at a time.',
  unknown: 'Drop audio, video, or a .zip pack.',
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

/**
 * What a drop does. Audio and video win over files the editor cannot use,
 * which are left out; a .zip opens only on its own, since opening a pack
 * replaces everything else.
 */
export function routeDrop<F extends DroppedFile>(
  { files, hasLink }: DropContents<F>,
  { onStart, isDirty }: DropContext,
): DropRoute<F> {
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
  const zips = files.filter((_, index) => kinds[index] === 'zip');
  const media = files.filter((_, index) => kinds[index] === 'media');

  if (zips.length > 1 || (zips.length === 1 && media.length > 0)) {
    return { kind: 'reject', message: DROP_MESSAGES.oneZip };
  }
  if (zips.length === 1) {
    return {
      kind: 'open-zip',
      file: zips[0],
      // The start screen has no pack to lose.
      confirm: !onStart && isDirty,
      message: 'Drop to open this pack',
    };
  }
  if (media.length > 0) {
    const these = media.length === 1 ? 'this sound' : 'these sounds';
    return onStart
      ? {
          kind: 'to-type-question',
          files: media,
          message: `Drop to start a new pack with ${these}`,
        }
      : { kind: 'add-media', files: media, message: `Drop to add ${these}` };
  }
  const archive = kinds.find((kind) => kind === 'rar' || kind === '7z');
  return {
    kind: 'reject',
    message: archive ? archiveMessage(archive) : DROP_MESSAGES.unusable,
  };
}
