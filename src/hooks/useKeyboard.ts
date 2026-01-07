/**
 * Keyboard Shortcuts Hook
 */

import { useEffect, useCallback } from 'react';
import type { KeyboardShortcut } from '@/types';

export const SHORTCUTS: KeyboardShortcut[] = [
  { key: 'z', ctrl: true, description: 'Undo', action: () => {} },
  { key: 'z', ctrl: true, shift: true, description: 'Redo', action: () => {} },
  { key: 'y', ctrl: true, description: 'Redo', action: () => {} },
  { key: 'b', description: 'Brush tool', action: () => {} },
  { key: 'v', description: 'Transform tool', action: () => {} },
  { key: 'h', description: 'Hand tool (pan)', action: () => {} },
  { key: 'e', description: 'Eraser mode', action: () => {} },
  { key: 'r', description: 'Restore mode', action: () => {} },
  { key: '[', description: 'Decrease brush size', action: () => {} },
  { key: ']', description: 'Increase brush size', action: () => {} },
  { key: 's', ctrl: true, description: 'Save project', action: () => {} },
  { key: 'o', ctrl: true, description: 'Open project', action: () => {} },
  { key: 'e', ctrl: true, description: 'Export image', action: () => {} },
  { key: '0', ctrl: true, description: 'Fit to screen', action: () => {} },
  { key: '1', ctrl: true, description: 'Zoom to 100%', action: () => {} },
  { key: '+', ctrl: true, description: 'Zoom in', action: () => {} },
  { key: '-', ctrl: true, description: 'Zoom out', action: () => {} },
  { key: 'Delete', description: 'Delete selected layer', action: () => {} },
  { key: 'Escape', description: 'Deselect / Cancel', action: () => {} },
];

interface UseKeyboardOptions {
  onUndo?: () => void;
  onRedo?: () => void;
  onBrushTool?: () => void;
  onTransformTool?: () => void;
  onHandTool?: () => void;
  onEraserMode?: () => void;
  onRestoreMode?: () => void;
  onBrushSizeDecrease?: () => void;
  onBrushSizeIncrease?: () => void;
  onSave?: () => void;
  onOpen?: () => void;
  onExport?: () => void;
  onFitToScreen?: () => void;
  onZoom100?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboard(options: UseKeyboardOptions): void {
  const {
    onUndo,
    onRedo,
    onBrushTool,
    onTransformTool,
    onHandTool,
    onEraserMode,
    onRestoreMode,
    onBrushSizeDecrease,
    onBrushSizeIncrease,
    onSave,
    onOpen,
    onExport,
    onFitToScreen,
    onZoom100,
    onZoomIn,
    onZoomOut,
    onDelete,
    onEscape,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Undo: Ctrl+Z
      if (ctrl && !shift && key === 'z') {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((ctrl && shift && key === 'z') || (ctrl && key === 'y')) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Save: Ctrl+S
      if (ctrl && key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Open: Ctrl+O
      if (ctrl && key === 'o') {
        e.preventDefault();
        onOpen?.();
        return;
      }

      // Export: Ctrl+E
      if (ctrl && key === 'e') {
        e.preventDefault();
        onExport?.();
        return;
      }

      // Fit to screen: Ctrl+0
      if (ctrl && key === '0') {
        e.preventDefault();
        onFitToScreen?.();
        return;
      }

      // Zoom 100%: Ctrl+1
      if (ctrl && key === '1') {
        e.preventDefault();
        onZoom100?.();
        return;
      }

      // Zoom in: Ctrl++
      if (ctrl && (key === '+' || key === '=')) {
        e.preventDefault();
        onZoomIn?.();
        return;
      }

      // Zoom out: Ctrl+-
      if (ctrl && key === '-') {
        e.preventDefault();
        onZoomOut?.();
        return;
      }

      // Non-ctrl shortcuts
      if (!ctrl) {
        switch (key) {
          case 'b':
            onBrushTool?.();
            break;
          case 'v':
            onTransformTool?.();
            break;
          case 'h':
            onHandTool?.();
            break;
          case 'e':
            onEraserMode?.();
            break;
          case 'r':
            onRestoreMode?.();
            break;
          case '[':
            onBrushSizeDecrease?.();
            break;
          case ']':
            onBrushSizeIncrease?.();
            break;
          case 'delete':
          case 'backspace':
            onDelete?.();
            break;
          case 'escape':
            onEscape?.();
            break;
        }
      }
    },
    [
      enabled,
      onUndo,
      onRedo,
      onBrushTool,
      onTransformTool,
      onHandTool,
      onEraserMode,
      onRestoreMode,
      onBrushSizeDecrease,
      onBrushSizeIncrease,
      onSave,
      onOpen,
      onExport,
      onFitToScreen,
      onZoom100,
      onZoomIn,
      onZoomOut,
      onDelete,
      onEscape,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Get shortcut display string
 */
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push('Shift');
  }
  if (shortcut.alt) {
    parts.push('Alt');
  }

  // Format key
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  if (key.length === 1) key = key.toUpperCase();

  parts.push(key);

  return parts.join('+');
}
