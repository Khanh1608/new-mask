/**
 * Cloud Settings Modal - Configure cloud storage (Dropbox)
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  isDropboxConnected,
  startDropboxAuth,
  disconnectDropbox,
  getDropboxAppKey,
  setDropboxAppKey,
  getAutoUploadSettings,
  setAutoUploadSettings,
} from '../api/dropbox';

interface CloudSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({ isOpen, onClose }) => {
  const [dropboxConnected, setDropboxConnected] = useState(false);
  const [appKey, setAppKey] = useState('');
  const [showAppKeyInput, setShowAppKeyInput] = useState(false);
  const [autoUpload, setAutoUpload] = useState(getAutoUploadSettings());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDropboxConnected(isDropboxConnected());
      setAppKey(getDropboxAppKey());
      setAutoUpload(getAutoUploadSettings());
      setError(null);
    }
  }, [isOpen]);

  const handleConnect = async () => {
    try {
      setError(null);
      setIsConnecting(true);
      await startDropboxAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectDropbox();
    setDropboxConnected(false);
  };

  const handleSaveAppKey = () => {
    setDropboxAppKey(appKey);
    setShowAppKeyInput(false);
  };

  const handleAutoUploadChange = (key: keyof typeof autoUpload, value: boolean | string) => {
    const newSettings = { ...autoUpload, [key]: value };
    setAutoUpload(newSettings);
    setAutoUploadSettings(newSettings);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cloud Storage" maxWidth="480px">
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Dropbox Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 14l6 4 6-4-6-4-6 4z" />
                </svg>
              </div>
              <div>
                <div className="text-white font-medium">Dropbox</div>
                <div className="text-xs text-gray-400">
                  {dropboxConnected ? (
                    <span className="text-green-400">Connected</span>
                  ) : (
                    'Not connected'
                  )}
                </div>
              </div>
            </div>

            {dropboxConnected ? (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>

          {/* App Key Configuration */}
          {!dropboxConnected && (
            <div className="space-y-2">
              <button
                onClick={() => setShowAppKeyInput(!showAppKeyInput)}
                className="text-xs text-primary-400 hover:text-primary-300"
              >
                {showAppKeyInput ? 'Hide App Key' : 'Configure App Key'}
              </button>

              {showAppKeyInput && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={appKey}
                    onChange={(e) => setAppKey(e.target.value)}
                    placeholder="Enter Dropbox App Key"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveAppKey}
                      className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded text-xs"
                    >
                      Save
                    </button>
                    <a
                      href="https://www.dropbox.com/developers/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-dark-600 hover:bg-dark-500 text-white rounded text-xs"
                    >
                      Get App Key
                    </a>
                  </div>
                  <p className="text-xs text-gray-500">
                    Create app at Dropbox Developer Console → App type: Scoped access →
                    Full Dropbox or App folder → Copy App Key
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto Upload Settings */}
        {dropboxConnected && (
          <div className="space-y-4 pt-4 border-t border-dark-600">
            <h3 className="text-sm font-medium text-white">Auto Upload</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoUpload.enabled}
                onChange={(e) => handleAutoUploadChange('enabled', e.target.checked)}
                className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-300">Enable auto upload</span>
            </label>

            {autoUpload.enabled && (
              <div className="space-y-3 pl-7">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoUpload.uploadBase}
                    onChange={(e) => handleAutoUploadChange('uploadBase', e.target.checked)}
                    className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-400">Upload base image when added</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoUpload.uploadOverlay}
                    onChange={(e) => handleAutoUploadChange('uploadOverlay', e.target.checked)}
                    className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-400">Upload overlay layers when added</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoUpload.uploadUpscale}
                    onChange={(e) => handleAutoUploadChange('uploadUpscale', e.target.checked)}
                    className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-400">Upload after AI upscale</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoUpload.uploadExport}
                    onChange={(e) => handleAutoUploadChange('uploadExport', e.target.checked)}
                    className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-400">Upload after export</span>
                </label>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Upload folder</label>
                  <input
                    type="text"
                    value={autoUpload.folder}
                    onChange={(e) => handleAutoUploadChange('folder', e.target.value)}
                    placeholder="/LayerMask Pro"
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-dark-600">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
