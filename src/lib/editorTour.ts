import { type DriveStep, driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { markTourSeen, type TourFlow } from '@/lib/editorTourFlow';
import type { FileKind } from '@/lib/fileKinds';
import { MOD_LABEL } from '@/lib/utils';
import type { WorkspaceStage } from '@/lib/workspaceVisibility';

// A guided tour of the workspace: where each step happens and in what order.
// Help walks every step; the first time a pack is entered it opens by itself
// with the few steps for that way in. Steps point at elements marked with
// data-tour="…"; a step whose element is not on show is left out, so the
// tour follows what the pack has so far.

const target = (name: string) => `[data-tour="${name}"]`;

/** Shown for a pack opened from the library. */
const updateStep: DriveStep = {
  element: target('update'),
  popover: {
    title: 'Update',
    description:
      'Publishes your changes as the next revision of this pack in the library.',
  },
};

/** The ways to add the first sounds of a new pack. */
function newPackSteps(isMouse: boolean): DriveStep[] {
  return [
    {
      element: target('add-tiles'),
      popover: {
        title: 'Add your sounds',
        description: isMouse
          ? 'Pick what you have: one recording of your clicks, one file for each button, or a video. Each opens a file picker that fits it. Choose folder adds every sound in a folder.'
          : 'Pick what you have: one recording of your typing, one file for each key, or a video. Each opens a file picker that fits it. Choose folder adds every sound in a folder.',
      },
    },
    {
      element: target('drop'),
      popover: {
        title: 'Or drop them',
        description: `Drop audio or video files, or a folder of them, anywhere on the page. The ${isMouse ? 'buttons' : 'keys'} behind come alive once a file is in.`,
      },
    },
  ];
}

function tryItDescription(isMouse: boolean) {
  return isMouse
    ? 'Plays the pack while you click and scroll your own mouse, or tap the buttons on a touch screen.'
    : 'Plays the pack while you type on your own keyboard, or tap the keys on a touch screen.';
}

/** Where to hear, save and publish a pack that already makes sound. */
function openedPackSteps(
  isMouse: boolean,
  activeFileKind: FileKind | null,
): DriveStep[] {
  const noun = isMouse ? 'button' : 'key';
  return [
    {
      element: target('keyboard'),
      popover: {
        title: `The ${noun}s of the pack`,
        description: `A dot marks a ${noun} that has a sound, in the colour of its file. Select ${noun}s to give them a new sound ${activeFileKind === 'one' ? 'by clicking a sound in the list below' : 'from the waveform below'}.`,
      },
    },
    {
      element: target('try-it'),
      popover: { title: 'Try it', description: tryItDescription(isMouse) },
    },
    {
      element: target('download'),
      popover: {
        title: 'Download .zip',
        description:
          'Saves the pack as a .zip. Install it in the Mechvibes app, or create a pack from it on the website to share it.',
      },
    },
    updateStep,
  ];
}

/** The step on the open file: the list gives a file of one sound, the waveform cuts one of many. */
function soundStep(
  stage: WorkspaceStage,
  isMouse: boolean,
  activeFileKind: FileKind | null,
): DriveStep {
  const noun = isMouse ? 'button' : 'key';
  const later =
    stage === 'has-sounds'
      ? ''
      : ` Try it and Download .zip show up once a ${noun} has a sound.`;
  if (activeFileKind === 'one') {
    return {
      element: target('sound'),
      popover: {
        title: `3. Give ${noun}s a sound`,
        description: `Select ${noun}s, then click a sound in the list to give it to them, or drag a sound onto a ${noun}. Click another sound to hear the change. A file with several sounds? Choose This file has several sounds in its ... menu to cut them on a waveform.${later}`,
      },
    };
  }
  return {
    element: target('sound'),
    popover: {
      title: '3. Cut the sound',
      description: `The waveform of the chosen file. Drag over one ${isMouse ? 'click' : 'keystroke'}, press Test to hear it, then Apply to give it to the selected ${noun}s. Once a ${noun} has a sound, switch to Release for the sound it makes when it comes up.${later}`,
    },
  };
}

function allSteps(
  signedIn: boolean,
  stage: WorkspaceStage,
  isMouse: boolean,
  activeFileKind: FileKind | null,
): DriveStep[] {
  const noun = isMouse ? 'button' : 'key';
  return [
    {
      popover: {
        title: 'Welcome to the Mechvibes Editor',
        description:
          'Make a sound pack from a recording of your own keyboard or mouse. This short tour shows where each step happens.',
      },
    },
    {
      element: target('add-sounds'),
      popover: {
        title: '1. Add your sounds',
        description: `Pick what you have: one recording, one file for each ${noun}, or a video. Choose folder adds every sound in a folder. You can also drop files or a folder anywhere on the page. The ${noun}s behind come alive once a file is in.`,
      },
    },
    {
      element: target('sources'),
      popover: {
        title: '1. Your sounds',
        description: `The files of the pack. Add more when ${noun}s need sounds from different recordings, or drop them anywhere on the page.`,
      },
    },
    {
      element: target('pack-type'),
      popover: {
        title: 'Keyboard or mouse',
        description: isMouse
          ? 'What the pack is for. Open it to switch: a keyboard pack shows the keys instead of the mouse buttons and wheel.'
          : 'What the pack is for. Open it to switch: a mouse pack shows the mouse buttons and wheel instead of keys.',
      },
    },
    {
      element: target('keyboard'),
      popover: {
        title: `2. Pick ${noun}s`,
        // The mouse drawing has no box to drag across.
        description: `Click a ${noun} to select it and click it again to deselect it. ${isMouse ? '' : 'Drag across keys to select several, '}Shift+click to select a range, or ${MOD_LABEL}+click to add or remove one. Delete clears the sound of the selected ${noun}s. A dot marks a ${noun} that already has a sound, in the colour of its file.`,
      },
    },
    soundStep(stage, isMouse, activeFileKind),
    {
      element: target('key-card'),
      popover: {
        title: `The selected ${noun}`,
        description: `The sound of the ${noun} you selected: play it, give it another file, or remove it. Swap press and release in its ... menu.`,
      },
    },
    {
      element: target('try-it'),
      popover: { title: '4. Try it', description: tryItDescription(isMouse) },
    },
    {
      element: target('pack-details'),
      popover: {
        title: 'Pack details',
        description:
          'Name the pack, and add an author, tags, an icon and a starting volume.',
      },
    },
    {
      element: target('download'),
      popover: {
        title: '5. Download .zip',
        description:
          'Saves the pack as a .zip. Install it in the Mechvibes app, or create a pack from it on the website to share it.',
      },
    },
    updateStep,
    {
      element: target('start-over'),
      popover: {
        title: 'Start over',
        description:
          'Go back to the first screen to open a pack file, open one of your packs or make a new one. Your work waits there behind Back to, and it asks first if another pack would replace changes you have not downloaded. To open a pack file, you can also drop its .zip anywhere on the page.',
      },
    },
    {
      element: target('help'),
      popover: {
        title: 'Help',
        description: `Take this tour again, or see the keyboard shortcuts for selecting ${noun}s.`,
      },
    },
    {
      element: target('account'),
      popover: {
        title: 'Your packs in the library',
        description: signedIn
          ? 'My packs opens the packs you published. Change one here, then press Update to publish the new version.'
          : 'Sign in with your Mechvibes account to open the packs you published and publish changes with Update.',
      },
    },
  ];
}

// On the page, laid out, and not inside a part that is put away.
function isOnShow(selector: string) {
  const element = document.querySelector(selector);
  return (
    element !== null &&
    element.getClientRects().length > 0 &&
    element.closest('[inert], [data-hidden="true"]') === null
  );
}

function buildSteps(
  flow: TourFlow,
  signedIn: boolean,
  stage: WorkspaceStage,
  isMouse: boolean,
  activeFileKind: FileKind | null,
) {
  switch (flow) {
    case 'new-pack':
      return newPackSteps(isMouse);
    case 'opened-pack':
      return openedPackSteps(isMouse, activeFileKind);
    default:
      return allSteps(signedIn, stage, isMouse, activeFileKind);
  }
}

/**
 * Start the tour, for how far the pack has come and the kind of the open
 * file. It counts as seen as soon as it opens: driver.js skips its destroy
 * callback when the tour closes mid-animation, so marking it on close would
 * bring it back.
 */
export function startEditorTour({
  flow = 'all',
  signedIn,
  stage,
  isMouse,
  activeFileKind = null,
}: {
  flow?: TourFlow;
  signedIn: boolean;
  stage: WorkspaceStage;
  isMouse: boolean;
  activeFileKind?: FileKind | null;
}) {
  const steps = buildSteps(
    flow,
    signedIn,
    stage,
    isMouse,
    activeFileKind,
  ).filter(
    (step) => typeof step.element !== 'string' || isOnShow(step.element),
  );
  if (steps.length === 0) return null;
  const tour = driver({
    steps,
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    popoverClass: 'editor-tour',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 8,
    smoothScroll: true,
  });
  tour.drive();
  markTourSeen();
  return tour;
}
