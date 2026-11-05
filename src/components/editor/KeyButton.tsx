import type React from 'react';
import { cn } from '@/lib/utils';
import { keyRect } from './key-selection';
import {
  KEYCAP_EDGE_PX,
  KEYCAP_FACE_OFF,
  KEYCAP_FACE_ON,
  KEYCAP_FACE_SELECTED,
  keycapEdge,
} from './keycap';

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

  // In preview mode a key is only interactive when a sound is mapped to it.
  const isInert = isPreview && !isModified;
  // A key held down sinks onto its edge, which then shows half as tall.
  const isDown = isPressed && !isInert;
  const edge = isDown ? KEYCAP_EDGE_PX / 2 : KEYCAP_EDGE_PX;

  // Clicks and drags in edit mode are handled by the keyboard around the keys.
  return (
    <button
      type="button"
      data-key-id={keyId}
      data-drop-code={isPreview ? undefined : code}
      tabIndex={isPreview ? -1 : tabIndex}
      aria-pressed={isPreview ? undefined : isSelected}
      aria-label={label.trim() ? label.replace(/\n/g, ' ') : 'Space'}
      title={!isPreview && sourceName ? `Sound from ${sourceName}` : undefined}
      className={cn(
        'absolute block cursor-pointer select-none rounded-[7px] border-0 p-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mv-ink',
        isInert && 'pointer-events-none opacity-30',
        isDropTarget && 'z-10 outline-2 outline-offset-1 outline-mv-ink',
      )}
      style={{
        left: box.left,
        top: box.top + (KEYCAP_EDGE_PX - edge),
        width: box.right - box.left,
        height: box.bottom - box.top - (KEYCAP_EDGE_PX - edge),
        paddingBottom: edge,
        background: keycapEdge(isModified, hasRelease),
      }}
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
      <span
        className={cn(
          'flex h-full items-center justify-center whitespace-pre-line rounded-[6px] px-0.5 text-center text-[length:var(--key-label-size,0.75rem)] font-bold leading-tight',
          !isPreview && isSelected
            ? KEYCAP_FACE_SELECTED
            : isModified
              ? KEYCAP_FACE_ON
              : KEYCAP_FACE_OFF,
          isDropTarget && 'bg-mv-fill',
          isDown && 'bg-mv-fill',
        )}
      >
        {label.replace(/ /g, '\n')}
      </span>
    </button>
  );
}
