import type { FileKind } from '@/lib/fileKinds';
import { keyLabel, matchFilesToKeys, type NamedFile } from '@/lib/keyNames';
import { plural } from '@/lib/utils';
import { formatLength, mediaTypeOf } from '@/utils/audioUtils';
import {
  type AudioSource,
  compareFileNames,
  countKeysBySource,
  type KeySounds,
  listKeys,
  type PackType,
} from '@/utils/soundPack';

// What the last add brought in, shown at the top of the sound panel: what
// kind each file looks like, which ones match keys by name, and what to do
// with the rest. Counts come from the pack as it is now, so an Undo of a
// give brings its button back.

/** The files one add brought in, and the names of those it left out. */
export type AddBatch = { ids: readonly string[]; skipped: readonly string[] };

/**
 * One line under the heading. `action` names the button the line carries.
 * - `matched`: files whose names match keys; `done` once each key plays its file;
 * - `need-key`: files of one sound that no key plays yet;
 * - `no-match`: no name matches, so the files can go to keys in order;
 * - `similar`: numbered files like click1…click5, to spread across keys;
 * - `release`: release files such as KeyA_up.wav, which go to no key;
 * - `other-kind`: files named for the other kind of pack;
 * - `skipped`: files that were not audio or video.
 */
export type AddSummaryLine =
  | {
      kind: 'matched';
      text: string;
      action?: string;
      done: boolean;
      matches: { id: string; codes: string[] }[];
    }
  | { kind: 'need-key'; text: string }
  | {
      kind: 'no-match' | 'similar';
      text: string;
      action: string;
      ids: string[];
    }
  | { kind: 'release' | 'other-kind' | 'skipped'; text: string };

export type AddSummary = {
  heading: string;
  /** The two choices of Change ▾, by the kind each sets. */
  changeLabels: Record<FileKind, string>;
  lines: AddSummaryLine[];
};

// Numbered names that differ only in the number at the end: click1, tap-2.
const NUMBERED = /^(.*?\D)[\s_-]*\d+$/;
const MIN_SIMILAR = 2;
const MAX_SIMILAR = 10;

const stemOf = (name: string) => name.replace(/\.[^.]+$/, '');

/**
 * Groups of files that look like takes of one sound: 2 to 10 sharing a name
 * but the number, each in name order.
 */
function findSimilar(files: readonly NamedFile[]) {
  const groups = new Map<string, NamedFile[]>();
  for (const file of files) {
    const stem = NUMBERED.exec(stemOf(file.name))?.[1];
    if (!stem) continue;
    const key = stem.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }
  return [...groups.values()]
    .filter(
      (group) => group.length >= MIN_SIMILAR && group.length <= MAX_SIMILAR,
    )
    .map((group) => group.sort((a, b) => compareFileNames(a.name, b.name)));
}

function words(packType: PackType) {
  const isMouse = packType === 'Mouse';
  return {
    key: isMouse ? 'button' : 'key',
    oneSound: isMouse ? 'one button sound' : 'one key sound',
    manySounds: isMouse ? 'many clicks' : 'many key presses',
  };
}

function headingFor(
  files: readonly AudioSource[],
  kinds: ReadonlyMap<string, FileKind>,
  packType: PackType,
) {
  const { oneSound, manySounds } = words(packType);
  const ones = files.filter((file) => kinds.get(file.id) === 'one');
  const manys = files.filter((file) => kinds.get(file.id) !== 'one');
  if (files.length === 1) {
    const [file] = files;
    const { name } = file.file;
    if (ones.length === 1) return `Added ${name}. It looks like ${oneSound}.`;
    const isVideo = mediaTypeOf(file.file)?.startsWith('video/');
    return `${name} · ${formatLength(file.duration)} · ${
      isVideo
        ? 'a video. Only its sound goes in the pack.'
        : `a recording with ${manySounds}.`
    }`;
  }
  const added = `Added ${files.length} files.`;
  if (manys.length === 0) return `${added} Each looks like ${oneSound}.`;
  if (ones.length === 0) return `${added} Each has ${manySounds}.`;
  const onePart = `${ones.length} ${ones.length === 1 ? 'looks' : 'look'} like ${oneSound}.`;
  const manyPart =
    manys.length === 1
      ? `${manys[0].file.name} has ${manySounds}.`
      : `${manys.length} have ${manySounds}.`;
  return `${added} ${onePart} ${manyPart}`;
}

/** The choices of Change ▾ for `count` files. */
export function changeKindLabels(
  count: number,
  packType: PackType,
): Record<FileKind, string> {
  const { oneSound, manySounds } = words(packType);
  const subject = count === 1 ? 'This file' : 'Each file';
  return {
    one: `${subject} is ${oneSound}`,
    many: `${subject} has ${manySounds}`,
  };
}

function matchedLine(
  matched: ReturnType<typeof matchFilesToKeys>['matched'],
  keySounds: KeySounds,
  packType: PackType,
): AddSummaryLine {
  const { key } = words(packType);
  const matches = matched.map(({ id, codes }) => ({ id, codes }));
  const done = matched.every(({ id, codes }) =>
    codes.every((code) => keySounds.get(code)?.source === id),
  );
  const count = matched.length;
  if (done) {
    return {
      kind: 'matched',
      text: `Gave ${plural(count, 'file')} to ${count === 1 ? 'its' : 'their'} ${key}${count === 1 ? '' : 's'}.`,
      done,
      matches,
    };
  }
  const examples = matched
    .slice(0, 2)
    .map(({ name, codes }) => `${name} -> ${codes.map(keyLabel).join(' and ')}`)
    .join(', ');
  const replaced = matched.flatMap(({ id, codes }) =>
    codes.filter((code) => {
      const source = keySounds.get(code)?.source;
      return source !== undefined && source !== id;
    }),
  ).length;
  const replacing =
    replaced === 0
      ? ''
      : ` ${replaced} of these ${key}s ${replaced === 1 ? 'has' : 'have'} a sound now. It gets replaced.`;
  return {
    kind: 'matched',
    text: `${count} ${count === 1 ? 'matches' : 'match'} ${key} names (${examples}).${replacing}`,
    action:
      count === 1 ? `Give it to its ${key}` : `Give them to their ${key}s`,
    done,
    matches,
  };
}

/**
 * The summary of the last add, from the pack as it is now; null once none of
 * its files is left, as after an Undo of the add. Lines about names look at
 * the files of one sound only.
 */
export function summarizeAdd({
  batch,
  sources,
  kinds,
  keySounds,
  packType,
}: {
  batch: AddBatch;
  sources: readonly AudioSource[];
  kinds: ReadonlyMap<string, FileKind>;
  keySounds: KeySounds;
  packType: PackType;
}): AddSummary | null {
  const ids = new Set(batch.ids);
  const files = sources.filter((source) => ids.has(source.id));
  if (files.length === 0) return null;
  const { key } = words(packType);
  const inUse = countKeysBySource(keySounds);
  const isFree = (file: NamedFile) => !inUse.has(file.id);

  const oneFiles = files
    .filter((file) => kinds.get(file.id) === 'one')
    .map((file) => ({ id: file.id, name: file.file.name }));
  const { matched, release, otherKind, unmatched } = matchFilesToKeys(
    oneFiles,
    packType,
  );
  const free = unmatched.filter(isFree);
  const lines: AddSummaryLine[] = [];

  if (matched.length > 0) lines.push(matchedLine(matched, keySounds, packType));
  if (free.length > 0 && matched.length === 0) {
    lines.push({
      kind: 'no-match',
      text: `None of the names match a ${key}. Select ${key}s and click a file, or`,
      action: `Give them to ${key}s in order`,
      // A file a key plays already, given by hand, keeps its key alone.
      ids: free.map((file) => file.id),
    });
  } else if (free.length > 0) {
    lines.push({
      kind: 'need-key',
      text: `${free.length} ${free.length === 1 ? 'needs' : 'need'} a ${key}: select ${key}s, then click a file.`,
    });
  }
  // One group at a time, so a spread never mixes two sounds: the largest
  // that still has a file no key plays, then the next.
  const [similar] = findSimilar(unmatched)
    .filter((group) => group.some(isFree))
    .sort(
      (a, b) => b.length - a.length || compareFileNames(a[0].name, b[0].name),
    );
  if (similar) {
    lines.push({
      kind: 'similar',
      text: `${similar.length} similar clicks found.`,
      action: `Spread them across ${key}s`,
      ids: similar.map((file) => file.id),
    });
  }
  if (release.length > 0) {
    lines.push({
      kind: 'release',
      text: `Mechvibes plays a release sound only from the same file as the press. Files like ${release[0].name} won't be used as release.`,
    });
  }
  if (otherKind.length > 0) {
    lines.push({
      kind: 'other-kind',
      text: `Some files look like ${packType === 'Mouse' ? 'keyboard keys' : 'mouse buttons'}. A pack is for a keyboard or a mouse. Make a second pack for those.`,
    });
  }
  if (batch.skipped.length > 0) {
    lines.push({
      kind: 'skipped',
      text: `${plural(batch.skipped.length, 'file')} skipped: ${listKeys([...batch.skipped])}`,
    });
  }
  return {
    heading: headingFor(files, kinds, packType),
    changeLabels: changeKindLabels(files.length, packType),
    lines,
  };
}
