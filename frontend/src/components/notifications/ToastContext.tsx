import React, { createContext, useCallback, useState, useContext } from 'react';
import { ToastNotification } from '../../types';

interface ToastContextType {
  addToast: (toast: Omit<ToastNotification, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  editToast: (id: string, newToast: Partial<Omit<ToastNotification, 'id'>>) => void;
  toasts: ToastNotification[];
}

export const ToastContext = createContext<ToastContextType>({
  addToast: () => '',
  removeToast: () => {},
  clearToasts: () => {},
  editToast: () => {},
  toasts: [],
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback(
    ({ type, title, message, duration = 5000 }: Omit<ToastNotification, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastNotification = {
        id,
        type,
        title,
        message,
        duration,
      };

      setToasts((prevToasts) => [...prevToasts, newToast]);

      return id;
    },
    []
  );

  const editToast = useCallback(
    (id: string, newToast: Partial<Omit<ToastNotification, 'id'>>) => {
      setToasts((prevToasts) =>
        prevToasts.map((toast) => (toast.id === id ? { ...toast, ...newToast } : toast))
      );
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearToasts, editToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};