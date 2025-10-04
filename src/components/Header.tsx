import React from 'react';
import ThemeSwitcher from './ThemeSwitcher';
import { AccentColor } from '../App';
import Logo from './Logo';

interface HeaderProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  onNavigateToProfile: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, setTheme, accentColor, setAccentColor, onNavigateToProfile }) => {
  return (
    <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-2 sticky top-0 z-40 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 px-4">
      <div className="flex items-center gap-2">
        <Logo className="h-8 w-8 text-[var(--accent-color-600)]" />
        <span className="font-bold text-lg hidden sm:inline text-gray-800 dark:text-gray-200">EchoDay</span>
      </div>
      <ThemeSwitcher theme={theme} setTheme={setTheme} accentColor={accentColor} setAccentColor={setAccentColor} />
      <button 
        onClick={onNavigateToProfile}
        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label="Profil ve Ayarlar"
        title="Profil ve Ayarlar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </header>
  );
};

export default Header;
