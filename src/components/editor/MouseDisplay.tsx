import type React from 'react';
import { cn } from '@/lib/utils';
import type { AudioSource, KeySounds } from '@/utils/soundPack';
import { getAudioTrackColor } from './audio-track-colors';
import type { SelectModifiers } from './key-selection';
import { keyboardLayouts, parseKeyboardLayout } from './keyboardLayouts';

/** Natural size of the drawing; the editor scales it like the keyboard. */
export const MOUSE_DISPLAY_SIZE = { width: 420, height: 340 };

type Region = {
  /** Outline of the clickable area. */
  shape: React.ReactNode;
  /** Where the press-sound dot sits. */
  dot: [number, number];
  /** Where the release-sound dot sits; 12px right of the press dot by default. */
  releaseDot?: [number, number];
  /** Text or icon drawn on or beside the area. */
  label: React.ReactNode;
  title: string;
};

const CX = 210;

// Top-down mouse: two main buttons, a wheel split into scroll up, click and
// scroll down, and side buttons. Each layout label maps to one region.
const BODY = `M${CX},10 C${CX + 70},10 ${CX + 100},60 ${CX + 100},130 L${CX + 100},240 C${CX + 100},300 ${CX + 55},330 ${CX},330 C${CX - 55},330 ${CX - 100},300 ${CX - 100},240 L${CX - 100},130 C${CX - 100},60 ${CX - 70},10 ${CX},10 Z`;
const SEAM_Y = 150;
const WHEEL = { x: CX - 22, y: 34, width: 44, height: 108 };
const WHEEL_PART = WHEEL.height / 3;
const WHEEL_RADIUS = WHEEL.width / 2;

const mainButton = (side: -1 | 1) => (
  <path
    d={`M${CX},10 C${CX + side * 70},10 ${CX + side * 100},60 ${CX + side * 100},130 L${CX + side * 100},${SEAM_Y} L${CX},${SEAM_Y} Z`}
  />
);

const mainLabel = (x: number, text: string) => (
  <text
    x={x}
    y={104}
    textAnchor="middle"
    className="fill-current text-[18px] font-medium pointer-events-none"
  >
    {text}
  </text>
);

const chevron = (y: number, direction: -1 | 1) => (
  <path
    d={`M${CX - 6},${y - 3 * direction} L${CX},${y + 3 * direction} L${CX + 6},${y - 3 * direction}`}
    className="fill-none stroke-current pointer-events-none"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

// Side buttons are short pills on the body's edge, labelled outside it.
const SIDE_BUTTON = { width: 14, height: 34 };
const sideButton = (
  side: -1 | 1,
  y: number,
): Omit<Region, 'title'> & {
  labelAt: number;
} => {
  const x = CX + side * 100 - SIDE_BUTTON.width / 2;
  return {
    shape: <rect x={x} y={y} {...SIDE_BUTTON} rx={7} />,
    dot: side < 0 ? [CX - 76, y + 17] : [CX + 64, y + 17],
    label: null,
    labelAt: y + 17,
  };
};

const sideRegion = (
  side: -1 | 1,
  y: number,
  text: string,
  title: string,
): Region => {
  const button = sideButton(side, y);
  return {
    shape: button.shape,
    dot: button.dot,
    title,
    label: (
      // Part of the button, so clicking the text selects it too.
      <text
        x={CX + side * 116}
        y={button.labelAt}
        textAnchor={side < 0 ? 'end' : 'start'}
        dominantBaseline="middle"
        className="fill-current text-[15px]"
      >
        {text}
      </text>
    ),
  };
};

// Drawn in the mouse layout's order (keyboardLayouts.ts), which puts the wheel
// on top of the main buttons.
const REGIONS: Record<string, Region> = {
  'Left button': {
    shape: mainButton(-1),
    dot: [CX - 58, 124],
    label: mainLabel(CX - 52, 'Left'),
    title: 'Left button (MouseLeft)',
  },
  'Right button': {
    shape: mainButton(1),
    dot: [CX + 46, 124],
    label: mainLabel(CX + 52, 'Right'),
    title: 'Right button (MouseRight)',
  },
  'Wheel up': {
    shape: (
      <path
        d={`M${WHEEL.x},${WHEEL.y + WHEEL_PART} V${WHEEL.y + WHEEL_RADIUS} A${WHEEL_RADIUS},${WHEEL_RADIUS} 0 0 1 ${WHEEL.x + WHEEL.width},${WHEEL.y + WHEEL_RADIUS} V${WHEEL.y + WHEEL_PART} Z`}
      />
    ),
    // Inside the wheel, either side of the icon.
    dot: [WHEEL.x + 37, WHEEL.y + WHEEL_PART / 2 + 2],
    releaseDot: [WHEEL.x + 7, WHEEL.y + WHEEL_PART / 2 + 2],
    label: chevron(WHEEL.y + WHEEL_PART / 2 + 2, -1),
    title: 'Scroll up (MouseWheelUp)',
  },
  'Middle button': {
    shape: (
      <rect
        x={WHEEL.x}
        y={WHEEL.y + WHEEL_PART}
        width={WHEEL.width}
        height={WHEEL_PART}
      />
    ),
    dot: [WHEEL.x + 37, WHEEL.y + WHEEL.height / 2],
    releaseDot: [WHEEL.x + 7, WHEEL.y + WHEEL.height / 2],
    label: (
      <circle
        cx={CX}
        cy={WHEEL.y + WHEEL.height / 2}
        r={3.5}
        className="fill-current pointer-events-none"
      />
    ),
    title: 'Wheel click (MouseMiddle)',
  },
  'Wheel down': {
    shape: (
      <path
        d={`M${WHEEL.x},${WHEEL.y + 2 * WHEEL_PART} V${WHEEL.y + WHEEL.height - WHEEL_RADIUS} A${WHEEL_RADIUS},${WHEEL_RADIUS} 0 0 0 ${WHEEL.x + WHEEL.width},${WHEEL.y + WHEEL.height - WHEEL_RADIUS} V${WHEEL.y + 2 * WHEEL_PART} Z`}
      />
    ),
    dot: [WHEEL.x + 37, WHEEL.y + 2.5 * WHEEL_PART - 2],
    releaseDot: [WHEEL.x + 7, WHEEL.y + 2.5 * WHEEL_PART - 2],
    label: chevron(WHEEL.y + 2.5 * WHEEL_PART - 2, 1),
    title: 'Scroll down (MouseWheelDown)',
  },
  // Back and forward sit on the left side, under the thumb.
  'Button 5': sideRegion(-1, 172, 'Forward (5)', 'Forward button (Mouse5)'),
  'Button 4': sideRegion(-1, 214, 'Back (4)', 'Back button (Mouse4)'),
  // Extra buttons only some mice have.
  'Button 6': sideRegion(1, 160, 'Button 6', 'Extra button (Mouse6)'),
  'Button 7': sideRegion(1, 202, 'Button 7', 'Extra button (Mouse7)'),
  'Button 8': sideRegion(1, 244, 'Button 8', 'Extra button (Mouse8)'),
};

interface MouseDisplayProps {
  selectedKeys: Set<string>;
  modifiedKeys: KeySounds;
  /** The pack's sources by id, for the colour and name of each button's file. */
  sourcesById: Map<string, AudioSource>;
  /** The one button in the Tab order. */
  tabStopId: string | null;
  onSelectKey: (
    keyId: string | null,
    modifiers: SelectModifiers,
    via: 'pointer' | 'keyboard',
  ) => void;
  onFocusKey: (keyId: string) => void;
  keyboardRef?: React.RefObject<HTMLDivElement | null>;
  /** Preview mode: the real mouse plays the sounds; the drawing only lights up. */
  isPreview?: boolean;
  pressedKeyCodes?: Set<string>;
}

/**
 * The mouse layout drawn as a mouse. Buttons select like keys: click to
 * select, Ctrl or Cmd+click to add or remove, Shift+click for a range, arrow
 * keys to move between buttons and Enter to select.
 */
export function MouseDisplay({
  selectedKeys,
  modifiedKeys,
  sourcesById,
  tabStopId,
  onSelectKey,
  onFocusKey,
  keyboardRef,
  isPreview = false,
  pressedKeyCodes,
}: MouseDisplayProps) {
  // Same keys, ids and order as the keyboard display, so selection, Shift
  // ranges and quick select work unchanged.
  const ordered = parseKeyboardLayout(keyboardLayouts.mouse)
    .map((key, index) => ({
      label: key.label,
      code: key.code,
      id: `${key.label || 'key'}-${index}-${key.x}-${key.y}`,
    }))
    .filter((key) => key.label in REGIONS);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a click beside the buttons deselects, as on the keyboard; Esc does the same from the keyboard
    // biome-ignore lint/a11y/noStaticElementInteractions: the buttons inside take focus; this only catches clicks that miss them
    <div
      ref={keyboardRef}
      className="flex mx-auto justify-center select-none"
      style={MOUSE_DISPLAY_SIZE}
      onClick={(e) => {
        // A Shift, Ctrl or Cmd click that misses a button keeps the selection.
        if (!isPreview) {
          onSelectKey(
            null,
            { range: e.shiftKey, toggle: e.ctrlKey || e.metaKey },
            'pointer',
          );
        }
      }}
    >
      <svg
        viewBox={`0 0 ${MOUSE_DISPLAY_SIZE.width} ${MOUSE_DISPLAY_SIZE.height}`}
        width={MOUSE_DISPLAY_SIZE.width}
        height={MOUSE_DISPLAY_SIZE.height}
        className="overflow-visible"
      >
        <title>Mouse buttons</title>
        <path
          d={BODY}
          className="fill-base-200 stroke-base-content/25"
          strokeWidth={1.5}
        />
        {ordered.map(({ label, code, id: keyId }, index) => {
          const region = REGIONS[label];
          const sound = modifiedKeys.get(code);
          const source = sound ? sourcesById.get(sound.source) : undefined;
          // The file's name as well as its colour, for those who cannot tell colours apart.
          const title =
            !isPreview && source
              ? `${region.title}, sound from ${source.file.name}`
              : region.title;
          const isSelected = !isPreview && selectedKeys.has(keyId);
          const isPressed = pressedKeyCodes?.has(code) ?? false;
          const isInert = isPreview && !sound;
          // Opaque fills only: the wheel sits on top of the main buttons.
          let fill = '[&>:first-child]:fill-base-100';
          if (isSelected) fill = '[&>:first-child]:fill-neutral';
          else if (isPressed && !isInert)
            fill =
              '[&>:first-child]:fill-[color-mix(in_oklab,var(--color-primary)_70%,var(--color-base-100))]';
          else if (isPreview && sound) fill = '[&>:first-child]:fill-primary';
          else if (sound)
            fill =
              '[&>:first-child]:fill-[color-mix(in_oklab,var(--color-primary)_12%,var(--color-base-100))]';
          return (
            // biome-ignore lint/a11y/useSemanticElements: an SVG region cannot be a <button>; it takes focus and answers the mouse like one
            <g
              key={keyId}
              role="button"
              data-key-id={keyId}
              tabIndex={isPreview ? -1 : keyId === tabStopId ? 0 : -1}
              aria-pressed={isSelected}
              aria-label={region.title}
              className={cn(
                'cursor-pointer outline-none [&>:first-child]:transition-colors',
                fill,
                isSelected
                  ? 'text-neutral-content'
                  : isPreview && sound
                    ? 'text-primary-content'
                    : 'text-base-content',
                !isSelected && !isPreview
                  ? 'hover:[&>:first-child]:fill-base-300'
                  : '',
                isInert ? 'opacity-30 pointer-events-none' : '',
                'focus-visible:[&>:first-child]:stroke-primary',
              )}
              onFocus={() => onFocusKey(keyId)}
              onClick={(e) => {
                e.stopPropagation();
                if (isPreview) return;
                onSelectKey(
                  keyId,
                  { range: e.shiftKey, toggle: e.ctrlKey || e.metaKey },
                  'pointer',
                );
              }}
              onKeyDown={(e) => {
                if (isPreview) return;
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!e.repeat) {
                    onSelectKey(
                      keyId,
                      { range: e.shiftKey, toggle: true },
                      'keyboard',
                    );
                  }
                  return;
                }
                // Arrows follow the drawing, as Shift ranges do.
                const step =
                  e.key === 'ArrowRight' || e.key === 'ArrowDown'
                    ? 1
                    : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                      ? -1
                      : 0;
                if (!step || e.altKey || e.ctrlKey || e.metaKey) return;
                e.preventDefault();
                const next = ordered[index + step];
                if (next) {
                  keyboardRef?.current
                    ?.querySelector<SVGGElement>(
                      `[data-key-id="${CSS.escape(next.id)}"]`,
                    )
                    ?.focus();
                }
              }}
            >
              <g className="stroke-base-content/30" strokeWidth={1.5}>
                {region.shape}
              </g>
              <title>{title}</title>
              {/* Side labels sit outside the body, in the page's text colour */}
              <g
                className={
                  label.startsWith('Button') ? 'text-base-content/80' : ''
                }
              >
                {region.label}
              </g>
              {!isPreview && sound && (
                <circle
                  cx={region.dot[0]}
                  cy={region.dot[1]}
                  r={5}
                  className={cn(
                    source
                      ? getAudioTrackColor(source.colorIndex).fill
                      : 'fill-primary',
                    'stroke-white',
                  )}
                  strokeWidth={2}
                />
              )}
              {!isPreview && sound?.release && (
                <circle
                  cx={region.releaseDot?.[0] ?? region.dot[0] + 12}
                  cy={region.releaseDot?.[1] ?? region.dot[1]}
                  r={5}
                  className="fill-secondary stroke-white"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
        {/* Seam between the buttons and the palm rest */}
        <path
          d={`M${CX - 100},${SEAM_Y} H${CX + 100}`}
          className="stroke-base-content/25 pointer-events-none"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
