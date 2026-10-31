import { EyeOff, Play, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { HiddenKey } from '@/components/editor/hidden-keys';
import { playFileSegment } from '@/utils/audioUtils';
import {
  type AudioSource,
  isWholeFile,
  type KeySounds,
} from '@/utils/soundPack';

const SIZE_NAMES = { compact: 'Compact', tkl: 'TKL', fullsize: 'Full size' };

/** Why a chip is in the tray, for its tooltip. */
function reasonText(hidden: HiddenKey) {
  switch (hidden.reason) {
    case 'bigger-layout':
      return `${hidden.code} is on the ${SIZE_NAMES[hidden.layout]} layout, not on this one.`;
    case 'no-layout':
      return `${hidden.code} is not on any layout the editor draws. It still plays in the app and is exported.`;
    case 'not-a-mouse-button':
      return `${hidden.code} is a keyboard key. A mouse pack does not play it, but it is still exported.`;
    case 'not-a-key':
      return `${hidden.code} is a mouse button. A keyboard pack does not play it, but it is still exported.`;
  }
}

const GROUPS: { label: string; reasons: HiddenKey['reason'][] }[] = [
  { label: 'Not on this layout', reasons: ['bigger-layout', 'no-layout'] },
  { label: 'Not mouse buttons', reasons: ['not-a-mouse-button'] },
  { label: 'Not keyboard keys', reasons: ['not-a-key'] },
];

interface HiddenKeysTrayProps {
  /** Mapped codes the drawn layout leaves out. */
  hiddenKeys: HiddenKey[];
  keySounds: KeySounds;
  sources: AudioSource[];
  /** Clear the sound on one code. */
  onClear: (code: string) => void;
}

/**
 * One line of chips for keys that have a sound but are not drawn, so they can
 * still be heard and cleared. It scrolls sideways when the chips do not fit.
 */
export function HiddenKeysTray({
  hiddenKeys,
  keySounds,
  sources,
  onClear,
}: HiddenKeysTrayProps) {
  const stopSoundRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopSoundRef.current?.(), []);

  const play = (code: string) => {
    stopSoundRef.current?.();
    const sound = keySounds.get(code);
    const source = sources.find((s) => s.id === sound?.source);
    if (!sound || !source) return;
    stopSoundRef.current = playFileSegment(source.file, sound.press);
  };

  return (
    <div className="flex h-6 items-center gap-3 overflow-x-auto whitespace-nowrap text-xs [scrollbar-width:none]">
      <EyeOff
        className="h-3.5 w-3.5 shrink-0 text-base-content/60"
        aria-hidden
      />
      {GROUPS.map(({ label, reasons }) => {
        const chips = hiddenKeys.filter((hidden) =>
          reasons.includes(hidden.reason),
        );
        if (chips.length === 0) return null;
        return (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-base-content/60">
              {label} ({chips.length}):
            </span>
            {chips.map((hidden) => {
              const sound = keySounds.get(hidden.code);
              const canPlay = sound !== undefined && !isWholeFile(sound.press);
              return (
                <span
                  key={hidden.code}
                  title={reasonText(hidden)}
                  className="inline-flex h-5 items-center gap-0.5 rounded-box border border-base-content/20 bg-base-100 px-0.5 font-mono"
                >
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-base-300 disabled:opacity-40"
                    aria-label={`Play ${hidden.code}`}
                    title={
                      canPlay ? undefined : 'This browser cannot play this file'
                    }
                    disabled={!canPlay}
                    onClick={() => play(hidden.code)}
                  >
                    <Play className="h-3 w-3" />
                  </button>
                  {hidden.code}
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-base-300"
                    aria-label={`Clear the sound on ${hidden.code}`}
                    onClick={() => onClear(hidden.code)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
