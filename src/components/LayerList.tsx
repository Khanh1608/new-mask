/**
 * Layer List Component - Manages layer display and interaction
 */

import React, { useCallback, useState } from 'react';
import {
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  GripIcon,
  LayersIcon,
  PlusIcon,
} from './Icons';
import type { Layer } from '@/types';

interface LayerListProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onReorderLayer: (fromIndex: number, toIndex: number) => void;
  onAddLayer: () => void;
}

export const LayerList: React.FC<LayerListProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onDeleteLayer,
  onReorderLayer,
  onAddLayer,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (toIndex: number) => {
      if (draggedIndex !== null && draggedIndex !== toIndex) {
        onReorderLayer(draggedIndex, toIndex);
      }
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, onReorderLayer]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // Display layers in reverse order (top layer first)
  const displayLayers = [...layers].reverse();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700/50">
        <div className="flex items-center gap-2">
          <LayersIcon size={18} className="text-primary-400" />
          <span className="text-sm font-medium text-white">Layers</span>
          <span className="text-xs text-dark-400">({layers.length})</span>
        </div>
        <button
          onClick={onAddLayer}
          className="btn-icon p-1.5 hover:bg-primary-500/20 hover:text-primary-400"
          title="Add layer"
        >
          <PlusIcon size={16} />
        </button>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
        {displayLayers.length === 0 ? (
          <div className="text-center py-8 text-dark-400 text-sm">
            No layers yet.<br />
            Add a base image to start.
          </div>
        ) : (
          displayLayers.map((layer, displayIndex) => {
            const actualIndex = layers.length - 1 - displayIndex;

            return (
              <LayerItem
                key={layer.id}
                layer={layer}
                isSelected={layer.id === selectedLayerId}
                isDragging={actualIndex === draggedIndex}
                isDragOver={actualIndex === dragOverIndex}
                onSelect={() => onSelectLayer(layer.id)}
                onToggleVisibility={() => onToggleVisibility(layer.id)}
                onDelete={() => onDeleteLayer(layer.id)}
                onMoveUp={() => {
                  if (actualIndex < layers.length - 1) {
                    onReorderLayer(actualIndex, actualIndex + 1);
                  }
                }}
                onMoveDown={() => {
                  if (actualIndex > 0) {
                    onReorderLayer(actualIndex, actualIndex - 1);
                  }
                }}
                canMoveUp={actualIndex < layers.length - 1}
                canMoveDown={actualIndex > 0}
                onDragStart={() => handleDragStart(actualIndex)}
                onDragOver={(e) => handleDragOver(e, actualIndex)}
                onDrop={() => handleDrop(actualIndex)}
                onDragEnd={handleDragEnd}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

interface LayerItemProps {
  layer: Layer;
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isSelected,
  isDragging,
  isDragOver,
  onSelect,
  onToggleVisibility,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  return (
    <div
      className={`
        group flex items-center gap-2 p-2 rounded-xl cursor-pointer
        transition-all duration-200
        ${isSelected ? 'bg-primary-500/15 ring-1 ring-primary-500/40' : 'hover:bg-dark-700/50'}
        ${isDragging ? 'opacity-50' : ''}
        ${isDragOver ? 'ring-2 ring-primary-400' : ''}
        ${!layer.visible ? 'opacity-60' : ''}
      `}
      onClick={onSelect}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle */}
      <div
        className="drag-handle text-dark-500 hover:text-dark-300"
        title="Drag to reorder"
      >
        <GripIcon size={14} />
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-dark-800 flex-shrink-0 ring-1 ring-dark-600">
        {layer.thumbnail ? (
          <img
            src={layer.thumbnail}
            alt={layer.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dark-500">
            <LayersIcon size={16} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {layer.name}
          </span>
          <span
            className={`
              text-[10px] px-1.5 py-0.5 rounded-md font-medium
              ${layer.type === 'BASE' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}
            `}
          >
            {layer.type}
          </span>
        </div>
        <div className="text-xs text-dark-400">
          {Math.round(layer.opacity * 100)}% opacity
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Move up/down */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={!canMoveUp}
          className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-600/50 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ChevronUpIcon size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={!canMoveDown}
          className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-600/50 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ChevronDownIcon size={14} />
        </button>

        {/* Visibility */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-600/50"
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
        </button>

        {/* Delete */}
        {layer.type !== 'BASE' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-dark-400 hover:text-red-400 hover:bg-red-500/10"
            title="Delete layer"
          >
            <TrashIcon size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
