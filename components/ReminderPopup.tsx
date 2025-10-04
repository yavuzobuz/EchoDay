import React, { useEffect } from 'react';

interface ReminderPopupProps {
  message: string;
  onClose: () => void;
}

const ReminderPopup: React.FC<ReminderPopupProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 10000); // Stays on screen for 10 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const baseClasses = "fixed bottom-5 left-5 z-50 p-4 rounded-lg shadow-lg flex items-center max-w-sm animate-fade-in-up";
  const typeClasses = 'bg-blue-100 dark:bg-blue-900/80 backdrop-blur-sm text-blue-800 dark:text-blue-200 border-l-4 border-blue-500';

  const Icon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
     </svg>
  );

  return (
    <div className={`${baseClasses} ${typeClasses}`}>
      <Icon />
      <span className="flex-1 font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default ReminderPopup;
