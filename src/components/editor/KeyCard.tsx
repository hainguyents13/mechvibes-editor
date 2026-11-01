import { Ellipsis, Play, Plus, Square } from 'lucide-react';
import { useId } from 'react';
import { getAudioTrackColor } from '@/components/editor/audio-track-colors';
import type { SoundSlot } from '@/components/editor/TimeSegmentControls';
import { NavbarMenu } from '@/components/NavbarMenu';
import type { FileKind } from '@/lib/fileKinds';
import { keyCardName, keyCardOffer, segmentSeconds } from '@/lib/keyCard';
import { keyLabel } from '@/lib/keyNames';
import { cn, plural } from '@/lib/utils';
import { formatLength } from '@/utils/audioUtils';
import type { AudioSource, KeySound, PackType } from '@/utils/soundPack';

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
}

/**
 * The sound of the one selected key or button, under the file list: what it
 * plays on press and release, what to do next with it, and its own actions.
 * Side by side it stays pinned to the bottom of the column while the list
 * scrolls behind it.
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
}: KeyCardProps) {
  const titleId = useId();
  const isMouse = packType === 'Mouse';
  const noun = isMouse ? 'button' : 'key';
  const label = keyLabel(code);
  const name = keyCardName(code, packType);
  const fileName = source.file.name;
  const offer = keyCardOffer(sound, source, kind);
  const color = getAudioTrackColor(source.colorIndex);

  const part = (slot: SoundSlot) => {
    const segment = slot === 'press' ? sound.press : sound.release;
    if (!segment) return null;
    const isPlaying = playingSlot === slot;
    const Icon = isPlaying ? Square : Play;
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="font-medium text-base-content">
          {slot === 'press' ? 'Press' : 'Release'}
        </span>
        <button
          type="button"
          className={cn(
            'btn btn-xs btn-ghost btn-square rounded-box',
            isPlaying && 'btn-active',
          )}
          onClick={() => onPlay(slot)}
          aria-label={`${isPlaying ? 'Stop' : 'Play'} the ${slot} sound of ${label}`}
          title={isPlaying ? 'Stop' : 'Play'}
        >
          <Icon className={`h-3 w-3 ${color.text}`} />
        </button>
        <span className="text-base-content/70">
          {formatLength(segmentSeconds(segment, source))}
        </span>
      </div>
    );
  };

  return (
    // Pinned over the column's bottom padding, which it carries itself: a
    // sticky box stops at the padding, so it is let past it by as much.
    <section
      aria-labelledby={titleId}
      data-tour="key-card"
      className="shrink-0 min-w-0 z-10 editor-panel-surface pt-3 lg:sticky lg:-bottom-3 lg:-mb-3 lg:pb-3"
    >
      <div
        className={cn(
          'flex flex-col gap-2 min-w-0 rounded-box border border-l-4 border-base-content/15 bg-base-100 p-3',
          // After the border colour, or cn drops it as overridden.
          color.border,
        )}
      >
        <h2
          id={titleId}
          className="truncate text-xs font-semibold text-base-content"
          title={`${name} · from ${fileName}`}
        >
          {name}{' '}
          <span className="font-normal text-base-content/70">
            · from {fileName}
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {part('press')}
          {part('release')}
          {offer === 'add-release' && (
            <button
              type="button"
              className="btn btn-xs btn-ghost rounded-box"
              onClick={onAddRelease}
              aria-label={`Add a release sound to ${label}`}
              title={`Cut the sound the ${noun} makes when it comes up from ${fileName}`}
            >
              <Plus className="h-3 w-3" />
              Add a release sound
            </button>
          )}
        </div>
        {offer === 'split' && (
          <p className="text-xs text-base-content/70">
            This {noun} plays the whole file. Has the file a press and a
            release?{' '}
            <button
              type="button"
              className="btn btn-xs rounded-box"
              onClick={onSplit}
              aria-label={`Split it: ${fileName}`}
              title={`Show ${fileName} on the waveform to cut its press and release`}
            >
              Split it
            </button>
          </p>
        )}
        {offer === 'cut' && (
          <p className="text-xs text-base-content/70">
            Cut the press on the waveform, then switch to Release.
          </p>
        )}
        {sameCount > 0 && (
          <p className="text-xs text-base-content/70">
            Same sound as {plural(sameCount, `other ${noun}`)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-xs rounded-box"
            onClick={onChangeFile}
            aria-label={`Change file for ${label}`}
            title={`Give the ${noun} another file`}
          >
            Change file
          </button>
          <button
            type="button"
            className="btn btn-xs rounded-box"
            onClick={onRemove}
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
              buttonClassName="btn btn-xs btn-ghost btn-square rounded-box"
              items={[{ label: 'Swap press and release', onSelect: onSwap }]}
            >
              <Ellipsis className="h-3 w-3" />
            </NavbarMenu>
          )}
        </div>
      </div>
    </section>
  );
}
