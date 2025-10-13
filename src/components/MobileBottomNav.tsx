import React from 'react';
import { useI18n } from '../contexts/I18nContext';

interface MobileBottomNavProps {
  onVoiceCommand: () => void;
  onOpenChat: () => void;
  onImageTask: () => void;
  onShowArchive: () => void;
  onShowProfile: () => void;
  isListening: boolean;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onVoiceCommand,
  onOpenChat,
  onImageTask,
  onShowArchive,
  onShowProfile,
  isListening
}) => {
  const { t } = useI18n();
  return (
    // Fixed bottom navigation - sadece mobilde göster
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-[10000] md:hidden overflow-visible" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
      <div className="grid grid-cols-5 h-16 relative overflow-visible">
        {/* Voice Command */}
        <button
          onClick={onVoiceCommand}
          disabled={isListening}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            isListening
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          <div className={`relative ${isListening ? 'animate-pulse' : ''}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            {isListening && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-[10px] font-medium">{t('bottomNav.voice', 'Sesli')}</span>
        </button>

        {/* Görsel Görev (taşındı) */}
        <button
          onClick={onImageTask}
          disabled={isListening}
          className="flex flex-col items-center justify-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-[10px] font-medium">{t('bottomNav.image', 'Görsel')}</span>
        </button>

        {/* Sohbet - standart ikon */}
        <button
          onClick={onOpenChat}
          disabled={isListening}
          className="flex flex-col items-center justify-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <span className="text-[10px] font-medium">{t('bottomNav.chat', 'Sohbet')}</span>
        </button>

        {/* Archive */}
        <button
          onClick={onShowArchive}
          className="flex flex-col items-center justify-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-[10px] font-medium">{t('bottomNav.archive', 'Arşiv')}</span>
        </button>

        {/* Profile */}
        <button
          onClick={onShowProfile}
          className="flex flex-col items-center justify-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="text-[10px] font-medium">{t('bottomNav.profile', 'Profil')}</span>
        </button>
      </div>
    </div>
  );
};

export default MobileBottomNav;

// Mobil cihazlarda native haptic feedback ve gestures eklenmesi
// Bu component'in TouchEvent desteği ile geliştirilmesi önerilir
