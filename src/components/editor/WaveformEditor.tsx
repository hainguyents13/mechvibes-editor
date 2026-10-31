import { RotateCcw, Zap } from 'lucide-react';
import React from 'react';
import { CombinedWaveform } from '@/components/editor/CombinedWaveform';
import { useWaveformEditor } from '@/hooks/useWaveformEditor';
import { isWholeFile, type KeySounds } from '@/utils/soundPack';

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
  wavesurfer: React.MutableRefObject<any>;
  regionsPlugin: React.MutableRefObject<any>;
  onPlaySelectedSegmentReady?: (playFn: () => void) => void;
  /** Key sounds; those cut from `sourceId` are marked under the waveform. */
  keySounds?: KeySounds;
  sourceId?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  /** Waveform height in px; the editor shrinks it on short screens. */
  waveformHeight?: number;
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
  wavesurfer,
  regionsPlugin,
  onPlaySelectedSegmentReady,
  keySounds,
  sourceId,
  videoRef: externalVideoRef,
  waveformHeight = 200,
}: WaveformEditorProps) {
  const {
    soundRegionsMode,
    toggleSoundRegionsMode,
    setSelectedSoundRegion,
    silenceThreshold,
    setSilenceThreshold,
    handleZoom,
    handleResetZoom,
    audioUrl,
  } = useWaveformEditor({
    audioFile,
    defaultDuration,
    setDefaultDuration,
    waveformSelection,
    setWaveformSelection,
    zoomLevel,
    setZoomLevel,
    isPlaying,
    setIsPlaying,
    wavesurfer,
    regionsPlugin,
  });

  const combinedWaveformRef = React.useRef<any>(null);
  // The horizontally scrolling wrapper around the waveform — zoom anchors to it
  const waveformScrollRef = React.useRef<HTMLDivElement>(null);
  const fallbackVideoRef = React.useRef<HTMLVideoElement>(null);
  // The preview element lives in AudioFileSelector; use it so playback stays in sync
  const videoPreviewRef = externalVideoRef ?? fallbackVideoRef;

  // Create the unified playSelectedSegment function that always uses segment inputs
  const actualPlaySelectedSegment = React.useCallback(() => {
    const waveformRef = combinedWaveformRef.current;
    if (!waveformRef) {
      console.log('CombinedWaveform ref not available');
      return;
    }

    const ws = waveformRef.wavesurfer;
    if (!ws) {
      console.log('WaveSurfer instance not available');
      return;
    }

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
      console.log('No valid time segment to play:', waveformSelection);
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

    // Clean up function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [waveformSelection, setIsPlaying, isPlaying]);

  const handleWaveformReady = React.useCallback(
    (duration: number) => {
      setDefaultDuration(duration);
      wavesurfer.current = combinedWaveformRef.current?.wavesurfer;
      regionsPlugin.current = combinedWaveformRef.current?.regions;
    },
    [setDefaultDuration, wavesurfer, regionsPlugin],
  );

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
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs">Zoom</span>
          <input
            type="range"
            min="10"
            max="300"
            step="10"
            value={zoomLevel}
            onChange={(e) => handleZoom(Number(e.target.value))}
            className="range range-xs w-60"
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
          {soundRegionsMode && (
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
              onRegionSelect={setSelectedSoundRegion}
              onReady={handleWaveformReady}
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
              defaultDuration > 0 &&
              (() => {
                // Group this file's press and release sounds by time range
                const regionGroups = new Map<
                  string,
                  {
                    phase: 'press' | 'release';
                    start: number;
                    end: number;
                    keyNames: string[];
                  }
                >();
                const add = (
                  phase: 'press' | 'release',
                  [start, end]: [number, number],
                  keyName: string,
                ) => {
                  const regionKey = `${phase}:${start}-${end}`;
                  const group = regionGroups.get(regionKey) ?? {
                    phase,
                    start,
                    end,
                    keyNames: [],
                  };
                  group.keyNames.push(keyName);
                  regionGroups.set(regionKey, group);
                };
                keySounds.forEach((sound, keyName) => {
                  // A key of unknown length has no span to mark.
                  if (sound.source !== sourceId || isWholeFile(sound.press))
                    return;
                  add('press', sound.press, keyName);
                  if (sound.release) add('release', sound.release, keyName);
                });

                return Array.from(regionGroups.entries()).map(
                  ([regionKey, { phase, start, end, keyNames }]) => {
                    const startPx = (start / 1000) * Math.max(100, zoomLevel);
                    const widthPx =
                      ((end - start) / 1000) * Math.max(100, zoomLevel);

                    // Position badge at the center of the region
                    const centerPx = startPx + widthPx / 2;

                    return (
                      <div
                        key={regionKey}
                        className="absolute top-[8px] transform -translate-y-1/2 -translate-x-1/2 tooltip z-50"
                        style={{ left: `${centerPx}px` }}
                        data-tip={`${phase === 'press' ? 'Press' : 'Release'} sound of ${keyNames.length} key${keyNames.length > 1 ? 's' : ''}: ${keyNames.join(', ')} (${Math.round(start)}ms - ${Math.round(end)}ms)`}
                      >
                        <div
                          className={`badge badge-xs rounded-none ${phase === 'press' ? 'badge-neutral' : 'badge-secondary'}`}
                          style={{ minWidth: '20px' }}
                        >
                          {keyNames.length}
                        </div>
                      </div>
                    );
                  },
                );
              })()}
          </div>
        </div>
      </div>

      {/* Debug Information Panel */}
      {/* <div className='mt-2 p-3 bg-base-200 rounded-box'>
        <h4 className='text-sm font-medium mb-2'>Debug Information</h4>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <h5 className='text-xs font-medium mb-1'>Current Selection:</h5>
            <pre className='text-xs bg-base-100 p-2 rounded overflow-x-auto'>
              {JSON.stringify({
                start: `${waveformSelection.start}ms`,
                end: `${waveformSelection.end}ms`,
                duration: `${waveformSelection.end - waveformSelection.start}ms`
              }, null, 2)}
            </pre>
          </div>
          <div>
            <h5 className='text-xs font-medium mb-1'>Selected Keys:</h5>
            <pre className='text-xs bg-base-100 p-2 rounded overflow-x-auto'>
              {JSON.stringify(Array.from(selectedKeys || []), null, 2)}
            </pre>
          </div>
        </div>
        <div className='mt-2'>
          <h5 className='text-xs font-medium mb-1'>Applied Key Segments:</h5>
          <pre className='text-xs bg-base-100 p-2 rounded overflow-x-auto max-h-40'>
            {JSON.stringify(
              modifiedKeys ? Object.fromEntries(
                Array.from(modifiedKeys.entries()).map(([key, [start, end]]) => [
                  key, 
                  { 
                    start: `${start}ms`, 
                    end: `${end}ms`, 
                    duration: `${end - start}ms` 
                  }
                ])
              ) : {}, 
              null, 
              2
            )}
          </pre>
        </div>
        <div className='mt-2'>
          <h5 className='text-xs font-medium mb-1'>Waveform Settings:</h5>
          <pre className='text-xs bg-base-100 p-2 rounded overflow-x-auto'>
            {JSON.stringify({
              zoomLevel: `${zoomLevel}%`,
              defaultDuration: `${defaultDuration}s`,
              soundRegionsMode,
              silenceThreshold,
              selectedSoundRegion
            }, null, 2)}
          </pre>
        </div>
      </div> */}

      <div className="shrink-0 px-4 text-xs text-base-content/50">
        {soundRegionsMode
          ? 'Auto detect: click a highlighted region to pick that sound'
          : 'Drag on the waveform to pick a sound • Drag edges to resize • Space to play • Scroll to pan'}
      </div>
    </fieldset>
  );
}
