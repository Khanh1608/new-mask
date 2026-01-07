/**
 * Keyboard Shortcuts Modal
 */

import React from 'react';
import { Modal } from './Modal';
import { KeyboardIcon } from './Icons';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'Tools', items: [
    { key: 'V', description: 'Transform tool' },
    { key: 'B', description: 'Brush tool' },
    { key: 'H', description: 'Hand tool (pan)' },
    { key: 'E', description: 'Eraser mode' },
    { key: 'R', description: 'Restore mode' },
  ]},
  { category: 'Brush', items: [
    { key: '[', description: 'Decrease brush size' },
    { key: ']', description: 'Increase brush size' },
  ]},
  { category: 'History', items: [
    { key: 'Ctrl + Z', description: 'Undo' },
    { key: 'Ctrl + Shift + Z', description: 'Redo' },
    { key: 'Ctrl + Y', description: 'Redo (alternative)' },
  ]},
  { category: 'View', items: [
    { key: 'Ctrl + 0', description: 'Fit to screen' },
    { key: 'Ctrl + 1', description: 'Zoom to 100%' },
    { key: 'Ctrl + +', description: 'Zoom in' },
    { key: 'Ctrl + -', description: 'Zoom out' },
  ]},
  { category: 'Project', items: [
    { key: 'Ctrl + S', description: 'Save project' },
    { key: 'Ctrl + O', description: 'Open project' },
    { key: 'Ctrl + E', description: 'Export image' },
    { key: 'Delete', description: 'Delete selected layer' },
    { key: 'Escape', description: 'Deselect / Cancel' },
  ]},
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        {shortcuts.map((section) => (
          <div key={section.category}>
            <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-3">
              {section.category}
            </h3>
            <div className="space-y-2">
              {section.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-dark-800/30"
                >
                  <span className="text-sm text-dark-200">{item.description}</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-dark-700 text-white rounded-md border border-dark-600">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-dark-700/50">
        <div className="flex items-center gap-2 text-dark-400 text-xs">
          <KeyboardIcon size={14} />
          <span>Press any shortcut to use it</span>
        </div>
      </div>
    </Modal>
  );
};
