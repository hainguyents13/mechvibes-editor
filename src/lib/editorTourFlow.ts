import type { WorkspaceStage } from '@/lib/workspaceVisibility';

/**
 * Which steps the tour walks: `all` that are on show, from Help, or the few
 * that start a way in when it opens by itself: the ways to add sounds for a
 * new pack (`new-pack`), and where to hear, save and publish a pack that
 * already makes sound (`opened-pack`).
 */
export type TourFlow = 'all' | 'new-pack' | 'opened-pack';

/**
 * The tour that opens by itself when a pack is entered at `stage`, or null.
 * A pack with files but no sound yet gets none, and waits for the next entry.
 */
export function autoTourFlow(stage: WorkspaceStage): TourFlow | null {
  if (stage === 'no-files') return 'new-pack';
  if (stage === 'has-sounds') return 'opened-pack';
  return null;
}

export const TOUR_SEEN_STORAGE_KEY = 'mechvibes-editor:tour-seen';

type ReadStorage = () => Pick<Storage, 'getItem'>;
type WriteStorage = () => Pick<Storage, 'setItem'>;

// Reaching localStorage itself can throw when site data is blocked, so it is
// passed as a getter and read inside the try.
const browserStorage = () => localStorage;

/**
 * Whether this browser has seen the tour, opened by itself or from Help.
 * Unreadable storage counts as seen, so the tour does not open by itself on
 * every visit.
 */
export function hasSeenTour(storage: ReadStorage = browserStorage): boolean {
  try {
    return storage().getItem(TOUR_SEEN_STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markTourSeen(storage: WriteStorage = browserStorage) {
  try {
    storage().setItem(TOUR_SEEN_STORAGE_KEY, '1');
  } catch {
    // Storage is unavailable; Help still opens the tour.
  }
}
