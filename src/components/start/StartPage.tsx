import { ChevronLeft, CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

/** The scrolling frame the screens before the workspace share. */
export function StartPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
        {children}
      </div>
    </div>
  );
}

export const SCREEN_HEADING_ID = 'screen-heading';

/**
 * A screen's heading. It takes the focus when the screen opens, so a screen
 * reader says where the visitor now is and Tab goes on from there.
 */
export function ScreenHeading({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <h1
      id={SCREEN_HEADING_ID}
      tabIndex={-1}
      className={`${className} focus:outline-none`}
    >
      {children}
    </h1>
  );
}

/** Back to the start screen. */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-sm btn-ghost rounded-box -ml-2 px-2"
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </button>
  );
}

/** Why something the visitor asked for did not happen, next to where they asked. */
export function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-sm text-error">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/**
 * Stretches a card's main button over the whole card, so the card is
 * clickable without nesting controls. The card must be `relative`, and the
 * button `static` so its overlay measures the card. daisyUI nudges a pressed
 * button with `translate`, which would shrink the overlay to the button
 * between press and release, so that is turned off. Other links in the card
 * sit above the overlay with `relative z-10`.
 */
export const STRETCHED_ACTION =
  "static active:translate-none after:absolute after:inset-0 after:rounded-box after:content-['']";
