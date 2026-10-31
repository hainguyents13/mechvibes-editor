import { X } from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ConfirmDiscardModal } from '@/components/ConfirmDiscardModal';
import { ConfirmPackTypeModal } from '@/components/ConfirmPackTypeModal';
import { EditorNavbar } from '@/components/EditorNavbar';
import { EditPackModal } from '@/components/EditPackModal';
import { AudioFileSelector } from '@/components/editor/AudioFileSelector';
import { HiddenKeysTray } from '@/components/editor/HiddenKeysTray';
import {
  codesOfOtherKind,
  findHiddenKeys,
  inferKeyboardSize,
} from '@/components/editor/hidden-keys';
import { KeyboardDisplay } from '@/components/editor/KeyboardDisplay';
import { KeyboardShortcuts } from '@/components/editor/KeyboardShortcuts';
import {
  type KeyboardSize,
  keyboardLayouts,
  type LayoutKey,
  parseKeyboardLayout,
} from '@/components/editor/keyboardLayouts';
import {
  MOUSE_DISPLAY_SIZE,
  MouseDisplay,
} from '@/components/editor/MouseDisplay';
import {
  type SoundSlot,
  TimeSegmentControls,
} from '@/components/editor/TimeSegmentControls';
import { WaveformEditor } from '@/components/editor/WaveformEditor';
import { canOpenPack, MyPacksModal } from '@/components/MyPacksModal';
import { siteIdentity, websiteUrl } from '@/config/siteIdentity';
import { useKeyboardSelection } from '@/hooks/useKeyboardSelection';
import { useLibrarySession } from '@/hooks/useLibrarySession';
import { usePackHistory } from '@/hooks/usePackHistory';
import { usePreviewPlayback } from '@/hooks/usePreviewPlayback';
import { hasSeenEditorTour, startEditorTour } from '@/lib/editorTour';
import { shouldIgnoreShortcut, spaceOperatesTarget } from '@/lib/shortcuts';
import { plural } from '@/lib/utils';
import {
  downloadPackZip,
  type LibraryPackSummary,
  signInUrl,
  updatePackZip,
  WebsiteApiError,
} from '@/lib/websiteApi';
import { clearKeySounds, getAudioDuration } from '@/utils/audioUtils';
import {
  getHistoryShortcut,
  isSameSnapshot,
  type PackSnapshot,
} from '@/utils/packHistory';
import {
  addSources,
  countKeysBySource,
  createAudioSource,
  isSamePackInfo,
  isWholeFile,
  type KeySounds,
  type PackExtras,
  type PackInfo,
  type PackType,
} from '@/utils/soundPack';
import { buildSoundPackZip, exportSoundPack } from '@/utils/soundPackExport';
import {
  type ImportedSoundPack,
  parseSoundPackZip,
} from '@/utils/soundPackImport';

// Mouse buttons in preview, by MouseEvent.button.
const MOUSE_BUTTON_CODES = [
  'MouseLeft',
  'MouseMiddle',
  'MouseRight',
  'Mouse4',
  'Mouse5',
];
/** The app plays at most one wheel sound per 120 ms. */
const WHEEL_SOUND_INTERVAL_MS = 120;
const TOUR_AUTO_START_MIN_WIDTH = 768;
const TOUR_AUTO_START_DELAY_MS = 600;

// Sound editing panel on wide (lg) screens. By default it takes half the
// viewport, up to the original 524px, and never less than what its controls need
// with the smallest waveform, unless the screen is too short to also fit a usable
// keyboard. Dragging its top edge trades keyboard space for
// waveform space, and the choice is remembered in this browser. The waveform
// absorbs every pixel the panel gains or gives up.
const LG_MIN_WIDTH = 1024;
const PANEL_MAX_HEIGHT = 524;
const WAVEFORM_MAX_HEIGHT = 200;
const WAVEFORM_MIN_HEIGHT = 110;
/** Panel height taken by everything except the waveform. */
const PANEL_CONTROLS_HEIGHT = PANEL_MAX_HEIGHT - WAVEFORM_MAX_HEIGHT;
const PANEL_MIN_HEIGHT = PANEL_CONTROLS_HEIGHT + WAVEFORM_MIN_HEIGHT;
/** Smallest dragged height; below PANEL_MIN_HEIGHT the controls scroll. */
const PANEL_DRAG_MIN_HEIGHT = 240;
/** The panel's collapse transition caps it at 48rem (index.css). */
const PANEL_DRAG_MAX_HEIGHT = 720;
/** Viewport height kept for the navbar, the footer and a usable keyboard. */
const PANEL_RESERVED_HEIGHT = 320;
/**
 * Viewport height the default panel leaves for the navbar, the footer and a
 * keyboard that is comfortable to click. On short screens (a 720px laptop) the
 * panel gives way to it, and its controls scroll.
 */
const DEFAULT_KEYBOARD_RESERVED_HEIGHT = 360;
const PANEL_RESIZE_STEP = 16;
const PANEL_HEIGHT_STORAGE_KEY = 'mechvibes-editor:panel-height';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPanelDragMax(viewportHeight: number) {
  return clamp(
    viewportHeight - PANEL_RESERVED_HEIGHT,
    PANEL_DRAG_MIN_HEIGHT,
    PANEL_DRAG_MAX_HEIGHT,
  );
}

/**
 * Panel height in px on lg screens, or null when the panel stacks and sizes to
 * its content. `chosen` is the dragged height, or null for the default.
 */
function getPanelHeight(
  viewport: { width: number; height: number },
  chosen: number | null,
): number | null {
  if (viewport.width < LG_MIN_WIDTH) return null;
  if (chosen === null) {
    const preferred = Math.max(
      Math.round(viewport.height / 2),
      PANEL_MIN_HEIGHT,
    );
    return clamp(
      Math.min(preferred, viewport.height - DEFAULT_KEYBOARD_RESERVED_HEIGHT),
      PANEL_DRAG_MIN_HEIGHT,
      PANEL_MAX_HEIGHT,
    );
  }
  return clamp(chosen, PANEL_DRAG_MIN_HEIGHT, getPanelDragMax(viewport.height));
}

function readStoredPanelHeight(): number | null {
  try {
    const value = Number(localStorage.getItem(PANEL_HEIGHT_STORAGE_KEY));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

function storePanelHeight(height: number | null) {
  try {
    if (height === null) {
      localStorage.removeItem(PANEL_HEIGHT_STORAGE_KEY);
    } else {
      localStorage.setItem(PANEL_HEIGHT_STORAGE_KEY, String(height));
    }
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the
    // dragged height then lasts for this visit only.
  }
}

function readViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Defaults for a new pack. */
function createDefaultPackInfo(): PackInfo {
  return {
    name: 'My Sound Pack',
    author: '',
    description: `A custom sound pack created with the ${siteIdentity.productName} editor.`,
    tags: [],
    packType: 'Keyboard',
    recommendedVolume: 1,
    randomPitch: false,
    icon: null,
  };
}

/** Whether the pack details are still the defaults of a new pack. */
function isDefaultPackInfo(info: PackInfo) {
  return isSamePackInfo(info, createDefaultPackInfo());
}

function createBlankSnapshot(): PackSnapshot {
  return {
    keySounds: new Map(),
    sources: [],
    packInfo: createDefaultPackInfo(),
  };
}

/** Whether a pack holds nothing yet: no files, no sounds and the default details. */
function isBlankPack({ sources, keySounds, packInfo }: PackSnapshot) {
  return (
    sources.length === 0 && keySounds.size === 0 && isDefaultPackInfo(packInfo)
  );
}

/** A message under the navbar; `details` lists reasons, such as why the library refused a zip. */
type Notice = {
  tone: 'error' | 'success' | 'info';
  message: string;
  details?: string[];
  link?: { href: string; label: string };
};

const NOTICE_TONE_CLASSES: Record<Notice['tone'], string> = {
  error: 'border-error/30 bg-error/10',
  success: 'border-success/30 bg-success/10',
  info: 'border-info/30 bg-info/10',
};

/** The library pack open in the editor; Update publishes to it. */
type OpenLibraryPack = Pick<
  LibraryPackSummary,
  'id' | 'name' | 'slug' | 'revision'
>;

const NEW_PACK_URL = `${websiteUrl}/profile/sound-packs/new`;

/** Turns a failed library call into a notice. 400 and 409 are handled by Update itself. */
function libraryErrorNotice(error: unknown, fallback: string): Notice {
  if (!(error instanceof WebsiteApiError)) {
    return {
      tone: 'error',
      message: error instanceof Error ? error.message : fallback,
    };
  }
  switch (error.status) {
    case 401:
      return {
        tone: 'error',
        message:
          'You are signed out of the website. Sign in again, then try once more. Your work here is kept.',
        link: { href: signInUrl(window.location.href), label: 'Sign in' },
      };
    case 404:
      return {
        tone: 'error',
        message: 'This pack is no longer in your account.',
      };
    case 411:
      return {
        tone: 'error',
        message: 'The upload did not declare its size. Try again.',
      };
    case 429:
      return {
        tone: 'error',
        message: error.retryAfter
          ? `Too many uploads. Try again in ${error.retryAfter} seconds.`
          : 'Too many uploads. Wait a moment and try again.',
      };
    case 503:
      return {
        tone: 'error',
        message:
          'The library storage is not available right now. Try again later.',
      };
    default:
      // Network failures (status 0) and removed packs (403) carry a readable message.
      return { tone: 'error', message: error.message || fallback };
  }
}

export function EditorPage() {
  // Basic state
  const [keyboardSize, setKeyboardSize] = useState<KeyboardSize>('fullsize');
  const {
    present,
    undoLabel,
    redoLabel,
    commit,
    undo,
    redo,
    reset: resetHistory,
  } = usePackHistory(createBlankSnapshot);
  const { keySounds, sources, packInfo } = present;
  // What was last imported, opened, exported or updated; leaving loses changes made since.
  const [savedSnapshot, setSavedSnapshot] = useState(present);
  // What the library holds for the open pack: set on open and on each successful Update.
  const publishedSnapshotRef = useRef<PackSnapshot | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  // Whether the sound controls assign press or release sounds.
  const [soundSlot, setSoundSlot] = useState<SoundSlot>('press');
  const [defaultDuration, setDefaultDuration] = useState(100);
  const [showEditPackModal, setShowEditPackModal] = useState(false);
  // config.id of an imported zip, kept on export. The editor never invents
  // one: the library issues ids, and the app mints imported-<uuid> otherwise.
  const [loadedPackId, setLoadedPackId] = useState<string | null>(null);
  // What an imported zip carried that the editor does not edit.
  const [packExtras, setPackExtras] = useState<PackExtras | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [pressedKeyCodes, setPressedKeyCodes] = useState<Set<string>>(
    new Set(),
  );
  const [confirmDiscardAction, setConfirmDiscardAction] = useState<
    null | 'new' | 'import' | { pack: LibraryPackSummary }
  >(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  // The pack type a switch is waiting on, while its dialog asks about the
  // sounds that type would not show.
  const [pendingPackType, setPendingPackType] = useState<PackType | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { session, refresh: refreshSession } = useLibrarySession();
  const [libraryPack, setLibraryPack] = useState<OpenLibraryPack | null>(null);
  const [showMyPacks, setShowMyPacks] = useState(false);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Waveform state
  const [waveformSelection, setWaveformSelection] = useState({
    start: 0,
    end: 0,
  });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  // Memoize setters to prevent unnecessary re-renders
  const setWaveformSelectionCallback = useCallback(
    (selection: { start: number; end: number }) => {
      setWaveformSelection(selection);
    },
    [],
  );

  const setZoomLevelCallback = useCallback((level: number) => {
    setZoomLevel(level);
  }, []);

  const setIsPlayingCallback = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  // Video preview element lives in AudioFileSelector, driven by WaveformEditor playback
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const activeSource =
    sources.find((source) => source.id === activeSourceId) ?? null;
  const audioFile = activeSource?.file ?? null;
  const audioDuration = activeSource?.duration ?? 0;
  const keyCounts = useMemo(() => countKeysBySource(keySounds), [keySounds]);
  // Keys show the colour and name of the file their sound comes from.
  const sourcesById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  // Changes New, Import, opening a library pack or closing the tab would lose. A blank pack has none.
  const isDirty =
    !isSameSnapshot(present, savedSnapshot) && !isBlankPack(present);

  const commitKeySounds = useCallback(
    (label: string, update: (current: KeySounds) => KeySounds) =>
      commit(label, (current) => ({ keySounds: update(current.keySounds) })),
    [commit],
  );

  // A mouse pack shows the mouse buttons instead of a keyboard.
  const layout = packInfo.packType === 'Mouse' ? 'mouse' : keyboardSize;

  // Parse keyboard layout — memoised so key-group lookups don't rebuild each render
  const keys = useMemo(
    () => parseKeyboardLayout(keyboardLayouts[layout]),
    [layout],
  );

  // Mapped codes the drawn layout leaves out; the tray under the keyboard lists them.
  const hiddenKeys = useMemo(
    () => findHiddenKeys(keySounds.keys(), layout),
    [keySounds, layout],
  );
  // Codes preview can play: keys in a keyboard pack, buttons in a mouse pack,
  // each with a sound of known length.
  const playableCount = useMemo(() => {
    const otherKind = new Set(
      codesOfOtherKind(keySounds.keys(), packInfo.packType),
    );
    return [...keySounds].filter(
      ([code, { press }]) => !otherKind.has(code) && !isWholeFile(press),
    ).length;
  }, [keySounds, packInfo.packType]);
  const hasHiddenKeys = hiddenKeys.length > 0;

  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [chosenPanelHeight, setChosenPanelHeight] = useState(
    readStoredPanelHeight,
  );
  useEffect(() => {
    storePanelHeight(chosenPanelHeight);
  }, [chosenPanelHeight]);
  const panelHeight = getPanelHeight(viewport, chosenPanelHeight);
  const panelDragMax = getPanelDragMax(viewport.height);
  const waveformHeight =
    panelHeight === null
      ? WAVEFORM_MAX_HEIGHT
      : Math.max(WAVEFORM_MIN_HEIGHT, panelHeight - PANEL_CONTROLS_HEIGHT);

  const panelDragRef = useRef<{ startY: number; startHeight: number } | null>(
    null,
  );
  const resizePanel = (height: number) => {
    setChosenPanelHeight(
      Math.round(clamp(height, PANEL_DRAG_MIN_HEIGHT, panelDragMax)),
    );
  };

  // Keyboard natural dimensions (used to scale-to-fit and avoid a scrollbar)
  const KEYBOARD_UNIT = 54;
  const KEYBOARD_GAP = 3;
  const keyboardMaxX = Math.max(...keys.map((k: any) => k.x + k.width));
  const keyboardMaxY = Math.max(...keys.map((k: any) => k.y + k.height));
  // The mouse is a drawing with its own size rather than a grid of keys.
  const keyboardNaturalWidth =
    layout === 'mouse'
      ? MOUSE_DISPLAY_SIZE.width
      : keyboardMaxX * (KEYBOARD_UNIT + KEYBOARD_GAP) + KEYBOARD_GAP * 2 - 1;
  const keyboardNaturalHeight =
    layout === 'mouse'
      ? MOUSE_DISPLAY_SIZE.height
      : keyboardMaxY * (KEYBOARD_UNIT + KEYBOARD_GAP) + KEYBOARD_GAP * 2 - 1;

  // Scale the keyboard to fit the available space (no scrollbar)
  const keyboardAreaRef = useRef<HTMLDivElement>(null);
  const [keyboardScale, setKeyboardScale] = useState(1);

  useEffect(() => {
    const el = keyboardAreaRef.current;
    // Measure the parent, not the keyboard wrapper: the wrapper now shrinks to the
    // scaled keyboard, so observing it would feed its own output back in as input.
    const target = el?.parentElement;
    if (!target) return;
    // Settings row + shortcuts row + the two gaps between them. Fixed rather than
    // measured: those rows derive their width from keyboardScale, so measuring them
    // would make the scale depend on its own output. The rows keep a minimum width
    // so they stay on one line and this height holds. Preview collapses both rows,
    // so the keyboard gets that space back. The hidden-keys tray, when shown,
    // adds its own row and one more gap.
    const rowsHeight = isPreview
      ? 0
      : 24 + 20 + 24 + (hasHiddenKeys ? 24 + 12 : 0);
    const rescale = (width: number, height: number) => {
      const available = height - rowsHeight;
      const scale = Math.min(
        width / keyboardNaturalWidth,
        available / keyboardNaturalHeight,
        1,
      );
      setKeyboardScale(scale > 0 ? scale : 0);
    };

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      rescale(width, height);
    });
    observer.observe(target);

    // Same content box the observer reports: without the container's padding,
    // otherwise the keyboard is scaled past the space it actually has.
    const rescaleFromLayout = () => {
      const style = getComputedStyle(target);
      rescale(
        target.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
        target.clientHeight -
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom),
      );
    };

    // The panels collapse over ~320ms without resizing this container, so step
    // the scale through the transition instead of waiting for a resize event.
    rescaleFromLayout();
    let frame = 0;
    const start = performance.now();
    const followTransition = () => {
      rescaleFromLayout();
      if (performance.now() - start < 360) {
        frame = requestAnimationFrame(followTransition);
      }
    };
    frame = requestAnimationFrame(followTransition);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [keyboardNaturalWidth, keyboardNaturalHeight, isPreview, hasHiddenKeys]);

  // Create unique key IDs — stable identity so consumers can memoise on it
  const getKeyId = useCallback((key: LayoutKey, index: number) => {
    return `${key.label || 'key'}-${index}-${key.x}-${key.y}`;
  }, []);

  // Selection ids to key codes.
  const keyCodeById = useMemo(() => {
    const codes = new Map<string, string>();
    keys.forEach((key, index) => {
      codes.set(getKeyId(key, index), key.code);
    });
    return codes;
  }, [keys, getKeyId]);

  // Play function ref
  const playSelectedSegmentRef = React.useRef<(() => void) | null>(null);
  const playSelectedSegment = React.useCallback(() => {
    if (playSelectedSegmentRef.current) {
      playSelectedSegmentRef.current();
    }
  }, []);

  // Preview plays the real keyboard, and a dialog or a busy overlay holds a
  // copy of the pack, so page-wide shortcuts stay off meanwhile.
  const isKeyboardOwnedElsewhere =
    isPreview ||
    showEditPackModal ||
    confirmDiscardAction !== null ||
    pendingPackType !== null ||
    showMyPacks ||
    isExporting ||
    isUpdating ||
    openingPackId !== null;

  // Keyboard selection hook
  const {
    selectedKeys,
    setSelectedKeys,
    marquee,
    tabStopId,
    setFocusKeyId,
    selectKey,
    keyboardRef,
    pointerHandlers,
  } = useKeyboardSelection({
    keys,
    getKeyId,
    enabled: !isKeyboardOwnedElsewhere,
    // Declared below, once the selected codes are known; called later from events.
    onClearSelected: () => clearSelectedKeySounds(),
    onSingleKeySelect: (keyCode) => {
      // Show the key's file and the half of its sound being edited.
      const sound = keySounds.get(keyCode);
      if (!sound) return;
      const segment =
        soundSlot === 'release' && sound.release ? sound.release : sound.press;
      setActiveSourceId(sound.source);
      setWaveformSelection({ start: segment[0], end: segment[1] });
    },
  });

  // Where focus goes when the control that had it goes away: the keyboard's
  // key in the Tab order.
  const focusKeyboard = useCallback(() => {
    keyboardRef.current
      ?.querySelector<HTMLElement | SVGElement>('[data-key-id][tabindex="0"]')
      ?.focus();
  }, [keyboardRef]);

  const selectedCodes = useMemo(
    () =>
      Array.from(
        new Set(
          Array.from(selectedKeys, (id) => keyCodeById.get(id)).filter(
            (code): code is string => Boolean(code),
          ),
        ),
      ),
    [selectedKeys, keyCodeById],
  );

  // Delete, Backspace and the Clear button take the whole sound off the
  // selected keys, as one undo step. Keys without a sound add no step.
  const clearSelectedKeySounds = () => {
    const count = selectedCodes.filter((code) => keySounds.has(code)).length;
    if (count === 0) return;
    commitKeySounds(`Clear ${plural(count, 'key')}`, (current) =>
      clearKeySounds(selectedCodes, current),
    );
  };

  // Add audio or video files; the first one added opens in the waveform.
  const handleAddSources = async (files: File[]) => {
    const added = await Promise.all(
      files.map(async (file) =>
        createAudioSource(file, await getAudioDuration(file)),
      ),
    );
    // Appends to the latest files, and picks colours against them: an Undo
    // can land while durations are read.
    commit(
      added.length === 1
        ? `Add ${added[0].file.name}`
        : `Add ${added.length} files`,
      (current) => ({ sources: addSources(current.sources, added) }),
    );
    setActiveSourceId(added[0].id);
    setWaveformSelection({ start: 0, end: 0 });
  };

  const handleSelectSource = (id: string) => {
    if (id === activeSourceId) return;
    setActiveSourceId(id);
    setWaveformSelection({ start: 0, end: 0 });
  };

  // Removing a file also removes the sounds cut from it, as one step. Undo
  // brings back the same file object with its id.
  const handleRemoveSource = (id: string) => {
    const source = sources.find((s) => s.id === id);
    if (!source) return;
    commit(`Remove ${source.file.name}`, (current) => {
      const nextSounds = new Map(current.keySounds);
      nextSounds.forEach((sound, code) => {
        if (sound.source === id) nextSounds.delete(code);
      });
      return {
        sources: current.sources.filter((s) => s.id !== id),
        keySounds: nextSounds,
      };
    });
    if (activeSourceId === id) {
      setActiveSourceId(sources.filter((s) => s.id !== id)[0]?.id ?? null);
      setWaveformSelection({ start: 0, end: 0 });
    }
  };

  const switchPackType = (packType: PackType) => {
    commit(`Switch to ${packType} pack`, (current) => ({
      packInfo: { ...current.packInfo, packType },
    }));
  };

  // Sounds the other type neither shows nor plays are asked about first.
  const handlePackTypeChange = (packType: PackType) => {
    if (packType === packInfo.packType) return;
    if (codesOfOtherKind(keySounds.keys(), packType).length > 0) {
      setPendingPackType(packType);
    } else {
      switchPackType(packType);
    }
  };

  // The dialog is modal and shortcuts are off while it is open, so the pack
  // cannot change under it.
  const pendingCodes = pendingPackType
    ? codesOfOtherKind(keySounds.keys(), pendingPackType)
    : [];
  const closePackTypeDialog = useCallback(() => setPendingPackType(null), []);

  // The type switch and the removal are one step, so Undo brings back both.
  const switchPackTypeAndRemove = (packType: PackType, codes: string[]) => {
    commit(
      `Switch to ${packType} and remove ${plural(codes.length, 'sound')}`,
      (current) => ({
        packInfo: { ...current.packInfo, packType },
        keySounds: clearKeySounds(codes, current.keySounds),
      }),
    );
  };

  // Clear what belongs to the open pack but is not in its history.
  const resetView = useCallback(() => {
    setSelectedKeys(new Set());
    setLoadedPackId(null);
    setPackExtras(null);
    // New and Import from disk leave the library pack, so Update cannot
    // publish unrelated work to it.
    setLibraryPack(null);
    setActiveSourceId(null);
    setSoundSlot('press');
    setWaveformSelection({ start: 0, end: 0 });
    setNotice(null);
  }, [setSelectedKeys]);

  // Start a new history from `snapshot` with nothing unsaved. `published` is what the library holds.
  const startFrom = useCallback(
    (snapshot: PackSnapshot, published: PackSnapshot | null) => {
      resetHistory(snapshot);
      setSavedSnapshot(snapshot);
      publishedSnapshotRef.current = published;
    },
    [resetHistory],
  );

  // Reset the whole pack back to defaults
  const resetPack = useCallback(() => {
    resetView();
    startFrom(createBlankSnapshot(), null);
  }, [resetView, startFrom]);

  // New pack: warn if there are unsaved modifications
  const handleNewPack = () => {
    if (isDirty) {
      setConfirmDiscardAction('new');
    } else {
      resetPack();
    }
  };

  // Import: warn if there are unsaved modifications, then open the file picker
  const handleImportClick = () => {
    if (isDirty) {
      setConfirmDiscardAction('import');
    } else {
      importInputRef.current?.click();
    }
  };

  const confirmDiscard = () => {
    const action = confirmDiscardAction;
    setConfirmDiscardAction(null);
    if (action === 'new') {
      resetPack();
    } else if (action === 'import') {
      importInputRef.current?.click();
    } else if (action) {
      openLibraryPack(action.pack);
    }
  };

  // Replace the current pack with a parsed zip. It opens unchanged, with
  // renamed key codes already applied, and with nothing to undo.
  const applyImportedPack = (
    imported: ImportedSoundPack,
    fromLibrary: boolean,
  ) => {
    resetView();
    const snapshot: PackSnapshot = {
      packInfo: {
        ...imported.info,
        description:
          imported.info.description || createDefaultPackInfo().description,
      },
      sources: imported.sources,
      keySounds: imported.keySounds,
    };
    startFrom(snapshot, fromLibrary ? snapshot : null);
    // Show every mapped key. Outside the history, like any size change.
    if (imported.info.packType === 'Keyboard') {
      setKeyboardSize((current) =>
        inferKeyboardSize(imported.keySounds.keys(), current),
      );
    }
    setLoadedPackId(imported.id);
    setPackExtras(imported.extras);
    setActiveSourceId(imported.sources[0]?.id ?? null);
    if (imported.warnings.length > 0) {
      setNotice({
        tone: 'error',
        message: 'Opened the pack, with some problems:',
        details: [...imported.warnings, ...imported.notes],
      });
    } else if (imported.notes.length > 0) {
      setNotice({
        tone: 'info',
        message: 'Opened the pack. Good to know:',
        details: imported.notes,
      });
    }
  };

  // Import a sound pack zip and apply its contents to current settings
  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      applyImportedPack(await parseSoundPackZip(file), false);
    } catch (error) {
      setNotice({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Could not import sound pack.',
      });
    }
  };

  // Open one of the visitor's library packs through the same path as Import.
  const openLibraryPack = async (pack: LibraryPackSummary) => {
    setOpeningPackId(pack.id);
    setNotice(null);
    try {
      const zip = await downloadPackZip(pack.id);
      const imported = await parseSoundPackZip(
        new File([zip], `${pack.slug}.zip`, { type: 'application/zip' }),
      );
      applyImportedPack(imported, true);
      setLibraryPack({
        id: pack.id,
        name: pack.name,
        slug: pack.slug,
        revision: pack.revision,
      });
      setShowMyPacks(false);
    } catch (error) {
      setShowMyPacks(false);
      setNotice(libraryErrorNotice(error, 'Could not open this pack.'));
      if (error instanceof WebsiteApiError && error.status === 401) {
        refreshSession();
      }
    } finally {
      setOpeningPackId(null);
    }
  };

  const handleOpenLibraryPack = (pack: LibraryPackSummary) => {
    if (!canOpenPack(pack)) return;
    if (isDirty) {
      setShowMyPacks(false);
      setConfirmDiscardAction({ pack });
    } else {
      openLibraryPack(pack);
    }
  };

  // Publish the current work as the next revision of the open library pack.
  const handleUpdate = async () => {
    if (!libraryPack || isUpdating) return;
    // The state written to the library; edits are locked while it uploads.
    const published = present;
    setIsUpdating(true);
    setNotice(null);
    try {
      const zip = await buildSoundPackZip({
        id: libraryPack.id,
        info: published.packInfo,
        sources: published.sources,
        keySounds: published.keySounds,
        extras: packExtras,
      });
      const pack = await updatePackZip(
        libraryPack.id,
        zip,
        libraryPack.revision,
      );
      setLibraryPack((current) =>
        current ? { ...current, revision: pack.revision } : current,
      );
      setSavedSnapshot(published);
      publishedSnapshotRef.current = published;
      setNotice({
        tone: 'success',
        message: `Published revision ${pack.revision} of ${libraryPack.name}.`,
        link: {
          href: `${websiteUrl}/sound-packs/${libraryPack.slug}`,
          label: 'View it in the library',
        },
      });
      refreshSession();
    } catch (error) {
      if (error instanceof WebsiteApiError && error.status === 400) {
        setNotice({
          tone: 'error',
          message: 'The library refused this zip:',
          details: error.reasons.length > 0 ? error.reasons : [error.message],
        });
      } else if (error instanceof WebsiteApiError && error.status === 409) {
        setNotice({
          tone: 'error',
          message: `${libraryPack.name} changed on the website since you opened it${error.revision ? ` (it is now at revision ${error.revision})` : ''}. Reopening it loses the changes made here, so export a copy first, then reopen the pack from My packs.`,
        });
      } else {
        setNotice(libraryErrorNotice(error, 'Could not update the pack.'));
        if (error instanceof WebsiteApiError && error.status === 401) {
          refreshSession();
        }
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Export current settings as a sound pack zip
  const handleExport = async () => {
    // The state written to the zip; edits are locked while it builds.
    const exported = present;
    setIsExporting(true);
    setNotice(null);
    try {
      await exportSoundPack({
        id: loadedPackId ?? undefined,
        info: exported.packInfo,
        sources: exported.sources,
        keySounds: exported.keySounds,
        extras: packExtras,
      });
      // A download cannot tell a cancelled save dialog, so starting it counts as saved.
      setSavedSnapshot(exported);
      if (!libraryPack) {
        setNotice({
          tone: 'success',
          message:
            'Exported. To share it in the library, create a pack from this zip on the website.',
          link: { href: NEW_PACK_URL, label: 'Create a pack' },
        });
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Could not export sound pack.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Clear selection when changing the keyboard size or the pack type
  // biome-ignore lint/correctness/useExhaustiveDependencies: the layout change is the trigger, not a value the effect reads
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [layout, setSelectedKeys]);

  // Keep the waveform on a file the pack still has: Undo and Redo can take
  // away the file shown, or bring files back when none is.
  useEffect(() => {
    if (
      activeSourceId !== null &&
      sources.some((source) => source.id === activeSourceId)
    )
      return;
    const fallback = sources[0]?.id ?? null;
    if (fallback === activeSourceId) return;
    setActiveSourceId(fallback);
    setWaveformSelection({ start: 0, end: 0 });
  }, [sources, activeSourceId]);

  // Preview: play the mapped sound for whichever key the user presses
  const {
    playKey,
    isLoading: isPreviewLoading,
    error: previewError,
  } = usePreviewPlayback(sources, keySounds, isPreview);
  const isMousePack = packInfo.packType === 'Mouse';

  const exitPreview = useCallback(() => {
    setIsPreview(false);
    setPressedKeyCodes(new Set());
  }, []);

  // Guided tour: it opens by itself on a first visit, and from the navbar at
  // any time.
  const tourRef = useRef<ReturnType<typeof startEditorTour> | null>(null);
  const signedInRef = useRef(false);
  useEffect(() => {
    signedInRef.current = session.status === 'signed-in';
  }, [session.status]);
  const startTour = useCallback(() => {
    tourRef.current?.destroy();
    tourRef.current = startEditorTour({ signedIn: signedInRef.current });
  }, []);
  useEffect(() => {
    // Phones cannot edit packs, so a first visit there does not start it.
    if (hasSeenEditorTour() || window.innerWidth < TOUR_AUTO_START_MIN_WIDTH)
      return;
    // Let the layout and the keyboard scale settle before measuring targets.
    const timer = window.setTimeout(startTour, TOUR_AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [startTour]);
  useEffect(() => () => tourRef.current?.destroy(), []);

  // The site footer is rendered by the layout, so flag the body for it.
  useEffect(() => {
    document.body.dataset.editorPreview = String(isPreview);
    return () => {
      delete document.body.dataset.editorPreview;
    };
  }, [isPreview]);

  useEffect(() => {
    if (!isPreview) return;

    const press = (code: string) => {
      playKey(code, 'press');
      setPressedKeyCodes((prev) => new Set(prev).add(code));
    };
    const release = (code: string) => {
      playKey(code, 'release');
      setPressedKeyCodes((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        exitPreview();
        return;
      }
      if (isMousePack) return;
      // Keep the browser out of it — F-keys, Tab and Space would otherwise
      // navigate or scroll instead of sounding like a key press.
      event.preventDefault();
      if (event.repeat) return;
      press(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isMousePack) release(event.code);
    };

    // A mouse pack sounds on the real mouse buttons and wheel, as in the app.
    const handleMouseDown = (event: MouseEvent) => {
      const code = MOUSE_BUTTON_CODES[event.button];
      if (code) press(code);
    };
    const handleMouseUp = (event: MouseEvent) => {
      const code = MOUSE_BUTTON_CODES[event.button];
      if (code) release(code);
    };
    let lastWheelSound = 0;
    const handleWheel = (event: WheelEvent) => {
      const now = performance.now();
      if (event.deltaY === 0 || now - lastWheelSound < WHEEL_SOUND_INTERVAL_MS)
        return;
      lastWheelSound = now;
      playKey(event.deltaY < 0 ? 'MouseWheelUp' : 'MouseWheelDown', 'press');
    };
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();

    // Releasing focus mid-press would otherwise leave keys stuck highlighted.
    const handleBlur = () => setPressedKeyCodes(new Set());

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    if (isMousePack) {
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('wheel', handleWheel);
      window.addEventListener('contextmenu', handleContextMenu);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isPreview, isMousePack, playKey, exitPreview]);

  useEffect(() => {
    if (isKeyboardOwnedElsewhere) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const command = getHistoryShortcut(event);
      if (!command || shouldIgnoreShortcut(event)) return;
      event.preventDefault();
      if (command === 'undo') undo();
      else redo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKeyboardOwnedElsewhere, undo, redo]);

  // Space plays or stops the selected sound, as the waveform hint says.
  useEffect(() => {
    if (isKeyboardOwnedElsewhere || !activeSourceId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code !== 'Space' ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }
      if (shouldIgnoreShortcut(event) || spaceOperatesTarget(event.target)) {
        return;
      }
      // Also keeps the page from scrolling when there is nothing to play.
      event.preventDefault();
      playSelectedSegment();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKeyboardOwnedElsewhere, activeSourceId, playSelectedSegment]);

  // Ask before closing or reloading the tab over unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older Safari and Firefox only ask when returnValue is set.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {isPreview ? (
          <div className="shrink-0 flex items-center justify-center gap-4 px-4 py-3 motion-safe:animate-[preview-bar-in_260ms_ease-out]">
            <span className="text-sm text-base-content/60">
              {isPreviewLoading
                ? 'Loading sounds…'
                : previewError
                  ? previewError
                  : isMousePack
                    ? `Click or scroll anywhere — ${plural(playableCount, 'button')} mapped`
                    : `Press any highlighted key — ${plural(playableCount, 'key')} mapped`}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-neutral rounded-box"
              onClick={exitPreview}
            >
              <X className="h-4 w-4" />
              Exit preview
            </button>
          </div>
        ) : (
          <EditorNavbar
            packName={packInfo.name}
            packType={packInfo.packType}
            onEditPack={() => setShowEditPackModal(true)}
            onNewPack={handleNewPack}
            onImport={handleImportClick}
            onExport={handleExport}
            isExporting={isExporting}
            onPreview={() => setIsPreview(true)}
            canPreview={sources.length > 0 && playableCount > 0}
            session={session}
            signInHref={signInUrl(window.location.href)}
            signInInNewTab={isDirty}
            onOpenMyPacks={() => {
              setShowMyPacks(true);
              refreshSession();
            }}
            onUpdate={
              libraryPack && session.status === 'signed-in'
                ? handleUpdate
                : undefined
            }
            isUpdating={isUpdating}
            onStartTour={startTour}
            undoLabel={undoLabel}
            redoLabel={redoLabel}
            onUndo={undo}
            onRedo={redo}
          />
        )}

        <input
          ref={importInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleImportFile}
        />

        <ConfirmDiscardModal
          isOpen={confirmDiscardAction !== null}
          onCancel={() => setConfirmDiscardAction(null)}
          onConfirm={confirmDiscard}
        />

        <ConfirmPackTypeModal
          packType={pendingPackType}
          codes={pendingCodes}
          onCancel={closePackTypeDialog}
          onKeep={() => {
            if (pendingPackType) switchPackType(pendingPackType);
            closePackTypeDialog();
          }}
          onRemove={() => {
            if (pendingPackType) {
              switchPackTypeAndRemove(pendingPackType, pendingCodes);
            }
            closePackTypeDialog();
          }}
        />

        {session.status === 'signed-in' && (
          <MyPacksModal
            isOpen={showMyPacks}
            onClose={() => setShowMyPacks(false)}
            user={session.user}
            packs={session.packs}
            openingId={openingPackId}
            onOpen={handleOpenLibraryPack}
            newPackUrl={NEW_PACK_URL}
          />
        )}

        {(isExporting || isUpdating || (openingPackId && !showMyPacks)) && (
          <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center">
            <div className="bg-base-100 rounded-lg shadow-xl p-8 flex flex-col items-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm font-medium">
                {isExporting
                  ? 'Exporting sound pack…'
                  : isUpdating
                    ? 'Publishing to the library…'
                    : 'Opening the pack…'}
              </p>
              {(isExporting || isUpdating) && (
                <p className="text-xs text-base-content/60">
                  Compressing audio — this can take a while for long files.
                </p>
              )}
            </div>
          </div>
        )}

        {showEditPackModal && (
          <EditPackModal
            isOpen={showEditPackModal}
            packInfo={packInfo}
            isLibraryPack={libraryPack !== null}
            onClose={() => setShowEditPackModal(false)}
            onSave={(updatedPackInfo) => {
              // A Save that changes nothing adds no step.
              if (!isSamePackInfo(updatedPackInfo, packInfo)) {
                commit('Edit pack details', { packInfo: updatedPackInfo });
              }
              setShowEditPackModal(false);
            }}
          />
        )}

        {/* Notices sit outside the keyboard column, whose fit-to-height
            scale only accounts for its own rows. */}
        {notice && (
          <div
            className={`shrink-0 flex items-start justify-center gap-3 border-b px-4 py-2 text-sm ${NOTICE_TONE_CLASSES[notice.tone]}`}
          >
            <div className="min-w-0">
              <p>
                {notice.message}
                {notice.link && (
                  <>
                    {' '}
                    <a
                      href={notice.link.href}
                      target="_blank"
                      rel="noopener"
                      className="link font-medium"
                    >
                      {notice.link.label}
                    </a>
                  </>
                )}
              </p>
              {notice.details && notice.details.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {notice.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              className="btn btn-xs btn-ghost shrink-0"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-center gap-3 px-4 py-3">
          {/* Keyboard Settings — width tracks the scaled keyboard so both align with it */}
          <div
            className="editor-chrome-vertical editor-chrome-top w-full min-w-[min(100%,46rem)] mx-auto shrink-0"
            data-hidden={isPreview}
            style={{ maxWidth: keyboardNaturalWidth * keyboardScale }}
          >
            <h2 className="sr-only">Keyboard settings</h2>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* soundpack_type: which device the pack is for */}
                <div className="join" data-tour="pack-type">
                  {(['Keyboard', 'Mouse'] as const).map((packType) => (
                    <button
                      key={packType}
                      type="button"
                      className={`btn btn-xs join-item ${packInfo.packType === packType ? 'btn-active' : ''}`}
                      aria-pressed={packInfo.packType === packType}
                      onClick={() => handlePackTypeChange(packType)}
                      title={`Make a ${packType.toLowerCase()} sound pack`}
                    >
                      {packType}
                    </button>
                  ))}
                </div>
                {packInfo.packType === 'Keyboard' && (
                  <div className="join">
                    <button
                      type="button"
                      className={`btn btn-xs join-item ${keyboardSize === 'fullsize' ? 'btn-active' : ''}`}
                      onClick={() => setKeyboardSize('fullsize')}
                    >
                      Full size
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs join-item ${keyboardSize === 'tkl' ? 'btn-active' : ''}`}
                      onClick={() => setKeyboardSize('tkl')}
                    >
                      TKL
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs join-item ${keyboardSize === 'compact' ? 'btn-active' : ''}`}
                      onClick={() => setKeyboardSize('compact')}
                    >
                      Compact
                    </button>
                  </div>
                )}
              </div>
              {/* Key State Examples */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="btn btn-xs btn-neutral pointer-events-none">
                    A
                  </div>
                  <span className="text-base-content/70">Selected</span>
                </div>
                <div
                  className="flex items-center gap-2"
                  title="The dot takes the colour of the file the sound comes from"
                >
                  <div className="btn btn-xs relative pointer-events-none">
                    Q
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-base-content/50 rounded-full border-2 border-white shadow-lg ring-2 ring-base-content/20"></div>
                  </div>
                  <span className="text-base-content/70">Has a sound</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="btn btn-xs relative pointer-events-none">
                    Z
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary rounded-full border-2 border-white shadow-lg ring-2 ring-secondary/30"></div>
                  </div>
                  <span className="text-base-content/70">Release sound</span>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Display (scaled to fit) — sits flush between the two rows */}
          <h2 className="sr-only">Keyboard</h2>
          <div
            ref={keyboardAreaRef}
            className="w-full min-h-0 shrink overflow-hidden flex items-center justify-center"
          >
            {/* No CSS transition here: ResizeObserver already re-scales the
                keyboard every frame while the panels collapse, and animating
                the same values on top of that lags behind the layout. */}
            <div
              className="shrink-0"
              data-tour="keyboard"
              style={{
                width: keyboardNaturalWidth * keyboardScale,
                height: keyboardNaturalHeight * keyboardScale,
              }}
            >
              <div
                style={{
                  transform: `scale(${keyboardScale})`,
                  transformOrigin: 'top left',
                  width: keyboardNaturalWidth,
                  height: keyboardNaturalHeight,
                }}
              >
                {isMousePack ? (
                  // Mouse packs answer the real mouse anywhere on the page.
                  <MouseDisplay
                    selectedKeys={selectedKeys}
                    modifiedKeys={keySounds}
                    sourcesById={sourcesById}
                    tabStopId={tabStopId}
                    onSelectKey={selectKey}
                    onFocusKey={setFocusKeyId}
                    keyboardRef={keyboardRef}
                    isPreview={isPreview}
                    pressedKeyCodes={pressedKeyCodes}
                  />
                ) : (
                  <KeyboardDisplay
                    layout={layout}
                    selectedKeys={selectedKeys}
                    modifiedKeys={keySounds}
                    sourcesById={sourcesById}
                    marquee={marquee}
                    tabStopId={tabStopId}
                    pointerHandlers={pointerHandlers}
                    onSelectKey={selectKey}
                    onFocusKey={setFocusKeyId}
                    keyboardRef={keyboardRef}
                    isPreview={isPreview}
                    pressedKeyCodes={pressedKeyCodes}
                    onPreviewKeyDown={(code) => playKey(code, 'press')}
                    onPreviewKeyUp={(code) => playKey(code, 'release')}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Keys with a sound that the drawn layout leaves out */}
          {hasHiddenKeys && (
            <div
              className="editor-chrome-vertical w-full min-w-[min(100%,46rem)] mx-auto shrink-0"
              data-hidden={isPreview}
              style={{ maxWidth: keyboardNaturalWidth * keyboardScale }}
            >
              <h2 className="sr-only">Hidden keys</h2>
              <HiddenKeysTray
                hiddenKeys={hiddenKeys}
                keySounds={keySounds}
                sources={sources}
                onClear={(code) =>
                  commitKeySounds(`Clear ${code}`, (current) =>
                    clearKeySounds([code], current),
                  )
                }
                onFocusLost={focusKeyboard}
              />
            </div>
          )}

          {/* Shortcuts Bar */}
          <div
            className="editor-chrome-vertical w-full flex justify-center shrink-0"
            data-hidden={isPreview}
          >
            <KeyboardShortcuts
              selectedKeys={selectedKeys}
              setSelectedKeys={setSelectedKeys}
              maxWidth={keyboardNaturalWidth * keyboardScale}
              isMousePack={isMousePack}
              onFocusLost={focusKeyboard}
            />
          </div>
        </div>

        {/* Drag handle on the panel's top edge (wide screens only) */}
        {panelHeight !== null && !isPreview && (
          // biome-ignore lint/a11y/useSemanticElements: a focusable window splitter with a grip; <hr> cannot hold children or take focus
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize the sound editing panel"
            aria-valuemin={PANEL_DRAG_MIN_HEIGHT}
            aria-valuemax={panelDragMax}
            aria-valuenow={panelHeight}
            tabIndex={0}
            title="Drag to resize. Double-click to reset."
            className="group relative z-10 -mb-2 h-3 shrink-0 cursor-row-resize touch-none flex justify-center focus-visible:outline-none"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              panelDragRef.current = {
                startY: event.clientY,
                startHeight: panelHeight,
              };
            }}
            onPointerMove={(event) => {
              const drag = panelDragRef.current;
              if (!drag) return;
              resizePanel(drag.startHeight - (event.clientY - drag.startY));
            }}
            onPointerUp={() => {
              panelDragRef.current = null;
            }}
            onPointerCancel={() => {
              panelDragRef.current = null;
            }}
            onDoubleClick={() => setChosenPanelHeight(null)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                resizePanel(
                  panelHeight +
                    (event.key === 'ArrowUp'
                      ? PANEL_RESIZE_STEP
                      : -PANEL_RESIZE_STEP),
                );
              }
            }}
          >
            <div className="mt-1 h-1 w-12 rounded-full bg-base-content/25 transition-colors group-hover:bg-primary group-focus-visible:bg-primary" />
          </div>
        )}

        {/* Timeline panel — bottom */}
        <div
          className="editor-chrome-vertical shrink-0 editor-panel-surface border-t-2 border-base-content/20"
          data-hidden={isPreview}
        >
          <div
            style={panelHeight === null ? undefined : { height: panelHeight }}
          >
            <h2 className="sr-only">Sound editing</h2>
            {/* Dividers run edge to edge: padding lives inside each column, not on the row */}
            <div className="flex flex-col lg:flex-row items-stretch lg:h-full min-h-0 border-b-2 border-base-content/20">
              {/* Left: audio/video import. Stacked, it is a short dropzone, sizes
                  to the file card once audio is loaded, and keeps room for the
                  clip when a video is loaded. */}
              <div
                data-tour="sources"
                className={`w-full ${!audioFile ? 'h-[180px]' : audioFile.type.startsWith('video/') ? 'h-[320px]' : 'h-auto max-h-[200px]'} lg:h-full lg:max-h-none lg:w-[360px] shrink-0 min-w-0 lg:border-r border-base-content/20 px-4 py-3`}
              >
                <AudioFileSelector
                  sources={sources}
                  activeSourceId={activeSourceId}
                  keyCounts={keyCounts}
                  onSelect={handleSelectSource}
                  onAdd={handleAddSources}
                  onRemove={handleRemoveSource}
                  videoRef={videoPreviewRef}
                />
              </div>

              {/* Right: waveform / mode-specific controls — fills the container height.
                  No horizontal padding here: the waveform runs edge to edge, and the
                  blocks around it carry their own px-4. */}
              <div
                data-tour="sound"
                className="flex-1 min-w-0 min-h-0 h-full pb-3 lg:pt-3 lg:overflow-y-auto"
              >
                {audioFile && activeSourceId ? (
                  <div className="min-h-full min-w-0 flex flex-col gap-3">
                    {/* Waveform Editor — grows to fill, video preview absorbs the slack */}
                    <WaveformEditor
                      audioFile={audioFile}
                      defaultDuration={defaultDuration}
                      setDefaultDuration={setDefaultDuration}
                      waveformSelection={waveformSelection}
                      setWaveformSelection={setWaveformSelectionCallback}
                      zoomLevel={zoomLevel}
                      setZoomLevel={setZoomLevelCallback}
                      isPlaying={isPlaying}
                      setIsPlaying={setIsPlayingCallback}
                      onPlaySelectedSegmentReady={(playFn) => {
                        playSelectedSegmentRef.current = playFn;
                      }}
                      keySounds={keySounds}
                      sourceId={activeSourceId}
                      videoRef={videoPreviewRef}
                      waveformHeight={waveformHeight}
                    />

                    {/* Time Segment Controls */}
                    <TimeSegmentControls
                      waveformSelection={waveformSelection}
                      setWaveformSelection={setWaveformSelection}
                      isPlaying={isPlaying}
                      playSelectedSegment={playSelectedSegment}
                      selectedKeys={selectedKeys}
                      setSelectedKeys={setSelectedKeys}
                      selectedCodes={selectedCodes}
                      keySounds={keySounds}
                      commitKeySounds={commitKeySounds}
                      onClearSelected={clearSelectedKeySounds}
                      hiddenCount={hiddenKeys.length}
                      activeSourceId={activeSourceId}
                      audioDuration={audioDuration}
                      slot={soundSlot}
                      setSlot={setSoundSlot}
                      keys={keys}
                      getKeyId={getKeyId}
                    />
                    {/* Absorbs leftover height so the blocks above stay pinned to the top */}
                    <div className="flex-1 min-h-0" />
                  </div>
                ) : (
                  <div className="h-full min-w-0 flex items-center justify-center px-4 py-4 text-center text-xs text-base-content/50">
                    Import an audio or video file to start editing the waveform
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
