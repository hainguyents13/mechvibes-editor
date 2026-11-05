import type { ReactNode } from 'react';
import { ChevronLeft, CircleAlert } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
        className={`mx-auto w-full max-w-[1040px] shrink-0 px-5 ${centered ? 'my-auto py-10' : 'py-12 md:py-14'}`}
      >
        {children}
      </div>
    </div>
  );
}

/** The small mono label over a screen's heading. */
export const SCREEN_LABEL_CLASS =
  'font-code text-[11px] font-bold uppercase tracking-[0.12em] text-mv-subtle';

/** A screen's big heading, in the site's display face. */
export const SCREEN_TITLE_CLASS =
  'font-display text-[clamp(34px,4.4vw,52px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-mv-ink';

/** A plain box on the page: the page colour inside a light line. */
export const CARD_CLASS =
  'rounded-[14px] bg-mv-page shadow-[inset_0_0_0_1px_var(--mv-line)]';

/** A card that is a button: its line darkens and it takes the raised colour under the pointer and under keyboard focus. */
export const BUTTON_CARD_CLASS = `${CARD_CLASS} cursor-pointer transition-[background-color,box-shadow] hover:bg-mv-raised hover:shadow-[inset_0_0_0_1px_var(--mv-line-strong)] focus-visible:bg-mv-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-line-strong`;

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
      className={`${className} m-0 focus:outline-none`}
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
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        '-ml-3 max-w-full',
      )}
    >
      <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
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
      className="m-0 flex items-start gap-2 text-sm text-mv-danger"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** A link in running text: ink, underlined in a light line. */
export const TEXT_LINK_CLASS =
  'cursor-pointer font-bold text-mv-ink underline decoration-mv-line-strong underline-offset-[3px] hover:decoration-mv-ink disabled:cursor-default disabled:text-mv-subtle';

/**
 * Stretches a card's action over the whole card, so the card is clickable
 * without nesting controls. The card must be `relative`, and the action
 * `static` so its overlay measures the card. Other links in the card sit above
 * the overlay with `relative z-10`.
 */
export const STRETCHED_ACTION =
  "static after:absolute after:inset-0 after:rounded-[14px] after:content-['']";
