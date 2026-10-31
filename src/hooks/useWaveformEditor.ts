import { useCallback, useEffect, useState } from 'react';

interface UseWaveformEditorProps {
  audioFile: File | null;
  setZoomLevel: (level: number) => void;
}

export function useWaveformEditor({
  audioFile,
  setZoomLevel,
}: UseWaveformEditorProps) {
  const [soundRegionsMode, setSoundRegionsMode] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [silenceThreshold, setSilenceThreshold] = useState<number>(0.002); // Default threshold

  // Initialize audio URL when file changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list kept as in the website editor; changing it changes when the hook re-runs
  useEffect(() => {
    if (!audioFile) {
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
  const toggleSoundRegionsMode = useCallback(
    () => setSoundRegionsMode((mode) => !mode),
    [],
  );

  return {
    soundRegionsMode,
    toggleSoundRegionsMode,
    silenceThreshold,
    setSilenceThreshold,
    handleZoom,
    handleResetZoom,
    audioUrl,
  };
}
