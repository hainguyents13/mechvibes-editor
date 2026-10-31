import type React from 'react';
import { cn } from '@/lib/utils';
import { keyRect } from './key-selection';

interface KeyButtonProps {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  isModified: boolean;
  /** The key also plays a sound when it comes up. */
  hasRelease?: boolean;
  /** Background class of the has-a-sound dot: the colour of the key's source file. */
  dotColor?: string;
  /** Name of the file the key's sound comes from, shown on hover. */
  sourceName?: string;
  keyId: string;
  /** 0 for the one key in the Tab order, -1 for the rest. */
  tabIndex: number;
  onKeyDown: (keyId: string, e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onFocus: (keyId: string) => void;
  /** Preview mode: unmapped keys are inert, mapped ones light up while held. */
  isPreview?: boolean;
  isPressed?: boolean;
  /** Preview only: play the key while the mouse holds it. */
  onPreviewMouseDown?: () => void;
  onPreviewMouseUp?: () => void;
}

export function KeyButton({
  label,
  x,
  y,
  width,
  height,
  isSelected,
  isModified,
  hasRelease = false,
  dotColor,
  sourceName,
  keyId,
  tabIndex,
  onKeyDown,
  onFocus,
  isPreview = false,
  isPressed = false,
  onPreviewMouseDown,
  onPreviewMouseUp,
}: KeyButtonProps) {
  const box = keyRect({ x, y, width, height });
  const style = {
    position: 'absolute' as const,
    left: box.left,
    top: box.top,
    width: box.right - box.left,
    height: box.bottom - box.top,
  };

  // In preview mode a key is only interactive when a sound is mapped to it.
  const isInert = isPreview && !isModified;

  // Clicks and drags in edit mode are handled by the keyboard around the keys.
  return (
    <button
      type="button"
      data-key-id={keyId}
      tabIndex={isPreview ? -1 : tabIndex}
      aria-pressed={isPreview ? undefined : isSelected}
      aria-label={label.trim() ? label.replace(/\n/g, ' ') : 'Space'}
      // The file's name as well as its colour, for those who cannot tell colours apart.
      title={!isPreview && sourceName ? `Sound from ${sourceName}` : undefined}
      className={cn(
        'btn text-xs flex font-normal items-center justify-center rounded select-none relative whitespace-pre-line text-center leading-tight border border-base-content/20 transition-transform',
        !isPreview && isSelected ? 'btn-neutral' : '',
        isInert ? 'opacity-30 pointer-events-none' : '',
        isPreview && isModified ? 'btn-primary' : '',
        isPressed ? 'btn-active scale-95' : '',
      )}
      style={style}
      disabled={isInert}
      onKeyDown={isPreview ? undefined : (e) => onKeyDown(keyId, e)}
      onFocus={() => onFocus(keyId)}
      onMouseDown={isPreview ? onPreviewMouseDown : undefined}
      onMouseUp={isPreview ? onPreviewMouseUp : undefined}
    >
      {!isPreview && isModified && (
        <div
          className={cn(
            'absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-lg ring-2 ring-base-content/20',
            dotColor ?? 'bg-primary',
          )}
        />
      )}
      {!isPreview && hasRelease && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary rounded-full border-2 border-white shadow-lg ring-2 ring-secondary/30"></div>
      )}
      {label.replace(/ /g, '\n')}
    </button>
  );
}
