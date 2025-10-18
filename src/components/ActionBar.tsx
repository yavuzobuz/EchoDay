import React from 'react';
import { useI18n } from '../contexts/I18nContext';

interface ActionBarProps {
  onSimpleVoiceCommand: () => void;
  onOpenChat: () => void;
  onImageTask: () => void;
  isListening: boolean;
  hasVoiceSupport?: boolean;
}

const ActionBar: React.FC<ActionBarProps> = ({ onSimpleVoiceCommand, onOpenChat, onImageTask, isListening, hasVoiceSupport = true }) => {
  const { t } = useI18n();
  // Mobil için minimum 44x44px touch area (Apple HIG standardı)
  const buttonBaseStyle = "flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-lg transition-all duration-300 active:scale-95 sm:hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 h-full min-h-[100px] sm:min-h-[120px] touch-manipulation";

  return (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl sm:rounded-lg shadow-md mb-4 sm:mb-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        
        {/* Simple Voice Command Button */}
        <button
          onClick={onSimpleVoiceCommand}
          disabled={isListening || !hasVoiceSupport}
          className={`
            ${buttonBaseStyle} 
            ${isListening ? 'bg-red-200 dark:bg-red-900/50 cursor-not-allowed' : 
              !hasVoiceSupport ? 'bg-gray-300 dark:bg-gray-800 cursor-not-allowed opacity-50' :
              'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
          `}
        >
          <div className={`relative flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full ${isListening ? 'bg-red-500' : 'bg-[var(--accent-color-600)]'} text-white shadow-lg`}>
            {isListening && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="mt-1.5 sm:mt-2 md:mt-3 font-semibold text-xs sm:text-base md:text-lg text-gray-800 dark:text-white">{t('action.voiceTask.title', 'Sesle Görev')}</p>
          <p className="text-[9px] sm:text-xs md:text-sm text-center text-gray-500 dark:text-gray-400 hidden sm:block leading-tight">{t('action.voiceTask.subtitle', 'Sadece konuşun, biz not alalım.')}</p>
        </button>

        {/* AI Chat Button */}
        <button
          onClick={onOpenChat}
          disabled={isListening}
          className={`${buttonBaseStyle} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full bg-white dark:bg-gray-800 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="h-8 w-8 sm:h-9 sm:w-9 md:h-12 md:w-12">
              <defs>
                <linearGradient id="grad1-action" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: 'var(--accent-color-500)'}}/>
                  <stop offset="100%" style={{stopColor: 'var(--accent-color-600)'}}/>
                </linearGradient>
                <linearGradient id="grad2-action" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#06B6D4'}}/>
                  <stop offset="100%" style={{stopColor: '#3B82F6'}}/>
                </linearGradient>
              </defs>
              <g>
                <rect x="30" y="50" width="140" height="100" rx="25" fill="url(#grad1-action)"/>
                <path d="M 80 150 L 70 170 L 95 150 Z" fill="url(#grad1-action)"/>
                <line x1="55" y1="80" x2="145" y2="80" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.9"/>
                <line x1="55" y1="100" x2="130" y2="100" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
                <line x1="55" y1="120" x2="120" y2="120" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.5"/>
                <circle cx="60" cy="135" r="4" fill="white" opacity="0.8"/>
                <circle cx="75" cy="135" r="4" fill="white" opacity="0.8"/>
                <circle cx="90" cy="135" r="4" fill="white" opacity="0.8"/>
              </g>
              <g transform="translate(120, 35)">
                <circle cx="35" cy="35" r="32" fill="url(#grad2-action)" opacity="0.95"/>
                <circle cx="35" cy="35" r="32" fill="none" stroke="white" strokeWidth="2" opacity="0.3"/>
                <g transform="translate(15, 15)">
                  <circle cx="10" cy="12" r="3" fill="white" opacity="0.9"/>
                  <circle cx="30" cy="12" r="3" fill="white" opacity="0.9"/>
                  <circle cx="20" cy="5" r="3" fill="white" opacity="0.9"/>
                  <circle cx="20" cy="25" r="3" fill="white" opacity="0.9"/>
                  <circle cx="5" cy="20" r="2.5" fill="white" opacity="0.8"/>
                  <circle cx="35" cy="20" r="2.5" fill="white" opacity="0.8"/>
                  <line x1="10" y1="12" x2="20" y2="5" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="30" y1="12" x2="20" y2="5" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="10" y1="12" x2="20" y2="25" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="30" y1="12" x2="20" y2="25" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="10" y1="12" x2="5" y2="20" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="30" y1="12" x2="35" y2="20" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="20" y1="25" x2="5" y2="20" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                  <line x1="20" y1="25" x2="35" y2="20" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                  <circle cx="20" cy="18" r="4" fill="white" opacity="0.95"/>
                </g>
                <text x="35" y="58" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="white" textAnchor="middle" opacity="0.95">AI</text>
              </g>
            </svg>
          </div>
          <p className="mt-1.5 sm:mt-2 md:mt-3 font-semibold text-xs sm:text-base md:text-lg text-gray-800 dark:text-white">{t('action.aiChat.title', 'AI Sohbet')}</p>
          <p className="text-[9px] sm:text-xs md:text-sm text-center text-gray-500 dark:text-gray-400 hidden sm:block leading-tight">{t('action.aiChat.subtitle', 'Asistanla sohbet edin.')}</p>
        </button>

        {/* New Image Task Button */}
        <button
          onClick={onImageTask}
          disabled={isListening}
          className={`${buttonBaseStyle} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full bg-white dark:bg-gray-800 text-[var(--accent-color-500)] shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="mt-1.5 sm:mt-2 md:mt-3 font-semibold text-xs sm:text-base md:text-lg text-gray-800 dark:text-white">{t('action.imageTask.title', 'Resimle')}</p>
          <p className="text-[9px] sm:text-xs md:text-sm text-center text-gray-500 dark:text-gray-400 hidden sm:block leading-tight">{t('action.imageTask.subtitle', 'Resimden akıllı görev yaratın.')}</p>
        </button>

      </div>
    </div>
  );
};

export default ActionBar;
