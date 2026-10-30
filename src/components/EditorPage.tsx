import { X } from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type WaveSurfer from 'wavesurfer.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { ConfirmDiscardModal } from '@/components/ConfirmDiscardModal';
import { EditorNavbar } from '@/components/EditorNavbar';
import { EditPackModal } from '@/components/EditPackModal';
import { AudioFileSelector } from '@/components/editor/AudioFileSelector';
import { FileModeControls } from '@/components/editor/FileModeControls';
import { KeyboardDisplay } from '@/components/editor/KeyboardDisplay';
import { KeyboardShortcuts } from '@/components/editor/KeyboardShortcuts';
import {
  keyboardLayouts,
  parseKeyboardLayout,
} from '@/components/editor/keyboardLayouts';
import { TimeSegmentControls } from '@/components/editor/TimeSegmentControls';
import { WaveformEditor } from '@/components/editor/WaveformEditor';
import { siteIdentity } from '@/config/siteIdentity';
import { useAudioFile } from '@/hooks/useAudioFile';
import { useKeyboardSelection } from '@/hooks/useKeyboardSelection';
import { usePreviewPlayback } from '@/hooks/usePreviewPlayback';
import { exportSoundPack } from '@/utils/soundPackExport';
import { parseSoundPackZip } from '@/utils/soundPackImport';

// Sound editing panel on wide (lg) screens. It takes half the viewport, up to
// the original 524px, and never less than what its controls need with the
// smallest waveform. The waveform absorbs every pixel the panel gives up, so the
// keyboard above gets the rest of the screen.
const LG_MIN_WIDTH = 1024;
const PANEL_MAX_HEIGHT = 524;
const WAVEFORM_MAX_HEIGHT = 200;
const WAVEFORM_MIN_HEIGHT = 110;
const PANEL_MIN_HEIGHT =
  PANEL_MAX_HEIGHT - (WAVEFORM_MAX_HEIGHT - WAVEFORM_MIN_HEIGHT);

/** Panel height in px on lg screens, or null when the panel stacks and sizes to its content. */
function getPanelHeight(): number | null {
  if (window.innerWidth < LG_MIN_WIDTH) return null;
  return Math.min(
    PANEL_MAX_HEIGHT,
    Math.max(PANEL_MIN_HEIGHT, Math.round(window.innerHeight / 2)),
  );
}

export function EditorPage() {
  // Basic state
  const [keyboardSize, setKeyboardSize] = useState<
    'fullsize' | 'tkl' | 'compact'
  >('fullsize');
  const [modifiedKeys, setModifiedKeys] = useState<
    Map<string, [number, number]>
  >(new Map());
  const [defaultDuration, setDefaultDuration] = useState(100);
  const [showEditPackModal, setShowEditPackModal] = useState(false);
  const [packInfo, setPackInfo] = useState({
    name: 'My Sound Pack',
    author: '',
    description: `A custom sound pack created with the ${siteIdentity.productName} editor.`,
    tags: '',
    mode: 'time' as 'time' | 'file',
  });
  const [isPreview, setIsPreview] = useState(false);
  const [pressedKeyCodes, setPressedKeyCodes] = useState<Set<string>>(
    new Set(),
  );
  const [confirmDiscardAction, setConfirmDiscardAction] = useState<
    null | 'new' | 'import'
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
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

  // Waveform refs
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const regionsPlugin = useRef<RegionsPlugin | null>(null);
  // Video preview element lives in AudioFileSelector, driven by WaveformEditor playback
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Get editMode from packInfo
  const editMode = packInfo.mode;

  // Parse keyboard layout — memoised so key-group lookups don't rebuild each render
  const keys = useMemo(
    () => parseKeyboardLayout(keyboardLayouts[keyboardSize]),
    [keyboardSize],
  );

  const [panelHeight, setPanelHeight] = useState(getPanelHeight);
  useEffect(() => {
    const onResize = () => setPanelHeight(getPanelHeight());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const waveformHeight =
    panelHeight === null
      ? WAVEFORM_MAX_HEIGHT
      : WAVEFORM_MAX_HEIGHT - (PANEL_MAX_HEIGHT - panelHeight);

  // Keyboard natural dimensions (used to scale-to-fit and avoid a scrollbar)
  const KEYBOARD_UNIT = 54;
  const KEYBOARD_GAP = 3;
  const keyboardMaxX = Math.max(...keys.map((k: any) => k.x + k.width));
  const keyboardMaxY = Math.max(...keys.map((k: any) => k.y + k.height));
  const keyboardNaturalWidth =
    keyboardMaxX * (KEYBOARD_UNIT + KEYBOARD_GAP) + KEYBOARD_GAP * 2 - 1;
  const keyboardNaturalHeight =
    keyboardMaxY * (KEYBOARD_UNIT + KEYBOARD_GAP) + KEYBOARD_GAP * 2 - 1;

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
    // so the keyboard gets that space back.
    const rowsHeight = isPreview ? 0 : 24 + 20 + 24;
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
  }, [keyboardNaturalWidth, keyboardNaturalHeight, isPreview]);

  // Create unique key IDs — stable identity so consumers can memoise on it
  const getKeyId = useCallback((key: any, index: number) => {
    return `${key.label || 'key'}-${index}-${key.x}-${key.y}`;
  }, []);

  // Audio file hook
  const { audioFile, audioDuration, handleFileFromObject, clearAudioFile } =
    useAudioFile();

  // Play function ref
  const playSelectedSegmentRef = React.useRef<(() => void) | null>(null);
  const playSelectedSegment = React.useCallback(() => {
    if (playSelectedSegmentRef.current) {
      playSelectedSegmentRef.current();
    }
  }, []);

  // Keyboard selection hook
  const {
    selectedKeys,
    setSelectedKeys,
    dragSelectedKeys,
    keyboardRef,
    handleKeyMouseDown,
    handleMouseMove,
    handleKeyMouseEnter,
    handleKeyMouseUp,
    handleMouseUp,
    handleKeyClick,
    handleMouseDown,
  } = useKeyboardSelection({
    keys,
    modifiedKeys,
    setWaveformSelection: setWaveformSelectionCallback,
    defaultDuration,
    getKeyId,
  });

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    await handleFileFromObject(file);
    setWaveformSelection({ start: 0, end: 0 });
  };

  // Handle clearing file
  const handleClearFile = () => {
    clearAudioFile();
    setWaveformSelection({ start: 0, end: 0 });
  };

  // Reset the whole pack back to defaults
  // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list kept as in the website editor; changing it changes when the hook re-runs
  const resetPack = useCallback(() => {
    setModifiedKeys(new Map());
    setSelectedKeys(new Set());
    setPackInfo({
      name: 'My Sound Pack',
      author: '',
      description: `A custom sound pack created with the ${siteIdentity.productName} editor.`,
      tags: '',
      mode: 'time',
    });
    clearAudioFile();
    setWaveformSelection({ start: 0, end: 0 });
    setActionError(null);
  }, [clearAudioFile, siteIdentity.productName]);

  // New pack: warn if there are unsaved modifications
  const handleNewPack = () => {
    if (modifiedKeys.size > 0) {
      setConfirmDiscardAction('new');
    } else {
      resetPack();
    }
  };

  // Import: warn if there are unsaved modifications, then open the file picker
  const handleImportClick = () => {
    if (modifiedKeys.size > 0) {
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
      const imported = await parseSoundPackZip(file);
      resetPack();
      setPackInfo((prev) => ({
        ...prev,
        name: imported.name,
        author: imported.author || prev.author,
        description: imported.description || prev.description,
        mode: imported.mode,
      }));
      setModifiedKeys(imported.modifiedKeys);
      await handleFileFromObject(imported.audioFile);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not import sound pack.',
      );
    }
  };

  // Export current settings as a sound pack zip
  const handleExport = async () => {
    setIsExporting(true);
    setActionError(null);
    try {
      await exportSoundPack({
        name: packInfo.name,
        author: packInfo.author,
        description: packInfo.description,
        audioFile,
        modifiedKeys,
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not export sound pack.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Clear selection when changing keyboard size
  // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list kept as in the website editor; changing it changes when the hook re-runs
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [keyboardSize, setSelectedKeys]);

  // Preview: play the mapped sound for whichever key the user presses
  const {
    playKey,
    isLoading: isPreviewLoading,
    error: previewError,
  } = usePreviewPlayback(audioFile, modifiedKeys, isPreview);

  const exitPreview = useCallback(() => {
    setIsPreview(false);
    setPressedKeyCodes(new Set());
  }, []);

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
      // Keep the browser out of it — F-keys, Tab and Space would otherwise
      // navigate or scroll instead of sounding like a key press.
      event.preventDefault();
      if (event.repeat) return;
      playKey(event.code);
      setPressedKeyCodes((prev) => new Set(prev).add(event.code));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setPressedKeyCodes((prev) => {
        const next = new Set(prev);
        next.delete(event.code);
        return next;
      });
    };

    // Releasing focus mid-press would otherwise leave keys stuck highlighted.
    const handleBlur = () => setPressedKeyCodes(new Set());

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isPreview, playKey, exitPreview]);

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
                  : `Press any highlighted key — ${modifiedKeys.size} key${modifiedKeys.size !== 1 ? 's' : ''} mapped`}
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
            editMode={editMode}
            onEditPack={() => setShowEditPackModal(true)}
            onNewPack={handleNewPack}
            onImport={handleImportClick}
            onExport={handleExport}
            isExporting={isExporting}
            onPreview={() => setIsPreview(true)}
            canPreview={!!audioFile && modifiedKeys.size > 0}
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

        {isExporting && (
          <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center">
            <div className="bg-base-100 rounded-lg shadow-xl p-8 flex flex-col items-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm font-medium">Exporting sound pack…</p>
              <p className="text-xs text-base-content/60">
                Compressing audio — this can take a while for long files.
              </p>
            </div>
          </div>
        )}

        {showEditPackModal && (
          <EditPackModal
            isOpen={showEditPackModal}
            packInfo={packInfo}
            onClose={() => setShowEditPackModal(false)}
            onSave={(updatedPackInfo) => {
              setPackInfo(updatedPackInfo);
              setShowEditPackModal(false);
            }}
          />
        )}

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-center gap-3 px-4 py-3">
          {actionError && (
            <div className="w-full max-w-4xl mx-auto shrink-0 flex items-start justify-between gap-3 rounded-box border border-error/30 bg-error/10 px-4 py-3 text-sm">
              <span>{actionError}</span>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setActionError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Keyboard Settings — width tracks the scaled keyboard so both align with it */}
          <div
            className="editor-chrome-vertical editor-chrome-top w-full min-w-[min(100%,46rem)] mx-auto shrink-0"
            data-hidden={isPreview}
            style={{ maxWidth: keyboardNaturalWidth * keyboardScale }}
          >
            <h2 className="sr-only">Keyboard settings</h2>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
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
              </div>
              {/* Key State Examples */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="btn btn-xs btn-neutral pointer-events-none">
                    A
                  </div>
                  <span className="text-base-content/70">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="btn btn-xs relative pointer-events-none">
                    Q
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg ring-2 ring-primary/30"></div>
                  </div>
                  <span className="text-base-content/70">Modified</span>
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
                <KeyboardDisplay
                  keyboardSize={keyboardSize}
                  selectedKeys={selectedKeys}
                  dragSelectedKeys={dragSelectedKeys}
                  modifiedKeys={modifiedKeys}
                  onKeyClick={handleKeyClick}
                  onKeyMouseDown={handleKeyMouseDown}
                  onKeyMouseUp={handleKeyMouseUp}
                  onKeyMouseEnter={handleKeyMouseEnter}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  keyboardRef={keyboardRef}
                  isPreview={isPreview}
                  pressedKeyCodes={pressedKeyCodes}
                  onPreviewKeyDown={playKey}
                />
              </div>
            </div>
          </div>

          {/* Shortcuts Bar */}
          <div
            className="editor-chrome-vertical w-full flex justify-center shrink-0"
            data-hidden={isPreview}
          >
            <KeyboardShortcuts
              selectedKeys={selectedKeys}
              setSelectedKeys={setSelectedKeys}
              maxWidth={keyboardNaturalWidth * keyboardScale}
            />
          </div>
        </div>

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
                className={`w-full ${!audioFile ? 'h-[180px]' : audioFile.type.startsWith('video/') ? 'h-[240px]' : 'h-auto'} lg:h-full lg:w-[360px] shrink-0 min-w-0 lg:border-r border-base-content/20 px-4 py-3`}
              >
                <AudioFileSelector
                  audioFile={audioFile}
                  audioDuration={audioDuration}
                  onFileSelect={handleFileSelect}
                  onClearFile={handleClearFile}
                  videoRef={videoPreviewRef}
                />
              </div>

              {/* Right: waveform / mode-specific controls — fills the container height.
                  No horizontal padding here: the waveform runs edge to edge, and the
                  blocks around it carry their own px-4. */}
              <div className="flex-1 min-w-0 min-h-0 h-full pb-3 lg:pt-3">
                {audioFile ? (
                  <div className="h-full min-h-0 min-w-0 flex flex-col gap-3">
                    {editMode === 'time' ? (
                      <>
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
                          wavesurfer={wavesurfer}
                          regionsPlugin={regionsPlugin}
                          onPlaySelectedSegmentReady={(playFn) => {
                            playSelectedSegmentRef.current = playFn;
                          }}
                          modifiedKeys={modifiedKeys}
                          selectedKeys={selectedKeys}
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
                          modifiedKeys={modifiedKeys}
                          setModifiedKeys={setModifiedKeys}
                          keys={keys}
                          getKeyId={getKeyId}
                        />
                      </>
                    ) : (
                      <div className="px-4">
                        {/* File Mode Controls */}
                        <FileModeControls
                          selectedKeys={selectedKeys}
                          modifiedKeys={modifiedKeys}
                          setModifiedKeys={setModifiedKeys}
                          audioDuration={audioDuration}
                        />
                      </div>
                    )}
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
