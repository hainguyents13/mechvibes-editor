import React from 'react';
import {
  CombinedWaveform,
  type CombinedWaveformRef,
} from '@/components/editor/CombinedWaveform';
import { PANEL_LABEL_CLASS } from '@/components/editor/TimeSegmentControls';
import {
  getUsageBadges,
  USAGE_BADGE_MIN_WIDTH_PX,
  type UsageBadge,
} from '@/components/editor/waveform-selection';
import { RotateCcw, Zap } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { useWaveformEditor } from '@/hooks/useWaveformEditor';
import { cn } from '@/lib/utils';
import type { KeySounds } from '@/utils/soundPack';

// The keys' press and release colours; a badge that stands for press and
// release segments together takes neither.
const BADGE_STYLES: Record<UsageBadge['phase'], string> = {
  press: 'bg-mv-press text-white',
  release: 'bg-mv-release text-white',
  mixed:
    'bg-mv-page text-mv-ink shadow-[inset_0_0_0_1px_var(--mv-line-strong)]',
};

/** A thin slider in the ink colour. */
const RANGE_CLASS = 'h-1 cursor-pointer accent-[var(--mv-ink)]';

/** The box `waveformHeight` sizes, for telling it from the controls around it. */
export const WAVEFORM_BOX_SELECTOR = '[data-waveform-box]';

interface WaveformEditorProps {
  audioFile: File | null;
  defaultDuration: number;
  setDefaultDuration: (duration: number) => void;
  waveformSelection: { start: number; end: number };
  setWaveformSelection: (selection: { start: number; end: number }) => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onPlaySelectedSegmentReady?: (playFn: () => void) => void;
  /** Key sounds; those cut from `sourceId` are marked under the waveform. */
  keySounds?: KeySounds;
  sourceId?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  /** Waveform height in px; the editor shrinks it on short screens. */
  waveformHeight?: number;
  /** The Auto detect threshold is open, under More in the sound controls. */
  showThreshold?: boolean;
}

export function WaveformEditor({
  audioFile,
  defaultDuration,
  setDefaultDuration,
  waveformSelection,
  setWaveformSelection,
  zoomLevel,
  setZoomLevel,
  isPlaying,
  setIsPlaying,
  onPlaySelectedSegmentReady,
  keySounds,
  sourceId,
  videoRef: externalVideoRef,
  waveformHeight = 200,
  showThreshold = false,
}: WaveformEditorProps) {
  const headingId = React.useId();
  const {
    soundRegionsMode,
    toggleSoundRegionsMode,
    silenceThreshold,
    setSilenceThreshold,
    handleZoom,
    handleResetZoom,
    audioUrl,
  } = useWaveformEditor({ audioFile, setZoomLevel });

  const combinedWaveformRef = React.useRef<CombinedWaveformRef>(null);
  // The horizontally scrolling wrapper around the waveform — zoom anchors to it
  const waveformScrollRef = React.useRef<HTMLDivElement>(null);
  const fallbackVideoRef = React.useRef<HTMLVideoElement>(null);
  // The preview element lives in AudioFileSelector; use it so playback stays in sync
  const videoPreviewRef = externalVideoRef ?? fallbackVideoRef;

  // Create the unified playSelectedSegment function that always uses segment inputs
  const actualPlaySelectedSegment = React.useCallback(() => {
    const waveformRef = combinedWaveformRef.current;
    if (!waveformRef) return;

    const ws = waveformRef.wavesurfer;
    if (!ws) return;

    // Stop any current playback (toggle functionality)
    if (isPlaying) {
      ws.pause();
      setIsPlaying(false);
      return;
    }

    // Check if we have a valid time segment selection
    if (
      waveformSelection.start === waveformSelection.end ||
      waveformSelection.start < 0 ||
      waveformSelection.end <= waveformSelection.start
    ) {
      return;
    }

    // Unified play function for both modes - always use the time segment inputs
    const startSec = waveformSelection.start / 1000;
    const endSec = waveformSelection.end / 1000;

    // Set playback position to start of selection
    ws.setTime(startSec);
    setIsPlaying(true);
    ws.play();

    // Monitor playback and stop at end of selection
    let animationId: number;
    const stopAtEnd = () => {
      const currentTime = ws.getCurrentTime();
      if (currentTime >= endSec || !ws.isPlaying()) {
        ws.pause();
        setIsPlaying(false);
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      } else {
        animationId = requestAnimationFrame(stopAtEnd);
      }
    };
    animationId = requestAnimationFrame(stopAtEnd);
  }, [waveformSelection, setIsPlaying, isPlaying]);

  // Provide the playSelectedSegment function to parent whenever it changes
  React.useEffect(() => {
    if (onPlaySelectedSegmentReady && combinedWaveformRef.current) {
      onPlaySelectedSegmentReady(actualPlaySelectedSegment);
    }
  }, [onPlaySelectedSegmentReady, actualPlaySelectedSegment]);

  // Check if the uploaded file is a video file
  const isVideo = audioFile?.type.startsWith('video/') || false;

  if (!audioFile || !audioUrl) {
    return null;
  }

  return (
    <section
      aria-labelledby={headingId}
      className="shrink-0 min-h-0 min-w-0 w-full flex flex-col gap-2.5"
    >
      <div className="flex items-center justify-between gap-2 shrink-0 min-w-0 flex-wrap px-5">
        <h2 id={headingId} className={cn(PANEL_LABEL_CLASS, 'm-0')}>
          Waveform
        </h2>
        {/* Zoom Controls: wrap on narrow screens rather than push Auto detect off the edge */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <label className="flex items-center gap-2 text-xs text-mv-subtle">
            Zoom
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={zoomLevel}
              onChange={(e) => handleZoom(Number(e.target.value))}
              className={cn(RANGE_CLASS, 'w-32 sm:w-60')}
              title={`${Math.round(zoomLevel)}% zoom`}
            />
          </label>
          <span className="w-10 text-center font-code text-xs text-mv-muted">
            {Math.round(zoomLevel)}%
          </span>
          <button
            type="button"
            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
            onClick={handleResetZoom}
            title="Reset Zoom"
            aria-label="Reset zoom"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-mv-line" />
          <button
            type="button"
            aria-pressed={soundRegionsMode}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              soundRegionsMode && 'bg-mv-fill text-mv-ink',
            )}
            onClick={toggleSoundRegionsMode}
            title={
              soundRegionsMode
                ? 'Exit sound regions mode'
                : 'Auto-detect sound regions'
            }
          >
            <Zap className="size-3.5" />
            Auto detect
          </button>
          {soundRegionsMode && showThreshold && (
            <>
              <label className="flex items-center gap-2 text-xs text-mv-subtle">
                Threshold
                <input
                  type="range"
                  min="0.001"
                  max="0.02"
                  step="0.001"
                  value={silenceThreshold}
                  onChange={(e) => setSilenceThreshold(Number(e.target.value))}
                  className={cn(RANGE_CLASS, 'w-32')}
                  title={`Silence threshold: ${silenceThreshold.toFixed(3)}`}
                />
              </label>
              <span className="w-12 text-center font-code text-xs text-mv-muted">
                {silenceThreshold.toFixed(3)}
              </span>
            </>
          )}
        </div>
      </div>
      {/* Video preview lives in the Audio source panel — this side only shows the waveform */}
      <div
        ref={waveformScrollRef}
        className="mx-5 shrink-0 min-w-0 rounded-[12px] bg-mv-raised shadow-[inset_0_0_0_1px_var(--mv-line)] overflow-x-auto overflow-y-hidden"
      >
        <div style={{ minWidth: '100%', width: 'max-content' }}>
          {/* Waveform */}
          <div data-waveform-box style={{ height: waveformHeight }}>
            <CombinedWaveform
              ref={combinedWaveformRef}
              audioUrl={audioUrl}
              isVideo={isVideo}
              videoElement={videoPreviewRef}
              zoomLevel={zoomLevel}
              soundOnlyMode={soundRegionsMode}
              silenceThreshold={silenceThreshold}
              waveformSelection={waveformSelection}
              onSelectionChange={setWaveformSelection}
              onReady={setDefaultDuration}
              scrollContainerRef={waveformScrollRef}
              height={waveformHeight}
            />
          </div>

          {/* Indicator badges for applied regions. A layer of their own, so
          the badges stay over the waveform but under the panel's pinned
          Sound row. */}
          <div
            className="relative z-[1] shadow-[inset_0_1px_0_var(--mv-line)]"
            style={{
              height: '22px',
              width: '100%',
            }}
          >
            {keySounds &&
              sourceId &&
              defaultDuration > 0 &&
              // Placed at the zoom value the waveform is drawn at.
              getUsageBadges(keySounds, sourceId, zoomLevel).map(
                ({ id, phase, count, tooltip, centerPx }) => (
                  <Tip key={id} label={tooltip}>
                    <span
                      className={cn(
                        'absolute top-[11px] z-50 flex h-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded px-1 font-code text-[10px] font-bold leading-none',
                        BADGE_STYLES[phase],
                      )}
                      style={{
                        left: `${centerPx}px`,
                        minWidth: `${USAGE_BADGE_MIN_WIDTH_PX}px`,
                      }}
                    >
                      {count}
                    </span>
                  </Tip>
                ),
              )}
          </div>
        </div>
      </div>

      <p className="m-0 shrink-0 px-5 text-xs text-mv-subtle">
        {soundRegionsMode
          ? 'Auto detect: click a highlighted region to pick that sound · Drag edges to resize · Space to play'
          : 'Drag on the waveform to pick a sound · Drag edges to resize · Space to play · Scroll to pan'}
      </p>
    </section>
  );
}
