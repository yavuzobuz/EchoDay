import { useState, useCallback } from 'react';
import type { ToastMessage } from '../components/ToastNotification';

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration || 5000,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods for different toast types
  const showMessage = useCallback((title: string, message: string, avatar?: string, duration?: number) => {
    return addToast({
      title,
      message,
      type: 'info',
      avatar,
      duration,
    });
  }, [addToast]);

  const showSuccess = useCallback((title: string, message: string, duration?: number) => {
    return addToast({
      title,
      message,
      type: 'success',
      duration,
    });
  }, [addToast]);

  const showWarning = useCallback((title: string, message: string, duration?: number) => {
    return addToast({
      title,
      message,
      type: 'warning',
      duration,
    });
  }, [addToast]);

  const showError = useCallback((title: string, message: string, duration?: number) => {
    return addToast({
      title,
      message,
      type: 'error',
      duration,
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    showMessage,
    showSuccess,
    showWarning,
    showError,
  };
};