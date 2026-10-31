import { describe, expect, it } from 'vitest';
import {
  backToStart,
  myPacksStartUrl,
  readScreenState,
  resolvePopState,
  screenState,
} from '@/lib/startFlow';

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

describe('myPacksStartUrl', () => {
  it('points the editor at the library list', () => {
    expect(myPacksStartUrl('https://editor.mechvibes.com/')).toBe(
      'https://editor.mechvibes.com/?start=my-packs',
    );
  });

  it('drops other parameters and the hash', () => {
    expect(myPacksStartUrl('http://localhost:5173/?open=abc&start=x#top')).toBe(
      'http://localhost:5173/?start=my-packs',
    );
  });
});
