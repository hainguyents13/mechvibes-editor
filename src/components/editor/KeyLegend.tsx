import { plural } from '@/lib/utils';

/** One line high, so the keyboard's fit-to-height scale can count on it. */
export const KEY_LEGEND_HEIGHT = 24;
/** With the count line under it. */
export const KEY_LEGEND_WITH_COUNT_HEIGHT = 44;

/**
 * What the marks on the keys mean, and once keys have a sound, how many do.
 * Release sound is named only when some key has one.
 */
export function KeyLegend({
  showRelease,
  count,
  isMousePack,
}: {
  showRelease: boolean;
  /** Drawn keys with a sound and without; left out before any has one. */
  count: { withSound: number; silent: number } | null;
  isMousePack: boolean;
}) {
  const noun = isMousePack ? 'button' : 'key';
  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex h-6 items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="btn btn-xs btn-neutral pointer-events-none">A</div>
          <span className="text-base-content/70">Selected</span>
        </div>
        <div
          className="flex items-center gap-2"
          title="The dot takes the colour of the file the sound comes from"
        >
          <div className="btn btn-xs relative pointer-events-none">
            Q
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-base-content/50 rounded-full border-2 border-white shadow-lg ring-2 ring-base-content/20"></div>
          </div>
          <span className="text-base-content/70">Has a sound</span>
        </div>
        {showRelease && (
          <div className="flex items-center gap-2">
            <div className="btn btn-xs relative pointer-events-none">
              Z
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary rounded-full border-2 border-white shadow-lg ring-2 ring-secondary/30"></div>
            </div>
            <span className="text-base-content/70">Release sound</span>
          </div>
        )}
      </div>
      {count && (
        <p className="truncate leading-4 text-base-content/70">
          {plural(count.withSound, noun)}{' '}
          {count.withSound === 1 ? 'has' : 'have'} a sound · {count.silent}{' '}
          silent. {isMousePack ? 'Buttons' : 'Keys'} without a sound stay
          silent. That's fine.
        </p>
      )}
    </div>
  );
}
