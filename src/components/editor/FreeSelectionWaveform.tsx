import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type WaveSurfer from 'wavesurfer.js';
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

interface FreeSelectionWaveformProps {
  audioUrl: string;
  zoomLevel: number;
  waveformSelection: { start: number; end: number };
  onSelectionChange: (selection: { start: number; end: number }) => void;
  onReady: (duration: number) => void;
}

export interface FreeSelectionWaveformRef {
  wavesurfer: WaveSurfer | null;
  regions: RegionsPlugin | null;
  zoom: (level: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  setTime: (time: number) => void;
}

export const FreeSelectionWaveform = forwardRef<
  FreeSelectionWaveformRef,
  FreeSelectionWaveformProps
>(
  (
    { audioUrl, zoomLevel, waveformSelection, onSelectionChange, onReady },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<RegionsPlugin | null>(null);

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
      getCurrentTime: () => wavesurferRef.current?.getCurrentTime() || 0,
      setTime: (time: number) => wavesurferRef.current?.setTime(time),
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
          waveColor: '#4f46e5',
          progressColor: '#7c3aed',
          cursorColor: '#7c3aed',
          barWidth: 2,
          barRadius: 2,
          height: 100,
          normalize: true,
          backend: 'WebAudio',
          plugins: [regions],
          url: audioUrl,
        });

        wavesurferRef.current = ws;

        // Enable drag selection
        regions.enableDragSelection({
          color: 'rgba(79, 70, 229, 0.3)',
        });

        // Region event handlers
        regions.on('region-updated', (region: any) => {
          console.log(
            'Free selection region updated:',
            region.start,
            region.end,
          );
          // Convert seconds to milliseconds for display
          onSelectionChange({
            start: region.start * 1000,
            end: region.end * 1000,
          });
        });

        regions.on('region-clicked', (region: any, e: MouseEvent) => {
          e.stopPropagation();
          console.log('Free selection region clicked:', region);
          // Convert seconds to milliseconds for display
          onSelectionChange({
            start: region.start * 1000,
            end: region.end * 1000,
          });
        });

        // Ready event
        ws.once('decode', (duration: number) => {
          console.log('Free Selection WaveSurfer decoded, duration:', duration);

          // Create initial region if we have a selection
          if (waveformSelection.start !== waveformSelection.end) {
            regions.addRegion({
              start: waveformSelection.start / 1000, // Convert ms to seconds for WaveSurfer
              end: waveformSelection.end / 1000, // Convert ms to seconds for WaveSurfer
              color: 'rgba(79, 70, 229, 0.3)',
              drag: true,
              resize: true,
            });
          }

          // Apply initial zoom
          if (ws.getDuration() > 0) {
            ws.zoom(Math.max(10, zoomLevel));
          }

          onReady(duration);
        });
      };

      initWaveform();

      return () => {
        if (wavesurferRef.current) {
          try {
            wavesurferRef.current.destroy();
          } catch (e) {
            console.warn('Error destroying FreeSelectionWaveform:', e);
          }
        }
      };
    }, [audioUrl, onReady, onSelectionChange]);

    // Handle zoom changes
    useEffect(() => {
      if (wavesurferRef.current && wavesurferRef.current.getDuration() > 0) {
        wavesurferRef.current.zoom(Math.max(10, zoomLevel));
      }
    }, [zoomLevel]);

    // Handle selection changes
    useEffect(() => {
      if (
        regionsRef.current &&
        wavesurferRef.current &&
        wavesurferRef.current.getDuration() > 0
      ) {
        // Clear existing regions
        regionsRef.current.clearRegions();

        // Create new region if we have a selection
        if (waveformSelection.start !== waveformSelection.end) {
          regionsRef.current.addRegion({
            start: waveformSelection.start / 1000, // Convert ms to seconds for WaveSurfer
            end: waveformSelection.end / 1000, // Convert ms to seconds for WaveSurfer
            color: 'rgba(79, 70, 229, 0.3)',
            drag: true,
            resize: true,
          });
        }
      }
    }, [waveformSelection]);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
  },
);

FreeSelectionWaveform.displayName = 'FreeSelectionWaveform';
