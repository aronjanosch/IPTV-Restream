import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmButtonClass?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  type = 'danger',
  loading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'info':
        return <AlertTriangle className="w-6 h-6 text-blue-400" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-red-400" />;
    }
  };

  const getBackgroundClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-900 bg-opacity-20 border-red-700';
      case 'warning':
        return 'bg-yellow-900 bg-opacity-20 border-yellow-700';
      case 'info':
        return 'bg-blue-900 bg-opacity-20 border-blue-700';
      default:
        return 'bg-red-900 bg-opacity-20 border-red-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className={`rounded-lg border p-4 mb-4 ${getBackgroundClass()}`}>
            <div className="flex items-start space-x-3">
              {getIcon()}
              <div>
                <p className="text-gray-200">{message}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${confirmButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={loading}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{loading ? 'Processing...' : confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;