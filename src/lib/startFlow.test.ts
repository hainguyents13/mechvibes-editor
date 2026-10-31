import { describe, expect, it } from 'vitest';
import { websiteHost } from '@/config/siteIdentity';
import {
  backToStart,
  findLinkedPack,
  parseStartLink,
  readScreenState,
  resolvePopState,
  screenState,
  startLinkUrl,
  withoutStartLink,
} from '@/lib/startFlow';
import type { LibraryPackSummary } from '@/lib/websiteApi';

const clean = { hasUnsavedChanges: false, isBusy: false };
const unsaved = { hasUnsavedChanges: true, isBusy: false };
const busy = { hasUnsavedChanges: false, isBusy: true };

describe('readScreenState', () => {
  it('reads what screenState writes', () => {
    expect(readScreenState(screenState('pack-type', true))).toEqual({
      editorScreen: 'pack-type',
      pushed: true,
    });
    expect(readScreenState(screenState('workspace'))).toEqual({
      editorScreen: 'workspace',
      pushed: false,
    });
  });

  it('ignores entries the editor did not write', () => {
    expect(readScreenState(null)).toBeNull();
    expect(readScreenState('start')).toBeNull();
    expect(readScreenState({ editorScreen: 'review' })).toBeNull();
    expect(readScreenState({ key: 'abc' })).toBeNull();
  });
});

describe('resolvePopState', () => {
  it('moves between the screens before the workspace', () => {
    expect(resolvePopState('pack-type', screenState('start'), clean)).toEqual({
      kind: 'show',
      screen: 'start',
    });
    expect(
      resolvePopState('start', screenState('my-packs', true), clean),
    ).toEqual({ kind: 'show', screen: 'my-packs' });
  });

  it('treats an entry from before the editor as the start screen', () => {
    expect(resolvePopState('my-packs', null, clean)).toEqual({
      kind: 'show',
      screen: 'start',
    });
  });

  it('leaves a workspace with nothing to lose', () => {
    expect(resolvePopState('workspace', screenState('start'), clean)).toEqual({
      kind: 'show',
      screen: 'start',
    });
  });

  it('asks before leaving a workspace with unsaved changes', () => {
    expect(resolvePopState('workspace', screenState('start'), unsaved)).toEqual(
      { kind: 'return-to-workspace', confirm: true },
    );
  });

  it('keeps the workspace while it saves or opens something', () => {
    expect(resolvePopState('workspace', screenState('start'), busy)).toEqual({
      kind: 'return-to-workspace',
      confirm: false,
    });
  });

  it('does not go forward into a workspace that was left', () => {
    expect(resolvePopState('start', screenState('workspace'), clean)).toEqual({
      kind: 'stay',
    });
  });

  it('stays when the entry is the workspace already shown', () => {
    expect(
      resolvePopState('workspace', screenState('workspace'), unsaved),
    ).toEqual({ kind: 'stay' });
  });
});

describe('backToStart', () => {
  it('steps back when the screen was opened from the start screen', () => {
    expect(backToStart(screenState('my-packs', true))).toBe('history-back');
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
