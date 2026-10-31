import { type DriveStep, driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { MOD_LABEL } from '@/lib/utils';

// A guided tour of the workspace: where each step happens and in what order.
// It opens only from the navbar. Steps point at elements marked with
// data-tour="…"; a step whose element is not on the page is left out.

const target = (name: string) => `[data-tour="${name}"]`;

function buildSteps(signedIn: boolean): DriveStep[] {
  return [
    {
      popover: {
        title: 'Welcome to the Mechvibes Editor',
        description:
          'Make a sound pack from a recording of your own keyboard or mouse. This short tour shows where each step happens.',
      },
    },
    {
      element: target('sources'),
      popover: {
        title: '1. Add a recording',
        description:
          'Drop an audio or video file of your keyboard here. Add more files when keys need sounds from different recordings.',
      },
    },
    {
      element: target('pack-type'),
      popover: {
        title: 'Keyboard or mouse',
        description:
          'Choose what the pack is for. A mouse pack shows the mouse buttons and wheel instead of keys.',
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
        description:
          'Once a file is added, its waveform shows here. Drag over one keystroke, press Test to hear it, then Apply to give it to the selected keys. Switch to Release for the sound a key makes when it comes up.',
      },
    },
    {
      element: target('preview'),
      popover: {
        title: '4. Try it',
        description:
          'Preview plays the pack while you type on your own keyboard. It turns on once a key has a sound.',
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
      element: target('export'),
      popover: {
        title: '5. Export',
        description:
          'Download the pack as a zip. Install it in the Mechvibes app, or create a pack from it on the website to share it.',
      },
    },
    {
      element: target('start-over'),
      popover: {
        title: 'Start over',
        description:
          'Go back to the first screen to open a pack file, open one of your packs or make a new one. It asks first when you have changes you have not exported. To open a pack file, you can also drop its .zip anywhere on the page.',
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

/** Start the tour. */
export function startEditorTour({ signedIn }: { signedIn: boolean }) {
  const steps = buildSteps(signedIn).filter(
    (step) =>
      typeof step.element !== 'string' ||
      document.querySelector(step.element) !== null,
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
