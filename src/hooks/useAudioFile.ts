import { useCallback, useState } from 'react';

const isMediaFile = (file: File) =>
  file.type.startsWith('audio/') || file.type.startsWith('video/');

export function useAudioFile() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);

  // Get media duration from file (audio or video)
  const getAudioDuration = useCallback((file: File): Promise<number> => {
    return new Promise((resolve) => {
      const media: HTMLMediaElement = file.type.startsWith('video/')
        ? document.createElement('video')
        : new Audio();
      const url = URL.createObjectURL(file);

      media.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(media.duration);
      });

      media.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });

      media.src = url;
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && isMediaFile(file)) {
        setAudioFile(file);

        // Get media duration
        const duration = await getAudioDuration(file);
        setAudioDuration(duration);
      }
    },
    [getAudioDuration],
  );

  // Handle file selection from File object (for drag/drop)
  const handleFileFromObject = useCallback(
    async (file: File) => {
      if (isMediaFile(file)) {
        setAudioFile(file);

        // Get media duration
        const duration = await getAudioDuration(file);
        setAudioDuration(duration);
      }
    },
    [getAudioDuration],
  );

  // Handle drag and drop events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        await handleFileFromObject(file);
      }
    },
    [handleFileFromObject],
  );

  // Clear audio file
  const clearAudioFile = useCallback(() => {
    setAudioFile(null);
    setAudioDuration(0);
  }, []);

  // Format duration for display
  const formatDuration = useCallback((seconds: number): string => {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    audioFile,
    audioDuration,
    setAudioFile,
    setAudioDuration,
    getAudioDuration,
    handleFileSelect,
    handleFileFromObject,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    clearAudioFile,
    formatDuration,
  };
}
