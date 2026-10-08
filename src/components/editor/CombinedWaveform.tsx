import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

interface CombinedWaveformProps {
  audioUrl: string;
  isVideo?: boolean;
  videoElement?: React.RefObject<HTMLVideoElement | null>;
  zoomLevel: number;
  soundOnlyMode: boolean;
  silenceThreshold: number;
  waveformSelection: { start: number; end: number };
  onSelectionChange: (selection: { start: number; end: number }) => void;
  onRegionSelect: (regionId: string) => void;
  onReady: (duration: number) => void;
  /** The element that actually scrolls horizontally, used to keep zoom anchored. */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export interface CombinedWaveformRef {
  wavesurfer: any;
  regions: any;
  zoom: (level: number) => void;
  play: () => void;
  pause: () => void;
  playRegion: (regionId: string) => void;
  setTime: (time: number) => void;
  getCurrentTime: () => number;
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
      onRegionSelect,
      onReady,
      scrollContainerRef,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<any>(null);
    const regionsRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);

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

    // Create and update regions based on mode
    const updateRegions = useCallback(() => {
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

        if (soundOnlyMode) {
          // Sound-only mode: clear and show auto-detected regions
          regions.clearRegions();
          const decodedData = ws.getDecodedData();
          if (decodedData) {
            const soundRegions = extractRegions(
              decodedData.getChannelData(0),
              duration,
              silenceThreshold,
            );

            soundRegions.forEach((region: any, index: number) => {
              regions.addRegion({
                start: region.start,
                end: region.end,
                content: (index + 1).toString(),
                color: `hsla(${(index * 137.508) % 360}, 40%, 70%, 0.25)`,
                drag: false,
                resize: false,
                id: `sound-region-${index}`,
              });
            });
          }
        } else {
          // Free selection mode: only clear regions if switching modes
          // Don't recreate user selections to avoid infinite loops
          const existingRegions = regions.getRegions();
          const hasUserRegion = existingRegions.some(
            (r: any) =>
              r.id === 'user-selection' || r.id?.startsWith('user-selection'),
          );

          // Only clear regions if we don't have any user regions (mode switch)
          if (existingRegions.length > 0 && !hasUserRegion) {
            regions.clearRegions();
          }
        }
      } catch (error) {
        console.warn('Error updating regions:', error);
      }
    }, [soundOnlyMode, silenceThreshold, extractRegions, isReady]);

    useImperativeHandle(ref, () => ({
      wavesurfer: wavesurferRef.current,
      regions: regionsRef.current,
      zoom: (level: number) => {
        const ws = wavesurferRef.current;
        if (ws && ws.getDecodedData()) {
          ws.zoom(level);
        }
      },
      play: () => wavesurferRef.current?.play(),
      pause: () => wavesurferRef.current?.pause(),
      playRegion: (regionId: string) => {
        const region = regionsRef.current
          ?.getRegions()
          ?.find((r: any) => r.id === regionId);
        if (region) {
          region.play();
        }
      },
      setTime: (time: number) => {
        wavesurferRef.current?.setTime(time);
        syncVideoTime(time);
      },
      getCurrentTime: () => wavesurferRef.current?.getCurrentTime() || 0,
    }));

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
            height: 200,
            normalize: true,
            backend: 'WebAudio',
            plugins: [regions, timeline],
            minPxPerSec: Math.max(100, zoomLevel),
            interact: true,
            scrollParent: true, // Enable scrolling
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

          // Set up drag selection for free mode only
          if (!soundOnlyMode) {
            regions.enableDragSelection({
              color: 'rgba(79, 70, 229, 0.25)',
            });
          }

          // Event handlers based on mode
          if (soundOnlyMode) {
            // Sound-only mode: only handle region clicks
            let selectedRegion: any = null;

            regions.on('region-clicked', (region: any, e: MouseEvent) => {
              e.stopPropagation();

              // Reset previous selected region to normal color
              if (selectedRegion && selectedRegion !== region) {
                selectedRegion.setOptions({
                  color: `hsla(${(selectedRegion.id.match(/\d+/)?.[0] * 137.508) % 360}, 40%, 70%, 0.25)`,
                });
              }

              // Highlight the newly selected region
              region.setOptions({
                color: `hsla(${(region.id.match(/\d+/)?.[0] * 137.508) % 360}, 80%, 45%, 0.6)`,
              });

              selectedRegion = region;
              onRegionSelect(region.id || '');
              onSelectionChange({
                start: region.start * 1000,
                end: region.end * 1000,
              });
              // Sync video time for video files
              syncVideoTime(region.start);
            });

            // Add hover effects for sound regions using individual region event listeners
            regions.on('region-created', (region: any) => {
              // Add mouse event listeners to each region
              region.element.addEventListener('mouseenter', () => {
                // Don't change color if this is the selected region
                if (selectedRegion === region) return;

                region.setOptions({
                  color: `hsla(${(region.id.match(/\d+/)?.[0] * 137.508) % 360}, 60%, 60%, 0.5)`,
                });
              });

              region.element.addEventListener('mouseleave', () => {
                // Don't change color if this is the selected region
                if (selectedRegion === region) return;

                // Reset to default color
                region.setOptions({
                  color: `hsla(${(region.id.match(/\d+/)?.[0] * 137.508) % 360}, 40%, 70%, 0.4)`,
                });
              });
            });
          } else {
            // Free selection mode: handle region updates and clicks
            regions.on('region-updated', (region: any) => {
              onSelectionChange({
                start: region.start * 1000,
                end: region.end * 1000,
              });
              // Move cursor to start position after update is complete
              setTimeout(() => {
                ws.setTime(region.start);
                syncVideoTime(region.start);
              }, 0);
            });

            regions.on('region-clicked', (region: any, e: MouseEvent) => {
              e.stopPropagation();
              onSelectionChange({
                start: region.start * 1000,
                end: region.end * 1000,
              });
              // Move cursor to start position on click
              ws.setTime(region.start);
              syncVideoTime(region.start);
            });

            // Limit to single selection: clear existing regions when creating new one
            regions.on('region-created', (region: any) => {
              const allRegions = regions.getRegions();
              // Remove all other regions except the newly created one
              allRegions.forEach((r: any) => {
                if (r !== region) {
                  r.remove();
                }
              });

              onSelectionChange({
                start: region.start * 1000,
                end: region.end * 1000,
              });
              // Move cursor to start position after drag selection
              ws.setTime(region.start);
              syncVideoTime(region.start);
            });
          }

          // Ready event
          ws.once('decode', (duration: number) => {
            setIsReady(true);
            onReady(duration);

            // Update regions after state is set and component is ready
            setTimeout(() => {
              updateRegions();
            }, 0);
          });
        } catch (error) {
          console.error('Error initializing CombinedWaveform:', error);
        }
      };

      initWaveform();

      return () => {
        setIsReady(false);
        if (wavesurferRef.current) {
          try {
            wavesurferRef.current.destroy();
          } catch (e) {
            console.warn('Error destroying CombinedWaveform:', e);
          }
        }
      };
    }, [audioUrl, soundOnlyMode, isVideo]); // Only reinitialize when URL, mode, or video type changes

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

    // Update regions when threshold or selection changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list kept as in the website editor; changing it changes when the hook re-runs
    useEffect(() => {
      if (isReady) {
        updateRegions();
      }
    }, [isReady, soundOnlyMode, silenceThreshold, updateRegions]);

    // Add CSS for region hover effects
    useEffect(() => {
      const style = document.createElement('style');
      style.id = 'combined-waveform-style';
      style.textContent = `
        [data-id*="region"] {
          cursor: pointer !important;
          transition: opacity 0.2s ease;
        }
      `;
      document.head.appendChild(style);

      return () => {
        const existingStyle = document.getElementById(
          'combined-waveform-style',
        );
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }, []);

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
