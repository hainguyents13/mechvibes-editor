import { useCallback, useEffect, useRef, useState } from 'react';
import { getKeyCode } from '@/components/editor/keyboardLayouts';

interface UseKeyboardSelectionProps {
  keys: any[];
  modifiedKeys: Map<string, [number, number]>;
  setWaveformSelection: (selection: { start: number; end: number }) => void;
  defaultDuration: number;
  getKeyId: (key: any, index: number) => string;
}

export function useKeyboardSelection({
  keys,
  modifiedKeys,
  setWaveformSelection,
  getKeyId,
}: UseKeyboardSelectionProps) {
  // Selection states
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dragSelectedKeys, setDragSelectedKeys] = useState<Set<string>>(
    new Set(),
  );

  // Drag selection states
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [mouseDownKeyId, setMouseDownKeyId] = useState<string | null>(null);
  const [hasDraggedFromKey, setHasDraggedFromKey] = useState(false);

  const keyboardRef = useRef<HTMLDivElement>(null);

  // Handle key mouse down
  const handleKeyMouseDown = useCallback(
    (keyId: string, e: React.MouseEvent) => {
      setMouseDownKeyId(keyId);
      setHasDraggedFromKey(false);

      // Set drag start position for potential drag selection
      const rect = keyboardRef.current?.getBoundingClientRect();
      if (rect) {
        const dragPos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        setDragStart(dragPos);
      }

      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Clear selection when starting a potential drag without modifiers
        setSelectedKeys(new Set());
      }

      e.stopPropagation();
    },
    [],
  );

  // Handle mouse move for drag selection detection
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragStart) return;

      const rect = keyboardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Track if we've dragged more than a small threshold
      const dragDistance = Math.sqrt(
        (x - dragStart.x) ** 2 + (y - dragStart.y) ** 2,
      );

      // Start drag selection if we've moved enough and started on a key
      if (
        !isDragSelecting &&
        dragDistance > 5 &&
        mouseDownKeyId &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        setIsDragSelecting(true);
        setHasDraggedFromKey(true);
        // Add the initial key to the drag selection
        setDragSelectedKeys(new Set([mouseDownKeyId]));
      }

      // If we're drag selecting, find which key is under the mouse
      if (isDragSelecting) {
        const unitSize = 54;
        const gap = 3;
        const padding = gap;

        // Find which key is under the mouse position
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const keyId = getKeyId(key, i);

          const keyLeft = key.x * unitSize + key.x * gap + padding;
          const keyTop = key.y * unitSize + key.y * gap + padding;
          const keyRight =
            keyLeft + (key.width * unitSize + (key.width - 1) * gap);
          const keyBottom =
            keyTop + (key.height * unitSize + (key.height - 1) * gap);

          if (x >= keyLeft && x <= keyRight && y >= keyTop && y <= keyBottom) {
            setDragSelectedKeys((prev) => {
              const newSet = new Set(prev);
              newSet.add(keyId);
              return newSet;
            });
            break;
          }
        }
      }
    },
    [dragStart, isDragSelecting, mouseDownKeyId, keys, getKeyId],
  );

  // Handle mouse entering a key during drag
  const handleKeyMouseEnter = useCallback(
    (keyId: string, _e: React.MouseEvent) => {
      if (isDragSelecting) {
        // Add to drag selection during drag
        setDragSelectedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.add(keyId);
          return newSet;
        });
      }
    },
    [isDragSelecting],
  );

  // Handle mouse up on a key
  // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list kept as in the website editor; changing it changes when the hook re-runs
  const handleKeyMouseUp = useCallback(
    (keyId: string, e: React.MouseEvent) => {
      // If we started on this key and haven't dragged, treat it as a click
      if (mouseDownKeyId === keyId && !hasDraggedFromKey) {
        handleKeyClick(keyId, e);
      }

      // If we were drag selecting, apply the selection
      if (isDragSelecting) {
        setSelectedKeys(dragSelectedKeys);
      }

      // Reset states
      setMouseDownKeyId(null);
      setHasDraggedFromKey(false);
      setIsDragSelecting(false);
      setDragSelectedKeys(new Set());
    },
    [mouseDownKeyId, hasDraggedFromKey, isDragSelecting, dragSelectedKeys],
  );

  // Handle mouse up to finish selection
  const handleMouseUp = useCallback(() => {
    // If we were drag selecting, apply the selection
    if (isDragSelecting) {
      setSelectedKeys(dragSelectedKeys);
    }

    setDragStart(null);
    setMouseDownKeyId(null);
    setHasDraggedFromKey(false);
    setIsDragSelecting(false);
    setDragSelectedKeys(new Set());
  }, [isDragSelecting, dragSelectedKeys]);

  // Handle individual key click
  const handleKeyClick = useCallback(
    (keyId: string, e: React.MouseEvent) => {
      const newSelected = new Set(selectedKeys);

      if (e.ctrlKey || e.metaKey) {
        // Toggle selection with Ctrl/Cmd
        if (newSelected.has(keyId)) {
          newSelected.delete(keyId);
        } else {
          newSelected.add(keyId);
        }
      } else if (e.shiftKey) {
        // Add to selection with Shift
        newSelected.add(keyId);
      } else {
        // Toggle selection on single click
        if (newSelected.has(keyId)) {
          newSelected.delete(keyId);
        } else {
          newSelected.add(keyId);
        }
      }

      setSelectedKeys(newSelected);

      // Update waveform selection based on the selected key's stored values
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && newSelected.size === 1) {
        // Only update for single key selection (not multi-select)
        const key = keys.find((k, i) => getKeyId(k, i) === keyId);
        if (key) {
          const keyCode = getKeyCode(key.label);
          const storedValues = modifiedKeys.get(keyCode);
          if (storedValues) {
            // Update waveform selection to show stored values
            setWaveformSelection({
              start: storedValues[0],
              end: storedValues[1],
            });
          }
          // If no stored values, don't update waveform selection
        }
      }
    },
    [selectedKeys, keys, getKeyId, modifiedKeys, setWaveformSelection],
  );

  // Handle mouse down on keyboard area
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = keyboardRef.current?.getBoundingClientRect();
    if (rect) {
      const dragPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setDragStart(dragPos);
    }
  }, []);

  // Add global mouse up listener
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  // Add keyboard event listener for Esc key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedKeys(new Set());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return {
    selectedKeys,
    setSelectedKeys,
    dragSelectedKeys,
    isDragSelecting,
    keyboardRef,
    handleKeyMouseDown,
    handleMouseMove,
    handleKeyMouseEnter,
    handleKeyMouseUp,
    handleMouseUp,
    handleKeyClick,
    handleMouseDown,
  };
}
