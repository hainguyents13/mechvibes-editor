import type { WorkspaceStage } from '@/lib/workspaceVisibility';

const NEXT_STEPS: Record<WorkspaceStage, string> = {
  'no-files': 'add your sounds.',
  'no-sounds': 'pick a sound on the waveform, select keys, then apply.',
  'has-sounds': 'keep giving keys a sound, or press Try it and type.',
};

/** What to do next, for how far the pack has come. Kept to one line. */
export function NextStep({ stage }: { stage: WorkspaceStage }) {
  const text = `Next: ${NEXT_STEPS[stage]}`;
  return (
    // Smaller below lg, where the row is only as wide as the screen.
    <p
      className="min-w-0 truncate text-xs lg:text-sm text-base-content/70"
      title={text}
    >
      <span className="font-medium text-base-content">Next:</span>{' '}
      {NEXT_STEPS[stage]}
    </p>
  );
}
