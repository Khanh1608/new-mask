/**
 * API Settings Modal - Allow users to configure their API keys
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { initGemini, isGeminiConfigured } from '../api/gemini';
import { initOpenAI, isOpenAIConfigured } from '../api/openai';
import { initReplicate, isReplicateConfigured } from '../api/replicate';

interface APISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface APIKeyConfig {
  key: string;
  name: string;
  storageKey: string;
  placeholder: string;
  description: string;
  link: string;
  init: (key: string) => void;
  isConfigured: () => boolean;
}

const API_CONFIGS: APIKeyConfig[] = [
  {
    key: 'gemini',
    name: 'Google Gemini',
    storageKey: 'gemini_api_key',
    placeholder: 'AIza...',
    description: 'Dùng cho AI Try-On với Gemini',
    link: 'https://aistudio.google.com/apikey',
    init: initGemini,
    isConfigured: isGeminiConfigured,
  },
  {
    key: 'openai',
    name: 'OpenAI',
    storageKey: 'openai_api_key',
    placeholder: 'sk-...',
    description: 'Dùng cho AI Try-On với GPT-4',
    link: 'https://platform.openai.com/api-keys',
    init: initOpenAI,
    isConfigured: isOpenAIConfigured,
  },
  {
    key: 'replicate',
    name: 'Replicate',
    storageKey: 'replicate_api_key',
    placeholder: 'r8_...',
    description: 'Dùng cho AI Upscale (nếu server chưa cấu hình)',
    link: 'https://replicate.com/account/api-tokens',
    init: initReplicate,
    isConfigured: isReplicateConfigured,
  },
];

export const APISettingsModal: React.FC<APISettingsModalProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  // Load keys from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const loadedKeys: Record<string, string> = {};
      for (const config of API_CONFIGS) {
        loadedKeys[config.key] = localStorage.getItem(config.storageKey) || '';
      }
      setKeys(loadedKeys);
      setSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    for (const config of API_CONFIGS) {
      const value = keys[config.key]?.trim() || '';
      if (value) {
        localStorage.setItem(config.storageKey, value);
        config.init(value);
      } else {
        localStorage.removeItem(config.storageKey);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusColor = (config: APIKeyConfig) => {
    if (config.isConfigured()) return 'bg-green-500';
    if (keys[config.key]) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getStatusText = (config: APIKeyConfig) => {
    if (config.isConfigured()) return 'Đã kết nối';
    if (keys[config.key]) return 'Chưa lưu';
    return 'Chưa cấu hình';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cài đặt API Keys" maxWidth="500px">
      <div className="space-y-4">
        <p className="text-sm text-gray-400 mb-4">
          Nhập API keys để sử dụng các tính năng AI. Keys được lưu trong trình duyệt của bạn.
        </p>

        {API_CONFIGS.map((config) => (
          <div key={config.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                {config.name}
                <span className={`w-2 h-2 rounded-full ${getStatusColor(config)}`} />
                <span className="text-xs text-gray-400">{getStatusText(config)}</span>
              </label>
              <a
                href={config.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-400 hover:text-primary-300"
              >
                Lấy key
              </a>
            </div>

            <div className="relative">
              <input
                type={showKeys[config.key] ? 'text' : 'password'}
                value={keys[config.key] || ''}
                onChange={(e) => setKeys(prev => ({ ...prev, [config.key]: e.target.value }))}
                placeholder={config.placeholder}
                className="w-full px-3 py-2 pr-10 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => toggleShowKey(config.key)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
              >
                {showKeys[config.key] ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500">{config.description}</p>
          </div>
        ))}

        <div className="flex gap-3 pt-4 border-t border-dark-600">
          <button
            onClick={handleSave}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-primary-600 hover:bg-primary-500 text-white'
            }`}
          >
            {saved ? '✓ Đã lưu!' : 'Lưu cài đặt'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Keys được lưu trong localStorage của trình duyệt, không gửi lên server.
        </p>
      </div>
    </Modal>
  );
};
