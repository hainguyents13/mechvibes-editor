import { websiteHost } from '@/config/siteIdentity';
import { canOpenPack, type LibraryPackSummary } from '@/lib/websiteApi';

// The screens before the workspace, and how they map to browser history.
//
// The start screen, the list of library packs and the Keyboard-or-Mouse
// question each get their own history entry, so the browser's Back moves
// between them. The workspace replaces the entry it was entered from instead
// of adding one: Back from it never lands on the question that started it.
//
// Leaving the workspace keeps the work in it. Start over adds a start screen
// entry on top of the workspace's, so Back, or Back to on that screen, returns
// to the same work. The work is replaced only when the visitor picks another
// way in, and each work gets an id, so an entry of work that was replaced is
// told apart from the work kept now.

/** `start` is the three ways in; `my-packs` lists library packs; `pack-type` asks Keyboard or Mouse. */
export type EditorScreen = 'start' | 'my-packs' | 'pack-type' | 'workspace';

/** What the editor keeps in `history.state`. */
export type ScreenHistoryState = {
  editorScreen: EditorScreen;
  /** Whether the entry was added on top of another of the editor's, so going back is a history step. */
  pushed: boolean;
  /**
   * On a workspace entry, the work it shows. On a start screen entry that
   * Start over added, the work whose entry lies right below it.
   */
  workId: string | null;
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
  workId: string | null = null,
): ScreenHistoryState {
  return { editorScreen: screen, pushed, workId };
}

/** The editor's state in a history entry, or null for an entry it did not write. */
export function readScreenState(state: unknown): ScreenHistoryState | null {
  if (typeof state !== 'object' || state === null) return null;
  const { editorScreen, pushed, workId } = state as Record<string, unknown>;
  if (!SCREENS.includes(editorScreen as EditorScreen)) return null;
  return {
    editorScreen: editorScreen as EditorScreen,
    pushed: pushed === true,
    workId: typeof workId === 'string' ? workId : null,
  };
}

/** A new id for the work in the workspace, unique across reloads of the tab. */
export function newWorkId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The entry the workspace writes over the one it was entered from, for the
 * work `workId`. Whether that entry was added on top of another carries over.
 */
export function workspaceState(state: unknown, workId: string) {
  return screenState('workspace', readScreenState(state)?.pushed, workId);
}

/**
 * The entry `state` written over to stand for `screen`. Whether it was added
 * on top of another carries over: a reload on it steps back only when there
 * is an entry of the editor's below.
 */
export function standInState(state: unknown, screen: EditorScreen) {
  return screenState(screen, readScreenState(state)?.pushed);
}

/** The start screen entry Start over adds on top of the workspace of `workId`. */
export function startOverState(workId: string) {
  return screenState('start', true, workId);
}

/**
 * How Back to returns from the start screen to the kept work `workId`: a
 * history step when Start over added this entry right above the work's own,
 * otherwise by adding a workspace entry, which drops the ones ahead.
 */
export function returnToWork(
  state: unknown,
  workId: string,
): 'history-back' | 'push' {
  const entry = readScreenState(state);
  return entry?.editorScreen === 'start' && entry.workId === workId
    ? 'history-back'
    : 'push';
}

/**
 * Whether picking another way in asks first: it replaces the work there is,
 * in the workspace or kept behind the start screens, and that work has
 * changes not saved yet.
 */
export function asksBeforeReplacing(work: {
  workId: string | null;
  isDirty: boolean;
}) {
  return work.workId !== null && work.isDirty;
}

/**
 * What to do when the browser moves to another history entry:
 * - `show`: go to the entry's screen. Leaving the workspace this way keeps
 *   the work. `replaceEntry`: the entry is a workspace of work that was
 *   replaced since, so it is written over as the screen shown.
 * - `return-to-workspace`: the workspace is saving or opening something, so
 *   add its entry back and stay. `aboveStart`: the entry goes back on top of
 *   the start screen's.
 * - `stay`: nothing to show. Away from the workspace the entry is one of work
 *   that was replaced; it now stands for the current screen.
 */
export type PopStateOutcome =
  | { kind: 'show'; screen: EditorScreen; replaceEntry: boolean }
  | { kind: 'return-to-workspace'; aboveStart: boolean }
  | { kind: 'stay' };

export function resolvePopState(
  current: EditorScreen,
  state: unknown,
  work: { workId: string | null; isBusy: boolean },
): PopStateOutcome {
  const entry = readScreenState(state);
  // Entries the editor did not write come before it took over the tab.
  const target = entry?.editorScreen ?? 'start';
  const isKeptWork =
    target === 'workspace' &&
    work.workId !== null &&
    entry?.workId === work.workId;
  const isReplacedWork = target === 'workspace' && !isKeptWork;
  if (current === 'workspace') {
    if (isKeptWork) return { kind: 'stay' };
    // Back from the workspace past the entry of work it replaced lands on
    // the start screen, as Back from any workspace does.
    const screen = isReplacedWork ? 'start' : target;
    if (work.isBusy) {
      return { kind: 'return-to-workspace', aboveStart: screen === 'start' };
    }
    return { kind: 'show', screen, replaceEntry: isReplacedWork };
  }
  if (isKeptWork) {
    return { kind: 'show', screen: 'workspace', replaceEntry: false };
  }
  if (isReplacedWork) return { kind: 'stay' };
  return { kind: 'show', screen: target, replaceEntry: false };
}

/**
 * How the editor returns to the start screen (the on-page Back, a reload): a
 * history step when the entry was added on top of the start screen's, so no
 * second start entry is left for Back to step over; otherwise by replacing
 * the entry (a link landed there directly, and stepping back would leave the
 * editor).
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
