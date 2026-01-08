/**
 * Modal Component - Reusable modal dialog
 */

import React, { useEffect, useCallback } from 'react';
import { XIcon } from './Icons';
import type { ModalProps } from '@/types';

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="btn-icon hover:bg-dark-600/50"
            >
              <XIcon size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
};

// Loading Modal
interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  progress?: number;
  isImageGeneration?: boolean;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  message = 'Processing...',
  progress,
  isImageGeneration = false,
}) => {
  if (!isOpen) return null;

  // Check if this is AI-related loading
  const isAILoading = message.toLowerCase().includes('ai') ||
                      message.toLowerCase().includes('generating') ||
                      message.toLowerCase().includes('upscal') ||
                      message.toLowerCase().includes('try') ||
                      isImageGeneration;

  return (
    <div className="modal-overlay">
      <div className="glass-panel p-8 text-center animate-scale-in max-w-sm">
        {isAILoading ? (
          <>
            {/* AI Image Generation Loading - ChatGPT/Grok style */}
            <div className="relative w-48 h-48 mx-auto mb-6 rounded-xl overflow-hidden bg-dark-800">
              {/* Shimmer skeleton effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-dark-800 via-dark-600 to-dark-800 animate-shimmer" />

              {/* Scanning line effect */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-scan-line" />
              </div>

              {/* Corner decorations */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary-500/50 rounded-tl" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary-500/50 rounded-tr" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary-500/50 rounded-bl" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary-500/50 rounded-br" />

              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Animated dots */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <p className="text-dark-200">{message}</p>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>

            {/* Progress bar with glow */}
            {progress !== undefined && (
              <div className="w-full bg-dark-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300 relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            )}

            <p className="text-xs text-dark-400 mt-3">AI is creating your image...</p>
          </>
        ) : (
          <>
            {/* Standard Loading */}
            <div className="w-16 h-16 mx-auto mb-4">
              <svg
                className="animate-spin text-primary-500"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>

            <p className="text-dark-200 mb-4">{message}</p>

            {progress !== undefined && (
              <div className="progress-bar w-48 mx-auto">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Confirm Modal
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-dark-300 mb-6">{message}</p>

      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>
          {cancelText}
        </button>
        <button
          className={danger ? 'btn bg-red-500 hover:bg-red-600 text-white' : 'btn-primary'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};
