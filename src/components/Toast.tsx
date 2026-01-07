/**
 * Toast Notification Component
 */

import React from 'react';
import { CheckIcon, XIcon, AlertCircleIcon } from './Icons';
import type { ToastMessage } from '@/types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface SingleToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<SingleToastProps> = ({ toast, onDismiss }) => {
  const icons = {
    success: <CheckIcon size={18} className="text-green-400" />,
    error: <XIcon size={18} className="text-red-400" />,
    warning: <AlertCircleIcon size={18} className="text-yellow-400" />,
    info: <AlertCircleIcon size={18} className="text-blue-400" />,
  };

  const bgColors = {
    success: 'bg-green-500/10 border-green-500/30',
    error: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    info: 'bg-blue-500/10 border-blue-500/30',
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border backdrop-blur-lg
        animate-slide-up shadow-lg
        ${bgColors[toast.type]}
      `}
    >
      <span className="flex-shrink-0 mt-0.5">{icons[toast.type]}</span>

      <p className="flex-1 text-sm text-white">{toast.message}</p>

      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-dark-400 hover:text-white transition-colors"
      >
        <XIcon size={16} />
      </button>
    </div>
  );
};
