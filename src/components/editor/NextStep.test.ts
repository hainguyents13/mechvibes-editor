import { describe, expect, it } from 'vitest';
import { nextStepText } from '@/components/editor/NextStep';

describe('nextStepText', () => {
  it('keeps the keyboard lines of a keyboard pack', () => {
    const keyboard = { packType: 'Keyboard', isTouch: false } as const;
    expect(nextStepText({ ...keyboard, stage: 'no-files' })).toBe(
      'add your sounds.',
    );
    expect(nextStepText({ ...keyboard, stage: 'no-sounds' })).toBe(
      'pick a sound on the waveform, select keys, then apply.',
    );
    expect(nextStepText({ ...keyboard, stage: 'has-sounds' })).toBe(
      'keep giving keys a sound, or press Try it and type.',
    );
  });

  it('names buttons and clicking in a mouse pack, where typing plays nothing', () => {
    const mouse = { packType: 'Mouse', isTouch: false } as const;
    expect(nextStepText({ ...mouse, stage: 'no-files' })).toBe(
      'add your sounds.',
    );
    expect(nextStepText({ ...mouse, stage: 'no-sounds' })).toBe(
      'pick a sound on the waveform, select buttons, then apply.',
    );
    expect(nextStepText({ ...mouse, stage: 'has-sounds' })).toBe(
      'keep giving buttons a sound, or press Try it and click.',
    );
  });

  it('says to click a sound in the list when the open file is one sound', () => {
    const one = {
      packType: 'Keyboard',
      isTouch: false,
      activeFileKind: 'one',
    } as const;
    expect(nextStepText({ ...one, stage: 'no-sounds' })).toBe(
      'select keys, then click a sound to give it to them.',
    );
    expect(nextStepText({ ...one, stage: 'no-sounds', selectedCount: 3 })).toBe(
      'click a sound to give it to the 3 selected keys.',
    );
    expect(
      nextStepText({ ...one, stage: 'has-sounds', selectedCount: 1 }),
    ).toBe('click a sound to give it to the selected key.');
    // With nothing selected, a pack that already sounds points at Try it.
    expect(nextStepText({ ...one, stage: 'has-sounds' })).toBe(
      'keep giving keys a sound, or press Try it and type.',
    );
    expect(
      nextStepText({ ...one, packType: 'Mouse', stage: 'no-sounds' }),
    ).toBe('select buttons, then click a sound to give it to them.');
    expect(
      nextStepText({
        ...one,
        packType: 'Mouse',
        stage: 'no-sounds',
        selectedCount: 2,
      }),
    ).toBe('click a sound to give it to the 2 selected buttons.');
  });

  it('keeps the waveform line for a file of many sounds', () => {
    expect(
      nextStepText({
        stage: 'no-sounds',
        packType: 'Keyboard',
        isTouch: false,
        activeFileKind: 'many',
        selectedCount: 2,
      }),
    ).toBe('pick a sound on the waveform, select keys, then apply.');
  });

  it('says to tap on a touch screen', () => {
    expect(
      nextStepText({
        stage: 'has-sounds',
        packType: 'Keyboard',
        isTouch: true,
      }),
    ).toBe('keep giving keys a sound, or press Try it and tap the keys.');
    expect(
      nextStepText({ stage: 'has-sounds', packType: 'Mouse', isTouch: true }),
    ).toBe('keep giving buttons a sound, or press Try it and tap the buttons.');
  });
});

describe('nextStepText for the one selected key', () => {
  const many = {
    stage: 'has-sounds',
    packType: 'Keyboard',
    isTouch: false,
    activeFileKind: 'many',
    selectedCount: 1,
  } as const;

  it('says to cut the press out of a whole file, as after Split it', () => {
    expect(nextStepText({ ...many, selectedKeyFile: 'whole' })).toBe(
      'drag over the press on the waveform and apply it, then switch to Release.',
    );
  });

  it('says to cut a sound for the key from another file', () => {
    expect(nextStepText({ ...many, selectedKeyFile: 'other' })).toBe(
      'drag over a sound on the waveform and apply it to the selected key.',
    );
    expect(
      nextStepText({ ...many, packType: 'Mouse', selectedKeyFile: 'other' }),
    ).toBe(
      'drag over a sound on the waveform and apply it to the selected button.',
    );
  });

  it('keeps the usual line for several keys, or a file of one sound', () => {
    expect(
      nextStepText({ ...many, selectedCount: 2, selectedKeyFile: 'whole' }),
    ).toBe('keep giving keys a sound, or press Try it and type.');
    expect(
      nextStepText({
        ...many,
        activeFileKind: 'one',
        selectedKeyFile: 'whole',
      }),
    ).toBe('click a sound to give it to the selected key.');
  });
});
