import { ChevronLeft, CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The scrolling frame the screens before the workspace share. A centred screen
 * sits in the middle of the space between navbar and footer; its auto margins
 * fall to zero when it is taller than that space, so it scrolls instead of
 * being clipped at the top.
 */
export function StartPage({
  centered = false,
  children,
}: {
  centered?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <div
        className={`mx-auto w-full max-w-5xl shrink-0 px-4 ${centered ? 'my-auto py-8' : 'py-10 md:py-14'}`}
      >
        {children}
      </div>
    </div>
  );
}

/** The resting look of a choice card: a border and no shadow. */
export const CARD_CLASS =
  'rounded-box border border-base-300 bg-base-100 transition-[border-color,box-shadow]';

/** A card that is a button: it lifts under the pointer and under keyboard focus. */
export const BUTTON_CARD_CLASS = `${CARD_CLASS} cursor-pointer hover:border-primary/60 hover:shadow-md focus-visible:border-primary/60 focus-visible:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`;

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

/** Back to the start screen, or `label` to where else it leads. */
export function BackButton({
  onClick,
  label = 'Back',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-sm btn-ghost rounded-box -ml-2 max-w-full px-2"
    >
      <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

/**
 * Where a sign-in link opens: a new tab when the work kept in this one has
 * unsaved changes, so it survives the round trip.
 */
export function signInTarget(newTab: boolean) {
  return newTab ? { target: '_blank', rel: 'noopener' } : {};
}

/** Why something the visitor asked for did not happen, next to where they asked. */
export function ErrorLine({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 text-sm text-error-strong"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/**
 * Stretches a card's action over the whole card, so the card is clickable
 * without nesting controls. The card must be `relative`, and the action
 * `static` so its overlay measures the card. Other links in the card sit above
 * the overlay with `relative z-10`.
 */
export const STRETCHED_ACTION =
  "static after:absolute after:inset-0 after:rounded-box after:content-['']";
