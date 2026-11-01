import { describe, expect, it } from 'vitest';
import {
  countDrawnKeys,
  getVisibility,
  type WorkspaceFacts,
} from '@/lib/workspaceVisibility';
import type { KeySound, KeySounds } from '@/utils/soundPack';

const press = (source = 's1'): KeySound => ({ source, press: [0, 100] });
const withRelease = (source = 's1'): KeySound => ({
  source,
  press: [0, 100],
  release: [100, 200],
});

function facts(overrides: Partial<WorkspaceFacts> = {}): WorkspaceFacts {
  return {
    sourceCount: 0,
    keySounds: new Map(),
    packType: 'Keyboard',
    isLibraryPack: false,
    isSignedIn: false,
    selectedCodes: [],
    activeFileKind: null,
    ...overrides,
  };
}

const sounds = (entries: [string, KeySound][]): KeySounds => new Map(entries);

describe('getVisibility', () => {
  it('shows only the ways to add sounds before any file (A)', () => {
    const v = getVisibility(facts());
    expect(v.stage).toBe('no-files');
    expect(v.addTiles).toBe(true);
    expect(v.fadedKeyboard).toBe(true);
    expect(v.soundPanel).toBe(false);
    expect(v.keyboardSize).toBe(false);
    expect(v.keyGroups).toBe(false);
    expect(v.legend).toBe(false);
    expect(v.releaseLegend).toBe(false);
    expect(v.tryIt).toBe(false);
    expect(v.download).toBe(false);
    expect(v.pressReleaseToggle).toBe(false);
    expect(v.waveform).toBe(false);
    expect(v.oneSoundPane).toBe(false);
  });

  it('shows the files and the waveform once a file is added (B)', () => {
    const v = getVisibility(facts({ sourceCount: 1, activeFileKind: 'many' }));
    expect(v.stage).toBe('no-sounds');
    expect(v.addTiles).toBe(false);
    expect(v.fadedKeyboard).toBe(false);
    expect(v.soundPanel).toBe(true);
    expect(v.waveform).toBe(true);
    expect(v.oneSoundPane).toBe(false);
    expect(v.keyboardSize).toBe(true);
    expect(v.keyGroups).toBe(true);
    expect(v.legend).toBe(true);
    expect(v.releaseLegend).toBe(false);
    expect(v.tryIt).toBe(false);
    expect(v.download).toBe(false);
  });

  it('offers trying and saving once a key has a sound (C)', () => {
    const v = getVisibility(
      facts({ sourceCount: 1, keySounds: sounds([['KeyA', press()]]) }),
    );
    expect(v.stage).toBe('has-sounds');
    expect(v.soundPanel).toBe(true);
    expect(v.legend).toBe(true);
    expect(v.tryIt).toBe(true);
    expect(v.download).toBe(true);
    expect(v.updateOnline).toBe(false);
  });

  it('counts only sounds the pack type plays', () => {
    // A keyboard pack that kept mouse sounds after a switch has no key sound yet.
    const keyboard = getVisibility(
      facts({ sourceCount: 1, keySounds: sounds([['MouseLeft', press()]]) }),
    );
    expect(keyboard.stage).toBe('no-sounds');
    expect(keyboard.tryIt).toBe(false);

    const mouse = getVisibility(
      facts({
        sourceCount: 1,
        packType: 'Mouse',
        keySounds: sounds([['MouseLeft', press()]]),
      }),
    );
    expect(mouse.stage).toBe('has-sounds');
  });

  it('adds Update online for a library pack while signed in (+L)', () => {
    const pack = facts({
      sourceCount: 1,
      keySounds: sounds([['KeyA', press()]]),
      isLibraryPack: true,
      isSignedIn: true,
    });
    expect(getVisibility(pack).library).toBe(true);
    expect(getVisibility(pack).updateOnline).toBe(true);
    expect(getVisibility(pack).stage).toBe('has-sounds');

    const signedOut = getVisibility({ ...pack, isSignedIn: false });
    expect(signedOut.library).toBe(false);
    expect(signedOut.updateOnline).toBe(false);

    const ownFile = getVisibility({ ...pack, isLibraryPack: false });
    expect(ownFile.updateOnline).toBe(false);
  });

  it('hides the keyboard size and the key groups in a mouse pack', () => {
    for (const sourceCount of [0, 1]) {
      const v = getVisibility(facts({ sourceCount, packType: 'Mouse' }));
      expect(v.keyboardSize).toBe(false);
      expect(v.keyGroups).toBe(false);
    }
    const withSound = getVisibility(
      facts({
        sourceCount: 1,
        packType: 'Mouse',
        keySounds: sounds([['MouseLeft', press()]]),
      }),
    );
    expect(withSound.keyboardSize).toBe(false);
    expect(withSound.keyGroups).toBe(false);
    expect(withSound.legend).toBe(true);
  });

  it('names Release sound in the legend only once a key has one', () => {
    const without = getVisibility(
      facts({ sourceCount: 1, keySounds: sounds([['KeyA', press()]]) }),
    );
    expect(without.releaseLegend).toBe(false);

    const withOne = getVisibility(
      facts({
        sourceCount: 1,
        keySounds: sounds([
          ['KeyA', press()],
          ['KeyB', withRelease()],
        ]),
      }),
    );
    expect(withOne.releaseLegend).toBe(true);

    // A release on a sound the pack type does not play marks no key.
    const otherKind = getVisibility(
      facts({
        sourceCount: 1,
        keySounds: sounds([
          ['KeyA', press()],
          ['MouseLeft', withRelease()],
        ]),
      }),
    );
    expect(otherKind.releaseLegend).toBe(false);
  });

  it('shows Press / Release once a selected key has a press sound', () => {
    const keySounds = sounds([['KeyA', press()]]);
    const open = { sourceCount: 1, keySounds, activeFileKind: 'many' } as const;
    const none = getVisibility(facts(open));
    expect(none.pressReleaseToggle).toBe(false);

    const silentKey = getVisibility(
      facts({ ...open, selectedCodes: ['KeyB'] }),
    );
    expect(silentKey.pressReleaseToggle).toBe(false);

    const mixed = getVisibility(
      facts({ ...open, selectedCodes: ['KeyB', 'KeyA'] }),
    );
    expect(mixed.pressReleaseToggle).toBe(true);
  });

  it('shows the waveform for a file of many sounds and the pane for one sound', () => {
    const keySounds = sounds([['KeyA', press()]]);
    const selected = { sourceCount: 1, keySounds, selectedCodes: ['KeyA'] };

    const many = getVisibility(facts({ ...selected, activeFileKind: 'many' }));
    expect(many.waveform).toBe(true);
    expect(many.oneSoundPane).toBe(false);

    // A file of one sound plays whole: no waveform, so no Press / Release.
    const one = getVisibility(facts({ ...selected, activeFileKind: 'one' }));
    expect(one.waveform).toBe(false);
    expect(one.oneSoundPane).toBe(true);
    expect(one.pressReleaseToggle).toBe(false);
    expect(one.soundPanel).toBe(true);
    expect(one.legend).toBe(true);
    expect(one.keyGroups).toBe(true);
    expect(one.tryIt).toBe(true);

    const noFileOpen = getVisibility(
      facts({ ...selected, activeFileKind: null }),
    );
    expect(noFileOpen.waveform).toBe(false);
    expect(noFileOpen.oneSoundPane).toBe(false);
    expect(noFileOpen.pressReleaseToggle).toBe(false);
  });

  it('goes back to A when the last file goes', () => {
    // Undo of the first Add leaves no file; the keys lost theirs with it.
    const v = getVisibility(facts({ sourceCount: 0 }));
    expect(v.stage).toBe('no-files');
    expect(v.addTiles).toBe(true);
  });
});

describe('countDrawnKeys', () => {
  it('counts drawn keys with a sound and the silent rest', () => {
    const drawn = new Set(['KeyA', 'KeyB', 'KeyC', 'Space']);
    const keySounds = sounds([
      ['KeyA', press()],
      ['Space', withRelease()],
      // Not drawn on this layout: the hidden-keys tray lists it instead.
      ['Numpad1', press()],
    ]);
    expect(countDrawnKeys(keySounds, drawn)).toEqual({
      withSound: 2,
      silent: 2,
    });
  });

  it('calls every key silent in an empty pack', () => {
    expect(countDrawnKeys(new Map(), new Set(['KeyA', 'KeyB']))).toEqual({
      withSound: 0,
      silent: 2,
    });
  });
});
