import React, { useEffect, useRef } from 'react';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  fullScreen?: boolean;
  swipeToClose?: boolean;
  className?: string;
}

export const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  fullScreen = true,
  swipeToClose = true,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Swipe to close handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeToClose) return;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeToClose || !isDragging.current) return;
    touchCurrentY.current = e.touches[0].clientY;
    const diff = touchCurrentY.current - touchStartY.current;

    if (modalRef.current && diff > 0) {
      modalRef.current.style.transform = `translateY(${diff}px)`;
      modalRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    if (!swipeToClose || !isDragging.current) return;
    const diff = touchCurrentY.current - touchStartY.current;

    if (modalRef.current) {
      modalRef.current.style.transition = 'transform 0.3s ease-out';

      if (diff > 100) {
        // Swipe threshold exceeded - close modal
        modalRef.current.style.transform = 'translateY(100%)';
        setTimeout(onClose, 300);
      } else {
        // Return to original position
        modalRef.current.style.transform = 'translateY(0)';
      }
    }

    isDragging.current = false;
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Add iOS momentum scrolling fix
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={`
          relative bg-white dark:bg-gray-800 
          ${fullScreen 
            ? 'w-full h-full md:h-auto md:max-h-[90vh] md:w-auto md:min-w-[500px] md:max-w-4xl md:rounded-2xl' 
            : 'w-full max-h-[85vh] rounded-t-3xl md:rounded-2xl md:max-w-lg'
          }
          shadow-2xl overflow-hidden
          animate-slide-up md:animate-fade-in
          ${className}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe indicator (mobile only) */}
        {swipeToClose && (
          <div className="md:hidden flex justify-center pt-2 pb-1">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
            {title && (
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  ml-auto p-2 rounded-full 
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  active:scale-95
                  transition-all duration-150
                  min-h-[44px] min-w-[44px]
                  flex items-center justify-center
                "
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(100vh-80px)] md:max-h-[calc(90vh-80px)] overscroll-contain">
          <div className="px-4 md:px-6 py-4 md:py-6 pb-safe">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility component for modal sections
export const ModalSection: React.FC<{
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => (
  <div className={`mb-6 ${className}`}>
    {title && (
      <h3 className="text-base md:text-lg font-medium text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
    )}
    {children}
  </div>
);

// Utility component for modal actions
export const ModalActions: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`
    sticky bottom-0 left-0 right-0 
    bg-white dark:bg-gray-800 
    border-t border-gray-200 dark:border-gray-700
    px-4 md:px-6 py-3 md:py-4
    flex gap-2 md:gap-3
    ${className}
  `}>
    {children}
  </div>
);
