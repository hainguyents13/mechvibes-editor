import { cn } from '@/lib/utils';
import {
  KEYCAP_FACE_OFF,
  KEYCAP_FACE_ON,
  KEYCAP_FACE_SELECTED,
  keycapEdge,
} from './keycap';

/**
 * The legend row's height, so the keyboard's fit-to-height scale can count on
 * it: it shows from the first file on.
 */
export const KEY_LEGEND_ROWS_HEIGHT = 24;
/**
 * Width the legend reads in full on one line with all four marks. A keyboard
 * drawn narrower, Compact on a short screen, has its rows reach past it.
 */
export const KEY_LEGEND_ROWS_MIN_WIDTH = 496;

/** A small keycap: a face on an edge, as the keys are drawn. */
function Swatch({
  face,
  press = false,
  release = false,
}: {
  face: string;
  press?: boolean;
  release?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="block h-[20px] w-[22px] shrink-0 rounded-[6px] pb-[3px]"
      style={{ background: keycapEdge(press, release) }}
    >
      <span className={cn('block h-full rounded-[5px]', face)} />
    </span>
  );
}

/**
 * What the keys' faces and edges mean. Release sound is named only when some
 * key has one, and a plain key only while the pack has sounds and some drawn
 * keys stay silent, to say that is fine, even when every sound is on a key
 * the layout leaves out.
 */
export function KeyLegend({
  showRelease,
  showSilent,
  isMousePack,
}: {
  showRelease: boolean;
  showSilent: boolean;
  isMousePack: boolean;
}) {
  return (
    <div className="flex h-6 items-center gap-5 whitespace-nowrap text-mv-muted">
      <span className="flex items-center gap-2">
        <Swatch face={KEYCAP_FACE_SELECTED} />
        Selected
      </span>
      <span
        className="flex items-center gap-2"
        title="The left half of the edge shows the sound played on press"
      >
        <Swatch face={KEYCAP_FACE_ON} press />
        Has a sound
      </span>
      {showRelease && (
        <span
          className="flex items-center gap-2"
          title="The right half of the edge shows the sound played on release"
        >
          <Swatch face={KEYCAP_FACE_ON} press release />
          Release sound
        </span>
      )}
      {showSilent && (
        <span
          className="flex items-center gap-2"
          title={`${isMousePack ? 'Buttons' : 'Keys'} without a sound stay silent. That's fine.`}
        >
          <Swatch face={KEYCAP_FACE_OFF} />
          Silent, that's fine
        </span>
      )}
    </div>
  );
}
