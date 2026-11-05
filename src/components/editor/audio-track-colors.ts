/**
 * Fixed 10-colour palette for audio tracks in the editor: each file's own
 * colour, on its icon in the file list and the key card, and on its dot where
 * a key's file is picked.
 *
 * Uses Tailwind's stock colour scale rather than the site's tokens, which have
 * one accent only, and none that carries a meaning (error, release) a track
 * identity colour should not imply.
 *
 * Each source keeps the slot it was given when it was added
 * (AudioSource.colorIndex), so its colour stays the same wherever it shows,
 * even when other files are removed.
 *
 * Class strings are written out in full so Tailwind's scanner emits them.
 */
export interface AudioTrackColor {
  /** Icon tint */
  text: string;
  /** A small dot of the colour */
  dot: string;
}

export const AUDIO_TRACK_COLORS: AudioTrackColor[] = [
  { text: 'text-sky-500', dot: 'bg-sky-500' },
  { text: 'text-violet-500', dot: 'bg-violet-500' },
  { text: 'text-emerald-500', dot: 'bg-emerald-500' },
  { text: 'text-amber-500', dot: 'bg-amber-500' },
  { text: 'text-rose-500', dot: 'bg-rose-500' },
  { text: 'text-cyan-500', dot: 'bg-cyan-500' },
  { text: 'text-fuchsia-500', dot: 'bg-fuchsia-500' },
  { text: 'text-lime-500', dot: 'bg-lime-500' },
  { text: 'text-orange-500', dot: 'bg-orange-500' },
  { text: 'text-teal-500', dot: 'bg-teal-500' },
];

/** Resolve the palette entry for a track index, cycling every 10 tracks. */
export function getAudioTrackColor(index: number): AudioTrackColor {
  return AUDIO_TRACK_COLORS[index % AUDIO_TRACK_COLORS.length];
}
