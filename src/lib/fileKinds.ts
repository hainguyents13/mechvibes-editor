import {
  formatLength,
  mediaTypeOf,
  sharedPressSegment,
} from '@/utils/audioUtils';
import {
  type AudioSource,
  isWholeFile,
  type KeySounds,
  type PackType,
  type Segment,
} from '@/utils/soundPack';

// What each file in the pack holds, which decides how the editor shows it:
// a file that is one sound goes to keys whole, from the file list; a file
// with many sounds opens in the waveform to cut them out. The kind is how
// the file is shown, not part of the pack, so it stays out of history.

/** `one`: the file is one key sound. `many`: it holds many, to cut apart. */
export type FileKind = 'one' | 'many';

/** The add tile a file came through, which says what the person has. */
export type AddTile = 'recording' | 'per-key' | 'video';

/**
 * The longest new file taken for one sound. Single key sounds measure up to
 * about 0.5 s with their release; recordings of clicks start at 1.1 s.
 */
export const ONE_SOUND_MAX_SECONDS = 1;

/**
 * The longest file given whole to a key without asking: past it a file is a
 * recording, and a key would play all of it.
 */
export const LONG_FILE_SECONDS = 2;

/** A file's kind from its length; one the browser cannot measure keeps the waveform. */
export function kindFromLength(seconds: number): FileKind {
  return seconds > 0 && seconds <= ONE_SOUND_MAX_SECONDS ? 'one' : 'many';
}

const isVideo = (file: { name: string; type: string }) =>
  mediaTypeOf(file)?.startsWith('video/') ?? false;

/**
 * The kind of a file just added. The tile it came through decides, since the
 * person said what they have; otherwise a video is a recording, and other
 * files go by their length.
 */
export function inferNewFileKind(
  file: { name: string; type: string },
  duration: number,
  tile?: AddTile,
): FileKind {
  if (tile) return tile === 'per-key' ? 'one' : 'many';
  if (isVideo(file)) return 'many';
  return kindFromLength(duration);
}

// How much longer a file can read than the part saved for it and still count
// as played whole: encoding a pack's audio pads the end with silence, so a
// 3 s file comes back about 3.003 s long, and MP3 at low rates pads more.
const ENCODER_PADDING_MS = 100;

/**
 * Whether a key that plays `segment` plays all of a file `seconds` long: the
 * whole file without timing, or from its start to its end, as a file of one
 * sound is given. Such a key has no part of the file left for a release.
 */
export function playsWholeFile(segment: Segment, seconds: number) {
  const [start, end] = segment;
  return (
    isWholeFile(segment) ||
    (start === 0 && seconds > 0 && end >= seconds * 1000 - ENCODER_PADDING_MS)
  );
}

/**
 * What to ask before files become one sound each, when some are longer than
 * `LONG_FILE_SECONDS`: a key given such a file would play all of it. Null
 * when none is. Several files are the ones a Change ▾ turns at once.
 */
export function longFileWarning(
  sources: readonly Pick<AudioSource, 'duration'>[],
  packType: PackType,
) {
  const long = sources
    .map((source) => source.duration)
    .filter((seconds) => seconds > LONG_FILE_SECONDS);
  if (long.length === 0) return null;
  const every = packType === 'Mouse' ? 'Every button' : 'Every key';
  const longest = formatLength(Math.max(...long));
  if (sources.length === 1) {
    return {
      title: 'Make this file one sound?',
      message: `This file is ${longest} long. ${every} would play all of it.`,
      confirmLabel: 'Make it one sound',
    };
  }
  return {
    title: 'Make these files one sound?',
    message:
      long.length === 1
        ? `1 of these files is ${longest} long. ${every} would play all of it.`
        : `${long.length} of these files are longer than ${LONG_FILE_SECONDS} s, up to ${longest}. ${every} would play all of each.`,
    confirmLabel: 'Make them one sound',
  };
}

function kindInPack(source: AudioSource, keySounds: KeySounds): FileKind {
  const sounds = [...keySounds.values()].filter(
    (sound) => sound.source === source.id,
  );
  if (sounds.length === 0) return kindFromLength(source.duration);
  if (sounds.some((sound) => sound.release)) return 'many';
  const shared = sharedPressSegment(source.id, keySounds);
  if (!shared) return 'many';
  // One part of a long recording that every key shares is still a recording:
  // its waveform stays when the pack is opened again.
  return playsWholeFile(shared, source.duration) ||
    kindFromLength(source.duration) === 'one'
    ? 'one'
    : 'many';
}

/**
 * The kind of each file of an opened pack, read from how its keys play it.
 * A key with a release, or keys playing different parts, make a file `many`;
 * keys that all play the whole file, or one part of a short file, make it
 * `one`. A file no key plays goes by its length, as a new one would.
 */
export function inferKindsFromPack(
  sources: readonly AudioSource[],
  keySounds: KeySounds,
): Map<string, FileKind> {
  return new Map(
    sources.map((source) => [source.id, kindInPack(source, keySounds)]),
  );
}
