/**
 * Mobile Toolbar Component
 * Touch-friendly bottom navigation for mobile devices
 */

import React, { useState } from 'react';
import type { ToolType, BrushSettings, Layer } from '@/types';
import {
  MoveIcon,
  BrushIcon,
  HandIcon,
  UndoIcon,
  RedoIcon,
  LayersIcon,
  SparklesIcon,
  MenuIcon,
  PlusIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  ChevronDownIcon,
  SettingsIcon,
  CloudIcon,
} from './Icons';

interface MobileToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  brushSettings: BrushSettings;
  onBrushSettingsChange: (settings: Partial<BrushSettings>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onAddLayer: () => void;
  onAutoAlign: () => void;
  onAITryOn: () => void;
  onAIUpscale: () => void;
  onExport: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onNewProject: () => void;
  isProcessing: boolean;
  onShowSettings: () => void;
  onShowCloud: () => void;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  activeTool,
  onToolChange,
  brushSettings,
  onBrushSettingsChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onDeleteLayer,
  onAddLayer,
  onAutoAlign,
  onAITryOn,
  onAIUpscale,
  onExport,
  onSaveProject,
  onLoadProject,
  onNewProject,
  isProcessing,
  onShowSettings,
  onShowCloud,
}) => {
  const [showLayers, setShowLayers] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBrushSettings, setShowBrushSettings] = useState(false);

  const tools: { tool: ToolType; icon: React.ReactNode }[] = [
    { tool: 'TRANSFORM', icon: <MoveIcon size={22} /> },
    { tool: 'BRUSH', icon: <BrushIcon size={22} /> },
    { tool: 'HAND', icon: <HandIcon size={22} /> },
  ];

  return (
    <>
      {/* Layers Panel - Slide up */}
      {showLayers && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLayers(false)} />
          <div className="absolute bottom-16 left-0 right-0 max-h-[60vh] bg-dark-800 rounded-t-2xl overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="text-white font-semibold">Layers</h3>
              <button onClick={() => setShowLayers(false)} className="text-dark-400 p-2">
                <ChevronDownIcon size={20} />
              </button>
            </div>
            <div className="p-2 max-h-[50vh] overflow-y-auto">
              {layers.length === 0 ? (
                <div className="text-center text-dark-400 py-8">
                  <LayersIcon size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No layers yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...layers].reverse().map((layer) => (
                    <div
                      key={layer.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedLayerId === layer.id
                          ? 'bg-primary-500/20 ring-1 ring-primary-500/50'
                          : 'bg-dark-700/50'
                      }`}
                      onClick={() => onSelectLayer(layer.id)}
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-dark-600 flex-shrink-0">
                        {layer.thumbnail ? (
                          <img src={layer.thumbnail} alt={layer.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <LayersIcon size={16} className="text-dark-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{layer.name}</div>
                        <div className="text-dark-400 text-xs">{layer.type}</div>
                      </div>

                      {/* Actions */}
                      <button
                        className="p-2 text-dark-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVisibility(layer.id);
                        }}
                      >
                        {layer.visible ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
                      </button>
                      <button
                        className="p-2 text-dark-400 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLayer(layer.id);
                        }}
                      >
                        <TrashIcon size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-dark-700">
              <button
                onClick={() => {
                  onAddLayer();
                  setShowLayers(false);
                }}
                className="w-full btn-primary py-3"
              >
                <PlusIcon size={18} />
                Add Layer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Panel - Slide up */}
      {showMenu && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMenu(false)} />
          <div className="absolute bottom-16 left-0 right-0 bg-dark-800 rounded-t-2xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-dark-700">
              <h3 className="text-white font-semibold">Menu</h3>
            </div>
            <div className="p-2 grid grid-cols-3 gap-2">
              <button
                onClick={() => { onNewProject(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 hover:bg-dark-600/50"
              >
                <PlusIcon size={24} className="text-primary-400" />
                <span className="text-xs text-dark-300">New</span>
              </button>
              <button
                onClick={() => { onLoadProject(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 hover:bg-dark-600/50"
              >
                <MenuIcon size={24} className="text-primary-400" />
                <span className="text-xs text-dark-300">Open</span>
              </button>
              <button
                onClick={() => { onSaveProject(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 hover:bg-dark-600/50"
              >
                <DownloadIcon size={24} className="text-primary-400" />
                <span className="text-xs text-dark-300">Save</span>
              </button>
              <button
                onClick={() => { onExport(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 hover:bg-dark-600/50"
              >
                <DownloadIcon size={24} className="text-green-400" />
                <span className="text-xs text-dark-300">Export</span>
              </button>
              <button
                onClick={() => { onAutoAlign(); setShowMenu(false); }}
                disabled={isProcessing}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 hover:bg-dark-600/50 disabled:opacity-50"
              >
                <MoveIcon size={24} className="text-blue-400" />
                <span className="text-xs text-dark-300">Auto Align</span>
              </button>
              <button
                onClick={() => { onAITryOn(); setShowMenu(false); }}
                disabled={isProcessing}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 hover:bg-dark-600/50 disabled:opacity-50"
              >
                <SparklesIcon size={24} className="text-purple-400" />
                <span className="text-xs text-dark-300">AI Try-On</span>
              </button>
              <button
                onClick={() => { onAIUpscale(); setShowMenu(false); }}
                disabled={isProcessing}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 hover:bg-dark-600/50 disabled:opacity-50"
              >
                <SparklesIcon size={24} className="text-yellow-400" />
                <span className="text-xs text-dark-300">Upscale</span>
              </button>
              <button
                onClick={() => { onShowSettings(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 hover:bg-dark-600/50"
              >
                <SettingsIcon size={24} className="text-gray-400" />
                <span className="text-xs text-dark-300">API Keys</span>
              </button>
              <button
                onClick={() => { onShowCloud(); setShowMenu(false); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-700/50 hover:bg-dark-600/50"
              >
                <CloudIcon size={24} className="text-blue-400" />
                <span className="text-xs text-dark-300">Cloud</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brush Settings Panel */}
      {showBrushSettings && activeTool === 'BRUSH' && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowBrushSettings(false)} />
          <div className="absolute bottom-16 left-0 right-0 bg-dark-800 rounded-t-2xl overflow-hidden animate-slide-up p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Brush Settings</h3>
              <button onClick={() => setShowBrushSettings(false)} className="text-dark-400">
                <ChevronDownIcon size={20} />
              </button>
            </div>

            {/* Brush Mode */}
            <div className="mb-4">
              <label className="text-xs text-dark-400 mb-2 block">Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`py-3 rounded-xl text-sm font-medium ${
                    brushSettings.mode === 'ERASE'
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                      : 'bg-dark-700/50 text-dark-300'
                  }`}
                  onClick={() => onBrushSettingsChange({ mode: 'ERASE' })}
                >
                  Erase
                </button>
                <button
                  className={`py-3 rounded-xl text-sm font-medium ${
                    brushSettings.mode === 'RESTORE'
                      ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50'
                      : 'bg-dark-700/50 text-dark-300'
                  }`}
                  onClick={() => onBrushSettingsChange({ mode: 'RESTORE' })}
                >
                  Restore
                </button>
              </div>
            </div>

            {/* Brush Size */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-dark-400 mb-2">
                <span>Size</span>
                <span>{brushSettings.size}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                value={brushSettings.size}
                onChange={(e) => onBrushSettingsChange({ size: Number(e.target.value) })}
                className="w-full accent-primary-500"
              />
            </div>

            {/* Brush Hardness */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-dark-400 mb-2">
                <span>Hardness</span>
                <span>{Math.round(brushSettings.hardness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={brushSettings.hardness * 100}
                onChange={(e) => onBrushSettingsChange({ hardness: Number(e.target.value) / 100 })}
                className="w-full accent-primary-500"
              />
            </div>

            {/* Brush Opacity */}
            <div>
              <div className="flex justify-between text-xs text-dark-400 mb-2">
                <span>Opacity</span>
                <span>{Math.round(brushSettings.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={brushSettings.opacity * 100}
                onChange={(e) => onBrushSettingsChange({ opacity: Number(e.target.value) / 100 })}
                className="w-full accent-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
        <div className="bg-dark-800/95 backdrop-blur-lg border-t border-dark-700 safe-area-bottom">
          <div className="flex items-center justify-around px-2 py-2">
            {/* Undo */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-3 rounded-xl ${canUndo ? 'text-white' : 'text-dark-600'}`}
            >
              <UndoIcon size={22} />
            </button>

            {/* Tools */}
            {tools.map(({ tool, icon }) => (
              <button
                key={tool}
                onClick={() => {
                  onToolChange(tool);
                  if (tool === 'BRUSH') setShowBrushSettings(true);
                }}
                className={`p-3 rounded-xl transition-all ${
                  activeTool === tool
                    ? 'bg-primary-500 text-white shadow-neon'
                    : 'text-dark-400'
                }`}
              >
                {icon}
              </button>
            ))}

            {/* Redo */}
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-3 rounded-xl ${canRedo ? 'text-white' : 'text-dark-600'}`}
            >
              <RedoIcon size={22} />
            </button>

            {/* Layers */}
            <button
              onClick={() => setShowLayers(true)}
              className="p-3 rounded-xl text-dark-400 relative"
            >
              <LayersIcon size={22} />
              {layers.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {layers.length}
                </span>
              )}
            </button>

            {/* Menu */}
            <button
              onClick={() => setShowMenu(true)}
              className="p-3 rounded-xl text-dark-400"
            >
              <MenuIcon size={22} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
