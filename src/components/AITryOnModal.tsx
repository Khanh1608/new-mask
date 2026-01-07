/**
 * AI Try-On Modal Component
 */

import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { ShirtIcon, SparklesIcon, ImageIcon, UploadIcon, CheckIcon } from './Icons';
import type { AIProvider, TryOnMode } from '@/types';

interface AITryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (options: TryOnOptions) => void;
  personImagePreview?: string;
}

export interface TryOnOptions {
  provider: AIProvider;
  mode: TryOnMode;
  clothingImage?: string;
  clothingDescription?: string;
  preserveFace: boolean;
  enhanceQuality: boolean;
}

export const AITryOnModal: React.FC<AITryOnModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  personImagePreview,
}) => {
  const [provider, setProvider] = useState<AIProvider>('GEMINI');
  const [mode, setMode] = useState<TryOnMode>('VIRTUAL_TRYON');
  const [clothingImage, setClothingImage] = useState<string | undefined>();
  const [clothingDescription, setClothingDescription] = useState('');
  const [preserveFace, setPreserveFace] = useState(true);
  const [enhanceQuality, setEnhanceQuality] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClothingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setClothingImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    onSubmit({
      provider,
      mode,
      clothingImage,
      clothingDescription,
      preserveFace,
      enhanceQuality,
    });
    onClose();
  };

  const canSubmit = mode === 'AI_GENERATE'
    ? clothingDescription.trim().length > 0
    : mode === 'VIRTUAL_TRYON'
    ? !!clothingImage
    : true;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Virtual Try-On">
      <div className="space-y-6">
        {personImagePreview && (
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-xl overflow-hidden ring-2 ring-primary-500/30">
              <img src={personImagePreview} alt="Person" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* AI Provider */}
        <div>
          <label className="input-label">AI Provider</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`p-3 rounded-xl text-left transition-all ${
                provider === 'GEMINI'
                  ? 'bg-primary-500/20 ring-1 ring-primary-500/50'
                  : 'bg-dark-700/50 hover:bg-dark-600/50'
              }`}
              onClick={() => setProvider('GEMINI')}
            >
              <div className="font-medium text-white text-sm">Gemini</div>
              <div className="text-xs text-dark-400">Google AI</div>
            </button>
            <button
              className={`p-3 rounded-xl text-left transition-all ${
                provider === 'OPENAI'
                  ? 'bg-primary-500/20 ring-1 ring-primary-500/50'
                  : 'bg-dark-700/50 hover:bg-dark-600/50'
              }`}
              onClick={() => setProvider('OPENAI')}
            >
              <div className="font-medium text-white text-sm">OpenAI</div>
              <div className="text-xs text-dark-400">GPT-4 + DALL-E</div>
            </button>
          </div>
        </div>

        {/* Mode */}
        <div>
          <label className="input-label">Mode</label>
          <div className="space-y-2">
            {[
              { mode: 'VIRTUAL_TRYON' as TryOnMode, icon: <ShirtIcon size={18} />, title: 'Virtual Try-On', desc: 'Upload a clothing image' },
              { mode: 'AI_GENERATE' as TryOnMode, icon: <SparklesIcon size={18} />, title: 'AI Generate', desc: 'Describe the outfit' },
              { mode: 'SEGMENT_REPLACE' as TryOnMode, icon: <ImageIcon size={18} />, title: 'Segment & Replace', desc: 'Auto-detect and replace clothing' },
            ].map((item) => (
              <button
                key={item.mode}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  mode === item.mode
                    ? 'bg-primary-500/20 ring-1 ring-primary-500/50'
                    : 'bg-dark-700/50 hover:bg-dark-600/50'
                }`}
                onClick={() => setMode(item.mode)}
              >
                <span className={mode === item.mode ? 'text-primary-400' : 'text-dark-400'}>{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{item.title}</div>
                  <div className="text-xs text-dark-400">{item.desc}</div>
                </div>
                {mode === item.mode && <CheckIcon size={16} className="text-primary-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Mode-specific inputs */}
        {mode === 'VIRTUAL_TRYON' && (
          <div>
            <label className="input-label">Clothing Image</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleClothingUpload} />
            {clothingImage ? (
              <div className="relative">
                <img src={clothingImage} alt="Clothing" className="w-full h-40 object-contain rounded-xl bg-dark-800" />
                <button
                  className="absolute top-2 right-2 btn-icon bg-dark-800/80"
                  onClick={() => setClothingImage(undefined)}
                >
                  &times;
                </button>
              </div>
            ) : (
              <button
                className="w-full h-32 border-2 border-dashed border-dark-600 rounded-xl flex flex-col items-center justify-center gap-2 text-dark-400 hover:text-white hover:border-primary-500/50 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon size={24} />
                <span className="text-sm">Upload clothing image</span>
              </button>
            )}
          </div>
        )}

        {(mode === 'AI_GENERATE' || mode === 'SEGMENT_REPLACE') && (
          <div>
            <label className="input-label">{mode === 'AI_GENERATE' ? 'Describe the outfit' : 'Replacement outfit (optional)'}</label>
            <textarea
              className="input min-h-[100px] resize-none"
              placeholder={mode === 'AI_GENERATE' ? "e.g., A elegant red evening dress..." : "e.g., Casual summer outfit..."}
              value={clothingDescription}
              onChange={(e) => setClothingDescription(e.target.value)}
            />
          </div>
        )}

        {/* Options */}
        <div className="space-y-3">
          {[
            { label: 'Preserve face', checked: preserveFace, onChange: setPreserveFace },
            { label: 'Enhance quality', checked: enhanceQuality, onChange: setEnhanceQuality },
          ].map((opt) => (
            <label key={opt.label} className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  opt.checked ? 'bg-primary-500 text-white' : 'bg-dark-700 border border-dark-600'
                }`}
                onClick={() => opt.onChange(!opt.checked)}
              >
                {opt.checked && <CheckIcon size={12} />}
              </div>
              <span className="text-sm text-dark-300 group-hover:text-white transition-colors">{opt.label}</span>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button className="flex-1 btn-secondary" onClick={onClose}>Cancel</button>
          <button className="flex-1 btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
            <SparklesIcon size={16} />
            Generate
          </button>
        </div>
      </div>
    </Modal>
  );
};
