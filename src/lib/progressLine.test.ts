import { describe, expect, it } from 'vitest';
import { getProgressItems, type ProgressFacts } from '@/lib/progressLine';

function facts(overrides: Partial<ProgressFacts> = {}): ProgressFacts {
  return {
    stage: 'has-sounds',
    withSound: 20,
    drawn: 104,
    isMousePack: false,
    hasTriedIt: false,
    canTryIt: true,
    library: false,
    isSaved: false,
    ...overrides,
  };
}

const byId = (f: ProgressFacts) =>
  Object.fromEntries(getProgressItems(f).map((item) => [item.id, item]));

describe('getProgressItems', () => {
  it('shows nothing before the pack has a file (A)', () => {
    expect(
      getProgressItems(facts({ stage: 'no-files', withSound: 0 })),
    ).toEqual([]);
  });

  it('marks the files added and waits on a sound for the rest (B)', () => {
    expect(
      getProgressItems(facts({ stage: 'no-sounds', withSound: 0 })),
    ).toEqual([
      { id: 'sounds', label: 'Sounds added', state: 'done' },
      { id: 'count', label: '0 of 104 keys have a sound', state: 'count' },
      {
        id: 'try-it',
        label: 'Try it',
        state: 'not-yet',
        title: 'Once a key has a sound',
      },
      {
        id: 'save',
        label: 'Download .zip',
        state: 'not-yet',
        title: 'Once a key has a sound',
      },
    ]);
  });

  it('lists the four items in order once a key has a sound (C)', () => {
    expect(getProgressItems(facts())).toEqual([
      { id: 'sounds', label: 'Sounds added', state: 'done' },
      { id: 'count', label: '20 of 104 keys have a sound', state: 'count' },
      { id: 'try-it', label: 'Try it', state: 'todo' },
      { id: 'save', label: 'Download .zip', state: 'todo' },
    ]);
  });

  it('says has for one key and have for more, and never marks the count done', () => {
    expect(byId(facts({ withSound: 1 })).count).toEqual({
      id: 'count',
      label: '1 of 104 keys has a sound',
      state: 'count',
    });
    expect(byId(facts({ withSound: 104 })).count.label).toBe(
      '104 of 104 keys have a sound',
    );
    expect(byId(facts({ withSound: 104 })).count.state).toBe('count');
    expect(byId(facts({ withSound: 3, drawn: 84 })).count.label).toBe(
      '3 of 84 keys have a sound',
    );
  });

  it('names buttons in a mouse pack', () => {
    const mouse = byId(facts({ isMousePack: true, withSound: 2, drawn: 10 }));
    expect(mouse.count.label).toBe('2 of 10 buttons have a sound');
    expect(
      byId(facts({ isMousePack: true, withSound: 1, drawn: 10 })).count.label,
    ).toBe('1 of 10 buttons has a sound');
    const mouseB = byId(
      facts({ isMousePack: true, stage: 'no-sounds', withSound: 0, drawn: 10 }),
    );
    expect(mouseB['try-it'].title).toBe('Once a button has a sound');
  });

  it('marks Try it once tried, and waits when the browser cannot play the sounds', () => {
    expect(byId(facts({ hasTriedIt: true }))['try-it'].state).toBe('done');
    expect(byId(facts({ canTryIt: false }))['try-it']).toEqual({
      id: 'try-it',
      label: 'Try it',
      state: 'not-yet',
      title: 'This browser cannot play the sounds of these keys',
    });
    // Tried before the sounds became unplayable: still tried.
    expect(
      byId(facts({ hasTriedIt: true, canTryIt: false }))['try-it'].state,
    ).toBe('done');
    // Back in B the line waits on a sound again, tried or not.
    expect(
      byId(facts({ stage: 'no-sounds', withSound: 0, hasTriedIt: true }))[
        'try-it'
      ].state,
    ).toBe('not-yet');
  });

  it('marks Download .zip only while the pack is unchanged since it', () => {
    expect(byId(facts({ isSaved: true })).save).toEqual({
      id: 'save',
      label: 'Download .zip',
      state: 'done',
    });
    expect(byId(facts({ isSaved: false })).save.state).toBe('todo');
  });

  it('saves a library pack with Update, marked while unchanged since the last publish', () => {
    expect(byId(facts({ library: true, isSaved: true })).save).toEqual({
      id: 'save',
      label: 'Update',
      title: 'Publish to mechvibes.com',
      state: 'done',
    });
    expect(byId(facts({ library: true, isSaved: false })).save.state).toBe(
      'todo',
    );
    expect(
      byId(facts({ library: true, stage: 'no-sounds', withSound: 0 })).save,
    ).toEqual({
      id: 'save',
      label: 'Update',
      state: 'not-yet',
      title: 'Once a key has a sound',
    });
  });
});
