import { EyeOff, Play, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { HiddenKey } from '@/components/editor/hidden-keys';
import { cn } from '@/lib/utils';
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
  /** Take focus when the focused clear button was the last, as the tray goes away. */
  onFocusLost: () => void;
  /** Codes a file dragged over the keyboard would go to. */
  dropCodes?: ReadonlySet<string> | null;
}

/** Pixels a wheel step of one line scrolls, for a mouse that reports lines. */
const WHEEL_LINE = 16;

/**
 * One line of chips for keys that have a sound but are not drawn, so they can
 * still be heard and cleared. It scrolls sideways when the chips do not fit,
 * with a plain mouse wheel too, and fades at an edge that has more chips.
 */
export function HiddenKeysTray({
  hiddenKeys,
  keySounds,
  sources,
  onClear,
  onFocusLost,
  dropCodes,
}: HiddenKeysTrayProps) {
  const stopSoundRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopSoundRef.current?.(), []);

  const stripRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  // Which edges have chips scrolled out of view.
  const [more, setMore] = useState({ before: false, after: false });

  useEffect(() => {
    const strip = stripRef.current;
    const chips = chipsRef.current;
    if (!strip || !chips) return;
    const measure = () => {
      const before = strip.scrollLeft > 1;
      const after =
        strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1;
      setMore((current) =>
        current.before === before && current.after === after
          ? current
          : { before, after },
      );
    };
    // A vertical wheel does not scroll sideways by itself.
    const onWheel = (event: WheelEvent) => {
      if (event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
        return;
      }
      if (strip.scrollWidth <= strip.clientWidth) return;
      event.preventDefault();
      strip.scrollLeft +=
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * WHEEL_LINE
          : event.deltaY;
    };
    // The chips change size as keys are cleared, the strip as the window does.
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    observer.observe(chips);
    strip.addEventListener('scroll', measure, { passive: true });
    strip.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      strip.removeEventListener('scroll', measure);
      strip.removeEventListener('wheel', onWheel);
    };
  }, []);

  const play = (code: string) => {
    stopSoundRef.current?.();
    const sound = keySounds.get(code);
    const source = sources.find((s) => s.id === sound?.source);
    if (!sound || !source) return;
    stopSoundRef.current = playFileSegment(source.file, sound.press);
  };

  // The cleared chip goes away, so focus moves to the next chip's clear
  // button, else the one before, else out of the tray.
  const clear = (code: string, button: HTMLButtonElement) => {
    const buttons = Array.from(
      chipsRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[data-clear]',
      ) ?? [],
    );
    const index = buttons.indexOf(button);
    const next = buttons[index + 1] ?? buttons[index - 1];
    if (button === document.activeElement) {
      if (next) next.focus();
      else onFocusLost();
    }
    onClear(code);
  };

  const fade = (edge: boolean, side: string) =>
    edge ? `transparent ${side}` : `black ${side}`;

  return (
    <div
      ref={stripRef}
      className="h-6 overflow-x-auto text-xs [scrollbar-width:none]"
      style={
        more.before || more.after
          ? {
              maskImage: `linear-gradient(to right, ${fade(more.before, '0')}, black 1.5rem, black calc(100% - 1.5rem), ${fade(more.after, '100%')})`,
            }
          : undefined
      }
    >
      <div
        ref={chipsRef}
        className="flex h-full w-max items-center gap-3 whitespace-nowrap"
      >
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
                const canPlay =
                  sound !== undefined && !isWholeFile(sound.press);
                return (
                  <span
                    key={hidden.code}
                    title={reasonText(hidden)}
                    // A file dropped on the chip goes to its key, which is not drawn.
                    data-drop-code={hidden.code}
                    className={cn(
                      'inline-flex h-5 items-center gap-0.5 rounded-box border border-base-content/20 bg-base-100 px-0.5 font-mono',
                      dropCodes?.has(hidden.code) &&
                        'border-primary bg-primary/25 ring-2 ring-primary',
                    )}
                  >
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-base-300 disabled:opacity-40"
                      aria-label={`Play ${hidden.code}`}
                      title={
                        canPlay
                          ? undefined
                          : 'This browser cannot play this file'
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
                      data-clear
                      onClick={(e) => clear(hidden.code, e.currentTarget)}
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
    </div>
  );
}
