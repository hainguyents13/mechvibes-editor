import { LONG_FILE_SECONDS, playsWholeFile } from '@/lib/fileKinds';
import { keyLabel } from '@/lib/keyNames';
import { plural } from '@/lib/utils';
import { formatLengthInText } from '@/utils/audioUtils';
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

/** The keys of `sourceId` that play all of its file, `seconds` long. */
function keysPlayingAll(
  sourceId: string,
  seconds: number,
  keySounds: KeySounds,
) {
  return [...keySounds]
    .filter(
      ([, sound]) =>
        sound.source === sourceId &&
        !sound.release &&
        playsWholeFile(sound.press, seconds),
    )
    .map(([code]) => code);
}

/**
 * What to ask before new audio takes the place of `oldName`'s, from the file
 * and keys `replaceSourceFile` made: keys that would run past its end, and
 * keys that would play all of a file longer than `LONG_FILE_SECONDS`, as the
 * keys a file of one sound is given later would. Null when there is nothing
 * to ask.
 */
export function replaceWarning(
  oldName: string,
  replaced: { source: AudioSource; keySounds: KeySounds },
  isOneSound: boolean,
  noun: string,
) {
  const { source, keySounds } = replaced;
  const newName = source.file.name;
  const length = formatLengthInText(source.duration);
  const pastEnd = keysPastEnd(source.id, [source], keySounds);
  const playingAll = keysPlayingAll(source.id, source.duration, keySounds);
  const isLong =
    source.duration > LONG_FILE_SECONDS &&
    (playingAll.length > 0 || isOneSound);
  if (pastEnd.length === 0 && !isLong) return null;
  const sentences: string[] = [];
  if (pastEnd.length > 0) {
    const one = pastEnd.length === 1;
    sentences.push(
      `${plural(pastEnd.length, noun)} ${one ? 'plays' : 'play'} past the end of ${newName}, which is ${length} long: ${listKeys(pastEnd.map(keyLabel))}. ${one ? 'It' : 'They'} would be cut short or silent.`,
    );
  }
  if (isLong) {
    const who =
      playingAll.length > 0 ? plural(playingAll.length, noun) : `Every ${noun}`;
    sentences.push(
      `${pastEnd.length > 0 ? '' : `${newName} is ${length} long. `}${who} would play all of it.`,
    );
  }
  return {
    title: `Replace ${oldName} with ${newName}?`,
    message: sentences.join(' '),
    // Keys cut short lose sound; keys playing all of a long file lose none.
    confirmTone: pastEnd.length > 0 ? ('error' as const) : ('primary' as const),
  };
}
