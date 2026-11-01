import type React from 'react';
import { useId, useRef } from 'react';

export interface NavbarMenuItem {
  label: string;
  onSelect: () => void;
}

/**
 * A button that opens a short list of actions under it. A popover, so it
 * closes on a click elsewhere or Esc, and sits above the page. Choosing an
 * action closes it and hands focus back to the button first, so a dialog the
 * action opens returns focus there too.
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
    const style = event.currentTarget.style;
    style.top = `${box.bottom + 4}px`;
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
      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        onBeforeToggle={placeMenu}
        className="fixed inset-auto m-0 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
      >
        <ul className="menu menu-sm w-52 p-0">
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
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
      </div>
    </>
  );
}
