import { useCallback, useState } from 'react';

/**
 * A yes/no choice kept for this tab's session under `key`. Storage can be
 * unavailable (private mode, blocked site data); the choice then lasts until
 * the page reloads.
 */
export function useSessionFlag(key: string, initial = false) {
  const [value, setValue] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored === null ? initial : stored === 'true';
    } catch {
      return initial;
    }
  });
  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        sessionStorage.setItem(key, String(next));
      } catch {
        // Kept in memory only; see above.
      }
    },
    [key],
  );
  return [value, update] as const;
}
