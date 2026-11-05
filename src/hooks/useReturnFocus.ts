import { useRef } from 'react';

/**
 * Hands focus back to where it was when a dialog closes. A Radix dialog
 * without a DialogTrigger would send it to the page's body instead. Spread the
 * result on DialogContent.
 *
 * A dialog opened from a menu item gives the focus to the menu's button, as
 * the item is gone by the time the dialog closes.
 */
export function useReturnFocus() {
  const returnTo = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      // Read before the dialog moves the focus into itself.
      let element = document.activeElement;
      const menu = element?.closest('[role="menu"]');
      if (menu?.id) {
        element =
          document.querySelector(`[aria-controls="${CSS.escape(menu.id)}"]`) ??
          element;
      }
      returnTo.current = element instanceof HTMLElement ? element : null;
    },
    onCloseAutoFocus: (event: Event) => {
      const element = returnTo.current;
      returnTo.current = null;
      if (element?.isConnected) {
        event.preventDefault();
        element.focus();
      }
    },
  };
}
