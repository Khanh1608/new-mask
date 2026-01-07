/**
 * History (Undo/Redo) Hook for Layer Masks
 */

import { useState, useCallback, useRef } from 'react';
import type { HistoryItem, Layer } from '@/types';

const MAX_HISTORY = 30;

interface UseHistoryReturn {
  saveState: (layer: Layer) => void;
  undo: (layers: Layer[], setLayers: (layers: Layer[]) => void) => void;
  redo: (layers: Layer[], setLayers: (layers: Layer[]) => void) => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

export function useHistory(): UseHistoryReturn {
  const [historyStack, setHistoryStack] = useState<HistoryItem[]>([]);
  const [futureStack, setFutureStack] = useState<HistoryItem[]>([]);
  const lastSaveTime = useRef<number>(0);

  const saveState = useCallback((layer: Layer) => {
    // Debounce saves (minimum 100ms between saves)
    const now = Date.now();
    if (now - lastSaveTime.current < 100) return;
    lastSaveTime.current = now;

    if (!layer.mask) return;

    const ctx = layer.mask.getContext('2d');
    if (!ctx) return;

    const maskData = ctx.getImageData(0, 0, layer.mask.width, layer.mask.height);

    setHistoryStack((prev) => {
      const newStack = [...prev, { layerId: layer.id, maskData }];
      // Limit history size
      if (newStack.length > MAX_HISTORY) {
        return newStack.slice(-MAX_HISTORY);
      }
      return newStack;
    });

    // Clear future stack when new action is performed
    setFutureStack([]);
  }, []);

  const undo = useCallback(
    (layers: Layer[], setLayers: (layers: Layer[]) => void) => {
      if (historyStack.length === 0) return;

      const lastState = historyStack[historyStack.length - 1];
      const layer = layers.find((l) => l.id === lastState.layerId);

      if (!layer?.mask) return;

      // Save current state to future stack
      const ctx = layer.mask.getContext('2d');
      if (ctx) {
        const currentData = ctx.getImageData(0, 0, layer.mask.width, layer.mask.height);
        setFutureStack((prev) => [...prev, { layerId: layer.id, maskData: currentData }]);
      }

      // Restore previous state
      const maskCtx = layer.mask.getContext('2d');
      if (maskCtx) {
        maskCtx.putImageData(lastState.maskData, 0, 0);
      }

      // Update layers to trigger re-render
      setLayers([...layers]);

      // Remove from history stack
      setHistoryStack((prev) => prev.slice(0, -1));
    },
    [historyStack]
  );

  const redo = useCallback(
    (layers: Layer[], setLayers: (layers: Layer[]) => void) => {
      if (futureStack.length === 0) return;

      const nextState = futureStack[futureStack.length - 1];
      const layer = layers.find((l) => l.id === nextState.layerId);

      if (!layer?.mask) return;

      // Save current state to history stack
      const ctx = layer.mask.getContext('2d');
      if (ctx) {
        const currentData = ctx.getImageData(0, 0, layer.mask.width, layer.mask.height);
        setHistoryStack((prev) => [...prev, { layerId: layer.id, maskData: currentData }]);
      }

      // Restore next state
      const maskCtx = layer.mask.getContext('2d');
      if (maskCtx) {
        maskCtx.putImageData(nextState.maskData, 0, 0);
      }

      // Update layers to trigger re-render
      setLayers([...layers]);

      // Remove from future stack
      setFutureStack((prev) => prev.slice(0, -1));
    },
    [futureStack]
  );

  const clearHistory = useCallback(() => {
    setHistoryStack([]);
    setFutureStack([]);
  }, []);

  return {
    saveState,
    undo,
    redo,
    canUndo: historyStack.length > 0,
    canRedo: futureStack.length > 0,
    clearHistory,
  };
}
