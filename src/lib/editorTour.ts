import { type DriveStep, driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { markTourSeen, type TourFlow } from '@/lib/editorTourFlow';
import { MOD_LABEL } from '@/lib/utils';
import type { WorkspaceStage } from '@/lib/workspaceVisibility';

// A guided tour of the workspace: where each step happens and in what order.
// Help walks every step; the first time a pack is entered it opens by itself
// with the few steps for that way in. Steps point at elements marked with
// data-tour="…"; a step whose element is not on show is left out, so the
// tour follows what the pack has so far.

const target = (name: string) => `[data-tour="${name}"]`;

/** The ways to add the first sounds of a new pack. */
function newPackSteps(isMouse: boolean): DriveStep[] {
  return [
    {
      element: target('add-tiles'),
      popover: {
        title: 'Add your sounds',
        description: isMouse
          ? 'Pick what you have: one recording of your clicks, one file for each button, or a video. Each opens a file picker that fits it.'
          : 'Pick what you have: one recording of your typing, one file for each key, or a video. Each opens a file picker that fits it.',
      },
    },
    {
      element: target('drop'),
      popover: {
        title: 'Or drop them',
        description: `Drop audio or video files anywhere on the page. The ${isMouse ? 'buttons' : 'keys'} behind come alive once a file is in.`,
      },
    },
  ];
}

/** Where to hear, save and publish a pack that already makes sound. */
function openedPackSteps(isMouse: boolean): DriveStep[] {
  const noun = isMouse ? 'button' : 'key';
  return [
    {
      element: target('keyboard'),
      popover: {
        title: `The ${noun}s of the pack`,
        description: `A dot marks a ${noun} that has a sound, in the colour of its file. Select ${noun}s to give them a new sound from the waveform below.`,
      },
    },
    {
      element: target('try-it'),
      popover: {
        title: 'Try it',
        description: isMouse
          ? 'Plays the pack while you click and scroll your own mouse, or tap the buttons on a touch screen.'
          : 'Plays the pack while you type on your own keyboard, or tap the keys on a touch screen.',
      },
    },
    {
      element: target('download'),
      popover: {
        title: 'Download .zip',
        description:
          'Saves the pack as a .zip. Install it in the Mechvibes app, or create a pack from it on the website to share it.',
      },
    },
    {
      element: target('update'),
      popover: {
        title: 'Update',
        description:
          'Publishes your changes as the next revision of this pack in the library.',
      },
    },
  ];
}

function allSteps(signedIn: boolean, stage: WorkspaceStage): DriveStep[] {
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
        description:
          'Pick what you have: one recording, one file for each key, or a video. You can also drop files anywhere on the page. The keys behind come alive once a file is in.',
      },
    },
    {
      element: target('sources'),
      popover: {
        title: '1. Your sounds',
        description:
          'The files of the pack. Add more when keys need sounds from different recordings, or drop them anywhere on the page.',
      },
    },
    {
      element: target('pack-type'),
      popover: {
        title: 'Keyboard or mouse',
        description:
          'What the pack is for. Open it to switch: a mouse pack shows the mouse buttons and wheel instead of keys.',
      },
    },
    {
      element: target('keyboard'),
      popover: {
        title: '2. Pick keys',
        description: `Click a key to select it and click it again to deselect it. Drag across keys to select several, Shift+click to select a range, or ${MOD_LABEL}+click to add or remove one. Delete clears the sound of the selected keys. A dot marks a key that already has a sound, in the colour of its file.`,
      },
    },
    {
      element: target('sound'),
      popover: {
        title: '3. Cut the sound',
        description: `The waveform of the chosen file. Drag over one keystroke, press Test to hear it, then Apply to give it to the selected keys. Once a key has a sound, switch to Release for the sound it makes when it comes up.${stage === 'has-sounds' ? '' : ' Try it and Download .zip show up once a key has a sound.'}`,
      },
    },
    {
      element: target('try-it'),
      popover: {
        title: '4. Try it',
        description:
          'Plays the pack while you type on your own keyboard, or tap the keys on a touch screen.',
      },
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
    {
      element: target('start-over'),
      popover: {
        title: 'Start over',
        description:
          'Go back to the first screen to open a pack file, open one of your packs or make a new one. It asks first when you have changes you have not downloaded. To open a pack file, you can also drop its .zip anywhere on the page.',
      },
    },
    {
      element: target('help'),
      popover: {
        title: 'Help',
        description:
          'Take this tour again, or see the keyboard shortcuts for selecting keys.',
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
) {
  switch (flow) {
    case 'new-pack':
      return newPackSteps(isMouse);
    case 'opened-pack':
      return openedPackSteps(isMouse);
    default:
      return allSteps(signedIn, stage);
  }
}

/**
 * Start the tour, for how far the pack has come. It counts as seen as soon
 * as it opens: driver.js skips its destroy callback when the tour closes
 * mid-animation, so marking it on close would bring it back.
 */
export function startEditorTour({
  flow = 'all',
  signedIn,
  stage,
  isMouse,
}: {
  flow?: TourFlow;
  signedIn: boolean;
  stage: WorkspaceStage;
  isMouse: boolean;
}) {
  const steps = buildSteps(flow, signedIn, stage, isMouse).filter(
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
