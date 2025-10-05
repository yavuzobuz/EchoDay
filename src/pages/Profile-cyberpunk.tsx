import React, { useState } from 'react';
import { AccentColor } from '../App-cyberpunk';

interface ProfileCyberpunkProps {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  assistantName: string;
  setAssistantName: (name: string) => void;
  onNavigateBack: () => void;
  onShowWelcome: () => void;
}

const ProfileCyberpunk: React.FC<ProfileCyberpunkProps> = ({
  accentColor,
  setAccentColor,
  apiKey,
  setApiKey,
  assistantName,
  setAssistantName,
  onNavigateBack,
  onShowWelcome
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localAssistantName, setLocalAssistantName] = useState(assistantName);

  const handleSave = () => {
    setApiKey(localApiKey);
    setAssistantName(localAssistantName);
    onNavigateBack();
  };

  return (
    <div className="min-h-screen p-4">
      {/* 🔙 BACK BUTTON 🔙 */}
      <div className="container mx-auto max-w-4xl mb-6">
        <button
          onClick={onNavigateBack}
          className="cyber-button rounded-lg px-4 py-2 font-terminal text-sm flex items-center gap-2"
        >
          <span>◀</span>
          <span>ANA SİSTEME DÖN</span>
        </button>
      </div>

      <div className="container mx-auto max-w-4xl">
        <div className="retro-card rounded-xl p-8">
          {/* 🎮 HEADER 🎮 */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-20 w-20 rounded-xl neon-border-pink bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center float-animation">
                <span className="text-5xl holographic">⚙</span>
              </div>
            </div>
            <h1 className="font-retro text-3xl neon-text-pink mb-2">
              SİSTEM AYARLARI
            </h1>
            <p className="font-terminal text-sm neon-text-cyan">
              [ NEURAL ARABİRİMİNİZİ YAPILANDIRIN ]
            </p>
          </div>

          {/* ⚙️ SETTINGS SECTIONS ⚙️ */}
          <div className="space-y-6">
            
            {/* 🤖 AI SETTINGS 🤖 */}
            <div className="terminal-window rounded-lg p-6">
              <h2 className="font-retro text-lg neon-text-green mb-4 flex items-center gap-2">
                <span>🤖</span>
                <span>AI ÇEKİRDEK</span>
              </h2>
              
              <div className="space-y-4">
                {/* Assistant Name */}
                <div>
                  <label className="font-terminal text-sm neon-text-cyan block mb-2">
                    &gt; ASİSTAN KOD ADI
                  </label>
                  <div className="neon-border rounded-lg bg-black/50 p-3">
                    <input
                      type="text"
                      value={localAssistantName}
                      onChange={(e) => setLocalAssistantName(e.target.value)}
                      placeholder="AI kod adı girin..."
                      className="w-full bg-transparent font-terminal text-sm text-white placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                  <p className="font-terminal text-xs text-gray-500 mt-1">
                    Varsayılan: NEON-BOT
                  </p>
                </div>

                {/* API Key */}
                <div>
                  <label className="font-terminal text-sm neon-text-cyan block mb-2">
                    &gt; GEMINI API ERİŞİM ANAHTARI
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 neon-border rounded-lg bg-black/50 p-3">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={localApiKey}
                        onChange={(e) => setLocalApiKey(e.target.value)}
                        placeholder="API anahtarı girin..."
                        className="w-full bg-transparent font-terminal text-sm text-white placeholder-gray-600 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="cyber-button rounded-lg px-4 font-terminal text-xs"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <p className="font-terminal text-xs text-gray-500 mt-1">
                    AI özellikleri için gerekli | Anahtar al: ai.google.dev
                  </p>
                </div>
              </div>
            </div>

            {/* 🎨 THEME SETTINGS 🎨 */}
            <div className="terminal-window rounded-lg p-6">
              <h2 className="font-retro text-lg neon-text-green mb-4 flex items-center gap-2">
                <span>🎨</span>
                <span>GÖRSEL ÇEKİRDEK</span>
              </h2>
              
              <div>
                <label className="font-terminal text-sm neon-text-cyan block mb-3">
                  &gt; NEON TEMA SEÇ
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { color: 'blue' as AccentColor, label: 'CYAN', neon: '#00ffff', icon: '💎' },
                    { color: 'green' as AccentColor, label: 'GREEN', neon: '#39ff14', icon: '☢️' },
                    { color: 'red' as AccentColor, label: 'PINK', neon: '#ff10f0', icon: '🔮' }
                  ].map(({ color, label, neon, icon }) => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className={`retro-card rounded-lg p-4 text-center transition-all duration-300 hover:scale-105 ${
                        accentColor === color ? 'scale-110' : ''
                      }`}
                      style={{
                        ...(accentColor === color && {
                          boxShadow: `0 0 30px ${neon}, 0 0 60px ${neon}`
                        })
                      }}
                    >
                      <div className="text-4xl mb-2">{icon}</div>
                      <p className="font-terminal text-xs neon-text-cyan">{label}</p>
                      {accentColor === color && (
                        <div className="mt-2">
                          <span className="font-terminal text-xs neon-text-green">✓ AKTİF</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 📊 SYSTEM INFO 📊 */}
            <div className="terminal-window rounded-lg p-6">
              <h2 className="font-retro text-lg neon-text-green mb-4 flex items-center gap-2">
                <span>📊</span>
                <span>SİSTEM BİLGİSİ</span>
              </h2>
              
              <div className="space-y-2 font-terminal text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">&gt; VERSİYON:</span>
                  <span className="neon-text-cyan">v2.077.beta</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">&gt; YAPI:</span>
                  <span className="neon-text-cyan">CYBERPUNK-EDİSYON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">&gt; NEURAL BAĞLANTI:</span>
                  <span className="neon-text-green">BAĞLI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">&gt; ŞİFRELEME:</span>
                  <span className="neon-text-green">AKTİF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">&gt; DURUM:</span>
                  <span className="neon-text-green animate-pulse">OPERASYONEL</span>
                </div>
              </div>
            </div>

            {/* 🎯 ACTION BUTTONS 🎯 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleSave}
                className="cyber-button rounded-lg px-6 py-4 font-terminal text-sm flex items-center justify-center gap-2"
              >
                <span>💾</span>
                <span>AYARLARI KAYDET</span>
              </button>
              
              <button
                onClick={onShowWelcome}
                className="retro-card rounded-lg px-6 py-4 font-terminal text-sm text-gray-400 hover:text-white transition-colors duration-300 flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>HOŞ GELDİN EKRANINI GÖSTER</span>
              </button>
            </div>
          </div>

          {/* 💾 FOOTER 💾 */}
          <div className="mt-8 pt-6 border-t-2 border-gray-800 text-center">
            <p className="font-terminal text-xs text-gray-600">
              NEON-DAY © 2077 | ALL SYSTEMS ENCRYPTED | BUILD v2.077.beta
            </p>
          </div>
        </div>
      </div>

      {/* 🌟 FLOATING ELEMENTS 🌟 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: ['#ff10f0', '#00ffff', '#39ff14'][Math.floor(Math.random() * 3)],
              boxShadow: `0 0 10px currentColor`,
              animation: `float ${3 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ProfileCyberpunk;
