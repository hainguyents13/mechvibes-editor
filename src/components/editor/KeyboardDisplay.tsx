import React from 'react';
import { KeyButton } from './KeyButton';
import {
  getKeyCode,
  keyboardLayouts,
  parseKeyboardLayout,
} from './keyboardLayouts';

interface KeyboardDisplayProps {
  keyboardSize: 'fullsize' | 'tkl' | 'compact';
  selectedKeys: Set<string>;
  dragSelectedKeys: Set<string>;
  modifiedKeys: Map<string, [number, number]>;
  onKeyClick: (keyId: string, e: React.MouseEvent) => void;
  onKeyMouseDown: (keyId: string, e: React.MouseEvent) => void;
  onKeyMouseUp: (keyId: string, e: React.MouseEvent) => void;
  onKeyMouseEnter: (keyId: string, e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: () => void;
  keyboardRef?: React.RefObject<HTMLDivElement | null>;
  /** Preview mode: keys respond to the real keyboard instead of selection. */
  isPreview?: boolean;
  /** Key codes currently held down, so they can be highlighted. */
  pressedKeyCodes?: Set<string>;
  onPreviewKeyDown?: (keyCode: string) => void;
}

export function KeyboardDisplay({
  keyboardSize,
  selectedKeys,
  dragSelectedKeys,
  modifiedKeys,
  onKeyClick,
  onKeyMouseDown,
  onKeyMouseUp,
  onKeyMouseEnter,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  keyboardRef,
  isPreview = false,
  pressedKeyCodes,
  onPreviewKeyDown,
}: KeyboardDisplayProps) {
  const internalKeyboardRef = React.useRef<HTMLDivElement>(null);
  const refToUse = keyboardRef || internalKeyboardRef;
  const keys = parseKeyboardLayout(keyboardLayouts[keyboardSize]);

  // Calculate keyboard dimensions
  const unitSize = 54;
  const gap = 3;

  // Find the actual rightmost and bottommost positions
  const maxX = Math.max(...keys.map((key) => key.x + key.width));
  const maxY = Math.max(...keys.map((key) => key.y + key.height));

  // Calculate exact dimensions with equal padding on all sides
  const padding = gap;
  const keyboardWidth = maxX * (unitSize + gap) + padding * 2 - 1;
  const keyboardHeight = maxY * (unitSize + gap) + padding * 2 - 1;

  // Create unique key IDs
  const getKeyId = (key: any, index: number) => {
    return `${key.label || 'key'}-${index}-${key.x}-${key.y}`;
  };

  return (
    <div className="flex mx-auto justify-center">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: mouse-driven editor surface ported unchanged from the website; keyboard access is a follow-up */}
      <div
        ref={refToUse}
        className="keyboard-display overflow-hidden relative bg-base-content/10 border border-base-content/10 rounded"
        style={{
          width: `${keyboardWidth}px`,
          height: `${keyboardHeight}px`,
          userSelect: 'none',
        }}
        onMouseDown={isPreview ? undefined : onMouseDown}
        onMouseMove={isPreview ? undefined : onMouseMove}
        onMouseUp={isPreview ? undefined : onMouseUp}
        onMouseLeave={isPreview ? undefined : onMouseUp}
      >
        {keys.map((key, index) => {
          const keyId = getKeyId(key, index);
          const keyCode = getKeyCode(key.label);
          return (
            <KeyButton
              // biome-ignore lint/suspicious/noArrayIndexKey: key kept as in the website editor
              key={index}
              keyId={keyId}
              label={key.label}
              x={key.x}
              y={key.y}
              width={key.width}
              height={key.height}
              isSelected={
                selectedKeys.has(keyId) || dragSelectedKeys.has(keyId)
              }
              isModified={modifiedKeys.has(keyCode)}
              isPreview={isPreview}
              isPressed={pressedKeyCodes?.has(keyCode) ?? false}
              onClick={onKeyClick}
              onMouseDown={
                isPreview ? () => onPreviewKeyDown?.(keyCode) : onKeyMouseDown
              }
              onMouseUp={onKeyMouseUp}
              onMouseEnter={onKeyMouseEnter}
            />
          );
        })}
      </div>
    </div>
  );
}
