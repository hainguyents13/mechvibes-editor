import { useSyncExternalStore } from 'react';
import { isPhoneScreen } from '@/lib/phoneScreen';

const COARSE_POINTER = '(pointer: coarse)';

// Turning a phone resizes the window too.
function subscribe(onChange: () => void) {
  const pointer = window.matchMedia(COARSE_POINTER);
  window.addEventListener('resize', onChange);
  pointer.addEventListener('change', onChange);
  return () => {
    window.removeEventListener('resize', onChange);
    pointer.removeEventListener('change', onChange);
  };
}

// The layout viewport, which pinch zoom leaves alone. The page itself never
// scrolls, so no scrollbar narrows it.
function getSnapshot() {
  const { clientWidth, clientHeight } = document.documentElement;
  return isPhoneScreen({
    width: clientWidth,
    height: clientHeight,
    coarsePointer: window.matchMedia(COARSE_POINTER).matches,
  });
}

/** Whether the screen is too small to make a pack on; follows resizing and turning. */
export function usePhoneScreen() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
