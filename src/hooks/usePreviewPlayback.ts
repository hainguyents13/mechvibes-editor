import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Plays the mapped time segment for a key, the way the finished sound pack will.
 *
 * The file is decoded once into an AudioBuffer so each key press can start a new
 * buffer source at an offset — repeated presses overlap instead of cutting each
 * other off, which is what fast typing sounds like on a real pack.
 */
export function usePreviewPlayback(
  audioFile: File | null,
  modifiedKeys: Map<string, [number, number]>,
  enabled: boolean,
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Decode the file once per file change, but only while preview is active.
  useEffect(() => {
    if (!enabled || !audioFile) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const context = new AudioContext();
    audioContextRef.current = context;

    audioFile
      .arrayBuffer()
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        if (cancelled) return;
        bufferRef.current = buffer;
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not decode this file for preview.');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      bufferRef.current = null;
      context.close().catch(() => {
        // Already closed — nothing to clean up.
      });
      audioContextRef.current = null;
    };
  }, [audioFile, enabled]);

  const playKey = useCallback(
    (keyCode: string) => {
      const context = audioContextRef.current;
      const buffer = bufferRef.current;
      const segment = modifiedKeys.get(keyCode);
      if (!context || !buffer || !segment) return;

      const [startMs, endMs] = segment;
      const start = startMs / 1000;
      const duration = (endMs - startMs) / 1000;
      if (!(duration > 0)) return;

      // Browsers suspend the context until a user gesture; a key press is one.
      if (context.state === 'suspended') {
        context.resume().catch(() => {
          // Playback stays silent if the browser refuses — nothing else to do.
        });
      }

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0, start, duration);
    },
    [modifiedKeys],
  );

  return { playKey, isLoading, error };
}
