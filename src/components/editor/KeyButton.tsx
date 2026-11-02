import type React from 'react';
import { cn } from '@/lib/utils';
import { keyRect } from './key-selection';

interface KeyButtonProps {
  label: string;
  /** The key's code, which a file dropped on it goes to. */
  code: string;
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
  /** A file dragged over the keyboard would go to this key. */
  isDropTarget?: boolean;
  /** Preview only: play the key while a mouse button or a finger holds it. */
  onPreviewPointerDown?: () => void;
  onPreviewPointerUp?: () => void;
}

export function KeyButton({
  label,
  code,
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
  isDropTarget = false,
  onPreviewPointerDown,
  onPreviewPointerUp,
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
      data-drop-code={isPreview ? undefined : code}
      tabIndex={isPreview ? -1 : tabIndex}
      aria-pressed={isPreview ? undefined : isSelected}
      aria-label={label.trim() ? label.replace(/\n/g, ' ') : 'Space'}
      // The file's name as well as its colour, for those who cannot tell colours apart.
      title={!isPreview && sourceName ? `Sound from ${sourceName}` : undefined}
      className={cn(
        'btn text-[length:var(--key-label-size,0.75rem)] flex font-normal items-center justify-center rounded select-none relative whitespace-pre-line text-center leading-tight border border-base-content/20 transition-transform',
        !isPreview && isSelected ? 'btn-neutral' : '',
        isInert ? 'opacity-30 pointer-events-none' : '',
        isPreview && isModified ? 'btn-primary' : '',
        // An unmapped key plays nothing in preview, so it does not look pressed either.
        isPressed && !isInert ? 'btn-active scale-95' : '',
        isDropTarget
          ? 'bg-primary/25 text-base-content ring-2 ring-primary z-10'
          : '',
      )}
      style={style}
      disabled={isInert}
      onKeyDown={isPreview ? undefined : (e) => onKeyDown(keyId, e)}
      onFocus={() => onFocus(keyId)}
      // Pointer events answer a tap at once, where the mouse events a browser
      // makes up for one come only after the finger lifts. Captured, the key
      // hears the pointer come up also off the key, so it never stays down.
      onPointerDown={
        isPreview
          ? (e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onPreviewPointerDown?.();
            }
          : undefined
      }
      onPointerUp={isPreview ? onPreviewPointerUp : undefined}
      onPointerCancel={isPreview ? onPreviewPointerUp : undefined}
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
