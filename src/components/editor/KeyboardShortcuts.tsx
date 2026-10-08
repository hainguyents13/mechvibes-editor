import type React from 'react';

interface KeyboardShortcutsProps {
  selectedKeys: Set<string>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Match the scaled keyboard width so this row lines up with the keys above. */
  maxWidth?: number;
}

export function KeyboardShortcuts({
  selectedKeys,
  setSelectedKeys,
  maxWidth,
}: KeyboardShortcutsProps) {
  return (
    <div
      className="w-full mx-auto shrink-0"
      style={maxWidth ? { maxWidth } : undefined}
    >
      <h2 className="sr-only">Selection and shortcuts</h2>
      <div className="flex items-center justify-between gap-4 text-xs text-base-content/70">
        <div className="flex items-center gap-2 shrink-0">
          <span>Selected: {selectedKeys.size} keys</span>
          {selectedKeys.size > 0 && (
            <button
              type="button"
              className="link link-hover link-error text-xs"
              onClick={() => setSelectedKeys(new Set())}
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1">
            <kbd className="kbd kbd-xs">Click</kbd>
            <span>Select key</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="kbd kbd-xs">Drag</kbd>
            <span>Select area</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="kbd kbd-xs">Ctrl</kbd>
            <span>+</span>
            <kbd className="kbd kbd-xs">Click</kbd>
            <span>Multi-select</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="kbd kbd-xs">Esc</kbd>
            <span>Clear selection</span>
          </div>
        </div>
      </div>
    </div>
  );
}
