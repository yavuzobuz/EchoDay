import React, { useState, useEffect } from 'react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  avatar?: string;
}

interface ToastNotificationProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ messages, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {messages.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto remove after duration
    const duration = toast.duration || 5000;
    const removeTimer = setTimeout(() => {
      handleRemove();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Animation duration
  };

  const getTypeStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-500 border-green-600';
      case 'warning':
        return 'bg-yellow-500 border-yellow-600';
      case 'error':
        return 'bg-red-500 border-red-600';
      default:
        return 'bg-blue-500 border-blue-600';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '💬';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700
        hover:shadow-xl cursor-pointer
      `}
      onClick={handleRemove}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Avatar or Icon */}
          <div className="flex-shrink-0">
            {toast.avatar ? (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                {toast.avatar.startsWith('http') ? (
                  <img src={toast.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-gray-700">{toast.avatar}</span>
                )}
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-full ${getTypeStyles()} flex items-center justify-center text-white text-lg`}>
                {getIcon()}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {toast.title}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
              {toast.message}
            </p>
          </div>
          
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToastNotification;