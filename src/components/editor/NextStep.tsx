import type { WorkspaceStage } from '@/lib/workspaceVisibility';
import type { PackType } from '@/utils/soundPack';

/**
 * What to do next, for how far the pack has come. A mouse pack names its
 * buttons, and a touch screen, where Try it plays what is tapped, says so.
 */
export function nextStepText({
  stage,
  packType,
  isTouch,
}: {
  stage: WorkspaceStage;
  packType: PackType;
  isTouch: boolean;
}) {
  const isMouse = packType === 'Mouse';
  const noun = isMouse ? 'button' : 'key';
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
export function NextStep(props: Parameters<typeof nextStepText>[0]) {
  const next = nextStepText(props);
  return (
    // Smaller below lg, where the row is only as wide as the screen.
    <p
      className="min-w-0 truncate text-xs lg:text-sm text-base-content/70"
      title={`Next: ${next}`}
    >
      <span className="font-medium text-base-content">Next:</span> {next}
    </p>
  );
}
