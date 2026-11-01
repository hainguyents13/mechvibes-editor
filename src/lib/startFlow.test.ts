import { describe, expect, it } from 'vitest';
import { websiteHost } from '@/config/siteIdentity';
import {
  asksBeforeReplacing,
  backToStart,
  type EditorScreen,
  findLinkedPack,
  newWorkId,
  parseStartLink,
  readScreenState,
  resolvePopState,
  returnToWork,
  screenState,
  standInState,
  startLinkUrl,
  startOverState,
  withoutStartLink,
  workspaceState,
} from '@/lib/startFlow';
import type { LibraryPackSummary } from '@/lib/websiteApi';

const kept = { workId: 'w1', isBusy: false };
const none = { workId: null, isBusy: false };
const busy = { workId: 'w1', isBusy: true };

describe('readScreenState', () => {
  it('reads what screenState writes', () => {
    expect(readScreenState(screenState('pack-type', true))).toEqual({
      editorScreen: 'pack-type',
      pushed: true,
      workId: null,
    });
    expect(readScreenState(screenState('workspace', false, 'w1'))).toEqual({
      editorScreen: 'workspace',
      pushed: false,
      workId: 'w1',
    });
  });

  it('reads entries written before work had an id', () => {
    expect(
      readScreenState({ editorScreen: 'workspace', pushed: true }),
    ).toEqual({ editorScreen: 'workspace', pushed: true, workId: null });
  });

  it('ignores entries the editor did not write', () => {
    expect(readScreenState(null)).toBeNull();
    expect(readScreenState('start')).toBeNull();
    expect(readScreenState({ editorScreen: 'review' })).toBeNull();
    expect(readScreenState({ key: 'abc' })).toBeNull();
  });
});

describe('newWorkId', () => {
  it('gives each work its own id', () => {
    const ids = new Set(Array.from({ length: 50 }, newWorkId));
    expect(ids.size).toBe(50);
  });
});

describe('workspaceState', () => {
  it('names the work and carries over whether the entry was added on top', () => {
    expect(workspaceState(screenState('pack-type', true), 'w2')).toEqual(
      screenState('workspace', true, 'w2'),
    );
    expect(workspaceState(screenState('start'), 'w2')).toEqual(
      screenState('workspace', false, 'w2'),
    );
    expect(workspaceState(null, 'w2')).toEqual(
      screenState('workspace', false, 'w2'),
    );
  });
});

describe('standInState', () => {
  it('stands for another screen and keeps whether the entry was added on top', () => {
    expect(
      standInState(screenState('workspace', false, 'w0'), 'start'),
    ).toEqual(screenState('start'));
    expect(
      standInState(screenState('workspace', true, 'w0'), 'my-packs'),
    ).toEqual(screenState('my-packs', true));
    expect(standInState(null, 'start')).toEqual(screenState('start'));
  });
});

describe('startOverState', () => {
  it('is a start screen entry added on top of the work', () => {
    expect(startOverState('w1')).toEqual(screenState('start', true, 'w1'));
  });
});

describe('returnToWork', () => {
  it('steps back when Start over added the entry right above the work', () => {
    expect(returnToWork(startOverState('w1'), 'w1')).toBe('history-back');
  });

  it('adds a workspace entry when the work is not right below', () => {
    // Back from the workspace landed on the start screen's own entry.
    expect(returnToWork(screenState('start'), 'w1')).toBe('push');
    // Start over left other work, which was replaced since.
    expect(returnToWork(startOverState('w0'), 'w1')).toBe('push');
    expect(returnToWork(null, 'w1')).toBe('push');
  });
});

describe('asksBeforeReplacing', () => {
  it('asks only over work with unsaved changes', () => {
    expect(asksBeforeReplacing({ workId: 'w1', isDirty: true })).toBe(true);
    expect(asksBeforeReplacing({ workId: 'w1', isDirty: false })).toBe(false);
    expect(asksBeforeReplacing({ workId: null, isDirty: false })).toBe(false);
  });
});

describe('resolvePopState', () => {
  it('moves between the screens before the workspace', () => {
    expect(resolvePopState('pack-type', screenState('start'), none)).toEqual({
      kind: 'show',
      screen: 'start',
      replaceEntry: false,
    });
    expect(
      resolvePopState('start', screenState('my-packs', true), kept),
    ).toEqual({ kind: 'show', screen: 'my-packs', replaceEntry: false });
  });

  it('treats an entry from before the editor as the start screen', () => {
    expect(resolvePopState('my-packs', null, none)).toEqual({
      kind: 'show',
      screen: 'start',
      replaceEntry: false,
    });
  });

  it('leaves the workspace for the start screen and keeps the work', () => {
    expect(resolvePopState('workspace', screenState('start'), kept)).toEqual({
      kind: 'show',
      screen: 'start',
      replaceEntry: false,
    });
  });

  it('returns to the kept work from the start screen', () => {
    expect(
      resolvePopState('start', screenState('workspace', false, 'w1'), kept),
    ).toEqual({ kind: 'show', screen: 'workspace', replaceEntry: false });
  });

  it('keeps the workspace while it saves or opens something', () => {
    expect(resolvePopState('workspace', screenState('start'), busy)).toEqual({
      kind: 'return-to-workspace',
      aboveStart: true,
    });
    expect(
      resolvePopState('workspace', screenState('pack-type', true), busy),
    ).toEqual({ kind: 'return-to-workspace', aboveStart: false });
  });

  it('shows the start screen for the entry of work that was replaced', () => {
    expect(
      resolvePopState('workspace', screenState('workspace', true, 'w0'), kept),
    ).toEqual({ kind: 'show', screen: 'start', replaceEntry: true });
  });

  it('does not go to work that was replaced from another screen', () => {
    expect(
      resolvePopState('start', screenState('workspace', false, 'w0'), kept),
    ).toEqual({ kind: 'stay' });
    expect(
      resolvePopState('my-packs', screenState('workspace', false, 'w0'), none),
    ).toEqual({ kind: 'stay' });
  });

  it('stays when the entry is the workspace already shown', () => {
    expect(
      resolvePopState('workspace', screenState('workspace', false, 'w1'), kept),
    ).toEqual({ kind: 'stay' });
  });
});

/**
 * The editor's screens and work over a browser history, moved the way
 * EditorPage moves them, to follow each transition through.
 */
function createFlow() {
  const entries: unknown[] = [screenState('start')];
  let index = 0;
  let count = 0;
  const flow = {
    screen: 'start' as EditorScreen,
    workId: null as string | null,
    isDirty: false,
    /** A way in waiting on the discard question. */
    asking: null as (() => void) | null,
    get entries() {
      return entries.slice(0, index + 1).map(readScreenState);
    },
    get ahead() {
      return entries.length - index - 1;
    },
  };
  const push = (state: unknown) => {
    entries.splice(index + 1, entries.length, state);
    index += 1;
  };
  const replace = (state: unknown) => {
    entries[index] = state;
  };
  const pop = () => {
    const state = entries[index];
    const outcome = resolvePopState(flow.screen, state, {
      workId: flow.workId,
      isBusy: false,
    });
    if (outcome.kind === 'show') {
      flow.screen = outcome.screen;
      if (outcome.replaceEntry) {
        replace(standInState(state, outcome.screen));
      }
    } else if (outcome.kind === 'stay' && flow.screen !== 'workspace') {
      replace(standInState(state, flow.screen));
    }
  };
  const enterWork = () => {
    count += 1;
    const id = `w${count}`;
    replace(workspaceState(entries[index], id));
    flow.workId = id;
    flow.screen = 'workspace';
    flow.isDirty = false;
  };
  const wayIn = (go: () => void) => {
    if (asksBeforeReplacing(flow)) {
      flow.asking = go;
    } else {
      go();
    }
  };
  return Object.assign(flow, {
    edit() {
      flow.isDirty = true;
    },
    /** Open a zip, by card or drop, from the start screen or the list. */
    openZip() {
      wayIn(enterWork);
    },
    openList() {
      flow.screen = 'my-packs';
      push(screenState('my-packs', true));
    },
    askPackType() {
      flow.screen = 'pack-type';
      push(screenState('pack-type', true));
    },
    choosePackType() {
      wayIn(enterWork);
    },
    confirm() {
      const go = flow.asking;
      flow.asking = null;
      go?.();
    },
    cancel() {
      flow.asking = null;
    },
    startOver() {
      if (!flow.workId) return;
      flow.screen = 'start';
      push(startOverState(flow.workId));
    },
    backTo() {
      if (!flow.workId) return;
      if (returnToWork(entries[index], flow.workId) === 'history-back') {
        index -= 1;
        pop();
      } else {
        push(screenState('workspace', true, flow.workId));
        flow.screen = 'workspace';
      }
    },
    browserBack() {
      index -= 1;
      pop();
    },
    browserForward() {
      index += 1;
      pop();
    },
  });
}

describe('keeping the work behind the start screen', () => {
  it('Start over keeps clean work and asks nothing', () => {
    const flow = createFlow();
    flow.openZip();
    flow.startOver();
    expect(flow).toMatchObject({ screen: 'start', workId: 'w1' });
    expect(flow.asking).toBeNull();
    expect(flow.entries).toEqual([
      screenState('workspace', false, 'w1'),
      startOverState('w1'),
    ]);
  });

  it('Start over keeps unsaved work and asks nothing', () => {
    const flow = createFlow();
    flow.openZip();
    flow.edit();
    flow.startOver();
    expect(flow).toMatchObject({
      screen: 'start',
      workId: 'w1',
      isDirty: true,
    });
    expect(flow.asking).toBeNull();
  });

  it('Back to returns to the same work with one entry for it', () => {
    const flow = createFlow();
    flow.openZip();
    flow.edit();
    flow.startOver();
    flow.backTo();
    expect(flow).toMatchObject({
      screen: 'workspace',
      workId: 'w1',
      isDirty: true,
    });
    expect(flow.entries).toEqual([screenState('workspace', false, 'w1')]);
  });

  it('the browser Back after Start over returns to the work, and Forward leaves it again', () => {
    const flow = createFlow();
    flow.askPackType();
    flow.choosePackType();
    flow.startOver();
    flow.browserBack();
    expect(flow).toMatchObject({ screen: 'workspace', workId: 'w1' });
    flow.browserForward();
    expect(flow).toMatchObject({ screen: 'start', workId: 'w1' });
  });

  it('the browser Back from the workspace keeps the work, and Back to returns to it', () => {
    const flow = createFlow();
    flow.askPackType();
    flow.choosePackType();
    flow.edit();
    flow.browserBack();
    expect(flow).toMatchObject({
      screen: 'start',
      workId: 'w1',
      isDirty: true,
    });
    expect(flow.asking).toBeNull();
    flow.backTo();
    expect(flow.screen).toBe('workspace');
    expect(flow.entries).toEqual([
      screenState('start'),
      screenState('workspace', true, 'w1'),
    ]);
    expect(flow.ahead).toBe(0);
  });

  it('the list and the question go back to the start screen with the work kept', () => {
    const flow = createFlow();
    flow.openZip();
    flow.startOver();
    flow.openList();
    flow.browserBack();
    expect(flow).toMatchObject({ screen: 'start', workId: 'w1' });
    flow.askPackType();
    flow.browserBack();
    expect(flow).toMatchObject({ screen: 'start', workId: 'w1' });
    flow.backTo();
    expect(flow).toMatchObject({ screen: 'workspace', workId: 'w1' });
  });

  it('picking another way in replaces clean work without asking', () => {
    const flow = createFlow();
    flow.openZip();
    flow.startOver();
    flow.openZip();
    expect(flow.asking).toBeNull();
    expect(flow).toMatchObject({ screen: 'workspace', workId: 'w2' });
  });

  it('picking another way in asks over unsaved work, and replaces it once confirmed', () => {
    const flow = createFlow();
    flow.openZip();
    flow.edit();
    flow.startOver();
    flow.askPackType();
    flow.choosePackType();
    expect(flow.asking).not.toBeNull();
    expect(flow).toMatchObject({ screen: 'pack-type', workId: 'w1' });
    flow.confirm();
    expect(flow).toMatchObject({
      screen: 'workspace',
      workId: 'w2',
      isDirty: false,
    });
  });

  it('cancelling keeps the work and the screen', () => {
    const flow = createFlow();
    flow.openZip();
    flow.edit();
    flow.startOver();
    flow.openZip();
    flow.cancel();
    expect(flow).toMatchObject({
      screen: 'start',
      workId: 'w1',
      isDirty: true,
      asking: null,
    });
    flow.backTo();
    expect(flow).toMatchObject({ screen: 'workspace', workId: 'w1' });
  });

  it('after replacing the work, Back shows the start screen and Back to returns to the new work', () => {
    const flow = createFlow();
    flow.openZip();
    flow.startOver();
    flow.openList();
    // A library pack opens like a zip.
    flow.openZip();
    expect(flow.workId).toBe('w2');
    flow.browserBack();
    expect(flow).toMatchObject({ screen: 'start', workId: 'w2' });
    // Start over left this entry above the replaced work.
    flow.backTo();
    expect(flow).toMatchObject({ screen: 'workspace', workId: 'w2' });
    flow.browserBack();
    flow.browserBack();
    // The replaced work's entry stands for the start screen, and is still
    // the editor's first, so a reload stays on it.
    expect(flow).toMatchObject({ screen: 'start', workId: 'w2' });
    expect(flow.entries).toEqual([screenState('start')]);
    expect(backToStart(flow.entries[0])).toBe('replace');
  });

  it('Back onto the first work after Start over and a new pack stays in the editor on reload', () => {
    const flow = createFlow();
    flow.openZip();
    flow.startOver();
    flow.askPackType();
    flow.choosePackType();
    flow.browserBack();
    flow.browserBack();
    expect(flow).toMatchObject({ screen: 'start', workId: 'w2' });
    expect(flow.entries).toEqual([screenState('start')]);
    expect(backToStart(flow.entries[0])).toBe('replace');
  });

  it('a zip opened over the start screen of Start over takes its entry', () => {
    const flow = createFlow();
    flow.openZip();
    flow.startOver();
    flow.openZip();
    flow.browserBack();
    // The first work's entry was replaced, so Back lands on the start screen.
    expect(flow).toMatchObject({ screen: 'start', workId: 'w2' });
    expect(flow.entries).toEqual([screenState('start')]);
    flow.backTo();
    expect(flow).toMatchObject({ screen: 'workspace', workId: 'w2' });
  });
});

describe('backToStart', () => {
  it('steps back when the screen was opened from the start screen', () => {
    expect(backToStart(screenState('my-packs', true))).toBe('history-back');
  });

  it('steps back from a workspace entered from a screen opened there', () => {
    expect(backToStart(screenState('workspace', true))).toBe('history-back');
  });

  it('replaces the entry when the screen was reached directly', () => {
    expect(backToStart(screenState('my-packs'))).toBe('replace');
    expect(backToStart(null)).toBe('replace');
  });
});

describe('parseStartLink', () => {
  it('reads a pack to open, as the website links to it', () => {
    expect(parseStartLink('?open=mv-0123abcd')).toEqual({
      kind: 'open',
      packId: 'mv-0123abcd',
    });
    expect(parseStartLink('?open=a%26b%20c')).toEqual({
      kind: 'open',
      packId: 'a&b c',
    });
  });

  it('reads the list of library packs', () => {
    expect(parseStartLink('?start=my-packs')).toEqual({ kind: 'my-packs' });
  });

  it('opens the pack when the link names both', () => {
    expect(parseStartLink('?start=my-packs&open=abc')).toEqual({
      kind: 'open',
      packId: 'abc',
    });
  });

  it('ignores anything else', () => {
    expect(parseStartLink('')).toBeNull();
    expect(parseStartLink('?open=')).toBeNull();
    expect(parseStartLink('?open=%20%20')).toBeNull();
    expect(parseStartLink('?start=pack-type')).toBeNull();
    expect(parseStartLink('?utm_source=site')).toBeNull();
  });
});

describe('startLinkUrl', () => {
  it('points the editor at the library list', () => {
    expect(
      startLinkUrl('https://editor.mechvibes.com/', { kind: 'my-packs' }),
    ).toBe('https://editor.mechvibes.com/?start=my-packs');
  });

  it('points the editor at a pack, the way the website writes it', () => {
    expect(
      startLinkUrl('https://editor.mechvibes.com/', {
        kind: 'open',
        packId: 'a&b c',
      }),
    ).toBe('https://editor.mechvibes.com/?open=a%26b+c');
  });

  it('drops other parameters and the hash', () => {
    expect(
      startLinkUrl('http://localhost:5173/?open=abc&start=x#top', {
        kind: 'my-packs',
      }),
    ).toBe('http://localhost:5173/?start=my-packs');
  });

  it('reads back as the same link', () => {
    const link = { kind: 'open', packId: 'mv-1 2&3' } as const;
    const url = new URL(startLinkUrl('https://editor.mechvibes.com/', link));
    expect(parseStartLink(url.search)).toEqual(link);
  });
});

describe('findLinkedPack', () => {
  const pack = (fields: Partial<LibraryPackSummary>): LibraryPackSummary => ({
    id: 'mv-1',
    slug: 'blue',
    name: 'Blue',
    status: 'PUBLISHED',
    revision: 2,
    iconUrl: null,
    removedReason: null,
    updatedAt: '2026-10-30T13:20:00.000Z',
    ...fields,
  });

  it('finds a published pack of the visitor', () => {
    const blue = pack({});
    expect(findLinkedPack([pack({ id: 'mv-0' }), blue], 'mv-1')).toEqual({
      pack: blue,
    });
  });

  it('explains a pack that is not theirs', () => {
    expect(findLinkedPack([pack({})], 'mv-9')).toEqual({
      problem: `The pack in this link is not in your account on ${websiteHost}.`,
    });
  });

  it('explains a removed pack, with the reason when there is one', () => {
    expect(
      findLinkedPack(
        [pack({ status: 'REMOVED', removedReason: 'Copyright claim' })],
        'mv-1',
      ),
    ).toEqual({
      problem: `Blue was removed from ${websiteHost}: Copyright claim`,
    });
    expect(findLinkedPack([pack({ status: 'REMOVED' })], 'mv-1')).toEqual({
      problem: `Blue was removed from ${websiteHost}.`,
    });
  });

  it('explains a pack without a zip', () => {
    const problem = `Blue has no .zip yet. Add one on ${websiteHost}, then open it here.`;
    expect(
      findLinkedPack([pack({ status: 'DRAFT', revision: 0 })], 'mv-1'),
    ).toEqual({ problem });
    expect(findLinkedPack([pack({ revision: 0 })], 'mv-1')).toEqual({
      problem,
    });
  });
});

describe('withoutStartLink', () => {
  it('removes the start link only', () => {
    expect(
      withoutStartLink('https://editor.mechvibes.com/?open=abc&ref=site#top'),
    ).toBe('https://editor.mechvibes.com/?ref=site#top');
    expect(
      withoutStartLink('https://editor.mechvibes.com/?start=my-packs'),
    ).toBe('https://editor.mechvibes.com/');
  });
});
