import { RotateCcw, Zap } from 'lucide-react';
import React from 'react';
import {
  CombinedWaveform,
  type CombinedWaveformRef,
} from '@/components/editor/CombinedWaveform';
import {
  getUsageBadges,
  USAGE_BADGE_MIN_WIDTH_PX,
  type UsageBadge,
} from '@/components/editor/waveform-selection';
import { useWaveformEditor } from '@/hooks/useWaveformEditor';
import type { KeySounds } from '@/utils/soundPack';

// A badge that stands for press and release segments together takes neither colour.
const BADGE_STYLES: Record<UsageBadge['phase'], string> = {
  press: 'badge-neutral',
  release: 'badge-secondary',
  mixed: 'badge-outline',
};

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
    <fieldset className="fieldset py-0 shrink-0 min-h-0 min-w-0 w-full flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 shrink-0 min-w-0 flex-wrap px-4">
        <h2 className="text-xs font-medium text-base-content">Waveform</h2>
        {/* Zoom Controls: wrap on narrow screens rather than push Auto detect off the edge */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-xs">Zoom</span>
          <input
            type="range"
            min="10"
            max="300"
            step="10"
            value={zoomLevel}
            onChange={(e) => handleZoom(Number(e.target.value))}
            className="range range-xs w-32 sm:w-60"
            title={`${Math.round(zoomLevel)}% zoom`}
          />
          <span className="text-xs w-10 text-center">
            {Math.round(zoomLevel)}%
          </span>
          <button
            type="button"
            className="btn btn-xs btn-ghost btn-square rounded-box"
            onClick={handleResetZoom}
            title="Reset Zoom"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
          <div className="w-px h-4 bg-base-content/20 mx-1"></div>
          <button
            type="button"
            className={`btn btn-xs rounded-box ${soundRegionsMode ? 'btn-active' : 'btn-ghost'}`}
            onClick={toggleSoundRegionsMode}
            title={
              soundRegionsMode
                ? 'Exit sound regions mode'
                : 'Auto-detect sound regions'
            }
          >
            <Zap className="h-3 w-3" />
            Auto detect
          </button>
          {soundRegionsMode && showThreshold && (
            <>
              <span className="text-xs">Threshold</span>
              <input
                type="range"
                min="0.001"
                max="0.02"
                step="0.001"
                value={silenceThreshold}
                onChange={(e) => setSilenceThreshold(Number(e.target.value))}
                className="range range-xs w-32"
                title={`Silence threshold: ${silenceThreshold.toFixed(3)}`}
              />
              <span className="text-xs w-12 text-center">
                {silenceThreshold.toFixed(3)}
              </span>
            </>
          )}
        </div>
      </div>
      {/* Video preview lives in the Audio source panel — this side only shows the waveform */}
      <div
        ref={waveformScrollRef}
        className="shrink-0 min-w-0 w-full border-y border-base-content/20 bg-base-100 overflow-x-auto overflow-y-hidden"
      >
        <div style={{ minWidth: '100%', width: 'max-content' }}>
          {/* Waveform */}
          <div style={{ height: waveformHeight }}>
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

          {/* Indicator badges for applied regions */}
          <div
            className="relative bg-base-200 border-t border-base-content/10"
            style={{
              height: '20px',
              width: '100%',
            }}
          >
            {keySounds &&
              sourceId &&
              defaultDuration > 0 &&
              // Placed at the zoom value the waveform is drawn at.
              getUsageBadges(keySounds, sourceId, zoomLevel).map(
                ({ id, phase, count, tooltip, centerPx }) => (
                  <div
                    key={id}
                    className="absolute top-[8px] transform -translate-y-1/2 -translate-x-1/2 tooltip z-50"
                    style={{ left: `${centerPx}px` }}
                    data-tip={tooltip}
                  >
                    <div
                      className={`badge badge-xs rounded-none ${BADGE_STYLES[phase]}`}
                      style={{ minWidth: `${USAGE_BADGE_MIN_WIDTH_PX}px` }}
                    >
                      {count}
                    </div>
                  </div>
                ),
              )}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 text-xs text-base-content/50">
        {soundRegionsMode
          ? 'Auto detect: click a highlighted region to pick that sound • Drag edges to resize • Space to play'
          : 'Drag on the waveform to pick a sound • Drag edges to resize • Space to play • Scroll to pan'}
      </div>
    </fieldset>
  );
}
