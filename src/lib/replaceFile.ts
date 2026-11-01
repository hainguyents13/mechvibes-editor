import { playsWholeFile } from '@/lib/fileKinds';
import { keyLabel } from '@/lib/keyNames';
import { plural } from '@/lib/utils';
import { formatLength } from '@/utils/audioUtils';
import {
  type AudioSource,
  isWholeFile,
  type KeySounds,
  listKeys,
} from '@/utils/soundPack';
import { findSegmentsPastEnd } from '@/utils/soundPackImport';

// Replace file… swaps the audio of a file for every key that plays it.

/**
 * The file with new audio, and the keys' sounds to match. The file keeps its
 * id and colour, so its keys, its kind and its row stay as they were. Parts
 * cut from it keep their times; a key that played all of the old file plays
 * all of the new one, unless it has a release: its press and release were
 * cut from the file, so they keep theirs too. Returns `keySounds` itself
 * when no key changes.
 */
export function replaceSourceFile(
  source: AudioSource,
  file: File,
  duration: number,
  keySounds: KeySounds,
): { source: AudioSource; keySounds: KeySounds } {
  let next: KeySounds | null = null;
  keySounds.forEach((sound, code) => {
    if (
      sound.source !== source.id ||
      sound.release ||
      isWholeFile(sound.press) ||
      !playsWholeFile(sound.press, source.duration) ||
      duration <= 0
    ) {
      return;
    }
    next ??= new Map(keySounds);
    next.set(code, { ...sound, press: [0, duration * 1000] });
  });
  return {
    source: { ...source, file, duration },
    keySounds: next ?? keySounds,
  };
}

/** The keys of `sourceId` with a part that runs past the end of its file. */
export function keysPastEnd(
  sourceId: string,
  sources: AudioSource[],
  keySounds: KeySounds,
) {
  const own: KeySounds = new Map(
    [...keySounds].filter(([, sound]) => sound.source === sourceId),
  );
  const { silent, pressPastEnd, cutShort } = findSegmentsPastEnd(
    own,
    sources.filter((source) => source.id === sourceId),
  );
  const past = new Set([...silent, ...pressPastEnd, ...cutShort]);
  return [...own.keys()].filter((code) => past.has(code));
}

/** What to ask before new audio leaves keys playing past its end. */
export function replaceWarning(
  oldName: string,
  newName: string,
  seconds: number,
  codes: readonly string[],
  noun: string,
) {
  const one = codes.length === 1;
  return {
    title: `Replace ${oldName} with ${newName}?`,
    message: `${plural(codes.length, noun)} ${one ? 'plays' : 'play'} past the end of ${newName}, which is ${formatLength(seconds)} long: ${listKeys(codes.map(keyLabel))}. ${one ? 'It' : 'They'} would be cut short or silent.`,
  };
}
