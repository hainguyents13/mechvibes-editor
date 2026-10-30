import type React from 'react';
import { cn } from '@/lib/utils';

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
  keyId: string;
  onClick: (keyId: string, e: React.MouseEvent) => void;
  onMouseDown: (keyId: string, e: React.MouseEvent) => void;
  onMouseUp: (keyId: string, e: React.MouseEvent) => void;
  onMouseEnter: (keyId: string, e: React.MouseEvent) => void;
  /** Preview mode: unmapped keys are inert, mapped ones light up while held. */
  isPreview?: boolean;
  isPressed?: boolean;
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
  keyId,
  onMouseDown,
  onMouseUp,
  onMouseEnter,
  isPreview = false,
  isPressed = false,
}: KeyButtonProps) {
  const unitSize = 54;
  const gap = 3;
  const padding = gap;

  const style = {
    position: 'absolute' as const,
    left: x * unitSize + x * gap + padding,
    top: y * unitSize + y * gap + padding,
    width: width * unitSize + (width - 1) * gap,
    height: height * unitSize + (height - 1) * gap,
  };

  // In preview mode a key is only interactive when a sound is mapped to it.
  const isInert = isPreview && !isModified;

  return (
    // biome-ignore lint/a11y/useKeyWithMouseEvents: mouse-driven editor surface ported unchanged from the website; keyboard access is a follow-up
    <button
      type="button"
      className={cn(
        'btn text-xs flex font-normal items-center justify-center rounded select-none relative whitespace-pre-line text-center leading-tight border border-base-content/20 transition-transform',
        !isPreview && isSelected ? 'btn-neutral' : '',
        isInert ? 'opacity-30 pointer-events-none' : '',
        isPreview && isModified ? 'btn-primary' : '',
        isPressed ? 'btn-active scale-95' : '',
      )}
      style={style}
      disabled={isInert}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(keyId, e);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        onMouseUp(keyId, e);
      }}
      onMouseEnter={(e) => {
        onMouseEnter(keyId, e);
      }}
      onMouseOver={(e) => {
        onMouseEnter(keyId, e);
      }}
    >
      {!isPreview && isModified && (
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg ring-2 ring-primary/30"></div>
      )}
      {!isPreview && hasRelease && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary rounded-full border-2 border-white shadow-lg ring-2 ring-secondary/30"></div>
      )}
      {label.replace(/ /g, '\n')}
    </button>
  );
}
