import type { WorkspaceStage } from '@/lib/workspaceVisibility';

/**
 * - `done`: marked with a check;
 * - `todo`: can be done now;
 * - `not-yet`: waits on something else, shown faded with why in `title`;
 * - `count`: a number to read, never marked done, so no one takes it as a
 *   task to give every key a sound.
 */
export type ProgressState = 'done' | 'todo' | 'not-yet' | 'count';

export interface ProgressItem {
  id: 'sounds' | 'count' | 'try-it' | 'save';
  label: string;
  state: ProgressState;
  /** Shown on hover; for a `not-yet` item, what it waits on. */
  title?: string;
}

export interface ProgressFacts {
  stage: WorkspaceStage;
  /** Keys (or buttons) the drawn layout has with a sound, and how many it draws. */
  withSound: number;
  drawn: number;
  isMousePack: boolean;
  /** Try it was entered at least once with this pack. */
  hasTriedIt: boolean;
  /** Try it has a sound it can play. */
  canTryIt: boolean;
  /** A library pack is open while signed in: saving is Update, not Download. */
  library: boolean;
  /** Unchanged since the last Download, or for `library`, the last publish. */
  isSaved: boolean;
}

/**
 * The light progress line under the keyboard: what is done so far, in no set
 * order and with nothing locked. Empty before the pack has a file, where the
 * ways to add sounds already say what to do.
 */
export function getProgressItems(facts: ProgressFacts): ProgressItem[] {
  if (facts.stage === 'no-files') return [];
  const noun = facts.isMousePack ? 'button' : 'key';
  const hasSounds = facts.stage === 'has-sounds';
  const waitsOnSound = {
    state: 'not-yet',
    title: `Once a ${noun} has a sound`,
  } as const;

  const tryIt: ProgressItem = {
    id: 'try-it',
    label: 'Try it',
    ...(!hasSounds
      ? waitsOnSound
      : facts.hasTriedIt
        ? { state: 'done' }
        : facts.canTryIt
          ? { state: 'todo' }
          : {
              state: 'not-yet',
              title: `This browser cannot play the sounds of these ${noun}s`,
            }),
  };

  const save: ProgressItem = {
    id: 'save',
    label: facts.library ? 'Update' : 'Download .zip',
    ...(facts.library && { title: 'Publish to mechvibes.com' }),
    ...(!hasSounds ? waitsOnSound : { state: facts.isSaved ? 'done' : 'todo' }),
  };

  return [
    { id: 'sounds', label: 'Sounds added', state: 'done' },
    {
      id: 'count',
      label: `${facts.withSound} of ${facts.drawn} ${noun}s ${facts.withSound === 1 ? 'has' : 'have'} a sound`,
      state: 'count',
    },
    tryIt,
    save,
  ];
}
