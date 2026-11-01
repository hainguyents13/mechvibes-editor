import { type FileKind, playsWholeFile } from '@/lib/fileKinds';
import { keyLabel } from '@/lib/keyNames';
import { isSameSegment } from '@/utils/audioUtils';
import type {
  AudioSource,
  KeySound,
  KeySounds,
  PackType,
  Segment,
} from '@/utils/soundPack';

// What the card of the one selected key says about its sound.

/**
 * What the card offers under a sound without a release: `add-release` for a
 * key that plays part of its file, `split` for one that plays a whole file
 * of one sound, `cut` for one that plays a whole file already shown on the
 * waveform. A key with a release has its Release row instead.
 */
export type KeyCardOffer = 'add-release' | 'split' | 'cut' | null;

/** The key as the card names it: "Key A", or a mouse button as drawn, "Left button". */
export function keyCardName(code: string, packType: PackType) {
  const label = keyLabel(code);
  return packType === 'Mouse' ? label : `Key ${label}`;
}

/**
 * How many other keys play the same sound as `code`: the same part of the
 * same file, with the same release or none. Keys the drawn layout leaves out
 * count too.
 */
export function sameSoundCount(code: string, keySounds: KeySounds) {
  const sound = keySounds.get(code);
  if (!sound) return 0;
  let count = 0;
  for (const [other, { source, press, release }] of keySounds) {
    if (
      other !== code &&
      source === sound.source &&
      isSameSegment(press, sound.press) &&
      isSameSegment(release, sound.release)
    ) {
      count += 1;
    }
  }
  return count;
}

/** What the card offers for `sound`, from its file and the file's kind. */
export function keyCardOffer(
  sound: KeySound,
  source: Pick<AudioSource, 'duration'>,
  kind: FileKind,
): KeyCardOffer {
  if (sound.release) return null;
  if (playsWholeFile(sound.press, source.duration)) {
    return kind === 'one' ? 'split' : 'cut';
  }
  return 'add-release';
}

/** The length of a part of a file in seconds; a whole file without timing is the file's length. */
export function segmentSeconds(
  [start, end]: Segment,
  source: Pick<AudioSource, 'duration'>,
) {
  return end > start ? (end - start) / 1000 : source.duration;
}
