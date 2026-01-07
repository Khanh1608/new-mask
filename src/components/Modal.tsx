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
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  message = 'Processing...',
  progress,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel p-8 text-center animate-scale-in">
        {/* Spinner */}
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

        {/* Message */}
        <p className="text-dark-200 mb-4">{message}</p>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="progress-bar w-48 mx-auto">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
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
