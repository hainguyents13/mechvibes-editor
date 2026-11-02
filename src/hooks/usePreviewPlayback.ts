import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AudioSource,
  type KeySounds,
  sourcesInUse,
} from '@/utils/soundPack';

/**
 * Plays a key's sound the way the finished sound pack will: the press sound
 * when the key goes down and, when the key has one, the release sound when it
 * comes up.
 *
 * Each source is decoded once into an AudioBuffer so each key press can start
 * a new buffer source at an offset — repeated presses overlap instead of
 * cutting each other off, which is what fast typing sounds like on a real pack.
 */
export function usePreviewPlayback(
  sources: AudioSource[],
  keySounds: KeySounds,
  enabled: boolean,
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only the files keys play: one no key uses cannot break the preview.
  const playedSources = useMemo(
    () => sourcesInUse(sources, keySounds),
    [sources, keySounds],
  );

  // Decode the files once per change, but only while preview is active.
  useEffect(() => {
    if (!enabled || playedSources.length === 0) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const context = new AudioContext();
    audioContextRef.current = context;
    const buffers = new Map<string, AudioBuffer>();
    buffersRef.current = buffers;

    Promise.all(
      playedSources.map(async (source) => {
        try {
          const data = await source.file.arrayBuffer();
          buffers.set(source.id, await context.decodeAudioData(data));
          return null;
        } catch {
          return source.file.name;
        }
      }),
    ).then((failed) => {
      if (cancelled) return;
      const names = failed.filter((name): name is string => name !== null);
      if (names.length > 0) {
        setError(`Could not decode ${names.join(', ')} to play it.`);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      buffersRef.current = new Map();
      context.close().catch(() => {
        // Already closed — nothing to clean up.
      });
      audioContextRef.current = null;
    };
  }, [playedSources, enabled]);

  const playKey = useCallback(
    (keyCode: string, phase: 'press' | 'release' = 'press') => {
      const context = audioContextRef.current;
      const sound = keySounds.get(keyCode);
      const segment = phase === 'press' ? sound?.press : sound?.release;
      const buffer = sound ? buffersRef.current.get(sound.source) : undefined;
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
    [keySounds],
  );

  return { playKey, isLoading, error };
}
