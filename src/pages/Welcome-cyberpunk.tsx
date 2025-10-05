import React from 'react';

interface WelcomeCyberpunkProps {
  onGetStarted: () => void;
}

const WelcomeCyberpunk: React.FC<WelcomeCyberpunkProps> = ({ onGetStarted }) => {
  const [terminalText, setTerminalText] = React.useState('');
  const [showButton, setShowButton] = React.useState(false);
  
  const fullText = `> SİSTEM BAŞL ATMA SİRASI BAŞLATILDI...
> NEURAL ARABIRIM YÜKLENİYOR... [TAMAM]
> NEON-DAY ANA SİSTEMİNE BAĞLANILIYOR... [TAMAM]
> SES TANIMA BAŞLATILIYOR... [TAMAM]
> HOLOGRAFİK EKRAN KALİBRE EDİLİYOR... [TAMAM]
> 
> GÜNLÜĞÜN GELECEĞİNE HOŞ GELDİNİZ
> `;

  React.useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTerminalText(fullText.substring(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowButton(true), 500);
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 🌟 ANIMATED BACKGROUND ELEMENTS 🌟 */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
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

      <div className="retro-card rounded-xl p-8 md:p-12 max-w-4xl w-full z-10">
        {/* 💫 HERO SECTION 💫 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-24 w-24 rounded-xl neon-border-pink bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center float-animation">
              <span className="text-6xl holographic">◈</span>
            </div>
          </div>
          <h1 className="font-retro text-3xl md:text-5xl mb-4 neon-text-pink">
            NEON-DAY
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="audio-bar w-2 rounded" style={{ animationDelay: '0s', height: '30px' }}></div>
            <div className="audio-bar w-2 rounded" style={{ animationDelay: '0.1s', height: '40px' }}></div>
            <div className="audio-bar w-2 rounded" style={{ animationDelay: '0.2s', height: '25px' }}></div>
            <div className="audio-bar w-2 rounded" style={{ animationDelay: '0.3s', height: '50px' }}></div>
            <div className="audio-bar w-2 rounded" style={{ animationDelay: '0.4s', height: '35px' }}></div>
          </div>
          <p className="font-terminal text-xl neon-text-cyan">
            [ SESLİ AKTİFLEŞTIRİLEN SİBER GÜNLÜK SİSTEMİ ]
          </p>
        </div>

        {/* 📟 TERMINAL WINDOW 📟 */}
        <div className="terminal-window rounded-lg p-6 mb-8 cyber-scrollbar max-h-64 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-terminal text-sm ml-2 neon-text-green">SYSTEM.LOG</span>
          </div>
          <pre className="font-terminal text-lg whitespace-pre-wrap">
            {terminalText}
            <span className="animate-pulse">▮</span>
          </pre>
        </div>

        {/* 🎯 FEATURES GRID 🎯 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
            { icon: '🎤', title: 'SESLİ GİRİŞ', desc: 'Sesle kaydet' },
            { icon: '🤖', title: 'AI ASİSTAN', desc: 'Akıllı otomasyon' },
            { icon: '⚡', title: 'ANLIK', desc: 'Hızlı senkronizasyon' }
          ].map((feature, i) => (
            <div 
              key={i}
              className="retro-card rounded-lg p-4 text-center hover:scale-105 transition-transform duration-300"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <div className="text-4xl mb-2 float-animation" style={{ animationDelay: `${i * 0.3}s` }}>
                {feature.icon}
              </div>
              <h3 className="font-terminal text-sm neon-text-cyan mb-1">{feature.title}</h3>
              <p className="font-terminal text-xs text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* 🚀 ACTION BUTTON 🚀 */}
        {showButton && (
          <div className="text-center">
            <button
              onClick={onGetStarted}
              className="cyber-button rounded-lg px-8 py-4 font-terminal text-xl float-animation"
            >
              <span className="flex items-center gap-3">
                <span>▶</span>
                <span>GİRİŞ YAP</span>
                <span>◀</span>
              </span>
            </button>
            <p className="font-terminal text-xs text-gray-500 mt-4 neon-text-green">
              &gt; Sisteme girmek için tıklayın...
            </p>
          </div>
        )}

        {/* 💾 FOOTER INFO 💾 */}
        <div className="mt-8 pt-6 border-t-2 border-gray-800 text-center">
          <p className="font-terminal text-xs text-gray-600">
            NEON-DAY © 2077 | CYBERPUNK EDITION | BUILD v2.077.beta
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCyberpunk;
