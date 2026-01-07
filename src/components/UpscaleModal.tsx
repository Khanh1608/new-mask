/**
 * Upscale Modal Component
 */

import React, { useState } from 'react';
import { Modal } from './Modal';
import { SparklesIcon, CheckIcon } from './Icons';

interface UpscaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (options: UpscaleOptions) => void;
  imagePreview?: string;
}

export interface UpscaleOptions {
  scale: 2 | 4 | 8 | 10;
  enhanceFace: boolean;
  mode: 'layer' | 'composite';
}

export const UpscaleModal: React.FC<UpscaleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  imagePreview,
}) => {
  const [scale, setScale] = useState<2 | 4 | 8 | 10>(4);
  const [enhanceFace, setEnhanceFace] = useState(true);
  const [mode, setMode] = useState<'layer' | 'composite'>('composite');

  const handleSubmit = () => {
    onSubmit({ scale, enhanceFace, mode });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Upscale">
      <div className="space-y-6">
        {imagePreview && (
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-xl overflow-hidden ring-2 ring-primary-500/30 bg-dark-800">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
            </div>
          </div>
        )}

        {/* Scale Selection */}
        <div>
          <label className="input-label">Upscale Factor</label>
          <div className="grid grid-cols-4 gap-2">
            {([2, 4, 8, 10] as const).map((s) => (
              <button
                key={s}
                className={`py-3 rounded-xl font-medium transition-all ${
                  scale === s
                    ? 'bg-primary-500 text-white shadow-neon'
                    : 'bg-dark-700/50 text-dark-300 hover:text-white hover:bg-dark-600/50'
                }`}
                onClick={() => setScale(s)}
              >
                {s}x
              </button>
            ))}
          </div>
          <p className="text-xs text-dark-400 mt-2">Higher scale = longer processing time</p>
        </div>

        {/* Mode Selection */}
        <div>
          <label className="input-label">Upscale Mode</label>
          <div className="space-y-2">
            {[
              { value: 'composite', title: 'Full Composite', desc: 'Upscale the final merged image' },
              { value: 'layer', title: 'Selected Layer Only', desc: 'Upscale only the current layer' },
            ].map((opt) => (
              <button
                key={opt.value}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  mode === opt.value
                    ? 'bg-primary-500/20 ring-1 ring-primary-500/50'
                    : 'bg-dark-700/50 hover:bg-dark-600/50'
                }`}
                onClick={() => setMode(opt.value as 'layer' | 'composite')}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  mode === opt.value ? 'border-primary-500' : 'border-dark-500'
                }`}>
                  {mode === opt.value && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{opt.title}</div>
                  <div className="text-xs text-dark-400">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
              enhanceFace ? 'bg-primary-500 text-white' : 'bg-dark-700 border border-dark-600'
            }`}
            onClick={() => setEnhanceFace(!enhanceFace)}
          >
            {enhanceFace && <CheckIcon size={12} />}
          </div>
          <span className="text-sm text-dark-300 group-hover:text-white transition-colors">
            Enhance faces (better facial detail)
          </span>
        </label>

        {/* Info */}
        <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700">
          <p className="text-xs text-dark-400">
            <span className="text-primary-400 font-medium">Note:</span> Upscaling uses Crystal Upscaler via Replicate API. Processing may take 30-120 seconds.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button className="flex-1 btn-secondary" onClick={onClose}>Cancel</button>
          <button className="flex-1 btn-primary" onClick={handleSubmit}>
            <SparklesIcon size={16} />
            Start Upscale
          </button>
        </div>
      </div>
    </Modal>
  );
};
