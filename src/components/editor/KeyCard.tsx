import { useId, useLayoutEffect, useRef, useState } from 'react';
import { getAudioTrackColor } from '@/components/editor/audio-track-colors';
import { KEYCAP_FACE_ON, keycapEdge } from '@/components/editor/keycap';
import type { SoundSlot } from '@/components/editor/TimeSegmentControls';
import {
  Ellipsis,
  Play,
  Plus,
  Square,
  TriangleAlert,
} from '@/components/icons';
import { NavbarMenu } from '@/components/NavbarMenu';
import { buttonVariants } from '@/components/ui/button';
import type { FileKind } from '@/lib/fileKinds';
import { keyCardName, keyCardOffer, segmentSeconds } from '@/lib/keyCard';
import { keyLabel } from '@/lib/keyNames';
import { cn, plural } from '@/lib/utils';
import { formatLength } from '@/utils/audioUtils';
import type { AudioSource, KeySound, PackType } from '@/utils/soundPack';

/** How far the pinned card goes past the column's bottom: `lg:-bottom-3`. */
const BOTTOM_OVERHANG = 12;

interface KeyCardProps {
  code: string;
  sound: KeySound;
  /** The file the key's sound comes from. */
  source: AudioSource;
  /** The kind of that file. */
  kind: FileKind;
  packType: PackType;
  /** How many other keys play the same sound. */
  sameCount: number;
  /** The half of the key's sound playing from the card, if one is. */
  playingSlot: SoundSlot | null;
  onPlay: (slot: SoundSlot) => void;
  onChangeFile: () => void;
  onRemove: () => void;
  onSwap: () => void;
  onAddRelease: () => void;
  onSplit: () => void;
  /** Where focus goes when Remove sound or Split it takes away its button. */
  onFocusLost: () => void;
}

/**
 * The sound of the one selected key or button, by the file list: what it
 * plays on press and release, what to do next with it, and its own actions.
 */
export function KeyCard({
  code,
  sound,
  source,
  kind,
  packType,
  sameCount,
  playingSlot,
  onPlay,
  onChangeFile,
  onRemove,
  onSwap,
  onAddRelease,
  onSplit,
  onFocusLost,
}: KeyCardProps) {
  const titleId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  // Pinned over the list only while it fits the column whole. Taller, it
  // would hide the list and Add, and still be cut off, so it scrolls with
  // the list instead. Pinning moves it without changing either height.
  const [fits, setFits] = useState(true);
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const column = section?.parentElement;
    if (!section || !column) return;
    // It is let past the column's bottom padding by its own.
    const check = () =>
      setFits(section.offsetHeight <= column.clientHeight + BOTTOM_OVERHANG);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(section);
    observer.observe(column);
    return () => observer.disconnect();
  }, []);
  const isMouse = packType === 'Mouse';
  const noun = isMouse ? 'button' : 'key';
  const label = keyLabel(code);
  const name = keyCardName(code, packType);
  const fileName = source.file.name;
  // A file without audio has nothing to play, split or cut.
  const isMissing = source.missing === true;
  const offer = isMissing ? null : keyCardOffer(sound, source, kind);
  const color = getAudioTrackColor(source.colorIndex);

  const part = (slot: SoundSlot) => {
    const segment = slot === 'press' ? sound.press : sound.release;
    if (!segment) return null;
    const isPlaying = playingSlot === slot;
    const Icon = isPlaying ? Square : Play;
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span
          aria-hidden="true"
          className={cn(
            'h-1 w-3 rounded-full',
            slot === 'press' ? 'bg-mv-press' : 'bg-mv-release',
          )}
        />
        <span className="font-bold text-mv-ink">
          {slot === 'press' ? 'Press' : 'Release'}
        </span>
        <button
          type="button"
          disabled={isMissing}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
            color.text,
            isPlaying && 'bg-mv-fill',
          )}
          onClick={() => onPlay(slot)}
          aria-label={`${isPlaying ? 'Stop' : 'Play'} the ${slot} sound of ${label}`}
          title={isPlaying ? 'Stop' : 'Play'}
        >
          <Icon className="size-3.5" />
        </button>
        <span className="font-code text-mv-subtle">
          {formatLength(segmentSeconds(segment, source))}
        </span>
      </div>
    );
  };

  // Remove sound takes the card away, and Split it its own button: focus
  // that was on them moves on rather than drop to the page.
  const thenMoveFocus = (action: () => void) => () => {
    const hadFocus = sectionRef.current?.contains(document.activeElement);
    action();
    if (hadFocus) onFocusLost();
  };

  return (
    // Side by side, pinned over the column's bottom padding, which it
    // carries itself: a sticky box stops at the padding, so it is let past
    // it by as much. Stacked, it shares the row with the list, as tall as its
    // own content rather than the list's.
    <section
      ref={sectionRef}
      aria-labelledby={titleId}
      data-tour="key-card"
      className={cn(
        'min-w-0 z-10 editor-panel-surface max-lg:flex-1 max-lg:self-start lg:shrink-0 lg:pt-3 lg:-bottom-3 lg:-mb-3 lg:pb-3',
        fits && 'lg:sticky',
      )}
    >
      <div className="flex flex-col gap-2.5 min-w-0 rounded-[12px] bg-mv-page p-3 shadow-[inset_0_0_0_1px_var(--mv-line)]">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* The key as the keyboard draws it: its edge shows press and release */}
          <span
            aria-hidden="true"
            className="block h-9 min-w-9 shrink-0 rounded-[7px] pb-[3px]"
            style={{ background: keycapEdge(true, Boolean(sound.release)) }}
          >
            <span
              className={cn(
                'flex h-full items-center justify-center rounded-[6px] px-1.5 text-xs font-bold',
                KEYCAP_FACE_ON,
              )}
            >
              {label}
            </span>
          </span>
          <h2
            id={titleId}
            className="m-0 min-w-0 truncate text-[13px] font-bold text-mv-ink"
            title={`${name} · from ${fileName}`}
          >
            {name}{' '}
            <span className="font-normal text-mv-subtle">
              · from {fileName}
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {part('press')}
          {part('release')}
          {isMissing && (
            <span className="flex items-center gap-1 text-xs font-bold text-mv-ink">
              <TriangleAlert className="size-3.5 shrink-0 text-mv-danger" />
              {fileName} has no audio
            </span>
          )}
          {offer === 'add-release' && (
            <button
              type="button"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              onClick={onAddRelease}
              aria-label={`Add a release sound to ${label}`}
              title={`Cut the sound the ${noun} makes when it comes up from ${fileName}`}
            >
              <Plus className="size-3.5" />
              Add a release sound
            </button>
          )}
        </div>
        {offer === 'split' && (
          <p className="m-0 text-xs text-mv-muted">
            This {noun} plays the whole file. Has the file a press and a
            release?{' '}
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'sm' }),
                'h-[26px] px-2.5 text-xs',
              )}
              onClick={thenMoveFocus(onSplit)}
              aria-label={`Split it: ${fileName}`}
              title={`Show ${fileName} on the waveform to cut its press and release`}
            >
              Split it
            </button>
          </p>
        )}
        {offer === 'cut' && (
          <p className="m-0 text-xs text-mv-muted">
            Cut the press on the waveform, then switch to Release.
          </p>
        )}
        {sameCount > 0 && (
          <p className="m-0 text-xs text-mv-subtle">
            Same sound as {plural(sameCount, `other ${noun}`)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            onClick={onChangeFile}
            aria-label={`Change file for ${label}`}
            title={`Give the ${noun} another file`}
          >
            Change file
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            onClick={thenMoveFocus(onRemove)}
            aria-label={`Remove sound from ${label}`}
            title={`Make the ${noun} silent (Delete)`}
          >
            Remove sound
          </button>
          {/* Its only action needs a release, so without one there is no menu. */}
          {sound.release && (
            <NavbarMenu
              align="end"
              buttonLabel={`More for ${isMouse ? label : `key ${label}`}`}
              buttonClassName={buttonVariants({
                variant: 'ghost',
                size: 'icon-sm',
              })}
              items={[{ label: 'Swap press and release', onSelect: onSwap }]}
            >
              <Ellipsis className="size-4" />
            </NavbarMenu>
          )}
        </div>
      </div>
    </section>
  );
}
