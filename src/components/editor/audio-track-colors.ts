/**
 * Fixed 10-colour palette for audio tracks in the editor.
 *
 * Uses Tailwind's stock colour scale rather than daisyUI's semantic tokens:
 * the semantic set only offers 7 usable hues, and those carry meaning
 * (error/warning) that a track identity colour should not imply.
 *
 * Each source keeps the slot it was given when it was added
 * (AudioSource.colorIndex), so its colour stays the same in the source list and
 * on the keys that use it, even when other files are removed.
 *
 * Class strings are written out in full so Tailwind's scanner emits them.
 */
export interface AudioTrackColor {
  /** Left accent border of the list row */
  border: string;
  /** Row background tint */
  bg: string;
  /** Icon tint */
  text: string;
  /** Dot on a key whose sound comes from this source */
  dot: string;
  /** The same dot on the mouse drawing (SVG fill) */
  fill: string;
}

export const AUDIO_TRACK_COLORS: AudioTrackColor[] = [
  {
    border: 'border-l-sky-500',
    bg: 'bg-sky-500/5',
    text: 'text-sky-500',
    dot: 'bg-sky-500',
    fill: 'fill-sky-500',
  },
  {
    border: 'border-l-violet-500',
    bg: 'bg-violet-500/5',
    text: 'text-violet-500',
    dot: 'bg-violet-500',
    fill: 'fill-violet-500',
  },
  {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-500',
    dot: 'bg-emerald-500',
    fill: 'fill-emerald-500',
  },
  {
    border: 'border-l-amber-500',
    bg: 'bg-amber-500/5',
    text: 'text-amber-500',
    dot: 'bg-amber-500',
    fill: 'fill-amber-500',
  },
  {
    border: 'border-l-rose-500',
    bg: 'bg-rose-500/5',
    text: 'text-rose-500',
    dot: 'bg-rose-500',
    fill: 'fill-rose-500',
  },
  {
    border: 'border-l-cyan-500',
    bg: 'bg-cyan-500/5',
    text: 'text-cyan-500',
    dot: 'bg-cyan-500',
    fill: 'fill-cyan-500',
  },
  {
    border: 'border-l-fuchsia-500',
    bg: 'bg-fuchsia-500/5',
    text: 'text-fuchsia-500',
    dot: 'bg-fuchsia-500',
    fill: 'fill-fuchsia-500',
  },
  {
    border: 'border-l-lime-500',
    bg: 'bg-lime-500/5',
    text: 'text-lime-500',
    dot: 'bg-lime-500',
    fill: 'fill-lime-500',
  },
  {
    border: 'border-l-orange-500',
    bg: 'bg-orange-500/5',
    text: 'text-orange-500',
    dot: 'bg-orange-500',
    fill: 'fill-orange-500',
  },
  {
    border: 'border-l-teal-500',
    bg: 'bg-teal-500/5',
    text: 'text-teal-500',
    dot: 'bg-teal-500',
    fill: 'fill-teal-500',
  },
];

/** Resolve the palette entry for a track index, cycling every 10 tracks. */
export function getAudioTrackColor(index: number): AudioTrackColor {
  return AUDIO_TRACK_COLORS[index % AUDIO_TRACK_COLORS.length];
}
