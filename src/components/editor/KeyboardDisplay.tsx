import React from 'react';
import type { AudioSource, KeySounds } from '@/utils/soundPack';
import { getAudioTrackColor } from './audio-track-colors';
import { KeyButton } from './KeyButton';
import {
  ARROW_DIRECTIONS,
  findNeighbor,
  KEY_GAP,
  KEY_UNIT,
  type LayoutRect,
  type SelectModifiers,
} from './key-selection';
import {
  keyboardLayouts,
  type LayoutKey,
  type LayoutName,
  parseKeyboardLayout,
} from './keyboardLayouts';

interface KeyboardDisplayProps {
  layout: LayoutName;
  selectedKeys: Set<string>;
  modifiedKeys: KeySounds;
  /** The pack's sources by id, for the colour and name of each key's file. */
  sourcesById: Map<string, AudioSource>;
  /** The marquee being dragged, in unscaled keyboard pixels. */
  marquee: LayoutRect | null;
  /** The one key in the Tab order. */
  tabStopId: string | null;
  /** Pointer handlers that click keys and draw the marquee. */
  pointerHandlers: React.HTMLAttributes<HTMLDivElement>;
  onSelectKey: (
    keyId: string,
    modifiers: SelectModifiers,
    via: 'keyboard',
  ) => void;
  onFocusKey: (keyId: string) => void;
  keyboardRef?: React.RefObject<HTMLDivElement | null>;
  /** Preview mode: keys respond to the real keyboard instead of selection. */
  isPreview?: boolean;
  /** Key codes currently held down, so they can be highlighted. */
  pressedKeyCodes?: Set<string>;
  onPreviewKeyDown?: (keyCode: string) => void;
  onPreviewKeyUp?: (keyCode: string) => void;
}

export function KeyboardDisplay({
  layout,
  selectedKeys,
  modifiedKeys,
  sourcesById,
  marquee,
  tabStopId,
  pointerHandlers,
  onSelectKey,
  onFocusKey,
  keyboardRef,
  isPreview = false,
  pressedKeyCodes,
  onPreviewKeyDown,
  onPreviewKeyUp,
}: KeyboardDisplayProps) {
  const internalKeyboardRef = React.useRef<HTMLDivElement>(null);
  const refToUse = keyboardRef || internalKeyboardRef;
  const keys = parseKeyboardLayout(keyboardLayouts[layout]);

  // Find the actual rightmost and bottommost positions
  const maxX = Math.max(...keys.map((key) => key.x + key.width));
  const maxY = Math.max(...keys.map((key) => key.y + key.height));

  // Calculate exact dimensions with equal padding on all sides
  const padding = KEY_GAP;
  const keyboardWidth = maxX * (KEY_UNIT + KEY_GAP) + padding * 2 - 1;
  const keyboardHeight = maxY * (KEY_UNIT + KEY_GAP) + padding * 2 - 1;

  // Create unique key IDs
  const getKeyId = (key: LayoutKey, index: number) => {
    return `${key.label || 'key'}-${index}-${key.x}-${key.y}`;
  };

  // Enter selects or deselects the focused key (Shift+Enter for a range), and
  // the arrows move focus to the nearest key that way. Space is left to the
  // waveform.
  const handleKeyKeyDown =
    (index: number) => (keyId: string, e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!e.repeat) {
          onSelectKey(keyId, { range: e.shiftKey, toggle: true }, 'keyboard');
        }
        return;
      }
      const direction = ARROW_DIRECTIONS[e.key];
      if (!direction || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const next = findNeighbor(keys, index, direction);
      refToUse.current
        ?.querySelector<HTMLElement>(
          `[data-key-id="${CSS.escape(getKeyId(keys[next], next))}"]`,
        )
        ?.focus();
    };

  return (
    <div className="flex mx-auto justify-center">
      {/* biome-ignore lint/a11y/useSemanticElements: a drawing of keys, not a form; pointer handlers draw the selection marquee and the keys themselves are focusable buttons */}
      <div
        ref={refToUse}
        role="group"
        aria-label="Keyboard keys"
        className="keyboard-display overflow-hidden relative bg-base-content/10 border border-base-content/10 rounded"
        style={{
          width: `${keyboardWidth}px`,
          height: `${keyboardHeight}px`,
          userSelect: 'none',
          // A drag on a tablet draws a marquee instead of scrolling.
          touchAction: isPreview ? undefined : 'none',
        }}
        {...(isPreview ? {} : pointerHandlers)}
      >
        {keys.map((key, index) => {
          const keyId = getKeyId(key, index);
          const keyCode = key.code;
          const sound = modifiedKeys.get(keyCode);
          const source = sound ? sourcesById.get(sound.source) : undefined;
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
              isSelected={selectedKeys.has(keyId)}
              isModified={Boolean(sound)}
              hasRelease={Boolean(sound?.release)}
              dotColor={
                source ? getAudioTrackColor(source.colorIndex).dot : undefined
              }
              sourceName={source?.file.name}
              isPreview={isPreview}
              isPressed={pressedKeyCodes?.has(keyCode) ?? false}
              tabIndex={keyId === tabStopId ? 0 : -1}
              onKeyDown={handleKeyKeyDown(index)}
              onFocus={onFocusKey}
              onPreviewMouseDown={() => onPreviewKeyDown?.(keyCode)}
              onPreviewMouseUp={() => onPreviewKeyUp?.(keyCode)}
            />
          );
        })}
        {marquee && !isPreview && (
          <div
            aria-hidden
            className="absolute pointer-events-none rounded-sm border border-primary bg-primary/15"
            style={{
              left: marquee.left,
              top: marquee.top,
              width: marquee.right - marquee.left,
              height: marquee.bottom - marquee.top,
            }}
          />
        )}
      </div>
    </div>
  );
}
