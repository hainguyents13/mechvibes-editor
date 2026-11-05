import type React from 'react';
import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface NavbarMenuItem {
  label: string;
  onSelect: () => void;
  /** Shown but not chosen, while it cannot run. */
  disabled?: boolean;
}

/**
 * A button that opens a short list of actions under it. A popover, so it
 * closes on a click elsewhere or Esc, and sits above the page. Choosing an
 * action closes it and hands focus back to the button first, so a dialog the
 * action opens returns focus there too. The list lives at the end of the
 * page, so a button inside a list item adds no list of its own there; Tab
 * still goes from the button into it, as for any popover it opens.
 */
export function NavbarMenu({
  items,
  align = 'start',
  buttonClassName,
  buttonLabel,
  tour,
  children,
}: {
  items: NavbarMenuItem[];
  /** Which edge of the button the list lines up with. */
  align?: 'start' | 'end';
  buttonClassName: string;
  /** Accessible name of the button, when its text is hidden on narrow screens. */
  buttonLabel?: string;
  /** data-tour name of the button, for the guided tour. */
  tour?: string;
  children: React.ReactNode;
}) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const placeMenu = (event: React.ToggleEvent<HTMLDivElement>) => {
    const button = buttonRef.current;
    if (event.newState !== 'open' || !button) return;
    const box = button.getBoundingClientRect();
    const menu = event.currentTarget;
    const style = menu.style;
    style.top = `${box.bottom + 4}px`;
    // Opens above a button too near the bottom of the window for it, once
    // it is shown and has a height, before it paints.
    requestAnimationFrame(() => {
      const height = menu.offsetHeight;
      if (
        box.bottom + 4 + height > window.innerHeight &&
        box.top > height + 4
      ) {
        style.top = `${box.top - 4 - height}px`;
      }
    });
    if (align === 'start') {
      style.left = `${box.left}px`;
      style.right = '';
    } else {
      style.left = '';
      style.right = `${document.documentElement.clientWidth - box.right}px`;
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        popoverTarget={menuId}
        aria-label={buttonLabel}
        data-tour={tour}
        className={buttonClassName}
      >
        {children}
      </button>
      {createPortal(
        <div
          ref={menuRef}
          id={menuId}
          popover="auto"
          onBeforeToggle={placeMenu}
          // The look of the site's menus (ui/dropdown-menu). A popover rather
          // than a Radix menu: shortcuts stay off while one is open.
          className="fixed inset-auto m-0 rounded-[10px] bg-mv-page p-1.5 font-body text-mv-ink shadow-[0_0_0_1px_var(--mv-line),0_14px_32px_-14px_var(--mv-shadow)]"
        >
          <ul className="flex min-w-[200px] flex-col gap-0.5">
            {items.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  disabled={item.disabled}
                  className="flex w-full cursor-pointer select-none items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-sm text-mv-text outline-none transition-colors hover:bg-mv-fill hover:text-mv-ink focus-visible:bg-mv-fill focus-visible:text-mv-ink disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => {
                    menuRef.current?.hidePopover();
                    buttonRef.current?.focus();
                    item.onSelect();
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </>
  );
}
