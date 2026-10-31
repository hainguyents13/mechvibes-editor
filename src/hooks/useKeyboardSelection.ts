import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  keysInRect,
  type LayoutRect,
  marqueeSelection,
  selectKey as nextSelection,
  rectFromPoints,
  type SelectModifiers,
  sameSelection,
  toLayoutPoint,
} from '@/components/editor/key-selection';
import type { LayoutKey } from '@/components/editor/keyboardLayouts';
import { shouldIgnoreShortcut } from '@/lib/shortcuts';

/** Screen pixels a press must travel before it becomes a marquee. */
const DRAG_THRESHOLD = 5;

interface UseKeyboardSelectionProps {
  keys: LayoutKey[];
  getKeyId: (key: LayoutKey, index: number) => string;
  /** Called with the key code when a click or Enter leaves only that key selected. */
  onSingleKeySelect: (keyCode: string) => void;
  /** Delete or Backspace with keys selected. */
  onClearSelected: () => void;
  /** False while preview or a dialog owns the keyboard. */
  enabled: boolean;
}

type DragState = {
  pointerId: number;
  startClient: { x: number; y: number };
  /** Where the press began, in unscaled keyboard pixels. */
  start: { x: number; y: number };
  /** The key pressed, or null for empty space. */
  keyId: string | null;
  modifiers: SelectModifiers;
  /** The selection when the press began; Esc puts it back. */
  base: ReadonlySet<string>;
  /** Shift, Ctrl or Cmd held: the marquee adds to `base` instead of replacing it. */
  additive: boolean;
  /** Moved past the threshold, so this is a marquee rather than a click. */
  active: boolean;
  /** The selection the marquee last set. */
  current: ReadonlySet<string>;
};

export function useKeyboardSelection({
  keys,
  getKeyId,
  onSingleKeySelect,
  onClearSelected,
  enabled,
}: UseKeyboardSelectionProps) {
  const [selectedKeys, setSelectedKeysState] = useState<Set<string>>(new Set());
  // The marquee being dragged, in unscaled keyboard pixels.
  const [marquee, setMarquee] = useState<LayoutRect | null>(null);
  const [focusKeyId, setFocusKeyId] = useState<string | null>(null);

  const keyboardRef = useRef<HTMLDivElement>(null);
  // Where Shift+click ranges start. Not rendered, so a ref.
  const anchorRef = useRef<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const order = useMemo(() => keys.map(getKeyId), [keys, getKeyId]);

  // Event handlers and document listeners read the latest values from here,
  // so none of them sees a selection from an older render.
  const latest = useRef({
    selectedKeys,
    order,
    keys,
    onSingleKeySelect,
    onClearSelected,
  });
  useEffect(() => {
    latest.current = {
      selectedKeys,
      order,
      keys,
      onSingleKeySelect,
      onClearSelected,
    };
  });

  // Quick select, Deselect and a layout change set the selection from outside,
  // so a later Shift+click starts a new range.
  const setSelectedKeys = useCallback<
    React.Dispatch<React.SetStateAction<Set<string>>>
  >((value) => {
    anchorRef.current = null;
    setSelectedKeysState(value);
  }, []);

  // The one key in the Tab order: the last focused, else the first selected,
  // else the first key. Checked against `order`, so a layout change heals it.
  const tabStopId =
    focusKeyId && order.includes(focusKeyId)
      ? focusKeyId
      : (order.find((id) => selectedKeys.has(id)) ?? order[0] ?? null);

  const selectKey = useCallback(
    (
      keyId: string | null,
      modifiers: SelectModifiers,
      via: 'pointer' | 'keyboard',
    ) => {
      const { selectedKeys, order, keys, onSingleKeySelect } = latest.current;
      const next = nextSelection(
        { selected: selectedKeys, anchor: anchorRef.current },
        keyId,
        order,
        modifiers,
      );
      anchorRef.current = next.anchor;
      if (next.selected !== selectedKeys) {
        setSelectedKeysState(new Set(next.selected));
      }
      if (keyId === null) return;
      // A plain click or Enter that leaves only this key shows its sound;
      // Ctrl+click and ranges do not.
      if (
        !modifiers.range &&
        (via === 'keyboard' || !modifiers.toggle) &&
        next.selected.size === 1 &&
        next.selected.has(keyId)
      ) {
        const key = keys[order.indexOf(keyId)];
        if (key) onSingleKeySelect(key.code);
      }
    },
    [],
  );

  // Stop a marquee and put back the selection it started from. True when a
  // marquee was showing.
  const cancelDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return false;
    dragRef.current = null;
    if (!drag.active) return false;
    setSelectedKeysState(new Set(drag.base));
    setMarquee(null);
    return true;
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Right and middle clicks leave the selection alone.
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const start = toLayoutPoint(
      e.clientX,
      e.clientY,
      el.getBoundingClientRect(),
      el.offsetWidth,
      el.clientLeft,
    );
    if (!start) return;
    const keyId =
      (e.target as Element)
        .closest('[data-key-id]')
        ?.getAttribute('data-key-id') ?? null;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    dragRef.current = {
      pointerId: e.pointerId,
      startClient: { x: e.clientX, y: e.clientY },
      start,
      keyId,
      modifiers: { range: e.shiftKey, toggle: e.ctrlKey || e.metaKey },
      base: selectedKeys,
      additive,
      active: false,
      current: selectedKeys,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (!drag.active) {
      // The button came up outside the keyboard before the drag started.
      if ((e.buttons & 1) === 0) {
        dragRef.current = null;
        return;
      }
      const moved = Math.hypot(
        e.clientX - drag.startClient.x,
        e.clientY - drag.startClient.y,
      );
      if (moved <= DRAG_THRESHOLD) return;
      drag.active = true;
      // Captured only now, so a plain click keeps its target and focus.
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const el = e.currentTarget;
    const point = toLayoutPoint(
      e.clientX,
      e.clientY,
      el.getBoundingClientRect(),
      el.offsetWidth,
      el.clientLeft,
    );
    if (!point) return;
    // Past the edge, the box stops at the keyboard.
    const rect = rectFromPoints(drag.start, {
      x: Math.min(Math.max(point.x, 0), el.clientWidth),
      y: Math.min(Math.max(point.y, 0), el.clientHeight),
    });
    setMarquee(rect);
    const next = marqueeSelection(
      drag.base,
      keysInRect(keys, order, rect),
      drag.additive,
    );
    // Only a change in the keys covered re-renders the panel.
    if (!sameSelection(next, drag.current)) {
      drag.current = next;
      setSelectedKeysState(next);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    // Cleared first, so the lostpointercapture that follows does nothing.
    dragRef.current = null;
    if (drag.active) {
      // The marquee's selection stays, and the anchor does not move.
      setMarquee(null);
      return;
    }
    selectKey(drag.keyId, drag.modifiers, 'pointer');
    if (drag.keyId !== null) {
      setFocusKeyId(drag.keyId);
      // Safari does not focus buttons on click.
      e.currentTarget
        .querySelector<HTMLElement>(`[data-key-id="${CSS.escape(drag.keyId)}"]`)
        ?.focus({ preventScroll: true });
    }
  };

  const onPointerCancel = () => {
    cancelDrag();
  };

  const onLostPointerCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    // A key losing the touch's implicit capture to the keyboard is not a cancel.
    if (e.target === e.currentTarget) cancelDrag();
  };

  // Esc, Ctrl/Cmd+A, Delete and Backspace, while nothing else owns the keyboard.
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreShortcut(event)) return;
      const { selectedKeys, order, onClearSelected } = latest.current;
      const command = event.ctrlKey || event.metaKey;
      if (event.key === 'Escape') {
        if (cancelDrag()) {
          event.preventDefault();
          return;
        }
        if (selectedKeys.size > 0) setSelectedKeys(new Set());
        return;
      }
      if (
        command &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'a'
      ) {
        event.preventDefault();
        setSelectedKeys(new Set(order));
        return;
      }
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        !command &&
        !event.altKey &&
        selectedKeys.size > 0
      ) {
        event.preventDefault();
        onClearSelected();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, cancelDrag, setSelectedKeys]);

  return {
    selectedKeys,
    setSelectedKeys,
    marquee,
    tabStopId,
    setFocusKeyId,
    selectKey,
    keyboardRef,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture,
    },
  };
}
