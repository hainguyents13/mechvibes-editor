/**
 * The legend row and the progress line under it, so the keyboard's
 * fit-to-height scale can count on them: both show from the first file on.
 */
export const KEY_LEGEND_ROWS_HEIGHT = 44;
/**
 * Width both read in full on one line: the legend with all four marks (about
 * 480px), and the progress line with every check. A keyboard drawn narrower,
 * Compact on a short screen, has its rows reach past it.
 */
export const KEY_LEGEND_ROWS_MIN_WIDTH = 496;

/**
 * What the marks on the keys mean. Release sound is named only when some key
 * has one, and a plain key only while some drawn keys have a sound and others
 * stay silent, to say that is fine.
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
    <div className="flex h-6 items-center gap-4 whitespace-nowrap">
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
      {showSilent && (
        <div
          className="flex items-center gap-2"
          title={`${isMousePack ? 'Buttons' : 'Keys'} without a sound stay silent. That's fine.`}
        >
          <div className="btn btn-xs pointer-events-none">X</div>
          <span className="text-base-content/70">Silent, that's fine</span>
        </div>
      )}
    </div>
  );
}
