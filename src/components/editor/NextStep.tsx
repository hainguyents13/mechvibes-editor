import type { FileKind } from '@/lib/fileKinds';
import type { WorkspaceStage } from '@/lib/workspaceVisibility';
import type { PackType } from '@/utils/soundPack';

/**
 * What to do next, for how far the pack has come and the kind of the open
 * file: a file of one sound goes to keys from the list, a file of many is cut
 * on the waveform. A mouse pack names its buttons, and a touch screen, where
 * Try it plays what is tapped, says so.
 */
export function nextStepText({
  stage,
  packType,
  isTouch,
  activeFileKind = null,
  selectedCount = 0,
  selectedKeyFile = null,
}: {
  stage: WorkspaceStage;
  packType: PackType;
  isTouch: boolean;
  activeFileKind?: FileKind | null;
  /** Keys or buttons selected. */
  selectedCount?: number;
  /**
   * How the one selected key with a sound plays the file on the waveform:
   * all of it (`whole`, as after Split it), or not at all (`other`, as after
   * choosing a file of many sounds for it).
   */
  selectedKeyFile?: 'whole' | 'other' | null;
}) {
  const isMouse = packType === 'Mouse';
  const noun = isMouse ? 'button' : 'key';
  if (
    stage !== 'no-files' &&
    activeFileKind === 'many' &&
    selectedCount === 1 &&
    selectedKeyFile
  ) {
    return selectedKeyFile === 'whole'
      ? 'drag over the press on the waveform and apply it, then switch to Release.'
      : `drag over a sound on the waveform and apply it to the selected ${noun}.`;
  }
  if (stage !== 'no-files' && activeFileKind === 'one') {
    if (selectedCount > 0) {
      const them =
        selectedCount === 1
          ? `the selected ${noun}`
          : `the ${selectedCount} selected ${noun}s`;
      return `click a sound to give it to ${them}.`;
    }
    if (stage === 'no-sounds') {
      return `select ${noun}s, then click a sound to give it to them.`;
    }
  }
  switch (stage) {
    case 'no-files':
      return 'add your sounds.';
    case 'no-sounds':
      return `pick a sound on the waveform, select ${noun}s, then apply.`;
    default: {
      const tryIt = isTouch ? `tap the ${noun}s` : isMouse ? 'click' : 'type';
      return `keep giving ${noun}s a sound, or press Try it and ${tryIt}.`;
    }
  }
}

/** What to do next, kept to one line. */
export function NextStep({
  isLarge,
  ...props
}: Parameters<typeof nextStepText>[0] & {
  /** Over a wide keyboard, the line reads at the larger size. */
  isLarge: boolean;
}) {
  const next = nextStepText(props);
  return (
    <p
      className={`min-w-0 truncate ${isLarge ? 'text-sm' : 'text-xs'} text-base-content/70`}
      title={`Next: ${next}`}
    >
      <span className="font-medium text-base-content">Next:</span> {next}
    </p>
  );
}
