import { type DriveStep, driver } from 'driver.js';
import 'driver.js/dist/driver.css';

// A guided tour of the editor: where to start and in what order. Steps point
// at elements marked with data-tour="…"; a step whose element is not on the
// page is left out.

const SEEN_STORAGE_KEY = 'mechvibes-editor:tour-seen';

/** Whether this browser has seen the tour. Unreadable storage counts as seen, so the tour never repeats on every visit. */
export function hasSeenEditorTour() {
  try {
    return localStorage.getItem(SEEN_STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

function markEditorTourSeen() {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, '1');
  } catch {
    // Storage is unavailable; the tour can still be opened from the navbar.
  }
}

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
        description:
          'Click a key to select it, drag across keys to select several, or Ctrl+click to add one. A dot marks a key that already has a sound.',
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
      element: target('import'),
      popover: {
        title: 'Change a pack you have',
        description:
          'Import opens a sound pack zip, so you can change it and export it again.',
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

/** Start the tour. It counts as seen once it closes, however it was closed. */
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
    onDestroyed: markEditorTourSeen,
  });
  tour.drive();
  return tour;
}
