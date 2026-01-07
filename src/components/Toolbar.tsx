/**
 * Toolbar Component - Main tool palette and controls
 */

import React, { useRef } from 'react';
import {
  BrushIcon,
  MoveIcon,
  HandIcon,
  EraserIcon,
  UndoIcon,
  RedoIcon,
  FitIcon,
  ZoomInIcon,
  ZoomOutIcon,
  CompareIcon,
  DownloadIcon,
  SaveIcon,
  FolderOpenIcon,
  UploadIcon,
  PlusIcon,
  FaceIcon,
  ShirtIcon,
  SparklesIcon,
  RotateIcon,
  ScaleIcon,
  KeyboardIcon,
  EyeIcon,
  SettingsIcon,
  CloudIcon,
} from './Icons';
import type { ToolType, BrushSettings, BrushMode } from '@/types';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  brushSettings: BrushSettings;
  onBrushSettingsChange: (settings: Partial<BrushSettings>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onToggleCompare: () => void;
  isComparing: boolean;
  selectedLayerOpacity: number;
  selectedLayerRotation: number;
  selectedLayerScale: number;
  onOpacityChange: (value: number) => void;
  onRotationChange: (value: number) => void;
  onScaleChange: (value: number) => void;
  hasSelectedLayer: boolean;
  onAutoAlign: () => void;
  onAITryOn: () => void;
  onAIUpscale: () => void;
  isProcessing: boolean;
  onNewProject: (file: File) => void;
  onAddLayer: (file: File) => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onExport: () => void;
  onShowShortcuts: () => void;
  onShowSettings: () => void;
  onShowCloud: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  brushSettings,
  onBrushSettingsChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onToggleCompare,
  isComparing,
  selectedLayerOpacity,
  selectedLayerRotation,
  selectedLayerScale,
  onOpacityChange,
  onRotationChange,
  onScaleChange,
  hasSelectedLayer,
  onAutoAlign,
  onAITryOn,
  onAIUpscale,
  isProcessing,
  onNewProject,
  onAddLayer,
  onSaveProject,
  onLoadProject,
  onExport,
  onShowShortcuts,
  onShowSettings,
  onShowCloud,
}) => {
  const baseInputRef = useRef<HTMLInputElement>(null);
  const layerInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="glass-panel w-72 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-dark-700/50">
        <h1 className="text-lg font-bold gradient-text">LayerMask Pro 2.0</h1>
        <p className="text-xs text-dark-400 mt-1">AI-Powered Image Editor</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6">
        {/* Project Section */}
        <Section title="Project">
          <div className="grid grid-cols-2 gap-2">
            <input
              ref={baseInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onNewProject(file);
                e.target.value = '';
              }}
            />
            <input
              ref={layerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAddLayer(file);
                e.target.value = '';
              }}
            />

            <button className="btn-secondary text-xs" onClick={() => baseInputRef.current?.click()}>
              <UploadIcon size={14} />
              New
            </button>
            <button className="btn-secondary text-xs" onClick={() => layerInputRef.current?.click()}>
              <PlusIcon size={14} />
              Add Layer
            </button>
            <button className="btn-secondary text-xs" onClick={onSaveProject}>
              <SaveIcon size={14} />
              Save
            </button>
            <button className="btn-secondary text-xs" onClick={onLoadProject}>
              <FolderOpenIcon size={14} />
              Open
            </button>
          </div>
          <button className="btn-primary w-full text-sm mt-2" onClick={onExport}>
            <DownloadIcon size={16} />
            Export PNG
          </button>
        </Section>

        {/* Tools Section */}
        <Section title="Tools">
          <div className="flex gap-1">
            <ToolButton
              icon={<MoveIcon size={18} />}
              label="Transform (V)"
              active={activeTool === 'TRANSFORM'}
              onClick={() => onToolChange('TRANSFORM')}
            />
            <ToolButton
              icon={<BrushIcon size={18} />}
              label="Brush (B)"
              active={activeTool === 'BRUSH'}
              onClick={() => onToolChange('BRUSH')}
            />
            <ToolButton
              icon={<HandIcon size={18} />}
              label="Pan (H)"
              active={activeTool === 'HAND'}
              onClick={() => onToolChange('HAND')}
            />
          </div>
        </Section>

        {/* Brush Settings */}
        {activeTool === 'BRUSH' && (
          <Section title="Brush">
            <div className="flex gap-2 mb-4">
              <button
                className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                  brushSettings.mode === 'ERASE'
                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                    : 'bg-dark-700/50 text-dark-300 hover:text-white'
                }`}
                onClick={() => onBrushSettingsChange({ mode: 'ERASE' as BrushMode })}
              >
                <EraserIcon size={14} className="inline mr-1" />
                Erase (E)
              </button>
              <button
                className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                  brushSettings.mode === 'RESTORE'
                    ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50'
                    : 'bg-dark-700/50 text-dark-300 hover:text-white'
                }`}
                onClick={() => onBrushSettingsChange({ mode: 'RESTORE' as BrushMode })}
              >
                <BrushIcon size={14} className="inline mr-1" />
                Restore (R)
              </button>
            </div>

            <SliderControl
              label="Size"
              value={brushSettings.size}
              min={1}
              max={200}
              unit="px"
              onChange={(size) => onBrushSettingsChange({ size })}
            />
            <SliderControl
              label="Hardness"
              value={Math.round(brushSettings.hardness * 100)}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => onBrushSettingsChange({ hardness: v / 100 })}
            />
            <SliderControl
              label="Opacity"
              value={Math.round(brushSettings.opacity * 100)}
              min={1}
              max={100}
              unit="%"
              onChange={(v) => onBrushSettingsChange({ opacity: v / 100 })}
            />
          </Section>
        )}

        {/* Layer Properties */}
        {hasSelectedLayer && (
          <Section title="Layer Properties">
            <SliderControl
              label="Opacity"
              value={Math.round(selectedLayerOpacity * 100)}
              min={0}
              max={100}
              unit="%"
              icon={<EyeIcon size={14} />}
              onChange={(v) => onOpacityChange(v / 100)}
            />
            <SliderControl
              label="Rotation"
              value={Math.round(selectedLayerRotation)}
              min={-180}
              max={180}
              unit="°"
              icon={<RotateIcon size={14} />}
              onChange={onRotationChange}
            />
            <SliderControl
              label="Scale"
              value={Math.round(selectedLayerScale * 100)}
              min={10}
              max={300}
              unit="%"
              icon={<ScaleIcon size={14} />}
              onChange={(v) => onScaleChange(v / 100)}
            />
          </Section>
        )}

        {/* AI Tools */}
        <Section title="AI Tools">
          <div className="space-y-2">
            <button
              className="btn-secondary w-full text-sm justify-start"
              onClick={onAutoAlign}
              disabled={isProcessing}
            >
              <FaceIcon size={16} />
              Auto Face Align
            </button>
            <button
              className="btn-primary w-full text-sm justify-start"
              onClick={onAITryOn}
              disabled={isProcessing}
            >
              <ShirtIcon size={16} />
              AI Try-On
            </button>
            <button
              className="btn-secondary w-full text-sm justify-start"
              onClick={onAIUpscale}
              disabled={isProcessing}
            >
              <SparklesIcon size={16} />
              AI Upscale
            </button>
          </div>
        </Section>

        {/* View Controls */}
        <Section title="View">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-dark-400">Zoom: {Math.round(zoom * 100)}%</span>
            <div className="flex gap-1">
              <button className="btn-icon p-1.5" onClick={onZoomOut}>
                <ZoomOutIcon size={14} />
              </button>
              <button className="btn-icon p-1.5" onClick={onZoomIn}>
                <ZoomInIcon size={14} />
              </button>
              <button className="btn-icon p-1.5" onClick={onFitToScreen}>
                <FitIcon size={14} />
              </button>
            </div>
          </div>
          <button
            className={`w-full py-2 text-xs rounded-lg transition-all ${
              isComparing
                ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/50'
                : 'bg-dark-700/50 text-dark-300 hover:text-white'
            }`}
            onClick={onToggleCompare}
          >
            <CompareIcon size={14} className="inline mr-2" />
            Compare Original
          </button>
        </Section>

        {/* History */}
        <Section title="History">
          <div className="flex gap-2">
            <button className="flex-1 btn-secondary text-xs" onClick={onUndo} disabled={!canUndo}>
              <UndoIcon size={14} />
              Undo
            </button>
            <button className="flex-1 btn-secondary text-xs" onClick={onRedo} disabled={!canRedo}>
              <RedoIcon size={14} />
              Redo
            </button>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-dark-700/50 space-y-2">
        <button className="w-full btn-ghost text-xs text-dark-400" onClick={onShowSettings}>
          <SettingsIcon size={14} />
          API Settings
        </button>
        <button className="w-full btn-ghost text-xs text-dark-400" onClick={onShowCloud}>
          <CloudIcon size={14} />
          Cloud Storage
        </button>
        <button className="w-full btn-ghost text-xs text-dark-400" onClick={onShowShortcuts}>
          <KeyboardIcon size={14} />
          Keyboard Shortcuts
        </button>
      </div>
    </div>
  );
};

// Helper Components
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">{title}</h3>
    {children}
  </div>
);

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, active, onClick }) => (
  <button
    className={active ? 'tool-btn-active flex-1' : 'tool-btn flex-1'}
    onClick={onClick}
    title={label}
  >
    {icon}
  </button>
);

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  icon?: React.ReactNode;
  onChange: (value: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  unit = '',
  icon,
  onChange,
}) => (
  <div className="mb-3">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs text-dark-300 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-white">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="slider"
    />
  </div>
);
