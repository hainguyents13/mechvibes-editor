import type React from 'react';
import { useId, useRef } from 'react';
import { MOD_LABEL, plural } from '@/lib/utils';

// Every selection shortcut, for the popover. The row shows the common ones.
const ALL_SHORTCUTS: [string[], string][] = [
  [['Click'], 'Select a key, or deselect the only selected key'],
  [[MOD_LABEL, 'Click'], 'Add or remove a key'],
  [['Shift', 'Click'], 'Select a range of keys'],
  [['Drag'], 'Select keys in a box'],
  [['Shift', 'Drag'], 'Add keys in a box'],
  [[MOD_LABEL, 'A'], 'Select all keys'],
  [['Arrows'], 'Move between keys'],
  [['Enter'], 'Select or deselect the focused key'],
  [['Delete'], 'Clear the sound of the selected keys'],
  [['Esc'], 'Deselect all'],
];

interface KeyboardShortcutsProps {
  selectedKeys: Set<string>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Match the scaled keyboard width so this row lines up with the keys above. */
  maxWidth?: number;
  /** A mouse pack has buttons rather than keys. */
  isMousePack?: boolean;
  /** Take focus when Deselect, which had it, goes away. */
  onFocusLost: () => void;
}

function Keys({ keys }: { keys: string[] }) {
  return keys.map((key, index) => (
    <span key={key} className="contents">
      {index > 0 && <span>+</span>}
      <kbd className="kbd kbd-xs">{key}</kbd>
    </span>
  ));
}

export function KeyboardShortcuts({
  selectedKeys,
  setSelectedKeys,
  maxWidth,
  isMousePack = false,
  onFocusLost,
}: KeyboardShortcutsProps) {
  // The mouse drawing has buttons, and no box to drag.
  const shortcuts = isMousePack
    ? ALL_SHORTCUTS.filter(([keys]) => !keys.includes('Drag')).map(
        ([keys, text]): [string[], string] => [
          keys,
          text.replace(/\bkey/g, 'button'),
        ],
      )
    : ALL_SHORTCUTS;

  // The full list opens above its link, right-aligned to it, and closes on a
  // click elsewhere or Esc.
  const popoverId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const placePopover = (event: React.ToggleEvent<HTMLDivElement>) => {
    const toggle = toggleRef.current;
    if (event.newState !== 'open' || !toggle) return;
    const box = toggle.getBoundingClientRect();
    const viewport = document.documentElement;
    const style = event.currentTarget.style;
    // Kept 1rem off the left edge on narrow screens; the width matches w-80 max-w-[calc(100vw-2rem)].
    style.right = `min(${viewport.clientWidth - box.right}px, calc(100% - 1rem - min(20rem, 100% - 2rem)))`;
    // Above the link, or below it when there is more room there; scrolls when neither fits.
    const roomAbove = box.top - 16;
    const roomBelow = viewport.clientHeight - box.bottom - 16;
    if (roomAbove >= roomBelow) {
      style.top = '';
      style.bottom = `${viewport.clientHeight - box.top + 8}px`;
    } else {
      style.bottom = '';
      style.top = `${box.bottom + 8}px`;
    }
    style.maxHeight = `${Math.max(roomAbove, roomBelow)}px`;
  };

  return (
    <div
      className="w-full min-w-[min(100%,46rem)] mx-auto shrink-0"
      style={maxWidth ? { maxWidth } : undefined}
    >
      <h2 className="sr-only">Selection and shortcuts</h2>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-base-content/70">
        <div className="flex items-center gap-2 shrink-0">
          <span>
            Selected:{' '}
            {plural(selectedKeys.size, isMousePack ? 'button' : 'key')}
          </span>
          {selectedKeys.size > 0 && (
            <button
              type="button"
              className="link link-hover link-error text-xs"
              onClick={(e) => {
                // It goes away with the selection.
                if (e.currentTarget === document.activeElement) onFocusLost();
                setSelectedKeys(new Set());
              }}
            >
              Deselect
            </button>
          )}
        </div>
        {/* Three hints fit the row's one line; Esc is in the popover, and Deselect sits on the left. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Keys keys={['Shift', 'Click']} />
            <span>Range</span>
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Keys keys={[MOD_LABEL, 'Click']} />
            <span>Add or remove</span>
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Keys keys={['Delete']} />
            <span>Clear sound</span>
          </div>
          <button
            ref={toggleRef}
            type="button"
            className="link link-hover text-xs"
            popoverTarget={popoverId}
          >
            Shortcuts
          </button>
          {/* A popover sits above the page, so the row's clipping does not cut it off. */}
          <div
            id={popoverId}
            popover="auto"
            onBeforeToggle={placePopover}
            className="fixed inset-auto m-0 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-box bg-base-100 p-3 text-xs text-base-content shadow-lg border border-base-content/10"
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              {shortcuts.map(([keys, text]) => (
                <div key={text} className="contents">
                  <dt className="flex items-center gap-1 whitespace-nowrap">
                    <Keys keys={keys} />
                  </dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
