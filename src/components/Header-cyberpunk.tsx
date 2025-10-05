import React from 'react';
import { AccentColor } from '../App-cyberpunk';

interface HeaderCyberpunkProps {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  onNavigateToProfile: () => void;
  onShowWelcome?: () => void;
}

const HeaderCyberpunk: React.FC<HeaderCyberpunkProps> = ({ accentColor, setAccentColor, onNavigateToProfile, onShowWelcome }) => {

  const colorButtons: { color: AccentColor; neon: string; label: string }[] = [
    { color: 'blue', neon: '#00ffff', label: 'CYAN' },
    { color: 'green', neon: '#39ff14', label: 'GREEN' },
    { color: 'red', neon: '#ff10f0', label: 'PINK' }
  ];

  return (
    <header className="neon-border backdrop-blur-sm p-4 sticky top-0 z-40 flex justify-between items-center bg-black/80">
      <div className="flex items-center gap-4">
        {/* 🎮 RETRO LOGO 🎮 */}
        <div className="flex items-center gap-2">
          <div className="relative">
            {/* Holographic icon */}
            <div className="h-12 w-12 rounded-lg neon-border-pink bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center float-animation">
              <span className="text-2xl holographic font-retro">◈</span>
            </div>
            {/* Glowing dots */}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 animate-ping"></div>
          </div>
          <div className="flex flex-col">
            <span className="font-retro text-sm neon-text-pink">NEON-DAY</span>
            <span className="font-terminal text-xs neon-text-cyan">v2.077.beta</span>
          </div>
        </div>

        {/* 🎨 COLOR THEME SELECTOR 🎨 */}
        <div className="hidden md:flex gap-2 items-center">
          <span className="font-terminal text-xs neon-text-green">[TEMA]</span>
          {colorButtons.map(({ color, neon, label }) => (
            <button
              key={color}
              onClick={() => setAccentColor(color)}
              className={`px-3 py-1 rounded font-terminal text-xs transition-all duration-300 ${
                accentColor === color 
                  ? 'cyber-button scale-110' 
                  : 'bg-gray-900 border border-gray-700 hover:border-white'
              }`}
              style={{
                ...(accentColor === color && {
                  boxShadow: `0 0 20px ${neon}, 0 0 40px ${neon}`
                })
              }}
              title={`${label} temasına geç`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* 🏠 WELCOME BUTTON 🏠 */}
        {onShowWelcome && (
          <button 
            onClick={onShowWelcome}
            className="cyber-button rounded-lg flex items-center gap-2 text-sm"
            aria-label="Karşılama Sayfası"
            title="Karşılama Sayfası"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="hidden sm:inline font-terminal">ANA SAYFA</span>
          </button>
        )}
        
        {/* 🎯 PROFILE BUTTON 🎯 */}
        <button 
          onClick={onNavigateToProfile}
          className="cyber-button rounded-lg flex items-center gap-2 text-sm"
          aria-label="Profil ve Ayarlar"
          title="Profil ve Ayarlar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="hidden sm:inline font-terminal">AYARLAR</span>
        </button>
      </div>
    </header>
  );
};

export default HeaderCyberpunk;
