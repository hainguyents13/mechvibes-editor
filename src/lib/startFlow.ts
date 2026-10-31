import { websiteHost } from '@/config/siteIdentity';
import { canOpenPack, type LibraryPackSummary } from '@/lib/websiteApi';

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
 *   put while it saves or opens something. `aboveStart`: the entry goes back
 *   on top of the start screen's, as one added there.
 * - `stay`: the entry is a workspace that was already left; it now stands for
 *   the current screen.
 */
export type PopStateOutcome =
  | { kind: 'show'; screen: EditorScreen }
  | { kind: 'return-to-workspace'; confirm: boolean; aboveStart: boolean }
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
    const aboveStart = target === 'start';
    if (pack.isBusy) {
      return { kind: 'return-to-workspace', confirm: false, aboveStart };
    }
    if (pack.hasUnsavedChanges) {
      return { kind: 'return-to-workspace', confirm: true, aboveStart };
    }
    return { kind: 'show', screen: target };
  }
  // The workspace it pointed to was reset when it was left.
  if (target === 'workspace') return { kind: 'stay' };
  return { kind: 'show', screen: target };
}

/**
 * How the editor returns to the start screen (the on-page Back, Start over, a
 * reload): a history step when the entry was added on top of the start
 * screen's, so no second start entry is left for Back to step over; otherwise
 * by replacing the entry (a link landed there directly, and stepping back
 * would leave the editor).
 */
export function backToStart(state: unknown): 'history-back' | 'replace' {
  return readScreenState(state)?.pushed ? 'history-back' : 'replace';
}

/**
 * Where a link into the editor asks it to begin:
 * - `?open=<pack id>` opens one of the visitor's library packs (the website's
 *   Edit sounds button);
 * - `?start=my-packs` shows the list of their library packs (signing in from
 *   the start screens comes back to it).
 */
export type StartLink = { kind: 'open'; packId: string } | { kind: 'my-packs' };

const START_PARAMS = ['open', 'start'];

/** The start link in a query string, or null. `open` wins when both are there. */
export function parseStartLink(search: string): StartLink | null {
  const params = new URLSearchParams(search);
  const packId = params.get('open')?.trim();
  if (packId) return { kind: 'open', packId };
  if (params.get('start') === 'my-packs') return { kind: 'my-packs' };
  return null;
}

/** The editor at `editorHref`, beginning as `link` asks. */
export function startLinkUrl(editorHref: string, link: StartLink) {
  const url = new URL(editorHref);
  url.search = '';
  url.hash = '';
  if (link.kind === 'open') {
    url.searchParams.set('open', link.packId);
  } else {
    url.searchParams.set('start', 'my-packs');
  }
  return url.toString();
}

/**
 * The signed-in visitor's pack that an open link names, or why it cannot be
 * opened. The website's own download answers 404 and 403 for the same cases.
 */
export function findLinkedPack(
  packs: LibraryPackSummary[],
  packId: string,
): { pack: LibraryPackSummary } | { problem: string } {
  const pack = packs.find((candidate) => candidate.id === packId);
  if (!pack) {
    return {
      problem: `The pack in this link is not in your account on ${websiteHost}.`,
    };
  }
  if (pack.status === 'REMOVED') {
    return {
      problem: `${pack.name} was removed from ${websiteHost}${pack.removedReason ? `: ${pack.removedReason}` : '.'}`,
    };
  }
  if (!canOpenPack(pack)) {
    return {
      problem: `${pack.name} has no .zip yet. Add one on ${websiteHost}, then open it here.`,
    };
  }
  return { pack };
}

/** `editorHref` without the start link, keeping any other parameter and the hash. */
export function withoutStartLink(editorHref: string) {
  const url = new URL(editorHref);
  for (const param of START_PARAMS) url.searchParams.delete(param);
  return url.toString();
}
