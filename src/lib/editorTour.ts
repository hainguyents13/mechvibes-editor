import { type DriveStep, driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { MOD_LABEL } from '@/lib/utils';
import type { WorkspaceStage } from '@/lib/workspaceVisibility';

// A guided tour of the workspace: where each step happens and in what order.
// It opens only from the Help menu. Steps point at elements marked with
// data-tour="…"; a step whose element is not on show is left out, so the
// tour follows what the pack has so far.

const target = (name: string) => `[data-tour="${name}"]`;

function buildSteps(signedIn: boolean, stage: WorkspaceStage): DriveStep[] {
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

/** Start the tour, for how far the pack has come. */
export function startEditorTour({
  signedIn,
  stage,
}: {
  signedIn: boolean;
  stage: WorkspaceStage;
}) {
  const steps = buildSteps(signedIn, stage).filter(
    (step) => typeof step.element !== 'string' || isOnShow(step.element),
  );
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
  return tour;
}
