import { siteIdentity } from '@/config/siteIdentity';
import { isSameSnapshot, type PackSnapshot } from '@/utils/packHistory';
import {
  isSamePackInfo,
  type PackInfo,
  type PackType,
} from '@/utils/soundPack';

/** Defaults for a new pack. */
export function createDefaultPackInfo(
  packType: PackType = 'Keyboard',
): PackInfo {
  return {
    name: 'My Sound Pack',
    author: '',
    description: `A custom sound pack created with the ${siteIdentity.productName} editor.`,
    tags: [],
    packType,
    recommendedVolume: 1,
    randomPitch: false,
    icon: null,
  };
}

/** A new pack with nothing in it. */
export function createBlankSnapshot(
  packType: PackType = 'Keyboard',
): PackSnapshot {
  return {
    keySounds: new Map(),
    sources: [],
    packInfo: createDefaultPackInfo(packType),
  };
}

/**
 * Whether a pack holds nothing yet: no files, no sounds and the default
 * details. The pack type does not count, so switching an empty pack to a
 * mouse pack leaves nothing to lose.
 */
export function isBlankPack({ sources, keySounds, packInfo }: PackSnapshot) {
  return (
    sources.length === 0 &&
    keySounds.size === 0 &&
    isSamePackInfo(packInfo, createDefaultPackInfo(packInfo.packType))
  );
}

/**
 * Whether `present` holds changes since `saved` (what was last opened, started
 * or saved) that leaving would lose. A blank pack has none.
 */
export function hasUnsavedChanges(present: PackSnapshot, saved: PackSnapshot) {
  return !isSameSnapshot(present, saved) && !isBlankPack(present);
}
