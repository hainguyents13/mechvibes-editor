/**
 * Over the faded keyboard of a pack with no sound yet: what to do first, and
 * a hand-drawn arrow down to the ways to add sounds under it. It takes no
 * clicks, so it never stands in the way of the panel or a drop.
 */
export function EmptyKeyboardHint({ noun }: { noun: string }) {
  return (
    <div
      data-empty-keyboard-hint
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
    >
      <div className="rounded-[14px] bg-mv-page/90 px-5 py-3.5 text-center shadow-[inset_0_0_0_1px_var(--mv-line),0_14px_32px_-14px_var(--mv-shadow)] backdrop-blur-[2px]">
        <p className="m-0 font-display text-lg font-bold tracking-[-0.01em] text-mv-ink">
          Start by adding your sounds below
        </p>
        <p className="m-0 mt-1 text-[13px] text-mv-muted">
          Then select {noun}s here and give each one a sound.
        </p>
      </div>
      {/* A loose, hand-drawn stroke, so it reads as a pointer, not a control */}
      <svg
        aria-hidden="true"
        viewBox="0 0 80 120"
        className="h-[min(110px,32%)] shrink text-mv-ink"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M46 6c-15 9-22 21-9 31 13 10 15 22 2 34-10 9-9 22-1 40" />
        <path d="M27 99c4 5 7 9 11 13 3-6 7-11 12-15" />
      </svg>
    </div>
  );
}
