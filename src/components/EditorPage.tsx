import { X } from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ConfirmDiscardModal } from '@/components/ConfirmDiscardModal';
import { ConfirmPackTypeModal } from '@/components/ConfirmPackTypeModal';
import { EditorNavbar } from '@/components/EditorNavbar';
import { EditPackModal } from '@/components/EditPackModal';
import {
  AddedFilesSummary,
  type ReadingProgress,
  readingText,
  type SummaryActionLine,
} from '@/components/editor/AddedFilesSummary';
import {
  ADD_SOUNDS_HEADING_ID,
  type AddOptions,
  AddSoundsPanel,
} from '@/components/editor/AddSoundsPanel';
import {
  AudioFileSelector,
  FILE_LIST_SELECTOR,
  SOURCE_DRAG_TYPE,
  SOURCES_HEADING_ID,
} from '@/components/editor/AudioFileSelector';
import { ChangeFileDialog } from '@/components/editor/ChangeFileDialog';
import { HiddenKeysTray } from '@/components/editor/HiddenKeysTray';
import {
  codesOfOtherKind,
  findHiddenKeys,
  getLayoutCodes,
  inferKeyboardSize,
  widenKeyboardSize,
} from '@/components/editor/hidden-keys';
import { KeyboardDisplay } from '@/components/editor/KeyboardDisplay';
import { KeyboardShortcutsDialog } from '@/components/editor/KeyboardShortcuts';
import { KeyCard } from '@/components/editor/KeyCard';
import {
  KEY_LEGEND_ROWS_HEIGHT,
  KEY_LEGEND_ROWS_MIN_WIDTH,
  KeyLegend,
} from '@/components/editor/KeyLegend';
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
import { NextStep } from '@/components/editor/NextStep';
import { OneSoundPane } from '@/components/editor/OneSoundPane';
import { ProgressLine } from '@/components/editor/ProgressLine';
import { QUICK_SELECT_SELECTOR } from '@/components/editor/QuickSelect';
import {
  type SoundSlot,
  TimeSegmentControls,
} from '@/components/editor/TimeSegmentControls';
import {
  WAVEFORM_BOX_SELECTOR,
  WaveformEditor,
} from '@/components/editor/WaveformEditor';
import { dropCodeAt, FileDropOverlay } from '@/components/FileDropOverlay';
import { MyPacksModal } from '@/components/MyPacksModal';
import { MyPacksScreen } from '@/components/start/MyPacksScreen';
import { PackTypeScreen } from '@/components/start/PackTypeScreen';
import { PhoneScreen } from '@/components/start/PhoneScreen';
import { SCREEN_HEADING_ID, ScreenHeading } from '@/components/start/StartPage';
import { StartScreen } from '@/components/start/StartScreen';
import { websiteUrl } from '@/config/siteIdentity';
import { useKeyboardSelection } from '@/hooks/useKeyboardSelection';
import { useLibrarySession } from '@/hooks/useLibrarySession';
import { usePackHistory } from '@/hooks/usePackHistory';
import { useCoarsePointer, usePhoneScreen } from '@/hooks/usePhoneScreen';
import { usePreviewPlayback } from '@/hooks/usePreviewPlayback';
import { useSessionFlag } from '@/hooks/useSessionFlag';
import { type AddBatch, summarizeAdd } from '@/lib/addSummary';
import type { DropRoute } from '@/lib/dropRouting';
import { startEditorTour } from '@/lib/editorTour';
import { autoTourFlow, hasSeenTour, type TourFlow } from '@/lib/editorTourFlow';
import {
  type FileKind,
  inferKindsFromPack,
  inferNewFileKind,
  LONG_FILE_SECONDS,
  longFileWarning,
  playsWholeFile,
} from '@/lib/fileKinds';
import { zipFolder } from '@/lib/folderFiles';
import { dropTargetCodes, sameSoundCount } from '@/lib/keyCard';
import { guessPackType, keyLabel } from '@/lib/keyNames';
import { getProgressItems } from '@/lib/progressLine';
import { replaceSourceFile, replaceWarning } from '@/lib/replaceFile';
import { shouldIgnoreShortcut, spaceOperatesTarget } from '@/lib/shortcuts';
import {
  asksBeforeReplacing,
  backToStart,
  type EditorScreen,
  findLinkedPack,
  newWorkId,
  parseStartLink,
  readScreenState,
  resolvePopState,
  returnToWork,
  screenState,
  standInState,
  startLinkUrl,
  startOverState,
  withoutStartLink,
  workspaceState,
} from '@/lib/startFlow';
import { plural } from '@/lib/utils';
import {
  canOpenPack,
  downloadPackZip,
  type LibraryPackSummary,
  signInUrl,
  updatePackZip,
  WebsiteApiError,
} from '@/lib/websiteApi';
import {
  countDrawnKeys,
  getVisibility,
  getWorkspaceStage,
  type WorkspaceStage,
} from '@/lib/workspaceVisibility';
import {
  addFileToKeys,
  clearKeySounds,
  giveFilesToKeysInOrder,
  giveFilesToTheirKeys,
  giveOneSoundToKeys,
  keysToFill,
  oneSoundSegment,
  playFileSegment,
  readSoundLengths,
  spreadFilesAcrossKeys,
  swapPressAndRelease,
  withMediaType,
} from '@/utils/audioUtils';
import {
  createBlankSnapshot,
  createDefaultPackInfo,
  hasUnsavedChanges,
} from '@/utils/blankPack';
import { getHistoryShortcut, type PackSnapshot } from '@/utils/packHistory';
import {
  type AudioSource,
  addSources,
  createAudioSource,
  isSamePackInfo,
  isWholeFile,
  type KeySounds,
  listKeys,
  type PackExtras,
  type PackType,
  type Segment,
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

// Sound editing panel on wide (lg) screens. By default it takes half the
// viewport, up to the original 524px, and never less than what its controls need
// with a comfortable waveform, unless the screen is too short to also fit a
// usable keyboard. Dragging its top edge trades keyboard space for
// waveform space, and the choice is remembered in this browser. The waveform
// absorbs every pixel the panel gains or gives up.
const LG_MIN_WIDTH = 1024;
const PANEL_MAX_HEIGHT = 524;
const WAVEFORM_MAX_HEIGHT = 200;
const WAVEFORM_MIN_HEIGHT = 110;
/**
 * On a screen too short for both, the waveform gives way to the controls down
 * to this height before the controls scroll.
 */
const WAVEFORM_SQUEEZED_HEIGHT = 64;
/**
 * Panel height taken by everything except the waveform, until the panel's
 * controls are on the page to measure.
 */
const PANEL_CONTROLS_HEIGHT = PANEL_MAX_HEIGHT - WAVEFORM_MAX_HEIGHT;
const PANEL_MIN_HEIGHT = PANEL_CONTROLS_HEIGHT + WAVEFORM_MIN_HEIGHT;
/** Smallest dragged height; below PANEL_MIN_HEIGHT the controls scroll. */
const PANEL_DRAG_MIN_HEIGHT = 240;
/**
 * Smallest default height: the waveform's header, a squeezed waveform and the
 * Sound row, which stays pinned to the panel's bottom while the rest scrolls.
 * Only a screen too short for that and a usable keyboard goes below it.
 */
const PANEL_SQUEEZED_MIN_HEIGHT = 216;
/** The panel's collapse transition caps it at 48rem (index.css). */
const PANEL_DRAG_MAX_HEIGHT = 720;
/**
 * Viewport height kept for the navbar, the footer and a usable keyboard,
 * until the keyboard's own room is on the page to measure.
 */
const PANEL_RESERVED_HEIGHT = 320;
/** The drag handle's 4px in the layout and the panel's 2px top border. */
const PANEL_EDGE_HEIGHT = 6;
/**
 * Stacked, the file list gives way to the pane of a file of one sound down to
 * about two rows; below that the panel scrolls.
 */
const STACKED_LIST_MIN_HEIGHT = 112;
/** On screen, key labels grow back to this as the keyboard scales down... */
const KEY_LABEL_MIN_PX = 8;
/**
 * ...up to the largest label, before scaling, that the narrowest keys still
 * fit ("Delete" on one unit). Further down they shrink with the keys.
 */
const KEY_LABEL_MAX_PX = 17;
const KEY_LABEL_PX = 12;
/**
 * Smallest scale the panel leaves the keyboard, dragged or not: the last at
 * which labels read 8px, a full-size keyboard about 600px wide with keys
 * about 25px across. On short screens the panel gives way to it, and its
 * controls scroll.
 */
const KEYBOARD_MIN_SCALE = KEY_LABEL_MIN_PX / KEY_LABEL_MAX_PX;
/**
 * Width the rows around the keyboard need to read in full. When the panel's
 * controls still fit, a narrower layout (TKL, Compact) is kept this wide.
 */
const ROWS_READABLE_WIDTH = 560;
/** Keyboard width (40rem) from which the Next line reads at the larger size. */
const NEXT_STEP_LARGE_WIDTH = 640;
const PANEL_RESIZE_STEP = 16;
/** The panels' collapse takes ~320ms (index.css); the tour waits it out. */
const AUTO_TOUR_DELAY_MS = 400;
const PANEL_HEIGHT_STORAGE_KEY = 'mechvibes-editor:panel-height';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The tallest the panel may be dragged; `room` is as in PanelRoom. */
function getPanelDragMax(viewportHeight: number, room: number) {
  return clamp(
    Number.isFinite(room) ? room : viewportHeight - PANEL_RESERVED_HEIGHT,
    PANEL_DRAG_MIN_HEIGHT,
    PANEL_DRAG_MAX_HEIGHT,
  );
}

/** Heights in px the panel weighs against the keyboard; Infinity until measured. */
type PanelRoom = {
  /** The most the panel may take and still leave a usable keyboard. */
  usable: number;
  /** The most it may take and leave the keyboard as wide as its rows read. */
  readable: number;
  /** What its controls take with a squeezed waveform. */
  needed: number;
};

/**
 * Panel height in px on lg screens, or null when the panel stacks and sizes to
 * its content. `chosen` is the dragged height, or null for the default. The
 * default leaves a usable keyboard first, then fits its controls, then leaves
 * the keyboard as wide as its rows read, and keeps its squeezed minimum.
 */
function getPanelHeight(
  viewport: { width: number; height: number },
  chosen: number | null,
  room: PanelRoom,
): number | null {
  if (viewport.width < LG_MIN_WIDTH) return null;
  if (chosen === null) {
    const preferred = clamp(
      Math.round(viewport.height / 2),
      PANEL_MIN_HEIGHT,
      PANEL_MAX_HEIGHT,
    );
    return Math.max(
      Math.min(preferred, Math.max(room.readable, room.needed), room.usable),
      PANEL_SQUEEZED_MIN_HEIGHT,
    );
  }
  return clamp(
    chosen,
    PANEL_DRAG_MIN_HEIGHT,
    getPanelDragMax(viewport.height, room.usable),
  );
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

/**
 * A sound playing outside the waveform: a file of one sound from its row or
 * pane, or half of the selected key's sound from its card.
 */
type Playing =
  | { kind: 'file'; id: string }
  | { kind: 'key'; code: string; slot: SoundSlot };

const isSamePlaying = (a: Playing | null, b: Playing) =>
  a !== null &&
  (a.kind === 'file'
    ? b.kind === 'file' && a.id === b.id
    : b.kind === 'key' && a.code === b.code && a.slot === b.slot);

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

/** Files a new pack starts with, and the names of those a drop left out. */
type IncomingFiles = { files: File[]; skipped: string[] };
const NO_FILES: IncomingFiles = { files: [], skipped: [] };

/** Why files could not be added, named where they were added. */
function unreadableMessage(names: string[]) {
  return names.length === 1
    ? `Your browser can't read the sound in ${names[0]}. Try an MP4 or MP3 copy.`
    : `Your browser can't read the sound in ${names.length} files: ${listKeys(names)}. Try MP4 or MP3 copies.`;
}

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
  // The pack as it is now, for work that ends after an await.
  const presentRef = useRef(present);
  presentRef.current = present;
  // What was last imported, opened, exported or updated; leaving loses changes made since.
  const [savedSnapshot, setSavedSnapshot] = useState(present);
  // What the library holds for the open pack: set on open and on each successful Update.
  const [publishedSnapshot, setPublishedSnapshot] =
    useState<PackSnapshot | null>(null);
  // What the last Download wrote, or the zip just opened: the file on disk.
  // Update leaves it alone, unlike savedSnapshot.
  const [downloadedSnapshot, setDownloadedSnapshot] =
    useState<PackSnapshot | null>(null);
  // Try it was entered with this pack; the progress line marks it.
  const [hasTriedIt, setHasTriedIt] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  // Whether the sound controls assign press or release sounds.
  const [soundSlot, setSoundSlot] = useState<SoundSlot>('press');
  // Start, End, Duration and the Auto detect threshold, under More.
  const [showExactTimes, setShowExactTimes] = useSessionFlag(
    'mechvibes-editor:exact-times-open',
  );
  const [defaultDuration, setDefaultDuration] = useState(100);
  const [showEditPackModal, setShowEditPackModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Set when a pack is opened, for Try it to draw the eye for a moment.
  const [emphasizeTryIt, setEmphasizeTryIt] = useState(false);
  // The tour asked to open by itself on entering a pack, until it does or
  // is passed over.
  const [autoTour, setAutoTour] = useState<TourFlow | null>(null);
  // config.id of an imported zip, kept on export. The editor never invents
  // one: the library issues ids, and the app mints imported-<uuid> otherwise.
  const [loadedPackId, setLoadedPackId] = useState<string | null>(null);
  // What an imported zip carried that the editor does not edit.
  const [packExtras, setPackExtras] = useState<PackExtras | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [pressedKeyCodes, setPressedKeyCodes] = useState<Set<string>>(
    new Set(),
  );
  // Another way in, waiting while the visitor is asked whether to discard the
  // unsaved work it would replace.
  const [confirmDiscardAction, setConfirmDiscardAction] = useState<
    | null
    | { pack: LibraryPackSummary }
    | { file: File }
    | ({ packType: PackType } & IncomingFiles)
  >(null);
  // The editor opens on the start screen; the pack controls show in the workspace.
  const [screen, setScreen] = useState<EditorScreen>('start');
  const isWorkspace = screen === 'workspace';
  // The work in the workspace, null until one is entered. Start over keeps
  // it behind the start screens, with the workspace mounted but hidden, so
  // Back to returns to it as it was; another way in replaces it.
  const [workId, setWorkId] = useState<string | null>(null);
  // A phone gets a page of its own instead of the editor. The pack stays in
  // state, so a window narrowed for a moment loses nothing.
  const isPhone = usePhoneScreen();
  // What the link the editor was opened with asks for, until it is acted on
  // or the visitor goes elsewhere from the start screen.
  const [startLink, setStartLink] = useState(() =>
    parseStartLink(window.location.search),
  );
  // Files that go into the new pack once Keyboard or Mouse is chosen, and
  // the names of those the drop left out.
  const [pendingFiles, setPendingFiles] = useState<IncomingFiles>(NO_FILES);
  // Why a pack file or a library pack did not open, shown where it was asked for.
  const [openFileError, setOpenFileError] = useState<string | null>(null);
  const [libraryOpenError, setLibraryOpenError] = useState<string | null>(null);
  const [isOpeningFile, setIsOpeningFile] = useState(false);
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
  const packFileInputRef = useRef<HTMLInputElement>(null);
  // Whether each file is one sound or many, which decides how it shows. It
  // is not part of the pack, so it stays out of history and unsaved changes;
  // Undo of a Remove brings the file back with its id, and so its kind.
  const [fileKinds, setFileKinds] = useState<ReadonlyMap<string, FileKind>>(
    () => new Map(),
  );
  // The files the last add brought in, for the summary over the sound panel.
  const [lastAdd, setLastAdd] = useState<AddBatch | null>(null);
  // Files on their way in, and why some of the last ones could not come.
  const [reading, setReading] = useState<ReadingProgress | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  // The work files are added to, set with workId: a read that ends after
  // another pack took its place adds nothing to that one.
  const workRef = useRef<string | null>(null);
  // The adds being read, as one: their files read so far and in all, how
  // many adds are still reading, and what those done brought in or left out.
  const readGroupRef = useRef<{
    read: number;
    total: number;
    pending: number;
    ids: string[];
    skipped: string[];
    unreadable: string[];
  } | null>(null);
  // What plays outside the waveform, and how to stop it.
  const [playing, setPlaying] = useState<Playing | null>(null);
  const playingRef = useRef<Playing | null>(null);
  const playingSourceId = playing?.kind === 'file' ? playing.id : null;
  // The key whose file the Change file dialog changes, while it is open.
  const [changeFileFor, setChangeFileFor] = useState<string | null>(null);
  // New audio read for Replace file…, while the warning about the keys that
  // would run past its end, or play all of a long file, asks first.
  const [pendingReplace, setPendingReplace] = useState<{
    id: string;
    file: File;
    duration: number;
    warning: NonNullable<ReturnType<typeof replaceWarning>>;
  } | null>(null);
  // Files about to become one sound each, while the warning about their
  // length asks first.
  const [pendingKinds, setPendingKinds] = useState<{
    ids: string[];
    warning: NonNullable<ReturnType<typeof longFileWarning>>;
  } | null>(null);
  // The file of one sound dragged from the list towards the keys, and the
  // key a dragged file is over, from the list or from the computer.
  const [draggedSourceId, setDraggedSourceId] = useState<string | null>(null);
  const [dropCode, setDropCode] = useState<string | null>(null);
  const stopSoundRef = useRef<(() => void) | null>(null);
  // Codes of the keys to keep selected across the next change of layout.
  const keptSelectionRef = useRef<readonly string[] | null>(null);

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
  // The keys that play each file.
  const codesBySource = useMemo(() => {
    const codes = new Map<string, string[]>();
    keySounds.forEach(({ source }, code) => {
      codes.set(source, [...(codes.get(source) ?? []), code]);
    });
    return codes;
  }, [keySounds]);
  // A file whose kind was never told, as one undone before this pack opened,
  // keeps the waveform.
  const activeFileKind: FileKind | null = activeSourceId
    ? (fileKinds.get(activeSourceId) ?? 'many')
    : null;
  // Keys show the colour and name of the file their sound comes from.
  const sourcesById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  // Changes Start over, opening a library pack or closing the tab would lose.
  const isDirty = hasUnsavedChanges(present, savedSnapshot);

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
  // copy of the pack, so page-wide shortcuts stay off meanwhile. The start
  // screens have no pack to edit, and the phone page shows none.
  const isKeyboardOwnedElsewhere =
    !isWorkspace ||
    isPhone ||
    isPreview ||
    showEditPackModal ||
    showShortcuts ||
    changeFileFor !== null ||
    pendingReplace !== null ||
    pendingKinds !== null ||
    confirmDiscardAction !== null ||
    pendingPackType !== null ||
    showMyPacks ||
    isExporting ||
    isUpdating ||
    isOpeningFile ||
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
    // The keyboard of a pack with no file yet is drawn faded and takes no clicks.
    enabled:
      !isKeyboardOwnedElsewhere &&
      getWorkspaceStage({
        sourceCount: sources.length,
        keySounds,
        packType: packInfo.packType,
      }) !== 'no-files',
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

  // What the workspace shows, from how far the pack has come.
  const visibility = getVisibility({
    sourceCount: sources.length,
    keySounds,
    packType: packInfo.packType,
    isLibraryPack: libraryPack !== null,
    isSignedIn: session.status === 'signed-in',
    selectedCodes,
    activeFileKind,
  });
  const noun = packInfo.packType === 'Mouse' ? 'button' : 'key';
  // The one selected key or button, when it has a sound: its card shows
  // under the file list.
  const cardCode =
    selectedCodes.length === 1 && keySounds.has(selectedCodes[0])
      ? selectedCodes[0]
      : null;
  const cardSound = cardCode ? keySounds.get(cardCode) : undefined;
  const cardSource = cardSound ? sourcesById.get(cardSound.source) : undefined;
  const showKeyCard = visibility.soundPanel && cardSource !== undefined;
  // The keys a dragged file would go to, lit up while it is over one.
  const dropCodes = useMemo(
    () => (dropCode ? new Set(dropTargetCodes(dropCode, selectedCodes)) : null),
    [dropCode, selectedCodes],
  );
  // How that key plays the file on the waveform, for the Next line.
  const selectedKeyFile =
    !cardSound || !activeSource
      ? null
      : cardSound.source !== activeSource.id
        ? 'other'
        : !cardSound.release &&
            playsWholeFile(cardSound.press, activeSource.duration)
          ? 'whole'
          : null;

  // What the last add brought in, read from the pack as it is now.
  const addSummary = useMemo(
    () =>
      lastAdd &&
      summarizeAdd({
        batch: lastAdd,
        sources,
        kinds: fileKinds,
        keySounds,
        packType: packInfo.packType,
      }),
    [lastAdd, sources, fileKinds, keySounds, packInfo.packType],
  );
  const hasSummary = Boolean(addSummary || reading || addError);
  const keyCount = useMemo(
    () => countDrawnKeys(keySounds, getLayoutCodes(layout)),
    [keySounds, layout],
  );
  // Saving is Update for a library pack, Download .zip otherwise; each is
  // done while the pack is as it was last saved that way.
  const saveMark = visibility.library ? publishedSnapshot : downloadedSnapshot;
  const progressItems = getProgressItems({
    stage: visibility.stage,
    withSound: keyCount.withSound,
    drawn: keyCount.withSound + keyCount.silent,
    isMousePack: packInfo.packType === 'Mouse',
    hasTriedIt,
    canTryIt: playableCount > 0,
    library: visibility.library,
    isSaved: saveMark !== null && !hasUnsavedChanges(present, saveMark),
  });

  // Release is a choice made for keys that have a press. Without the switch
  // the controls assign presses, and once it shows again it starts on Press:
  // applying a press to a silent key must not turn the next Apply into a
  // release the visitor never picked.
  useEffect(() => {
    if (!visibility.pressReleaseToggle) setSoundSlot('press');
  }, [visibility.pressReleaseToggle]);

  // The keyboard of a pack with no file takes no clicks or keys, so a
  // selection left on it (an Undo of the only file) could not be cleared
  // there, and would come back unseen with the next file. Try it is marked
  // done for the sounds that were tried, not for the next ones.
  useEffect(() => {
    if (visibility.stage !== 'no-files') return;
    setSelectedKeys(new Set());
    setHasTriedIt(false);
  }, [visibility.stage, setSelectedKeys]);

  // Height the rows around the keyboard take, each with the column's 12px gap:
  // the settings row above, then the hidden-keys tray and the legend with the
  // progress line below, when shown. Fixed rather than measured: those rows derive
  // their width from keyboardScale, so measuring them would make the scale
  // depend on its own output. Each row stays on one line, its text cut short
  // rather than wrapped, so these heights hold. Preview collapses them all,
  // so the keyboard gets that space back.
  const rowsHeight = isPreview
    ? 0
    : [
        24,
        hasHiddenKeys ? 24 : 0,
        visibility.legend ? KEY_LEGEND_ROWS_HEIGHT : 0,
      ]
        .filter((height) => height > 0)
        .reduce((sum, height) => sum + height + 12, 0);
  // The rows line up with the keyboard, and are never narrower than it is at
  // its smallest scale, nor than the legend and progress line need. The
  // mouse's rows keep the width they need to read.
  const keyboardWidth = keyboardNaturalWidth * keyboardScale;
  const rowsMinWidth =
    layout === 'mouse'
      ? ROWS_READABLE_WIDTH
      : Math.max(
          keyboardNaturalWidth * KEYBOARD_MIN_SCALE,
          KEY_LEGEND_ROWS_MIN_WIDTH,
        );
  const rowsStyle = {
    maxWidth: keyboardWidth,
    minWidth: `min(100%, ${rowsMinWidth}px)`,
  };
  // The settings row is as wide as the rows, or as wide as its words and the
  // size switch need over a narrow keyboard, up to the column's width: only a
  // column too narrow for them cuts the Next line short.
  const settingsRowStyle = {
    minWidth: `min(100%, ${Math.max(keyboardWidth, rowsMinWidth)}px)`,
  };

  // Height the keyboard column (inside its padding), the drag handle and the
  // panel share: the page below the navbar and any notice, however tall the
  // notice is. The column is what grows and shrinks between them, so a
  // change of either shows up as a resize of the column.
  const [sharedHeight, setSharedHeight] = useState<number | null>(null);
  const measureSharedHeight = useCallback(() => {
    const column = keyboardAreaRef.current?.parentElement;
    // The wrapper that hides the workspace behind the start screens has no
    // box of its own while it shows (display: contents), so the page is the
    // first ancestor laid out as one.
    let page = column?.parentElement;
    while (page && getComputedStyle(page).display === 'contents') {
      page = page.parentElement;
    }
    if (!column || !page) return;
    const style = getComputedStyle(column);
    setSharedHeight(
      Math.round(
        page.getBoundingClientRect().bottom -
          column.getBoundingClientRect().top -
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom),
      ),
    );
  }, []);

  // Height the panel's content takes besides the waveform, measured so the
  // waveform can take what is left: More, a second row of chips or, stacked,
  // each file in the list. It does not depend on the waveform's own height,
  // so measuring it feeds nothing back.
  const panelRowRef = useRef<HTMLDivElement>(null);
  const panelControlsRef = useRef<HTMLDivElement>(null);
  // The summary of the last add, across the top of the panel.
  const summaryRef = useRef<HTMLElement>(null);
  const [panelControlsHeight, setPanelControlsHeight] = useState<number | null>(
    null,
  );
  // What the pane of a file of one sound needs, which has no waveform.
  const [oneSoundHeight, setOneSoundHeight] = useState<number | null>(null);
  // The same, up to where Quick select starts; null without Quick select.
  const [quickSelectStart, setQuickSelectStart] = useState<number | null>(null);
  // Stacked, what that pane's panel holds besides the file list.
  const [stackedListRest, setStackedListRest] = useState<number | null>(null);

  // The panel leaves the keyboard its rows and at least its smallest scale.
  // Keyboard sizes narrower than full size are kept as wide as their rows
  // read while the panel's controls fit; the mouse is no row-wide drawing.
  const keyboardMinHeight = keyboardNaturalHeight * KEYBOARD_MIN_SCALE;
  const keyboardReadableHeight =
    layout === 'mouse'
      ? keyboardMinHeight
      : Math.max(
          keyboardMinHeight,
          (keyboardNaturalHeight * ROWS_READABLE_WIDTH) / keyboardNaturalWidth,
        );
  const panelSpace =
    sharedHeight === null
      ? Number.POSITIVE_INFINITY
      : sharedHeight - PANEL_EDGE_HEIGHT - rowsHeight;
  const panelRoom: PanelRoom = {
    usable: Math.floor(panelSpace - keyboardMinHeight),
    readable: Math.floor(panelSpace - keyboardReadableHeight),
    // The pane of a file of one sound takes the panel the waveform has, so
    // switching between files keeps the keyboard still; only a pane taller
    // than that grows the panel.
    needed: Math.max(
      (panelControlsHeight ?? PANEL_CONTROLS_HEIGHT) + WAVEFORM_SQUEEZED_HEIGHT,
      oneSoundHeight ?? 0,
    ),
  };
  const panelHeight = getPanelHeight(viewport, chosenPanelHeight, panelRoom);
  const panelDragMax = getPanelDragMax(viewport.height, panelRoom.usable);
  // Stacked, the panel sizes to its content up to the same room.
  const stackedPanelMax = Math.max(panelRoom.usable, PANEL_DRAG_MIN_HEIGHT);
  const isStacked = panelHeight === null;
  const measurePanelControls = useCallback(() => {
    const row = panelRowRef.current;
    const controls = panelControlsRef.current;
    const column = controls?.parentElement;
    const waveform = controls?.querySelector<HTMLElement>(
      WAVEFORM_BOX_SELECTOR,
    );
    if (!row || !controls || !column) return;
    // The summary sits over both columns and takes its height off the rest.
    const summary = summaryRef.current?.offsetHeight ?? 0;
    const quickSelect = controls.querySelector<HTMLElement>(
      QUICK_SELECT_SELECTOR,
    );
    // Within the controls, which scroll as one, so their scroll is no matter.
    const toQuickSelect = quickSelect
      ? quickSelect.getBoundingClientRect().top -
        controls.getBoundingClientRect().top
      : null;
    // Stacked, the whole row grows with its content and scrolls in the
    // panel. Side by side, the panel has a fixed height and only the right
    // column's content counts, with the column's padding and the row's
    // bottom border, which stays below the column's fold.
    let needed = summary + row.offsetHeight;
    let start =
      toQuickSelect === null
        ? null
        : summary +
          controls.getBoundingClientRect().top -
          row.getBoundingClientRect().top +
          toQuickSelect;
    if (!isStacked) {
      const columnStyle = getComputedStyle(column);
      const paddingTop = parseFloat(columnStyle.paddingTop);
      const border = parseFloat(getComputedStyle(row).borderBottomWidth);
      needed =
        summary +
        controls.offsetHeight +
        paddingTop +
        parseFloat(columnStyle.paddingBottom) +
        border;
      start =
        toQuickSelect === null
          ? null
          : summary + paddingTop + toQuickSelect + border;
    }
    // Without a waveform the pane is measured whole, apart from the
    // waveform's numbers, which the next file with one picks up again.
    if (!waveform) {
      setOneSoundHeight(needed);
      const list = row.querySelector<HTMLElement>(FILE_LIST_SELECTOR);
      setStackedListRest(isStacked && list ? needed - list.offsetHeight : null);
      return;
    }
    setPanelControlsHeight(needed - waveform.offsetHeight);
    setQuickSelectStart(
      start === null ? null : Math.round(start - waveform.offsetHeight),
    );
  }, [isStacked]);

  // Measured after every commit, so a row or a notice this page adds is
  // counted before it paints; the observers catch what changes size without
  // a render here, such as a row a child opens or chips that wrap.
  useLayoutEffect(() => {
    if (!isWorkspace || isPhone) return;
    measureSharedHeight();
    measurePanelControls();
  });
  const hasPanelControls = visibility.waveform || visibility.oneSoundPane;
  useLayoutEffect(() => {
    if (!isWorkspace || isPhone) return;
    const observer = new ResizeObserver(() => {
      measureSharedHeight();
      measurePanelControls();
    });
    for (const el of [
      keyboardAreaRef.current?.parentElement,
      panelRowRef.current,
      // Each comes and goes with what it holds.
      hasSummary ? summaryRef.current : null,
      hasPanelControls ? panelControlsRef.current : null,
    ]) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [
    isWorkspace,
    isPhone,
    hasPanelControls,
    hasSummary,
    measureSharedHeight,
    measurePanelControls,
  ]);

  // The waveform takes what the panel has besides its controls: the fixed
  // height side by side, about half the screen stacked, within the most the
  // panel shows before its controls scroll. A panel too short for them all
  // ends where Quick select starts and the waveform takes the rest, so the
  // chips wait below the fold whole rather than show a slice.
  const panelView = panelHeight ?? stackedPanelMax;
  // Stacked, the pane of a file of one sound has no waveform to give way, so
  // the file list does: the summary, the key card and the pane's chips stay
  // in the panel. Over the waveform, the list gives the key card its room.
  const fileListMax = !isStacked
    ? undefined
    : visibility.oneSoundPane && stackedListRest !== null
      ? Math.max(STACKED_LIST_MIN_HEIGHT, stackedPanelMax - stackedListRest)
      : visibility.waveform && showKeyCard
        ? STACKED_LIST_MIN_HEIGHT
        : undefined;
  const panelControls = panelControlsHeight ?? PANEL_CONTROLS_HEIGHT;
  const waveformHeight = clamp(
    quickSelectStart !== null &&
      panelControls + WAVEFORM_SQUEEZED_HEIGHT > panelView
      ? panelView - quickSelectStart
      : Math.min(panelHeight ?? Math.round(viewport.height / 2), panelView) -
          panelControls,
    WAVEFORM_SQUEEZED_HEIGHT,
    WAVEFORM_MAX_HEIGHT,
  );

  const panelDragRef = useRef<{ startY: number; startHeight: number } | null>(
    null,
  );
  const resizePanel = (height: number) => {
    setChosenPanelHeight(
      Math.round(clamp(height, PANEL_DRAG_MIN_HEIGHT, panelDragMax)),
    );
  };

  useEffect(() => {
    // The keyboard is shown only in the workspace: the start screens hide it
    // (its container then measures 0x0) and the phone page takes it off.
    // Coming back measures again, from the container shown by then.
    if (!isWorkspace || isPhone) return;
    const el = keyboardAreaRef.current;
    // Measure the parent, not the keyboard wrapper: the wrapper now shrinks to the
    // scaled keyboard, so observing it would feed its own output back in as input.
    const target = el?.parentElement;
    if (!target) return;
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
      // A container taken off the page measures 0x0; that is no size to fit.
      if (width === 0 && height === 0) return;
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
  }, [
    isWorkspace,
    isPhone,
    keyboardNaturalWidth,
    keyboardNaturalHeight,
    rowsHeight,
  ]);

  // Delete, Backspace and the Clear button take the whole sound off the
  // selected keys, as one undo step. Keys without a sound add no step.
  const clearSelectedKeySounds = () => {
    const count = selectedCodes.filter((code) => keySounds.has(code)).length;
    if (count === 0) return;
    commitKeySounds(`Clear ${plural(count, noun)}`, (current) =>
      clearKeySounds(selectedCodes, current),
    );
  };

  // Add audio or video files; the first one added opens. Files without a
  // type get one from their extension first. Each is decoded on the way in:
  // one the browser cannot read is named here and left out. `tile` is the
  // way in the visitor chose, which says what kind the files are. An add
  // that starts while another is read joins it, so the reading line
  // counts the files of both until the last is read, and the summary and the
  // error cover them all. A single file for `giveTo` keys, short enough to be
  // one key sound, goes to them in the same step.
  const handleAddSources = async (
    files: File[],
    {
      tile,
      skipped = [],
      giveTo,
    }: AddOptions & { giveTo?: readonly string[] } = {},
  ) => {
    if (files.length === 0) {
      setAddError('There are no audio or video files in this folder.');
      return;
    }
    const typed = files.map(withMediaType);
    const read = await readIntoGroup(typed, skipped);
    if (!read) return;
    const { group, lengths } = read;
    group.unreadable.push(
      ...typed.flatMap((file, index) =>
        lengths[index] === 0 ? file.name : [],
      ),
    );
    if (group.unreadable.length > 0) {
      setAddError(unreadableMessage(group.unreadable));
    }
    const added = typed.flatMap((file, index) =>
      lengths[index] > 0 ? [createAudioSource(file, lengths[index])] : [],
    );
    if (added.length === 0) return;
    // A longer file is a recording: it opens on the waveform for the keys,
    // still selected, to get the part cut for them.
    const givenTo =
      giveTo &&
      giveTo.length > 0 &&
      added.length === 1 &&
      added[0].duration <= LONG_FILE_SECONDS
        ? giveTo
        : null;
    // Appends to the latest files, and picks colours against them: an Undo
    // can land while the files are read.
    if (givenTo) {
      commit(
        `Add ${added[0].file.name} and give it to ${plural(givenTo.length, noun)}`,
        (current) => addFileToKeys(current, added[0], givenTo),
      );
    } else {
      commit(
        added.length === 1
          ? `Add ${added[0].file.name}`
          : `Add ${added.length} files`,
        (current) => ({ sources: addSources(current.sources, added) }),
      );
    }
    setFileKinds((current) => {
      const next = new Map(current);
      for (const source of added) {
        next.set(
          source.id,
          givenTo
            ? 'one'
            : inferNewFileKind(source.file, source.duration, tile),
        );
      }
      return next;
    });
    group.ids.push(...added.map((source) => source.id));
    setLastAdd({ ids: [...group.ids], skipped: [...group.skipped] });
    setActiveSourceId(added[0].id);
    setWaveformSelection({ start: 0, end: 0 });
    if (givenTo) {
      playSource(added[0], true);
    } else if (giveTo && giveTo.length > 0) {
      // The keys it was dropped on, those drawn, wait selected for the part
      // cut from it.
      const ids = [...keyCodeById]
        .filter(([, code]) => giveTo.includes(code))
        .map(([id]) => id);
      if (ids.length > 0) setSelectedKeys(new Set(ids));
    }
  };

  // Read the lengths of files on their way in, counted on the reading line
  // with any others being read. Null when another pack took this one's place
  // meanwhile.
  const readIntoGroup = async (
    typed: File[],
    skipped: readonly string[] = [],
  ) => {
    const work = workRef.current;
    const group = readGroupRef.current ?? {
      read: 0,
      total: 0,
      pending: 0,
      ids: [],
      skipped: [],
      unreadable: [],
    };
    if (readGroupRef.current !== group) {
      readGroupRef.current = group;
      setAddError(null);
    }
    group.total += typed.length;
    group.pending += 1;
    group.skipped.push(...skipped);
    setReading({ read: group.read, total: group.total });
    const lengths = await readSoundLengths(typed, () => {
      if (readGroupRef.current !== group) return;
      group.read += 1;
      setReading({ read: group.read, total: group.total });
    });
    // Another pack took this one's place while the files were read.
    if (workRef.current !== work || readGroupRef.current !== group) {
      return null;
    }
    group.pending -= 1;
    if (group.pending === 0) {
      readGroupRef.current = null;
      setReading(null);
    }
    return { group, lengths };
  };

  // Stop the sound that plays outside the waveform.
  const stopSound = useCallback(() => {
    stopSoundRef.current?.();
    stopSoundRef.current = null;
  }, []);

  // Play part of a file outside the waveform, one sound at a time. Played
  // again while it plays, it stops, unless `restart`.
  const playPart = (
    what: Playing,
    file: File,
    segment: Segment,
    restart = false,
  ) => {
    const wasPlaying = isSamePlaying(playingRef.current, what);
    stopSound();
    if (wasPlaying && !restart) return;
    playingRef.current = what;
    setPlaying(what);
    stopSoundRef.current = playFileSegment(file, segment, () => {
      if (playingRef.current !== what) return;
      playingRef.current = null;
      setPlaying(null);
    });
  };

  // Play a file of one sound as its keys do: the part they share, else the
  // whole file.
  const playSource = (source: AudioSource, restart = false) =>
    playPart(
      { kind: 'file', id: source.id },
      source.file,
      oneSoundSegment(source, keySounds),
      restart,
    );

  // Give a file of one sound to keys, as one step. Giving it again to keys
  // that already play it adds none.
  const giveFileTo = (source: AudioSource, codes: readonly string[]) => {
    if (codes.length === 0) return;
    commitKeySounds(
      `Give ${source.file.name} to ${plural(codes.length, noun)}`,
      (current) => giveOneSoundToKeys(codes, source, current),
    );
  };
  const giveToSelected = (source: AudioSource) =>
    giveFileTo(source, selectedCodes);

  // A file of one sound dropped from the list on a key goes to it, or to
  // every selected key when it is one of them, as a click on the file with
  // those keys selected would: it plays and opens, and the selection stays.
  const dropSourceOn = (id: string, code: string) => {
    const source = sourcesById.get(id);
    if (!source || fileKinds.get(id) !== 'one') return;
    giveFileTo(source, dropTargetCodes(code, selectedCodes));
    playSource(source, true);
    if (id === activeSourceId) return;
    setActiveSourceId(id);
    setWaveformSelection({ start: 0, end: 0 });
  };

  // The drag of a file from the list ends, dropped or not.
  const endSourceDrag = () => {
    setDraggedSourceId(null);
    setDropCode(null);
  };

  // A click on a file opens it; a file of one sound also plays, and goes to
  // the selected keys, so the next file on the same keys is one click away.
  const handleSelectSource = (id: string) => {
    const source = sourcesById.get(id);
    if (!source) return;
    if (fileKinds.get(id) === 'one') {
      giveToSelected(source);
      playSource(source, true);
    }
    if (id === activeSourceId) return;
    setActiveSourceId(id);
    setWaveformSelection({ start: 0, end: 0 });
  };

  const setKinds = (ids: readonly string[], kind: FileKind) => {
    setFileKinds((current) => {
      const next = new Map(current);
      for (const id of ids) next.set(id, kind);
      return next;
    });
  };

  // The person says what files hold. Before a file longer than a key sound
  // becomes one sound, which keys would then play whole, they are asked.
  const requestKinds = (ids: readonly string[], kind: FileKind) => {
    const turning = ids.filter((id) => fileKinds.get(id) !== kind);
    const warning =
      kind === 'one'
        ? longFileWarning(
            turning.flatMap((id) => sourcesById.get(id) ?? []),
            packInfo.packType,
          )
        : null;
    if (warning) {
      setPendingKinds({ ids: [...ids], warning });
    } else {
      setKinds(ids, kind);
    }
  };

  // Replace the audio of a file for every key that plays it, as one step,
  // once the new file is read. Parts cut from it keep their times; keys that
  // would then run past its end, or play all of a long file, are asked about
  // first. The file is read on the reading line, as an added one is.
  const replaceSource = async (id: string, file: File) => {
    const typed = withMediaType(file);
    const read = await readIntoGroup([typed]);
    if (!read) return;
    const [duration] = read.lengths;
    if (duration === 0) {
      read.group.unreadable.push(typed.name);
      setAddError(unreadableMessage(read.group.unreadable));
      return;
    }
    const { sources: now, keySounds: sounds } = presentRef.current;
    const source = now.find((s) => s.id === id);
    if (!source) return;
    const warning = replaceWarning(
      source.file.name,
      replaceSourceFile(source, typed, duration, sounds),
      fileKinds.get(id) === 'one',
      noun,
    );
    if (warning) {
      setPendingReplace({ id, file: typed, duration, warning });
    } else {
      commitReplace(id, typed, duration);
    }
  };

  const commitReplace = (id: string, file: File, duration: number) => {
    const old = presentRef.current.sources.find((s) => s.id === id);
    if (!old) return;
    // A file an Undo took away meanwhile is not brought back.
    commit(`Replace ${old.file.name} with ${file.name}`, (current) => {
      const source = current.sources.find((s) => s.id === id);
      if (!source) return null;
      const next = replaceSourceFile(source, file, duration, current.keySounds);
      return {
        sources: current.sources.map((s) => (s.id === id ? next.source : s)),
        keySounds: next.keySounds,
      };
    });
  };

  // Half of the key's sound, from its card.
  const playKeySound = (code: string, slot: SoundSlot) => {
    const sound = keySounds.get(code);
    const source = sound && sourcesById.get(sound.source);
    const segment = slot === 'press' ? sound?.press : sound?.release;
    if (!source || !segment) return;
    playPart({ kind: 'key', code, slot }, source.file, segment);
  };

  // A key's whole file goes on the waveform, its press over all of it, to be
  // cut into a press and a release. How the file shows is no change to the
  // pack, so it adds no step.
  const splitFileOf = (code: string) => {
    const sound = keySounds.get(code);
    const source = sound && sourcesById.get(sound.source);
    if (!sound || !source) return;
    setKinds([source.id], 'many');
    setActiveSourceId(source.id);
    setSoundSlot('press');
    const [start, end] = sound.press;
    setWaveformSelection(
      end > start ? { start, end } : { start: 0, end: source.duration * 1000 },
    );
  };

  // The key's file goes on the waveform for its release, cut there and
  // applied as usual. Only the waveform cuts a release, so a file of one
  // sound shows as many.
  const addReleaseTo = (code: string) => {
    const sound = keySounds.get(code);
    if (!sound) return;
    if (fileKinds.get(sound.source) === 'one') {
      setKinds([sound.source], 'many');
    }
    setActiveSourceId(sound.source);
    setSoundSlot('release');
    setWaveformSelection({ start: 0, end: 0 });
  };

  // Change file: a file of one sound goes to the key as one step; a file of
  // many opens on the waveform for the key, still selected, to cut its part.
  const pickFileFor = (code: string, id: string) => {
    setChangeFileFor(null);
    const source = sourcesById.get(id);
    if (!source) return;
    if (fileKinds.get(id) === 'one') {
      giveFileTo(source, [code]);
      playSource(source, true);
    } else {
      setSoundSlot('press');
    }
    if (id === activeSourceId) return;
    setActiveSourceId(id);
    setWaveformSelection({ start: 0, end: 0 });
  };

  // The buttons of the summary of the last add, each one step.
  const handleSummaryAction = (line: SummaryActionLine) => {
    const filesOf = (ids: readonly string[]) =>
      ids.flatMap((id) => sourcesById.get(id) ?? []);
    if (line.kind === 'matched') {
      const matches = line.matches.flatMap(({ id, codes }) => {
        const source = sourcesById.get(id);
        return source ? [{ source, codes }] : [];
      });
      commitKeySounds(
        `Give ${plural(matches.length, 'file')} to their ${noun}s`,
        (current) => giveFilesToTheirKeys(matches, current),
      );
      // Keys a smaller keyboard leaves out show, as when a pack is opened.
      // The selected keys stay selected: the give did not use them, and the
      // bigger keyboard draws them all.
      if (packInfo.packType === 'Keyboard') {
        const codes = matches.flatMap((match) => match.codes);
        const wider = widenKeyboardSize(codes, keyboardSize);
        if (wider !== keyboardSize) {
          keptSelectionRef.current = selectedCodes;
          setKeyboardSize(wider);
        }
      }
      return;
    }
    const files = filesOf(line.ids);
    const layoutCodes = getLayoutCodes(layout);
    // Silent keys are counted from the pack as the step finds it.
    const targetsIn = (current: KeySounds) =>
      keysToFill(layoutCodes, selectedCodes, current);
    if (line.kind === 'similar') {
      commitKeySounds(
        `Spread ${plural(files.length, 'file')} across ${plural(targetsIn(keySounds).length, noun)}`,
        (current) => spreadFilesAcrossKeys(files, targetsIn(current), current),
      );
    } else {
      commitKeySounds(
        `Give ${plural(files.length, 'file')} to ${noun}s in order`,
        (current) => giveFilesToKeysInOrder(files, targetsIn(current), current),
      );
    }
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
    // Starting over and opening a pack file leave the library pack, so
    // Update cannot publish unrelated work to it.
    setLibraryPack(null);
    setActiveSourceId(null);
    setSoundSlot('press');
    setWaveformSelection({ start: 0, end: 0 });
    setNotice(null);
    setEmphasizeTryIt(false);
    setAutoTour(null);
    setFileKinds(new Map());
    setLastAdd(null);
    readGroupRef.current = null;
    setReading(null);
    setAddError(null);
    setHasTriedIt(false);
    stopSound();
  }, [setSelectedKeys, stopSound]);

  // Start a new history from `snapshot` with nothing unsaved. `published` is
  // what the library holds, `downloaded` what a file on disk holds.
  const startFrom = useCallback(
    (
      snapshot: PackSnapshot,
      published: PackSnapshot | null,
      downloaded: PackSnapshot | null,
    ) => {
      resetHistory(snapshot);
      setSavedSnapshot(snapshot);
      setPublishedSnapshot(published);
      setDownloadedSnapshot(downloaded);
    },
    [resetHistory],
  );

  // The work stays as it is while the start screens show, but nothing of the
  // workspace may go on over them: what was open over the pack closes, a
  // sound playing stops, and the tour would point at nothing. The emphasis on
  // Try it is spent too, so coming back does not play it again.
  const leaveWorkspace = () => {
    setShowMyPacks(false);
    setShowEditPackModal(false);
    setShowShortcuts(false);
    setChangeFileFor(null);
    setPendingReplace(null);
    setPendingKinds(null);
    setPendingPackType(null);
    setEmphasizeTryIt(false);
    exitPreview();
    stopSound();
    // Playing again stops it.
    if (isPlaying) playSelectedSegment();
    tourRef.current?.destroy();
  };

  // The visitor went elsewhere than the link asked. It leaves the address bar
  // too, so a reload or signing in later does not act on it after all.
  const dropStartLink = () => {
    setStartLink(null);
    if (parseStartLink(window.location.search)) {
      window.history.replaceState(
        window.history.state,
        '',
        withoutStartLink(window.location.href),
      );
    }
  };

  // Show a screen before the workspace, or the work kept behind them.
  const showScreen = (next: EditorScreen) => {
    if (isWorkspace && next !== 'workspace') leaveWorkspace();
    // The discard question was asked for a way in on the screen left, also
    // when the browser's Back or Forward left it.
    setConfirmDiscardAction(null);
    if (next !== 'pack-type') setPendingFiles(NO_FILES);
    if (next !== 'start') dropStartLink();
    setOpenFileError(null);
    setLibraryOpenError(null);
    setScreen(next);
  };

  // A screen of its own in the browser's history, so Back returns from it.
  // Shown first, so the link leaves the start screen's entry before the new
  // entry copies its address.
  const pushScreen = (next: EditorScreen) => {
    showScreen(next);
    window.history.pushState(screenState(next, true), '');
  };

  // Show new work, which the pack state already holds, in place of the work
  // there was. The workspace takes over the history entry it was entered
  // from, so Back never lands on the step that started it.
  const enterWorkspace = () => {
    const id = newWorkId();
    dropStartLink();
    window.history.replaceState(workspaceState(window.history.state, id), '');
    workRef.current = id;
    setWorkId(id);
    setScreen('workspace');
  };

  // Set while a step back onto the start screen's entry is on its way, so
  // its popstate is not taken for the visitor's Back.
  const steppingBackRef = useRef(false);

  // The on-page Back of the screens before the workspace. Steps back onto
  // the start screen's entry when it lies right below, rather than turn this
  // entry into a second one that Back would have to step over.
  const goBackToStart = () => {
    if (backToStart(window.history.state) === 'history-back') {
      steppingBackRef.current = true;
      window.history.back();
    } else {
      window.history.replaceState(screenState('start'), '');
    }
    showScreen('start');
  };

  // Start over keeps the work, so it asks nothing: the start screen goes on
  // top of the workspace, and Back or Back to returns to it.
  const startOver = () => {
    if (!workId) return;
    showScreen('start');
    window.history.pushState(startOverState(workId), '');
  };

  // Back to the work kept behind the start screen, as it was left.
  const returnToKeptWork = () => {
    if (!workId) return;
    if (returnToWork(window.history.state, workId) === 'history-back') {
      // Its popstate shows the workspace.
      window.history.back();
    } else {
      window.history.pushState(screenState('workspace', true, workId), '');
      showScreen('workspace');
    }
  };

  // Signing in from the start screens comes back to the link the editor was
  // opened with, or else to the list of the visitor's packs. It happens in
  // this tab unless the work kept behind them has unsaved changes, as from
  // the workspace.
  const startSignInHref = signInUrl(
    startLinkUrl(window.location.href, startLink ?? { kind: 'my-packs' }),
  );

  const showMyPacksScreen = () => {
    if (screen === 'my-packs') return;
    pushScreen('my-packs');
    refreshSession();
  };

  // Ask whether the new pack is for a keyboard or a mouse. `incoming` files
  // go into it once that is answered.
  const askPackType = (incoming: IncomingFiles = NO_FILES) => {
    pushScreen('pack-type');
    setPendingFiles(incoming);
  };

  // The new pack starts from a blank one of the chosen type, which counts as
  // saved: choosing Mouse leaves nothing to lose. Files coming with it are
  // added on top as an undoable step, so they do count as changes. They come
  // with the call, not from state this same event may have just set.
  const startNewPack = (
    packType: PackType,
    { files, skipped }: IncomingFiles = NO_FILES,
  ) => {
    setPendingFiles(NO_FILES);
    resetView();
    startFrom(createBlankSnapshot(packType), null, null);
    enterWorkspace();
    // Files on their way skip the empty pack the tour would show.
    if (files.length > 0) {
      handleAddSources(files, { skipped });
    } else {
      setAutoTour('new-pack');
    }
  };

  // Each way in replaces the work there is, so it asks first over changes
  // that are not saved.
  const asksFirst = asksBeforeReplacing({ workId, isDirty });

  const chooseNewPack = (
    packType: PackType,
    incoming: IncomingFiles = NO_FILES,
  ) => {
    if (asksFirst) {
      setConfirmDiscardAction({ packType, ...incoming });
    } else {
      startNewPack(packType, incoming);
    }
  };

  const confirmDiscard = () => {
    const action = confirmDiscardAction;
    setConfirmDiscardAction(null);
    if (!action) return;
    if ('packType' in action) {
      startNewPack(action.packType, action);
    } else if ('file' in action) {
      openPackFile(action.file);
    } else {
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
    // A zip from disk is that file, so it counts as downloaded.
    startFrom(
      snapshot,
      fromLibrary ? snapshot : null,
      fromLibrary ? null : snapshot,
    );
    // How the keys play each file tells what it holds.
    setFileKinds(inferKindsFromPack(imported.sources, imported.keySounds));
    // Show every mapped key. Outside the history, like any size change.
    if (imported.info.packType === 'Keyboard') {
      setKeyboardSize((current) =>
        inferKeyboardSize(imported.keySounds.keys(), current),
      );
    }
    setLoadedPackId(imported.id);
    setPackExtras(imported.extras);
    setActiveSourceId(imported.sources[0]?.id ?? null);
    // A pack that opens already makes sound: point at the way to hear it.
    setEmphasizeTryIt(true);
    setAutoTour(
      autoTourFlow(
        getWorkspaceStage({
          sourceCount: imported.sources.length,
          keySounds: imported.keySounds,
          packType: imported.info.packType,
        }),
      ),
    );
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

  // Open a pack .zip in place of the current pack. Why it did not open shows
  // where it was chosen: under its card before the workspace, as a notice in it.
  const openPackFile = async (file: File) => {
    setIsOpeningFile(true);
    setOpenFileError(null);
    try {
      applyImportedPack(await parseSoundPackZip(file), false);
      enterWorkspace();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not open this pack.';
      if (isWorkspace) {
        setNotice({ tone: 'error', message });
      } else {
        setOpenFileError(message);
      }
    } finally {
      setIsOpeningFile(false);
    }
  };

  const choosePackFile = () => packFileInputRef.current?.click();

  const handlePackFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (asksFirst) {
      setConfirmDiscardAction({ file });
    } else {
      openPackFile(file);
    }
  };

  // Open one of the visitor's library packs through the same path as a pack file.
  const openLibraryPack = async (pack: LibraryPackSummary) => {
    setOpeningPackId(pack.id);
    setNotice(null);
    setLibraryOpenError(null);
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
      enterWorkspace();
    } catch (error) {
      const failure = libraryErrorNotice(error, 'Could not open this pack.');
      if (isWorkspace) {
        setShowMyPacks(false);
        setNotice(failure);
      } else {
        setLibraryOpenError(failure.message);
      }
      if (error instanceof WebsiteApiError && error.status === 401) {
        refreshSession();
      }
    } finally {
      setOpeningPackId(null);
    }
  };

  const handleOpenLibraryPack = (pack: LibraryPackSummary) => {
    if (!canOpenPack(pack)) return;
    if (asksFirst) {
      setShowMyPacks(false);
      setConfirmDiscardAction({ pack });
    } else {
      openLibraryPack(pack);
    }
  };

  // Files dropped or pasted on the start screen or in the workspace. Nothing
  // else may be open over them: a dialog holds a copy of the pack, or waits
  // on a way in. The phone page shows neither.
  const canDrop =
    !isPhone &&
    (screen === 'start'
      ? !isOpeningFile &&
        openingPackId === null &&
        confirmDiscardAction === null
      : !isKeyboardOwnedElsewhere);

  // Why a drop did nothing shows where a pack file's problem would.
  const showDropProblem = (message: string) => {
    if (isWorkspace) {
      setNotice({ tone: 'error', message });
    } else {
      setOpenFileError(message);
    }
  };
  const handleDrop = (route: DropRoute<File>, target?: { code: string }) => {
    switch (route.kind) {
      case 'open-zip':
        if (route.confirm) {
          setConfirmDiscardAction({ file: route.file });
        } else {
          openPackFile(route.file);
        }
        return;
      case 'open-folder':
        // Zipped in memory, the folder opens the way its zip would. A file
        // that cannot be read on the way says so, as a pack that cannot open.
        zipFolder(route.files).then(
          (file) => {
            if (route.confirm) {
              setConfirmDiscardAction({ file });
            } else {
              openPackFile(file);
            }
          },
          () => showDropProblem('Could not open this pack.'),
        );
        return;
      case 'to-type-question': {
        const incoming = { files: route.files, skipped: route.skipped };
        // Names that all say the same kind of pack skip the question.
        const packType = guessPackType(route.files.map((file) => file.name));
        if (packType) {
          chooseNewPack(packType, incoming);
        } else {
          askPackType(incoming);
        }
        return;
      }
      case 'add-media':
        // One sound dropped on a key goes to it, as the list's files do.
        handleAddSources(route.files, {
          skipped: route.skipped,
          giveTo: target && dropTargetCodes(target.code, selectedCodes),
        });
        return;
      default:
        showDropProblem(route.message);
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
      setPublishedSnapshot(published);
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
          message: `${libraryPack.name} changed on the website since you opened it${error.revision ? ` (it is now at revision ${error.revision})` : ''}. Reopening it loses the changes made here, so download a .zip first, then reopen the pack from My packs.`,
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

  // Download the pack as a .zip
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
      setDownloadedSnapshot(exported);
      if (!libraryPack) {
        setNotice({
          tone: 'success',
          message:
            'Downloaded. To share it in the library, create a pack from this .zip on the website.',
          link: { href: NEW_PACK_URL, label: 'Create a pack' },
        });
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Could not make the .zip.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Clear selection when changing the keyboard size or the pack type, unless
  // the keyboard grew to show keys just given a sound: then the same keys
  // stay selected on it. Selection ids differ between layouts, so they are
  // found again by code.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the layout change is the trigger, not a value the effect reads
  useEffect(() => {
    const kept = keptSelectionRef.current;
    keptSelectionRef.current = null;
    setSelectedKeys(
      new Set(
        kept
          ? [...keyCodeById]
              .filter(([, code]) => kept.includes(code))
              .map(([id]) => id)
          : [],
      ),
    );
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
  // A touch screen has no keys to press: Try it says to tap the drawn ones.
  const isCoarsePointer = useCoarsePointer();

  const exitPreview = useCallback(() => {
    setIsPreview(false);
    setPressedKeyCodes(new Set());
  }, []);

  // A key or button goes down or comes up in preview, from the real keyboard
  // or mouse, or from a click or tap on its drawing.
  const pressPreviewKey = useCallback(
    (code: string) => {
      playKey(code, 'press');
      setPressedKeyCodes((prev) => new Set(prev).add(code));
    },
    [playKey],
  );
  const releasePreviewKey = useCallback(
    (code: string) => {
      playKey(code, 'release');
      setPressedKeyCodes((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    },
    [playKey],
  );

  // The emphasis on Try it plays out once, then goes.
  useEffect(() => {
    if (!emphasizeTryIt) return;
    const timer = window.setTimeout(() => setEmphasizeTryIt(false), 4500);
    return () => window.clearTimeout(timer);
  }, [emphasizeTryIt]);

  // Guided tour of the workspace: every step from the Help menu, or the
  // steps for the way in, opened by itself the first time a pack is entered.
  const tourRef = useRef<ReturnType<typeof startEditorTour>>(null);
  const startTour = (flow: TourFlow = 'all') => {
    tourRef.current?.destroy();
    tourRef.current = startEditorTour({
      flow,
      signedIn: session.status === 'signed-in',
      stage: visibility.stage,
      isMouse: isMousePack,
      activeFileKind,
      selectedHasRelease: cardSound?.release !== undefined,
    });
  };
  useEffect(() => () => tourRef.current?.destroy(), []);

  // Read when the delay below runs out, for the pack and account as they are then.
  const startTourRef = useRef(startTour);
  startTourRef.current = startTour;

  // Not on a phone, not over a dialog or Try it, and not once this browser
  // has seen the tour. Anything that changes meanwhile (a dialog, a file
  // dropped, leaving the workspace) passes it over instead of postponing it.
  useEffect(() => {
    if (!autoTour) return;
    if (
      !isWorkspace ||
      isPhone ||
      isKeyboardOwnedElsewhere ||
      autoTourFlow(visibility.stage) !== autoTour ||
      hasSeenTour()
    ) {
      setAutoTour(null);
      return;
    }
    // Once the keyboard has scaled to its space, so each step points at
    // where its element ends up.
    const timer = window.setTimeout(() => {
      setAutoTour(null);
      startTourRef.current(autoTour);
    }, AUTO_TOUR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [
    autoTour,
    isWorkspace,
    isPhone,
    isKeyboardOwnedElsewhere,
    visibility.stage,
  ]);

  // The phone page hides the workspace, so nothing of it may go on running:
  // preview would play the keyboard, and the tour would point at nothing.
  useEffect(() => {
    if (!isPhone) return;
    exitPreview();
    setIsPlaying(false);
    stopSound();
    tourRef.current?.destroy();
  }, [isPhone, exitPreview, stopSound]);

  // The editor opens on the start screen, also after a reload. Reloaded on an
  // entry added on top of the start screen's, it steps back onto that one.
  // The ref also keeps a remount in development from stepping back twice.
  useEffect(() => {
    if (backToStart(window.history.state) === 'replace') {
      window.history.replaceState(screenState('start'), '');
    } else if (!steppingBackRef.current) {
      steppingBackRef.current = true;
      window.history.back();
    }
  }, []);

  // A link into the editor waits on the start screen until the account is
  // known. Its parameters then leave the address bar; the link itself stays
  // for signing in, and is acted on once the visitor is signed in, also when
  // they sign in from another tab. On a phone the link stays in the address
  // bar, for Copy link to pass on to a bigger screen.
  useEffect(() => {
    if (
      !startLink ||
      isPhone ||
      screen !== 'start' ||
      session.status === 'loading'
    ) {
      return;
    }
    if (parseStartLink(window.location.search)) {
      window.history.replaceState(
        window.history.state,
        '',
        withoutStartLink(window.location.href),
      );
    }
    if (session.status !== 'signed-in') return;
    setStartLink(null);
    if (startLink.kind === 'my-packs') {
      // Reached directly, so its Back replaces the entry instead of leaving.
      window.history.replaceState(screenState('my-packs'), '');
      showScreen('my-packs');
      return;
    }
    const linked = findLinkedPack(session.packs, startLink.packId);
    if ('problem' in linked) {
      setLibraryOpenError(linked.problem);
    } else {
      openLibraryPack(linked.pack);
    }
  });

  // A new screen's heading takes the focus, which would otherwise drop to the
  // page with the control that had it, so a screen reader says where the
  // visitor now is. Not on load: the page starts with its own focus then.
  const focusedScreenRef = useRef(screen);
  useEffect(() => {
    if (focusedScreenRef.current === screen) return;
    focusedScreenRef.current = screen;
    document.getElementById(SCREEN_HEADING_ID)?.focus({ preventScroll: true });
  }, [screen]);

  // The first file takes away the tiles, and removing the last one takes
  // away the file list and puts the panel away. Focus inside them drops to
  // the page, so it goes to the heading of what shows instead, for the Tab
  // order and a screen reader to pick up there. Focus anywhere else stays.
  // After the screen heading's effect, which owns the focus on entering.
  const focusedStageRef = useRef<WorkspaceStage | null>(null);
  useEffect(() => {
    const previous = focusedStageRef.current;
    focusedStageRef.current = isWorkspace ? visibility.stage : null;
    if (previous === null || !isWorkspace) return;
    const emptied = visibility.stage === 'no-files';
    if (emptied === (previous === 'no-files')) return;
    const active = document.activeElement;
    if (active && active !== document.body && !active.closest('[inert]')) {
      return;
    }
    document
      .getElementById(emptied ? ADD_SOUNDS_HEADING_ID : SOURCES_HEADING_ID)
      ?.focus({ preventScroll: true });
  }, [isWorkspace, visibility.stage]);

  // The browser's Back and Forward move between the start screens and the
  // workspace. Leaving the workspace that way keeps the work, as Start over does.
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (steppingBackRef.current) {
        // The start screen already shows. A start screen entry stays as it
        // is, with the work it lies above; any other now stands for it.
        steppingBackRef.current = false;
        if (readScreenState(event.state)?.editorScreen !== 'start') {
          window.history.replaceState(standInState(event.state, 'start'), '');
        }
        return;
      }
      const outcome = resolvePopState(screen, event.state, {
        workId,
        isBusy:
          isExporting || isUpdating || isOpeningFile || openingPackId !== null,
      });
      if (outcome.kind === 'show') {
        showScreen(outcome.screen);
        if (outcome.replaceEntry) {
          window.history.replaceState(
            standInState(event.state, outcome.screen),
            '',
          );
        }
      } else if (outcome.kind === 'return-to-workspace') {
        window.history.pushState(
          screenState('workspace', outcome.aboveStart, workId),
          '',
        );
      } else if (!isWorkspace) {
        window.history.replaceState(standInState(event.state, screen), '');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  });

  // The site footer is rendered by the layout, so flag the body for it.
  useEffect(() => {
    document.body.dataset.editorPreview = String(isPreview);
    return () => {
      delete document.body.dataset.editorPreview;
    };
  }, [isPreview]);

  useEffect(() => {
    if (!isPreview) return;

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
      pressPreviewKey(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isMousePack) releasePreviewKey(event.code);
    };

    // A mouse pack sounds on the real mouse buttons and wheel, as in the app.
    // A tap plays the button tapped on the drawing instead, so the mouse
    // events a browser makes up after a tap are left alone.
    let lastTouch = Number.NEGATIVE_INFINITY;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') lastTouch = performance.now();
    };
    const isAfterTouch = () => performance.now() - lastTouch < 1000;
    const handleMouseDown = (event: MouseEvent) => {
      const code = MOUSE_BUTTON_CODES[event.button];
      if (code && !isAfterTouch()) pressPreviewKey(code);
    };
    const handleMouseUp = (event: MouseEvent) => {
      const code = MOUSE_BUTTON_CODES[event.button];
      if (code && !isAfterTouch()) releasePreviewKey(code);
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
      window.addEventListener('pointerdown', handlePointerDown, true);
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('wheel', handleWheel);
      window.addEventListener('contextmenu', handleContextMenu);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [
    isPreview,
    isMousePack,
    playKey,
    pressPreviewKey,
    releasePreviewKey,
    exitPreview,
  ]);

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

  // Another file opens: what played from the one before stops, unless the
  // click that opened it plays it.
  useEffect(() => {
    const now = playingRef.current;
    if (now?.kind !== 'file' || now.id !== activeSourceId) stopSound();
    setIsPlaying(false);
  }, [activeSourceId, stopSound]);

  // A key's sound from its card stops when another key is selected or the
  // sound changes, as the card it played from does.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the card's key and sound changing are the trigger, not values the effect reads
  useEffect(() => {
    if (playingRef.current?.kind === 'key') stopSound();
  }, [cardCode, cardSound, stopSound]);

  // A file that stops being one sound, or leaves the pack, takes away the
  // buttons that stop its sound, so the sound stops with them.
  useEffect(() => {
    if (
      playingSourceId !== null &&
      (fileKinds.get(playingSourceId) !== 'one' ||
        !sources.some((source) => source.id === playingSourceId))
    ) {
      stopSound();
    }
  }, [playingSourceId, fileKinds, sources, stopSound]);

  // Space plays or stops the open sound, as the waveform hint says: the
  // waveform's selection, or a file of one sound. The waveform's player
  // stays behind when a file of one sound opens, so the kind decides.
  const playOpenSound = () => {
    if (activeFileKind === 'one') {
      if (activeSource) playSource(activeSource);
    } else {
      playSelectedSegment();
    }
  };
  const playOpenSoundRef = useRef(playOpenSound);
  playOpenSoundRef.current = playOpenSound;
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
      playOpenSoundRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKeyboardOwnedElsewhere, activeSourceId]);

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

  // Also on the phone page, where it is off: a file dropped on a narrowed
  // window must not open in place of the editor and the pack kept behind it.
  const dropOverlay = (
    <FileDropOverlay
      enabled={canDrop}
      context={{ onStart: screen === 'start', isDirty: asksFirst }}
      keyboardReady={isWorkspace && !visibility.fadedKeyboard}
      noun={noun}
      onDrop={handleDrop}
      onDropTarget={setDropCode}
    />
  );

  if (isPhone) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <PhoneScreen />
        {dropOverlay}
      </div>
    );
  }

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
                  : isCoarsePointer
                    ? `Tap a ${isMousePack ? 'button' : 'key'} to hear it`
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
              Back to editing
            </button>
          </div>
        ) : (
          <EditorNavbar
            session={session}
            signInHref={
              isWorkspace ? signInUrl(window.location.href) : startSignInHref
            }
            signInInNewTab={isDirty}
            onOpenMyPacks={
              isWorkspace
                ? () => {
                    setShowMyPacks(true);
                    refreshSession();
                  }
                : showMyPacksScreen
            }
            workspace={
              isWorkspace
                ? {
                    packName: packInfo.name,
                    packType: packInfo.packType,
                    onEditPack: () => setShowEditPackModal(true),
                    onSwitchPackType: handlePackTypeChange,
                    onStartOver: startOver,
                    onDownload: visibility.download ? handleExport : undefined,
                    isDownloading: isExporting,
                    onTryIt: visibility.tryIt
                      ? () => {
                          setEmphasizeTryIt(false);
                          setHasTriedIt(true);
                          setIsPreview(true);
                        }
                      : undefined,
                    canTryIt: playableCount > 0,
                    emphasizeTryIt,
                    onUpdate: visibility.updateOnline
                      ? handleUpdate
                      : undefined,
                    isUpdating,
                    onStartTour: () => startTour(),
                    onShowShortcuts: () => setShowShortcuts(true),
                    undoLabel,
                    redoLabel,
                    onUndo: undo,
                    onRedo: redo,
                  }
                : undefined
            }
          />
        )}

        <input
          ref={packFileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handlePackFileChosen}
        />

        {dropOverlay}

        <ConfirmDiscardModal
          isOpen={confirmDiscardAction !== null}
          onCancel={() => setConfirmDiscardAction(null)}
          onConfirm={confirmDiscard}
          // Away from the workspace, the work asked about is the one kept
          // behind the start screens.
          {...(!isWorkspace && {
            title: 'Start over?',
            message:
              'Your changes in this tab will be lost. Download a .zip first to keep them.',
            confirmLabel: 'Discard and continue',
          })}
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

        <ChangeFileDialog
          keyName={changeFileFor === null ? null : keyLabel(changeFileFor)}
          sources={sources}
          kinds={fileKinds}
          currentId={
            changeFileFor === null
              ? null
              : (keySounds.get(changeFileFor)?.source ?? null)
          }
          onPick={(id) => {
            if (changeFileFor !== null) pickFileFor(changeFileFor, id);
          }}
          onChooseFile={(file) => {
            if (changeFileFor === null) return;
            setChangeFileFor(null);
            handleAddSources([file], { giveTo: [changeFileFor] });
          }}
          onClose={() => setChangeFileFor(null)}
        />

        <ConfirmDiscardModal
          isOpen={pendingReplace !== null}
          onCancel={() => setPendingReplace(null)}
          onConfirm={() => {
            if (pendingReplace) {
              const { id, file, duration } = pendingReplace;
              commitReplace(id, file, duration);
            }
            setPendingReplace(null);
          }}
          {...pendingReplace?.warning}
          confirmLabel="Replace anyway"
        />

        <ConfirmDiscardModal
          isOpen={pendingKinds !== null}
          onCancel={() => setPendingKinds(null)}
          onConfirm={() => {
            if (pendingKinds) setKinds(pendingKinds.ids, 'one');
            setPendingKinds(null);
          }}
          {...pendingKinds?.warning}
          confirmTone="primary"
        />

        <KeyboardShortcutsDialog
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
          isMousePack={isMousePack}
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

        {(isExporting ||
          isUpdating ||
          isOpeningFile ||
          (openingPackId &&
            (screen === 'start' || (isWorkspace && !showMyPacks)))) && (
          <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center">
            <div className="bg-base-100 rounded-lg shadow-xl p-8 flex flex-col items-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm font-medium">
                {isExporting
                  ? 'Making the .zip…'
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

        {screen === 'start' && (
          <StartScreen
            session={session}
            onRetrySession={refreshSession}
            signInHref={startSignInHref}
            signInInNewTab={isDirty}
            signInLabel={
              startLink?.kind === 'open' ? 'Sign in to open your pack' : null
            }
            onShowMyPacks={showMyPacksScreen}
            libraryOpenError={libraryOpenError}
            onChoosePackFile={choosePackFile}
            isOpeningFile={isOpeningFile}
            openFileError={openFileError}
            onMakeNewPack={() => askPackType()}
            keptWork={
              workId
                ? { packName: packInfo.name, onReturn: returnToKeptWork }
                : null
            }
          />
        )}
        {screen === 'my-packs' && (
          <MyPacksScreen
            session={session}
            onRetrySession={refreshSession}
            signInHref={startSignInHref}
            signInInNewTab={isDirty}
            onBack={goBackToStart}
            openingId={openingPackId}
            onOpen={handleOpenLibraryPack}
            openError={libraryOpenError}
            onChoosePackFile={choosePackFile}
            isOpeningFile={isOpeningFile}
            openFileError={openFileError}
          />
        )}
        {screen === 'pack-type' && (
          <PackTypeScreen
            fileCount={pendingFiles.files.length}
            onBack={goBackToStart}
            onChoose={(packType) => chooseNewPack(packType, pendingFiles)}
          />
        )}

        {/* Hidden rather than unmounted behind the start screens, so the work
        comes back with its waveform still decoded and at the same zoom. */}
        {workId && (
          <div className={isWorkspace ? 'contents' : 'hidden'}>
            {isWorkspace && (
              <ScreenHeading className="sr-only">
                Editing {packInfo.name}
              </ScreenHeading>
            )}
            {/* Notices sit outside the keyboard column, whose fit-to-height
            scale only accounts for its own rows; the panel's default height
            makes room for them. Short screens get a compact notice, and a
            long list scrolls rather than squeeze the keyboard. */}
            {notice && (
              <div
                className={`shrink-0 flex items-start justify-center gap-3 border-b px-4 py-2 text-sm short:py-1 short:text-xs ${NOTICE_TONE_CLASSES[notice.tone]}`}
              >
                <div className="min-w-0 short:max-h-20 short:overflow-y-auto">
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

            {/* A file of one sound dragged from the list drops on a key here,
            drawn or in the tray of hidden keys. */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a drop zone for rows dragged from the list; selecting keys then clicking a file does the same from the keyboard */}
            <div
              className="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-center gap-3 px-4 py-3"
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes(SOURCE_DRAG_TYPE)) {
                  return;
                }
                const code = dropCodeAt(event.target);
                setDropCode(code);
                // Only a key takes the drop.
                if (!code) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }}
              onDragLeave={(event) => {
                if (
                  event.dataTransfer.types.includes(SOURCE_DRAG_TYPE) &&
                  !(
                    event.relatedTarget instanceof Node &&
                    event.currentTarget.contains(event.relatedTarget)
                  )
                ) {
                  setDropCode(null);
                }
              }}
              onDrop={(event) => {
                if (!event.dataTransfer.types.includes(SOURCE_DRAG_TYPE)) {
                  return;
                }
                event.preventDefault();
                const code = dropCodeAt(event.target);
                const id = event.dataTransfer.getData(SOURCE_DRAG_TYPE);
                endSourceDrag();
                if (code && id) dropSourceOn(id, code);
              }}
            >
              {/* Keyboard Settings — at least as wide as the scaled keyboard, so both align */}
              <div
                className="editor-chrome-vertical editor-chrome-top w-max max-w-full shrink-0"
                data-hidden={isPreview}
                style={settingsRowStyle}
              >
                <h2 className="sr-only">Keyboard settings</h2>
                <div className="flex h-6 items-center justify-between gap-4">
                  <NextStep
                    stage={visibility.stage}
                    packType={packInfo.packType}
                    isTouch={isCoarsePointer}
                    activeFileKind={activeFileKind}
                    selectedCount={selectedCodes.length}
                    selectedKeyFile={selectedKeyFile}
                    isLarge={keyboardWidth >= NEXT_STEP_LARGE_WIDTH}
                  />
                  {visibility.keyboardSize && (
                    <div className="flex shrink-0 items-center gap-4">
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
                    </div>
                  )}
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
                the same values on top of that lags behind the layout. Only
                the fade of an empty pack's keyboard is animated. */}
                <div
                  className={`shrink-0 rounded transition-opacity duration-300 ${visibility.fadedKeyboard ? 'opacity-30' : ''} ${draggedSourceId ? 'outline-2 outline-dashed outline-primary -outline-offset-2' : ''}`}
                  // Faded, it shows where the sounds will go, and takes no clicks or focus.
                  inert={visibility.fadedKeyboard}
                  // Inert, the tour leaves it out.
                  data-tour="keyboard"
                  style={{
                    width: keyboardNaturalWidth * keyboardScale,
                    height: keyboardNaturalHeight * keyboardScale,
                  }}
                >
                  <div
                    style={
                      {
                        transform: `scale(${keyboardScale})`,
                        transformOrigin: 'top left',
                        width: keyboardNaturalWidth,
                        height: keyboardNaturalHeight,
                        // Labels grow as the keyboard shrinks, so they stay
                        // readable, but only as far as they fit the keys.
                        '--key-label-size': `${keyboardScale > 0 ? clamp(KEY_LABEL_MIN_PX / keyboardScale, KEY_LABEL_PX, KEY_LABEL_MAX_PX) : KEY_LABEL_PX}px`,
                      } as React.CSSProperties
                    }
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
                        dropCodes={dropCodes}
                        onPreviewTouchDown={pressPreviewKey}
                        onPreviewTouchUp={releasePreviewKey}
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
                        dropCodes={dropCodes}
                        onPreviewKeyDown={pressPreviewKey}
                        onPreviewKeyUp={releasePreviewKey}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Keys with a sound that the drawn layout leaves out */}
              {hasHiddenKeys && (
                <div
                  className="editor-chrome-vertical w-full mx-auto shrink-0"
                  data-hidden={isPreview}
                  style={rowsStyle}
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
                    dropCodes={dropCodes}
                  />
                </div>
              )}

              {visibility.legend && (
                <div
                  className="editor-chrome-vertical w-full mx-auto shrink-0 flex flex-col gap-1 text-xs"
                  data-hidden={isPreview}
                  style={rowsStyle}
                >
                  <h2 className="sr-only">Key marks</h2>
                  <KeyLegend
                    showRelease={visibility.releaseLegend}
                    showSilent={
                      visibility.stage === 'has-sounds' && keyCount.silent > 0
                    }
                    isMousePack={isMousePack}
                  />
                  <ProgressLine items={progressItems} />
                </div>
              )}
            </div>

            {visibility.addTiles && (
              <AddSoundsPanel
                packType={packInfo.packType}
                onAdd={handleAddSources}
                status={
                  reading
                    ? { tone: 'info', text: readingText(reading) }
                    : addError
                      ? { tone: 'error', text: addError }
                      : null
                }
              />
            )}

            {/* Drag handle on the panel's top edge (wide screens only) */}
            {panelHeight !== null && !isPreview && visibility.soundPanel && (
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
            {/* Collapsed rather than taken off the page before the first file,
            so the keyboard glides into the space it leaves. */}
            <div
              className="editor-chrome-vertical shrink-0 editor-panel-surface border-t-2 border-base-content/20"
              data-hidden={isPreview || !visibility.soundPanel}
              inert={!visibility.soundPanel}
            >
              {/* Stacked, the panel sizes to its content; capped so the keyboard keeps room */}
              <div
                className="flex flex-col max-lg:overflow-y-auto"
                style={
                  panelHeight === null
                    ? { maxHeight: stackedPanelMax }
                    : { height: panelHeight }
                }
              >
                <h2 className="sr-only">Sound editing</h2>
                {/* Over the tiles, A says the same under them. */}
                {visibility.soundPanel && (
                  <AddedFilesSummary
                    ref={summaryRef}
                    summary={addSummary}
                    reading={reading}
                    error={addError}
                    onChangeKind={(kind) => {
                      if (lastAdd) requestKinds(lastAdd.ids, kind);
                    }}
                    onAction={handleSummaryAction}
                    onDismiss={() => {
                      setLastAdd(null);
                      setAddError(null);
                    }}
                  />
                )}
                {/* Dividers run edge to edge: padding lives inside each column, not on the row */}
                <div
                  ref={panelRowRef}
                  className="flex flex-col lg:flex-row items-stretch max-lg:shrink-0 lg:flex-1 min-h-0 border-b-2 border-base-content/20"
                >
                  {/* Left: audio/video import. Stacked, it is a short dropzone,
                  sizes to the file list once audio is loaded (the waveform
                  gives way to a longer list), and keeps room for the clip when
                  a video plays along with the waveform. The key card goes
                  under the list side by side, where the list scrolls behind
                  it, and beside the list stacked, where the list is as wide
                  as the panel and the card would push the controls down. */}
                  <div
                    // The tour points only at what is on show.
                    data-tour={visibility.soundPanel ? 'sources' : undefined}
                    className={`w-full flex flex-col ${!audioFile ? 'h-[180px]' : visibility.waveform && audioFile.type.startsWith('video/') ? 'h-[320px]' : 'h-auto'} lg:h-full lg:w-[360px] shrink-0 min-w-0 lg:border-r border-base-content/20 px-4 py-3 ${showKeyCard ? 'max-lg:flex-row max-lg:gap-4 lg:overflow-y-auto' : ''}`}
                  >
                    <AudioFileSelector
                      sources={sources}
                      activeSourceId={activeSourceId}
                      kinds={fileKinds}
                      codesBySource={codesBySource}
                      selectedCount={selectedCodes.length}
                      noun={noun}
                      listMaxHeight={fileListMax}
                      hasKeyCard={showKeyCard}
                      playingSourceId={playingSourceId}
                      onPlay={(id) => {
                        const source = sourcesById.get(id);
                        if (source) playSource(source);
                      }}
                      onSelect={handleSelectSource}
                      onAdd={(files) => handleAddSources(files)}
                      onRemove={handleRemoveSource}
                      onSetKind={(id, kind) => requestKinds([id], kind)}
                      onReplace={replaceSource}
                      isReading={reading !== null}
                      onDragFile={(id) => {
                        if (id) setDraggedSourceId(id);
                        else endSourceDrag();
                      }}
                      videoRef={videoPreviewRef}
                    />
                    {showKeyCard && cardCode && cardSound && cardSource && (
                      <KeyCard
                        code={cardCode}
                        sound={cardSound}
                        source={cardSource}
                        kind={fileKinds.get(cardSource.id) ?? 'many'}
                        packType={packInfo.packType}
                        sameCount={sameSoundCount(cardCode, keySounds)}
                        playingSlot={
                          playing?.kind === 'key' && playing.code === cardCode
                            ? playing.slot
                            : null
                        }
                        onPlay={(slot) => playKeySound(cardCode, slot)}
                        onChangeFile={() => setChangeFileFor(cardCode)}
                        onRemove={() =>
                          commitKeySounds(
                            `Remove the sound of ${keyLabel(cardCode)}`,
                            (current) => clearKeySounds([cardCode], current),
                          )
                        }
                        onSwap={() =>
                          commitKeySounds(
                            `Swap press and release of ${keyLabel(cardCode)}`,
                            (current) =>
                              swapPressAndRelease([cardCode], current),
                          )
                        }
                        onAddRelease={() => addReleaseTo(cardCode)}
                        onSplit={() => splitFileOf(cardCode)}
                        onFocusLost={focusKeyboard}
                      />
                    )}
                  </div>

                  {/* Right: waveform / mode-specific controls — fills the container height.
                  No horizontal padding here: the waveform runs edge to edge, and the
                  blocks around it carry their own px-4. */}
                  <div
                    data-tour={visibility.soundPanel ? 'sound' : undefined}
                    className="flex-1 min-w-0 min-h-0 h-full pb-3 lg:pt-3 lg:overflow-y-auto"
                  >
                    {visibility.waveform && audioFile && activeSourceId && (
                      // Sized to its content, which the panel measures.
                      <div
                        ref={panelControlsRef}
                        className="min-w-0 flex flex-col gap-3"
                      >
                        {/* The waveform takes the height the panel has left */}
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
                          showThreshold={showExactTimes}
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
                          // Without the switch, the controls assign press sounds.
                          slot={
                            visibility.pressReleaseToggle ? soundSlot : 'press'
                          }
                          setSlot={setSoundSlot}
                          showSlotSwitch={visibility.pressReleaseToggle}
                          showExactTimes={showExactTimes}
                          setShowExactTimes={setShowExactTimes}
                          // A mouse pack has no groups of keys to pick.
                          keys={visibility.keyGroups ? keys : undefined}
                          getKeyId={getKeyId}
                          noun={noun}
                        />
                      </div>
                    )}
                    {visibility.oneSoundPane && activeSource && (
                      // Measured as controls with no waveform.
                      <div
                        ref={panelControlsRef}
                        className="min-w-0 flex flex-col gap-3"
                      >
                        <OneSoundPane
                          source={activeSource}
                          codes={codesBySource.get(activeSource.id) ?? []}
                          noun={noun}
                          isPlaying={playingSourceId === activeSource.id}
                          onPlay={() => playSource(activeSource)}
                          onGive={() => {
                            giveToSelected(activeSource);
                            playSource(activeSource, true);
                          }}
                          given={
                            selectedCodes.length > 0 &&
                            giveOneSoundToKeys(
                              selectedCodes,
                              activeSource,
                              keySounds,
                            ) === keySounds
                          }
                          selectedKeys={selectedKeys}
                          setSelectedKeys={setSelectedKeys}
                          selectedCodes={selectedCodes}
                          keySounds={keySounds}
                          commitKeySounds={commitKeySounds}
                          onClearSelected={clearSelectedKeySounds}
                          hiddenCount={hiddenKeys.length}
                          keys={visibility.keyGroups ? keys : undefined}
                          getKeyId={getKeyId}
                        />
                      </div>
                    )}{' '}
                    {/* The column's bottom padding, kept over what the panel is
                    too short for, so cut content fades out at the edge
                    rather than ending in a sliver. */}
                    <div
                      aria-hidden
                      className="editor-panel-surface mask-t-from-0% pointer-events-none sticky bottom-0 lg:-bottom-3 z-10 -mb-3 h-3"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
