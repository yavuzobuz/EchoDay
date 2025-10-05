import React from 'react';
import { AccentColor } from '../App';

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

const accentColors: { name: AccentColor, className: string }[] = [
    { name: 'blue', className: 'bg-blue-500' },
    { name: 'green', className: 'bg-green-500' },
    { name: 'red', className: 'bg-red-500' },
];

interface ThemeSwitcherProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, setTheme, accentColor, setAccentColor }) => {
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('[ThemeSwitcher] Toggling theme from', theme, 'to', newTheme);
    setTheme(newTheme);
  };

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
       {accentColors.map(color => (
         <button
            key={color.name}
            onClick={() => setAccentColor(color.name)}
            className={`w-6 h-6 rounded-full ${color.className} transition-transform transform hover:scale-110 ${accentColor === color.name ? 'ring-2 ring-offset-2 ring-white dark:ring-offset-gray-800' : ''}`}
            aria-label={`Set accent color to ${color.name}`}
         />
       ))}
       <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
       <button
          onClick={toggleTheme}
          className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          aria-label="Toggle theme"
       >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
       </button>
    </div>
  );
};

export default ThemeSwitcher;
