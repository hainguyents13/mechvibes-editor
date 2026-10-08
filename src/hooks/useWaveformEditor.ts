import { useCallback, useEffect, useState } from 'react';

interface UseWaveformEditorProps {
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
}

export function useWaveformEditor({
  audioFile,
  setZoomLevel,
  setIsPlaying,
  wavesurfer,
}: UseWaveformEditorProps) {
  const [soundRegionsMode, setSoundRegionsMode] = useState(false);
  const [selectedSoundRegion, setSelectedSoundRegion] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [silenceThreshold, setSilenceThreshold] = useState<number>(0.002); // Default threshold

  // Initialize audio URL when file changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list kept as in the website editor; changing it changes when the hook re-runs
  useEffect(() => {
    if (!audioFile) {
      console.log('No audio file provided');
      return;
    }

    // Clean up previous URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    // Create new URL
    const newUrl = URL.createObjectURL(audioFile);
    setAudioUrl(newUrl);

    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [audioFile]);

  // Handle zoom changes
  const handleZoom = useCallback(
    (newZoom: number) => {
      setZoomLevel(newZoom);
    },
    [setZoomLevel],
  );

  // Reset zoom
  const handleResetZoom = useCallback(() => {
    const defaultZoom = 100;
    handleZoom(defaultZoom);
  }, [handleZoom]);

  // Toggle sound regions mode
  const toggleSoundRegionsMode = useCallback(() => {
    setSoundRegionsMode(!soundRegionsMode);
    setSelectedSoundRegion('');
  }, [soundRegionsMode]);

  // Play selected segment - this is a placeholder, will be replaced by actual function from CombinedWaveform
  const playSelectedSegment = useCallback(() => {
    console.log('playSelectedSegment called but not properly initialized');
  }, []);

  // Stop playback
  const stopPlayback = useCallback(() => {
    if (wavesurfer.current) {
      wavesurfer.current.pause();
      setIsPlaying(false);
    }
  }, [setIsPlaying, wavesurfer]);

  return {
    soundRegionsMode,
    toggleSoundRegionsMode,
    selectedSoundRegion,
    setSelectedSoundRegion,
    silenceThreshold,
    setSilenceThreshold,
    handleZoom,
    handleResetZoom,
    playSelectedSegment,
    stopPlayback,
    audioUrl,
  };
}
