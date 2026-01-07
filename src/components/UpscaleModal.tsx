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
  creativity: number;
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
  const [creativity, setCreativity] = useState(0);

  const handleSubmit = () => {
    onSubmit({ scale, enhanceFace, mode, creativity });
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
              { value: 'composite', title: 'Ảnh hoàn chỉnh', desc: 'Upscale mặt base + body overlay (ảnh đã ghép)' },
              { value: 'layer', title: 'Chỉ Overlay', desc: 'Upscale overlay đã áp mask (vùng mặt trong suốt)' },
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

        {/* Creativity Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="input-label mb-0">Creativity</label>
            <span className="text-xs text-primary-400 font-medium">{creativity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={creativity}
            onChange={(e) => setCreativity(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
          <div className="flex justify-between text-xs text-dark-500 mt-1">
            <span>Giữ nguyên gốc</span>
            <span>Sáng tạo</span>
          </div>
          <p className="text-xs text-dark-400 mt-2">
            0% = giữ nguyên chi tiết gốc (khuyên dùng cho ảnh chân dung)
          </p>
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
            Enhance faces (độ giống mặt cao nhất)
          </span>
        </label>

        {/* Info */}
        <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700">
          <p className="text-xs text-dark-400">
            <span className="text-primary-400 font-medium">Tip:</span> Để giữ mặt giống nhất, đặt Creativity = 0% và bật Enhance faces.
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
