import { codesOfOtherKind } from '@/components/editor/hidden-keys';
import type { FileKind } from '@/lib/fileKinds';
import type { KeySounds, PackType } from '@/utils/soundPack';

/**
 * How far the open pack has come, read from its data alone:
 * - `no-files` (A): no audio or video file yet;
 * - `no-sounds` (B): files, but no key of the pack's kind has a sound;
 * - `has-sounds` (C): at least one key of the pack's kind has a sound.
 */
export type WorkspaceStage = 'no-files' | 'no-sounds' | 'has-sounds';

export interface WorkspaceFacts {
  sourceCount: number;
  keySounds: KeySounds;
  packType: PackType;
  /** A pack from the library is open. */
  isLibraryPack: boolean;
  isSignedIn: boolean;
  /** Codes of the selected keys or buttons. */
  selectedCodes: readonly string[];
  /** The kind of the file open in the sound panel; null when none is. */
  activeFileKind: FileKind | null;
}

/** What the workspace shows; each flag is true when its control is on the page. */
export interface WorkspaceVisibility {
  stage: WorkspaceStage;
  /** A library pack is open and the visitor is signed in (+L). */
  library: boolean;
  /** The keyboard or mouse is drawn faded behind the ways to add sounds, and takes no clicks. */
  fadedKeyboard: boolean;
  /** The three tiles that each open a file picker, with their hints. */
  addTiles: boolean;
  /** The file list, and beside it the open file. */
  soundPanel: boolean;
  /** The waveform, for an open file with many sounds. */
  waveform: boolean;
  /** The pane that gives an open file of one sound to keys, without a waveform. */
  oneSoundPane: boolean;
  keyboardSize: boolean;
  /** The chips that select a group of keys, such as the letters. */
  keyGroups: boolean;
  /** Selected / Has a sound under the keyboard. */
  legend: boolean;
  /** Release sound in the legend, once some key has one. */
  releaseLegend: boolean;
  tryIt: boolean;
  download: boolean;
  /** Same as `library`: Update online publishes to the open library pack. */
  updateOnline: boolean;
  /** The Press / Release switch, over the waveform once a selected key has a press sound. */
  pressReleaseToggle: boolean;
}

type PackFacts = Pick<WorkspaceFacts, 'sourceCount' | 'keySounds' | 'packType'>;

export function getWorkspaceStage(facts: PackFacts): WorkspaceStage {
  if (facts.sourceCount === 0) return 'no-files';
  return ownCodes(facts).length > 0 ? 'has-sounds' : 'no-sounds';
}

// Codes with a sound that the pack's type draws and plays. Sounds kept for
// the other type (after a switch) wait in the hidden-keys tray instead.
function ownCodes({ keySounds, packType }: PackFacts) {
  const other = new Set(codesOfOtherKind(keySounds.keys(), packType));
  return [...keySounds.keys()].filter((code) => !other.has(code));
}

export function getVisibility(facts: WorkspaceFacts): WorkspaceVisibility {
  const stage = getWorkspaceStage(facts);
  const hasFiles = stage !== 'no-files';
  const hasSounds = stage === 'has-sounds';
  const isKeyboard = facts.packType === 'Keyboard';
  const hasRelease = ownCodes(facts).some(
    (code) => facts.keySounds.get(code)?.release,
  );
  const library = facts.isLibraryPack && facts.isSignedIn;
  return {
    stage,
    library,
    fadedKeyboard: !hasFiles,
    addTiles: !hasFiles,
    soundPanel: hasFiles,
    waveform: hasFiles && facts.activeFileKind === 'many',
    oneSoundPane: hasFiles && facts.activeFileKind === 'one',
    keyboardSize: hasFiles && isKeyboard,
    keyGroups: hasFiles && isKeyboard,
    legend: hasFiles,
    releaseLegend: hasFiles && hasRelease,
    tryIt: hasSounds,
    download: hasSounds,
    updateOnline: library,
    pressReleaseToggle:
      hasFiles &&
      facts.activeFileKind === 'many' &&
      facts.selectedCodes.some((code) => facts.keySounds.has(code)),
  };
}

/** Of the codes a layout draws, how many have a sound and how many stay silent. */
export function countDrawnKeys(
  keySounds: KeySounds,
  drawnCodes: ReadonlySet<string>,
) {
  let withSound = 0;
  for (const code of drawnCodes) {
    if (keySounds.has(code)) withSound += 1;
  }
  return { withSound, silent: drawnCodes.size - withSound };
}
