import React from 'react';
import { AccentColor } from '../App';
import Logo from './Logo';
import { useI18n } from '../contexts/I18nContext';

interface HeaderProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  onNavigateToProfile: () => void;
  onNavigateToHome?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigateToProfile, onNavigateToHome }) => {
  const { lang, setLang } = useI18n();
  const toggleLang = () => setLang(lang === 'tr' ? 'en' : 'tr');
  return (
    <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm sticky top-0 z-40 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 px-3 sm:px-4 py-2 safe-area-top">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm">
          <Logo className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow" />
        </span>
        <span className="font-bold text-lg sm:text-xl hidden sm:inline text-gray-800 dark:text-gray-200">EchoDay</span>
      </div>
      {/* Theme switcher removed (moved to Profile page) */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          aria-label="Language"
          title="Language"
        >
          {lang === 'tr' ? 'EN' : 'TR'}
        </button>
        {onNavigateToHome && (
          <button 
            onClick={onNavigateToHome}
            className="p-2 sm:p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Ana Sayfa"
            title="Ana Sayfa"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        )}
        <button 
          onClick={onNavigateToProfile}
          className="p-2 sm:p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Profil ve Ayarlar"
          title="Profil ve Ayarlar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
