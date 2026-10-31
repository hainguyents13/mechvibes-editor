// The screens before the workspace, and how they map to browser history.
//
// The start screen, the list of library packs and the Keyboard-or-Mouse
// question each get their own history entry, so the browser's Back moves
// between them. The workspace replaces the entry it was entered from instead
// of adding one: Back from it never lands on the question that started it.

/** `start` is the three ways in; `my-packs` lists library packs; `pack-type` asks Keyboard or Mouse. */
export type EditorScreen = 'start' | 'my-packs' | 'pack-type' | 'workspace';

/** What the editor keeps in `history.state`. */
export type ScreenHistoryState = {
  editorScreen: EditorScreen;
  /** Whether the entry was added on top of the start screen's, so going back is a history step. */
  pushed: boolean;
};

const SCREENS: readonly EditorScreen[] = [
  'start',
  'my-packs',
  'pack-type',
  'workspace',
];

export function screenState(
  screen: EditorScreen,
  pushed = false,
): ScreenHistoryState {
  return { editorScreen: screen, pushed };
}

/** The editor's state in a history entry, or null for an entry it did not write. */
export function readScreenState(state: unknown): ScreenHistoryState | null {
  if (typeof state !== 'object' || state === null) return null;
  const { editorScreen, pushed } = state as Record<string, unknown>;
  if (!SCREENS.includes(editorScreen as EditorScreen)) return null;
  return {
    editorScreen: editorScreen as EditorScreen,
    pushed: pushed === true,
  };
}

/**
 * What to do when the browser moves to another history entry:
 * - `show`: go to the entry's screen. Leaving the workspace this way starts over.
 * - `return-to-workspace`: the pack has work that would be lost, so add the
 *   workspace's entry back and ask before starting over (`confirm`), or stay
 *   put while it saves or opens something.
 * - `stay`: the entry is a workspace that was already left; it now stands for
 *   the current screen.
 */
export type PopStateOutcome =
  | { kind: 'show'; screen: EditorScreen }
  | { kind: 'return-to-workspace'; confirm: boolean }
  | { kind: 'stay' };

export function resolvePopState(
  current: EditorScreen,
  state: unknown,
  pack: { hasUnsavedChanges: boolean; isBusy: boolean },
): PopStateOutcome {
  // Entries the editor did not write come before it took over the tab.
  const target = readScreenState(state)?.editorScreen ?? 'start';
  if (current === 'workspace') {
    if (target === 'workspace') return { kind: 'stay' };
    if (pack.isBusy) return { kind: 'return-to-workspace', confirm: false };
    if (pack.hasUnsavedChanges) {
      return { kind: 'return-to-workspace', confirm: true };
    }
    return { kind: 'show', screen: target };
  }
  // The workspace it pointed to was reset when it was left.
  if (target === 'workspace') return { kind: 'stay' };
  return { kind: 'show', screen: target };
}

/**
 * How the on-page Back of the library list and the Keyboard-or-Mouse question
 * returns to the start screen: a history step when the entry was added on top
 * of the start screen's, otherwise by replacing the entry (a link or a reload
 * landed there directly, and stepping back would leave the editor).
 */
export function backToStart(state: unknown): 'history-back' | 'replace' {
  return readScreenState(state)?.pushed ? 'history-back' : 'replace';
}

/** The editor at `editorHref`, opening on the list of the visitor's library packs. */
export function myPacksStartUrl(editorHref: string) {
  const url = new URL(editorHref);
  url.search = '';
  url.hash = '';
  url.searchParams.set('start', 'my-packs');
  return url.toString();
}
