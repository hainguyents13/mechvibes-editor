import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type WaveSurfer from 'wavesurfer.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

interface SoundOnlyWaveformProps {
  audioUrl: string;
  zoomLevel: number;
  silenceThreshold: number;
  onSelectionChange: (selection: { start: number; end: number }) => void;
  onRegionSelect: (regionId: string) => void;
  onReady: (duration: number) => void;
}

export interface SoundOnlyWaveformRef {
  wavesurfer: WaveSurfer | null;
  regions: RegionsPlugin | null;
  zoom: (level: number) => void;
  play: () => void;
  pause: () => void;
  playRegion: (regionId: string) => void;
  getRegions: () => any[];
}

export const SoundOnlyWaveform = forwardRef<
  SoundOnlyWaveformRef,
  SoundOnlyWaveformProps
>(
  (
    {
      audioUrl,
      zoomLevel,
      silenceThreshold,
      onSelectionChange,
      onRegionSelect,
      onReady,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<RegionsPlugin | null>(null);
    const isInitializedRef = useRef<boolean>(false);
    const thresholdRef = useRef<number>(silenceThreshold);

    // Keep threshold ref updated
    useEffect(() => {
      thresholdRef.current = silenceThreshold;
    }, [silenceThreshold]);

    // Extract regions function (from official example)
    const extractRegions = useCallback(
      (audioData: Float32Array, durationMs: number, threshold: number) => {
        // Efficiently calculate max and average without spreading large arrays
        let maxValue = 0;
        let sumValue = 0;
        for (let i = 0; i < audioData.length; i++) {
          const absValue = Math.abs(audioData[i]);
          if (absValue > maxValue) maxValue = absValue;
          sumValue += absValue;
        }
        const avgValue = sumValue / audioData.length;

        console.log('Audio analysis:', {
          durationMs,
          durationSec: (durationMs / 1000).toFixed(2),
          samples: audioData.length,
          maxValue,
          avgValue,
        });

        const minValue = threshold; // Use configurable threshold for silence
        const minSilenceDurationMs = 50; // Minimum silence duration (50ms)
        const mergeDurationMs = 100; // Merge duration (100ms)
        const scaleMs = durationMs / audioData.length; // ms per sample
        const silentRegions: { start: number; end: number }[] = [];

        // Find all silent regions longer than minSilenceDurationMs
        let start = 0;
        let end = 0;
        let isSilent = false;
        for (let i = 0; i < audioData.length; i++) {
          const absValue = Math.abs(audioData[i]);
          if (absValue < minValue) {
            if (!isSilent) {
              start = i;
              isSilent = true;
            }
          } else if (isSilent) {
            end = i;
            isSilent = false;
            const silenceDurationMs = scaleMs * (end - start);
            if (silenceDurationMs > minSilenceDurationMs) {
              silentRegions.push({
                start: scaleMs * start,
                end: scaleMs * end,
              });
            }
          }
        }

        // Handle case where audio ends with silence
        if (isSilent) {
          end = audioData.length;
          if (scaleMs * (end - start) > minSilenceDurationMs) {
            silentRegions.push({
              start: scaleMs * start,
              end: scaleMs * end,
            });
          }
        }

        // Merge silent regions that are close together
        const mergedRegions: { start: number; end: number }[] = [];
        let lastRegion: { start: number; end: number } | null = null;
        for (let i = 0; i < silentRegions.length; i++) {
          if (
            lastRegion &&
            silentRegions[i].start - lastRegion.end < mergeDurationMs
          ) {
            lastRegion.end = silentRegions[i].end;
          } else {
            lastRegion = silentRegions[i];
            mergedRegions.push(lastRegion);
          }
        }

        // Find regions that are not silent (sound regions)
        const regions: { start: number; end: number }[] = [];
        let lastEndMs = 0;
        for (let i = 0; i < mergedRegions.length; i++) {
          if (mergedRegions[i].start > lastEndMs) {
            regions.push({
              start: lastEndMs,
              end: mergedRegions[i].start,
            });
          }
          lastEndMs = mergedRegions[i].end;
        }

        // Add final region if there's audio after the last silence
        if (lastEndMs < durationMs) {
          regions.push({
            start: lastEndMs,
            end: durationMs,
          });
        }

        console.log('Silence detection results:', {
          silentRegions: silentRegions.length,
          mergedSilentRegions: mergedRegions.length,
          soundRegions: regions.length,
          regions: regions.map((r) => ({
            start: (r.start / 1000).toFixed(3) + 's',
            end: (r.end / 1000).toFixed(3) + 's',
            duration: ((r.end - r.start) / 1000).toFixed(3) + 's',
          })),
        });

        return regions;
      },
      [],
    );

    useImperativeHandle(ref, () => ({
      wavesurfer: wavesurferRef.current,
      regions: regionsRef.current,
      zoom: (level: number) => {
        if (wavesurferRef.current && wavesurferRef.current.getDuration() > 0) {
          wavesurferRef.current.zoom(level);
        }
      },
      play: () => wavesurferRef.current?.play(),
      pause: () => wavesurferRef.current?.pause(),
      playRegion: (regionId: string) => {
        const regions = regionsRef.current?.getRegions();
        const region = regions?.find((r: any) => r.id === regionId);
        if (region) {
          region.play();
        }
      },
      getRegions: () => regionsRef.current?.getRegions() || [],
    }));

    // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list kept as in the website editor; changing it changes when the hook re-runs
    useEffect(() => {
      if (!containerRef.current || !audioUrl) return;

      const initWaveform = async () => {
        const { default: WaveSurfer } = await import('wavesurfer.js');
        const { default: RegionsPlugin } = await import(
          'wavesurfer.js/dist/plugins/regions.esm.js'
        );

        const regions = RegionsPlugin.create();
        regionsRef.current = regions;

        const ws = WaveSurfer.create({
          container: containerRef.current!,
          waveColor: '#6366f1',
          progressColor: '#4f46e5',
          cursorColor: 'transparent', // Hide cursor in sound-only mode
          barWidth: 3,
          barRadius: 3,
          height: 100,
          normalize: true,
          backend: 'WebAudio',
          plugins: [regions],
          url: audioUrl,
          interact: true, // Allow interaction for region clicks
        });

        wavesurferRef.current = ws;

        // Prevent drag selection by not enabling it
        // (drag selection is opt-in, not opt-out)

        regions.on('region-created', (region: any) => {
          const originalColor = region.color;

          region.element.addEventListener('mouseenter', () => {
            region.setOptions({
              color: `hsla(${(region.id.match(/\d+/)?.[0] * 137.508) % 360}, 85%, 60%, 0.9)`,
            });
          });

          region.element.addEventListener('mouseleave', () => {
            region.setOptions({ color: originalColor });
          });
        });

        // Region clicked event handler
        regions.on('region-clicked', (region: any, e: MouseEvent) => {
          e.stopPropagation();
          console.log('Sound region clicked:', region);

          // Select this region and update inputs with start/end/duration
          onRegionSelect(region.id || '');
          // Convert seconds to milliseconds for display
          onSelectionChange({
            start: region.start * 1000,
            end: region.end * 1000,
          });

          // Don't auto-play - just update the inputs
          const durationMs = (region.end - region.start) * 1000;
          console.log(
            `Region ${region.id} selected: ${region.start.toFixed(3)}s to ${region.end.toFixed(3)}s (duration: ${durationMs.toFixed(0)}ms)`,
          );
        });

        // Ready event
        ws.once('decode', (durationSec: number) => {
          console.log('Sound-Only WaveSurfer decoded, duration:', durationSec);

          // Extract sound regions using silence detection
          const decodedData = ws.getDecodedData();
          if (decodedData) {
            const durationMs = durationSec * 1000;
            const soundRegions = extractRegions(
              decodedData.getChannelData(0),
              durationMs,
              thresholdRef.current,
            );

            // Add highlighted sound regions (non-silent parts)
            soundRegions.forEach((region: any, index: number) => {
              regions.addRegion({
                start: region.start / 1000, // Convert ms back to seconds for WaveSurfer API
                end: region.end / 1000, // Convert ms back to seconds for WaveSurfer API
                content: (index + 1).toString(),
                color: `hsla(${(index * 137.508) % 360}, 70%, 50%, 0.7)`,
                drag: false, // Block dragging
                resize: false, // Block resizing
                id: `sound-region-${index}`,
              });
            });

            console.log(`Created ${soundRegions.length} sound regions`);
          }

          // Apply initial zoom
          if (ws.getDuration() > 0) {
            ws.zoom(Math.max(10, zoomLevel));
          }

          // Mark as initialized after successful setup
          isInitializedRef.current = true;
          onReady(durationSec);
        });
      };

      initWaveform();

      return () => {
        isInitializedRef.current = false;
        if (wavesurferRef.current) {
          try {
            wavesurferRef.current.destroy();
          } catch (e) {
            console.warn('Error destroying SoundOnlyWaveform:', e);
          }
        }
      };
    }, [audioUrl, onSelectionChange, onRegionSelect, onReady]);

    // Handle zoom changes
    useEffect(() => {
      if (wavesurferRef.current && wavesurferRef.current.getDuration() > 0) {
        wavesurferRef.current.zoom(Math.max(10, zoomLevel));
      }
    }, [zoomLevel]);

    // Rebuild regions when threshold changes (but not on initial mount)
    // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list kept as in the website editor; changing it changes when the hook re-runs
    useEffect(() => {
      console.log('Threshold effect triggered:', {
        silenceThreshold,
        initialized: isInitializedRef.current,
        hasWavesurfer: !!wavesurferRef.current,
        hasRegions: !!regionsRef.current,
      });

      // Skip if not initialized yet
      if (!isInitializedRef.current) {
        console.log('Skipping: not initialized yet');
        return;
      }

      // Skip if refs are not ready
      if (!wavesurferRef.current || !regionsRef.current) {
        console.log('Skipping: refs not ready');
        return;
      }

      const ws = wavesurferRef.current;
      const regions = regionsRef.current;

      // Check if WaveSurfer is fully initialized
      try {
        const duration = ws.getDuration();
        if (duration <= 0) {
          console.log('WaveSurfer not ready yet, duration:', duration);
          return;
        }

        const decodedData = ws.getDecodedData();
        if (!decodedData) {
          console.log('No decoded data available yet');
          return;
        }

        console.log(
          'Clearing regions and rebuilding with threshold:',
          silenceThreshold,
        );

        // Clear existing regions
        regions.clearRegions();

        // Extract and add new regions with updated threshold
        const durationMs = duration * 1000;
        const soundRegions = extractRegions(
          decodedData.getChannelData(0),
          durationMs,
          silenceThreshold,
        );

        console.log('Generated sound regions:', soundRegions.length);

        soundRegions.forEach((region: any, index: number) => {
          const newRegion = regions.addRegion({
            start: region.start / 1000,
            end: region.end / 1000,
            content: (index + 1).toString(),
            color: `hsla(${(index * 137.508) % 360}, 70%, 50%, 0.7)`,
            drag: false,
            resize: false,
            id: `sound-region-${index}`,
          });
          console.log('Added region:', newRegion?.id);
        });

        console.log(
          `Rebuilt ${soundRegions.length} sound regions with threshold ${silenceThreshold}`,
        );
      } catch (error) {
        console.warn('Error rebuilding regions:', error);
      }
    }, [silenceThreshold]);

    // Add CSS styles for region hover effects
    useEffect(() => {
      // Create style element if it doesn't exist
      let styleEl = document.getElementById(
        'sound-regions-style',
      ) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'sound-regions-style';
        document.head.appendChild(styleEl);
      }

      // Add CSS rules for region hover effects
      styleEl.textContent = `
        [data-id^="sound-region-"] {
          cursor: pointer !important;
          transition: opacity 0.2s ease;
        }
        [data-id^="sound-region-"]:hover {
          opacity: 0.8 !important;
        }
      `;

      return () => {
        // Clean up style element when component unmounts
        if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
      };
    }, []);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
  },
);

SoundOnlyWaveform.displayName = 'SoundOnlyWaveform';
