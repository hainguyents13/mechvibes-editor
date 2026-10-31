import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import {
  isSameSpan,
  type SelectionMs,
  type SpanSec,
  scrollLeftToReveal,
  toRegionSpan,
} from '@/components/editor/waveform-selection';

/** Id of the one region the user edits. It always mirrors waveformSelection. */
const SELECTION_REGION_ID = 'selection';
const SELECTION_COLOR = 'rgba(79, 70, 229, 0.25)';
/** Auto-detected regions are click targets only and are never edited. */
const AUTO_REGION_PREFIX = 'sound-region-';
const isAutoRegion = (region: Region) =>
  region.id.startsWith(AUTO_REGION_PREFIX);
const autoRegionColor = (index: number, hovered = false) => {
  const hue = (index * 137.508) % 360;
  return hovered
    ? `hsla(${hue}, 60%, 60%, 0.5)`
    : `hsla(${hue}, 40%, 70%, 0.25)`;
};
const autoRegionIndex = (region: Region) =>
  Number(region.id.slice(AUTO_REGION_PREFIX.length));
/**
 * Lift the selection above the auto regions so its edges stay draggable. A
 * z-index rather than DOM order, because the plugin re-appends region elements
 * while scrolling.
 */
const raiseSelectionRegion = (region: Region) => {
  if (region.element) region.element.style.zIndex = '1';
};

interface CombinedWaveformProps {
  audioUrl: string;
  isVideo?: boolean;
  videoElement?: React.RefObject<HTMLVideoElement | null>;
  zoomLevel: number;
  soundOnlyMode: boolean;
  silenceThreshold: number;
  waveformSelection: SelectionMs;
  onSelectionChange: (selection: SelectionMs) => void;
  onReady: (duration: number) => void;
  /** The element that actually scrolls horizontally, used to keep zoom anchored. */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  /** Waveform height in px. Changes are applied without rebuilding the waveform. */
  height?: number;
}

export interface CombinedWaveformRef {
  wavesurfer: any;
}

export const CombinedWaveform = forwardRef<
  CombinedWaveformRef,
  CombinedWaveformProps
>(
  (
    {
      audioUrl,
      isVideo = false,
      videoElement,
      zoomLevel,
      soundOnlyMode,
      silenceThreshold,
      waveformSelection,
      onSelectionChange,
      onReady,
      scrollContainerRef,
      height = 200,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<any>(null);
    const regionsRef = useRef<any>(null);
    // The region drawn for waveformSelection, if any.
    const selectionRegionRef = useRef<Region | null>(null);
    const [isReady, setIsReady] = useState(false);
    // Read at init time so a height change does not rebuild the waveform.
    const heightRef = useRef(height);
    heightRef.current = height;

    // Time (seconds) the zoom should stay centred on. Captured before each zoom so
    // the view can be re-anchored afterwards, since ws.zoom() does not preserve it.
    const zoomAnchorRef = useRef<number | null>(null);

    // Latest selection, read inside the zoom effect without making it a dependency
    // (the effect must run on zoom changes only, not on every selection tweak).
    const selectionRef = useRef(waveformSelection);
    selectionRef.current = waveformSelection;

    // Helper function to synchronize video time with waveform
    const syncVideoTime = useCallback(
      (timeInSeconds: number) => {
        const video = videoElement?.current;
        if (isVideo && video) {
          video.currentTime = timeInSeconds;
        }
      },
      [isVideo, videoElement],
    );

    // Silence detection algorithm from official example
    const extractRegions = useCallback(
      (
        audioData: Float32Array,
        duration: number,
        threshold: number = 0.001,
      ) => {
        const minSilenceDuration = 0.05; // 50ms
        const mergeDuration = 0.1; // 100ms
        const scale = duration / audioData.length;
        const silentRegions: { start: number; end: number }[] = [];

        let start = 0;
        let end = 0;
        let isSilent = false;

        for (let i = 0; i < audioData.length; i++) {
          const absValue = Math.abs(audioData[i]);
          if (absValue < threshold) {
            if (!isSilent) {
              start = i;
              isSilent = true;
            }
          } else if (isSilent) {
            end = i;
            isSilent = false;
            if (scale * (end - start) > minSilenceDuration) {
              silentRegions.push({
                start: scale * start,
                end: scale * end,
              });
            }
          }
        }

        // Handle case where audio ends with silence
        if (isSilent) {
          end = audioData.length;
          if (scale * (end - start) > minSilenceDuration) {
            silentRegions.push({
              start: scale * start,
              end: scale * end,
            });
          }
        }

        // Merge close silent regions
        const mergedRegions: { start: number; end: number }[] = [];
        let lastRegion: { start: number; end: number } | null = null;

        for (let i = 0; i < silentRegions.length; i++) {
          if (
            lastRegion &&
            silentRegions[i].start - lastRegion.end < mergeDuration
          ) {
            lastRegion.end = silentRegions[i].end;
          } else {
            lastRegion = silentRegions[i];
            mergedRegions.push(lastRegion);
          }
        }

        // Find sound regions (non-silent parts)
        const soundRegions: { start: number; end: number }[] = [];
        let lastEnd = 0;

        for (let i = 0; i < mergedRegions.length; i++) {
          if (mergedRegions[i].start > lastEnd) {
            soundRegions.push({
              start: lastEnd,
              end: mergedRegions[i].start,
            });
          }
          lastEnd = mergedRegions[i].end;
        }

        // Add final region if there's audio after last silence
        if (lastEnd < duration) {
          soundRegions.push({
            start: lastEnd,
            end: duration,
          });
        }

        // Add 10ms padding before and after each sound region
        const paddingMs = 0.01; // 10ms
        const paddedRegions = soundRegions.map((region) => ({
          start: Math.max(0, region.start - paddingMs), // Don't go below 0
          end: Math.min(duration, region.end + paddingMs), // Don't exceed total duration
        }));

        return paddedRegions;
      },
      [],
    );

    // Rebuild the auto-detected regions. The selection region is left alone.
    const updateAutoRegions = useCallback(() => {
      if (!regionsRef.current || !wavesurferRef.current || !isReady) {
        return;
      }

      const regions = regionsRef.current;
      const ws = wavesurferRef.current;

      try {
        // Verify WaveSurfer is properly initialized
        const duration = ws.getDuration();
        if (duration <= 0) {
          return;
        }

        for (const region of [...regions.getRegions()]) {
          if (isAutoRegion(region)) region.remove();
        }
        if (!soundOnlyMode) return;

        const decodedData = ws.getDecodedData();
        if (decodedData) {
          const soundRegions = extractRegions(
            decodedData.getChannelData(0),
            duration,
            silenceThreshold,
          );

          soundRegions.forEach((span, index) => {
            regions.addRegion({
              ...span,
              id: `${AUTO_REGION_PREFIX}${index}`,
              content: String(index + 1),
              color: autoRegionColor(index),
              drag: false,
              resize: false,
            });
          });
        }
      } catch (error) {
        console.warn('Error updating regions:', error);
      }
    }, [soundOnlyMode, silenceThreshold, extractRegions, isReady]);

    useImperativeHandle(ref, () => ({ wavesurfer: wavesurferRef.current }));

    // Initialize WaveSurfer
    // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list kept as in the website editor; changing it changes when the hook re-runs
    useEffect(() => {
      if (!containerRef.current || !audioUrl) {
        return;
      }

      const initWaveform = async () => {
        try {
          const { default: WaveSurfer } = await import('wavesurfer.js');
          const { default: RegionsPlugin } = await import(
            'wavesurfer.js/dist/plugins/regions.esm.js'
          );
          const { default: TimelinePlugin } = await import(
            'wavesurfer.js/dist/plugins/timeline.esm.js'
          );

          // Clear container
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }

          const regions = RegionsPlugin.create();
          const timeline = TimelinePlugin.create({
            height: 20,
            insertPosition: 'beforebegin',
            timeInterval: 0.2,
            primaryLabelInterval: 5,
            secondaryLabelInterval: 1,
            style: {
              fontSize: '10px',
              color: '#6b7280',
            },
          });
          regionsRef.current = regions;

          // Configure WaveSurfer for either audio or video
          const waveSurferConfig: any = {
            container: containerRef.current,
            waveColor: '#4f46e5',
            progressColor: '#7c3aed',
            cursorColor: '#7c3aed',
            barWidth: soundOnlyMode ? 3 : 2,
            barRadius: soundOnlyMode ? 3 : 2,
            height: heightRef.current,
            normalize: true,
            backend: 'WebAudio',
            plugins: [regions, timeline],
            minPxPerSec: zoomLevel,
            interact: true,
            fillParent: false, // Don't fill parent, allow scrolling
          };

          // Use media element for video, URL for audio
          if (isVideo && videoElement?.current) {
            videoElement.current.src = audioUrl;
            waveSurferConfig.media = videoElement.current;
          } else {
            waveSurferConfig.url = audioUrl;
          }

          const ws = WaveSurfer.create(waveSurferConfig);

          wavesurferRef.current = ws;

          // A drag draws a new selection in free mode only
          if (!soundOnlyMode) {
            regions.enableDragSelection({ color: SELECTION_COLOR });
          }

          // Report a region as the new selection and park the cursor at its start.
          const selectRegion = (region: Region) => {
            onSelectionChange({
              start: region.start * 1000,
              end: region.end * 1000,
            });
            ws.setTime(region.start);
            syncVideoTime(region.start);
          };

          regions.on('region-created', (region: Region) => {
            if (region.id === SELECTION_REGION_ID) return; // drawn from the prop
            if (isAutoRegion(region)) {
              const index = autoRegionIndex(region);
              if (region.element) region.element.style.cursor = 'pointer';
              region.element?.addEventListener('mouseenter', () =>
                region.setOptions({ color: autoRegionColor(index, true) }),
              );
              region.element?.addEventListener('mouseleave', () =>
                region.setOptions({ color: autoRegionColor(index) }),
              );
              return;
            }
            // A drag on the waveform: it becomes the selection region.
            const previous = selectionRegionRef.current;
            if (previous && previous !== region) previous.remove();
            region.setOptions({ id: SELECTION_REGION_ID });
            raiseSelectionRegion(region);
            selectionRegionRef.current = region;
            selectRegion(region);
          });

          regions.on('region-removed', (region: Region) => {
            if (region === selectionRegionRef.current) {
              selectionRegionRef.current = null;
            }
          });

          // Only the selection can be dragged or resized.
          regions.on('region-updated', (region: Region) => {
            if (region.id !== SELECTION_REGION_ID) return;
            onSelectionChange({
              start: region.start * 1000,
              end: region.end * 1000,
            });
            // Move the cursor once the drag has fully ended.
            setTimeout(() => {
              ws.setTime(region.start);
              syncVideoTime(region.start);
            }, 0);
          });

          regions.on('region-clicked', (region: Region, e: MouseEvent) => {
            e.stopPropagation();
            // A click on an auto region picks its sound; the selection then
            // moves over it.
            if (isAutoRegion(region)) {
              selectRegion(region);
              return;
            }
            ws.setTime(region.start);
            syncVideoTime(region.start);
          });

          // Ready event. The effects below draw the regions once isReady is set.
          ws.once('decode', (duration: number) => {
            setIsReady(true);
            onReady(duration);
          });
        } catch (error) {
          console.error('Error initializing CombinedWaveform:', error);
        }
      };

      initWaveform();

      return () => {
        setIsReady(false);
        selectionRegionRef.current = null;
        if (wavesurferRef.current) {
          try {
            wavesurferRef.current.destroy();
          } catch (e) {
            console.warn('Error destroying CombinedWaveform:', e);
          }
        }
      };
    }, [audioUrl, soundOnlyMode, isVideo]); // Only reinitialize when URL, mode, or video type changes

    // Follow the panel height on the live waveform.
    useEffect(() => {
      if (isReady) {
        wavesurferRef.current?.setOptions({ height });
      }
    }, [height, isReady]);

    // Update zoom when level changes, keeping the view anchored.
    //
    // The waveform is rendered at full natural width (fillParent: false) inside an
    // outer overflow-x-auto element, so that element — not WaveSurfer — owns the
    // scroll position. ws.zoom() rescales the drawing but leaves scrollLeft alone,
    // which makes the visible slice jump. Re-derive scrollLeft from a time anchor:
    // the centre of the current selection, or the centre of the viewport if there
    // is no selection.
    useEffect(() => {
      const ws = wavesurferRef.current;
      if (!ws || !isReady) return;

      const scroller = scrollContainerRef?.current;
      const duration = ws.getDuration?.() ?? 0;

      // Capture the anchor time before rescaling.
      let anchorTime = zoomAnchorRef.current;
      if (anchorTime === null) {
        const { start, end } = selectionRef.current;
        const hasSelection = end > start && end > 0;
        if (hasSelection) {
          anchorTime = (start + end) / 2 / 1000;
        } else if (scroller && duration > 0) {
          const prevPxPerSec = scroller.scrollWidth / duration;
          anchorTime =
            prevPxPerSec > 0
              ? (scroller.scrollLeft + scroller.clientWidth / 2) / prevPxPerSec
              : 0;
        }
      }

      try {
        // WaveSurfer throws "No audio loaded" if the media isn't decoded yet.
        // Guard with the same check it uses internally (decodedData).
        if (ws.getDecodedData()) {
          ws.zoom(zoomLevel);
        }
      } catch {
        // Ignore — zoom is re-applied on the next decode/isReady update.
        return;
      }

      zoomAnchorRef.current = null;
      if (!scroller || anchorTime === null || duration <= 0) return;

      // Re-centre after the rescaled waveform has been laid out.
      requestAnimationFrame(() => {
        const pxPerSec = scroller.scrollWidth / duration;
        if (!Number.isFinite(pxPerSec) || pxPerSec <= 0) return;
        const target = anchorTime * pxPerSec - scroller.clientWidth / 2;
        const maxScroll = scroller.scrollWidth - scroller.clientWidth;
        scroller.scrollLeft = Math.max(0, Math.min(target, maxScroll));
      });
    }, [zoomLevel, isReady, scrollContainerRef]);

    // Scroll the outer scroller (it owns the scroll position, see the zoom
    // effect) just enough to show a span. Runs after layout, like the zoom
    // re-anchor, and is declared after it so that, when isReady turns true, the
    // zoom centring runs first.
    const revealSpan = useCallback(
      (span: SpanSec) => {
        const scroller = scrollContainerRef?.current;
        const ws = wavesurferRef.current;
        if (!scroller || !ws) return;
        requestAnimationFrame(() => {
          const duration = ws.getDuration?.() ?? 0;
          if (!(duration > 0)) return;
          const target = scrollLeftToReveal(span, {
            pxPerSec: scroller.scrollWidth / duration,
            scrollLeft: scroller.scrollLeft,
            clientWidth: scroller.clientWidth,
            scrollWidth: scroller.scrollWidth,
          });
          if (target !== null) scroller.scrollLeft = target;
        });
      },
      [scrollContainerRef],
    );

    // Draw the selection as the one editable region: create, move or remove it.
    // setOptions emits no update event, so this never calls onSelectionChange back.
    const syncSelectionRegion = useCallback(
      (selection: SelectionMs) => {
        const ws = wavesurferRef.current;
        const regions = regionsRef.current;
        if (!ws || !regions) return;
        const span = toRegionSpan(selection, ws.getDuration());
        const region = selectionRegionRef.current;
        if (!span) {
          // Clears the ref through the region-removed handler.
          region?.remove();
          return;
        }
        if (region) {
          if (isSameSpan(region, span)) return; // the change came from this region
          region.setOptions(span);
        } else {
          const created = regions.addRegion({
            id: SELECTION_REGION_ID,
            ...span,
            color: SELECTION_COLOR,
          });
          raiseSelectionRegion(created);
          selectionRegionRef.current = created;
        }
        revealSpan(span);
      },
      [revealSpan],
    );

    const { start: selectionStart, end: selectionEnd } = waveformSelection;
    // Key selection, typed times, Whole file and a source switch all arrive here.
    useEffect(() => {
      if (isReady) {
        syncSelectionRegion({ start: selectionStart, end: selectionEnd });
      }
    }, [isReady, selectionStart, selectionEnd, syncSelectionRegion]);

    // Sync the video preview to the selected start time (ms) whenever it changes,
    // e.g. via the time-segment Start input or keyboard key selection.
    useEffect(() => {
      const video = videoElement?.current;
      if (!isVideo || !video) return;
      const timeInSeconds = waveformSelection.start / 1000;
      if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) return;
      try {
        video.currentTime = timeInSeconds;
      } catch {
        // Ignore — media metadata may not be loaded yet.
      }
    }, [waveformSelection.start, isVideo, videoElement]);

    // Sync the other way: scrubbing the video moves the waveform cursor and keeps
    // that position centred in the scroll container, so the playhead never drifts
    // off-screen while seeking.
    useEffect(() => {
      const video = videoElement?.current;
      const ws = wavesurferRef.current;
      if (!isVideo || !video || !ws || !isReady) return;

      const centreOnVideoTime = () => {
        const time = video.currentTime;
        if (!Number.isFinite(time)) return;

        // WaveSurfer drives playback from this same element for video, so setting
        // the cursor is only needed when it has drifted (e.g. a native scrub).
        const duration = ws.getDuration?.() ?? 0;
        if (duration > 0 && Math.abs(ws.getCurrentTime() - time) > 0.01) {
          ws.setTime(time);
        }

        const scroller = scrollContainerRef?.current;
        if (!scroller || duration <= 0) return;
        const pxPerSec = scroller.scrollWidth / duration;
        if (!Number.isFinite(pxPerSec) || pxPerSec <= 0) return;
        const target = time * pxPerSec - scroller.clientWidth / 2;
        const maxScroll = scroller.scrollWidth - scroller.clientWidth;
        scroller.scrollLeft = Math.max(0, Math.min(target, maxScroll));
      };

      video.addEventListener('seeking', centreOnVideoTime);
      video.addEventListener('seeked', centreOnVideoTime);
      video.addEventListener('timeupdate', centreOnVideoTime);
      return () => {
        video.removeEventListener('seeking', centreOnVideoTime);
        video.removeEventListener('seeked', centreOnVideoTime);
        video.removeEventListener('timeupdate', centreOnVideoTime);
      };
    }, [isVideo, videoElement, isReady, scrollContainerRef]);

    // Rebuild the auto regions when the threshold or the mode changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list kept as in the website editor; changing it changes when the hook re-runs
    useEffect(() => {
      if (isReady) {
        updateAutoRegions();
      }
    }, [isReady, soundOnlyMode, silenceThreshold, updateAutoRegions]);

    return (
      <div>
        {/* Waveform container */}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            minWidth: 'max-content',
            overflow: 'visible',
          }}
        />
      </div>
    );
  },
);

CombinedWaveform.displayName = 'CombinedWaveform';
