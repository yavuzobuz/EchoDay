import React from 'react';

interface InfoBannerProps {
  assistantName: string;
  onClose: () => void;
}

const InfoBanner: React.FC<InfoBannerProps> = ({ assistantName, onClose }) => {
  return (
    <div className="bg-[var(--accent-color-100)] dark:bg-[var(--accent-color-900)] border-t border-b border-[var(--accent-color-300)] dark:border-[var(--accent-color-800)] text-[var(--accent-color-900)] dark:text-[var(--accent-color-200)] px-4 py-3 rounded-lg mb-6 shadow-sm relative" role="alert">
      <div className="flex items-center">
        <div className="py-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-sm sm:text-base">
            İpucu: Asistanı aktive etmek için "<span className="font-semibold">{assistantName}</span>" deyin.
          </p>
          <p className="text-xs sm:text-sm">
            Ardından komutunuzu söyleyin: "Yarın 14:00'te toplantı ayarla" veya "Bu fikri not al".
          </p>
        </div>
      </div>
      <button 
        onClick={onClose} 
        className="absolute top-2 right-2 p-1.5 rounded-full text-current opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="İpucunu kapat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default InfoBanner;