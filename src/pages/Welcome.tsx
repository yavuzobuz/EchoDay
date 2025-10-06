import React, { useState, useEffect } from 'react';
import Logo from '../components/Logo';

interface WelcomeProps {
  onGetStarted: () => void;
}

const Feature: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; delay: number }> = ({ icon, title, children, delay }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  return (
    <div 
      className={`group feature-card text-center h-full ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] mb-4 transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300 glow-primary">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-[hsl(var(--card-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">{title}</h3>
      <p className="text-[hsl(var(--muted-foreground))] text-sm leading-relaxed">{children}</p>
    </div>
  );
};


const Welcome: React.FC<WelcomeProps> = ({ onGetStarted }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    setIsLoaded(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[hsl(var(--gradient-from))] via-[hsl(var(--gradient-via))] to-[hsl(var(--gradient-to))] text-[hsl(var(--foreground))] p-4 transition-colors duration-300 overflow-hidden relative">
      {/* Animated Background Gradient */}
      <div 
        className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, hsl(var(--primary) / 0.15), transparent 40%)`
        }}
      />
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-[hsl(var(--primary))] rounded-full opacity-20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>
      
      <div className="text-center max-w-7xl mx-auto relative z-10">
        {/* Logo with pulse animation - BÜYÜTÜLDÜ */}
        <div className={`inline-block p-8 bg-[hsl(var(--card))]/80 backdrop-blur-lg rounded-3xl mb-8 glow-primary transform transition-all duration-1000 ${
          isLoaded ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-180'
        }`}>
          <Logo className="w-32 h-32 animate-pulse" />
        </div>
        
        {/* Main Title with gradient animation */}
        <h1 className={`text-6xl sm:text-7xl md:text-8xl font-black mb-4 gradient-text animate-gradient-x transform transition-all duration-1000 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          EchoDay
        </h1>
        
        {/* Subtitle with typing effect feel */}
        <div className={`flex items-center justify-center gap-3 mb-4 transform transition-all duration-1000 delay-200 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <svg className="w-10 h-10 text-[hsl(var(--accent))]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <p className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))]">
            Gününüzün Yankısı
          </p>
        </div>
        
        {/* Description with fade in */}
        <p className={`text-lg md:text-xl text-[hsl(var(--muted-foreground))] mb-12 max-w-3xl mx-auto leading-relaxed transform transition-all duration-1000 delay-300 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <span className="inline-flex items-center gap-2 font-semibold text-[hsl(var(--primary))]">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 7H7v6h6V7z" />
              <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
            </svg>
            AI destekli
          </span> sesli komutlar, 
          <span className="font-semibold text-[hsl(var(--accent))]">akıllı öneriler</span> ve 
          <span className="font-semibold text-[hsl(var(--primary))]">güçlü analiz</span> özellikleriyle 
          verimliliğinizi <span className="font-bold underline decoration-wavy decoration-[hsl(var(--primary))]">üst seviyeye</span> çıkarın.
        </p>

        {/* Features Grid with stagger animation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
            title="Sesle Yönetim"
            delay={100}
          >
            Görevlerinizi ve notlarınızı <strong>sesli komutlarla</strong> ekleyin, AI asistanınızla <strong>sohbet edin</strong>.
          </Feature>
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
            title="Akıllı Analiz"
            delay={200}
          >
            Yapay zeka <strong>tarih, öncelik ve konum</strong> gibi detayları <strong>otomatik çıkarır</strong>.
          </Feature>
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            title="Görselden Görev"
            delay={300}
          >
            <strong>Fatura, takvim</strong> veya <strong>el yazısı</strong> fotoğraflarından anında görev oluşturun.
          </Feature>
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
            title="Proaktif Öneriler"
            delay={400}
          >
            AI <strong>alışkanlıklarınızı öğrenir</strong> ve size <strong>özel öneriler</strong> sunar.
          </Feature>
        </div>
        
        {/* App Preview Mockup - MODERN TASARİM */}
        <div className={`mb-16 transform transition-all duration-1000 delay-500 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="relative max-w-6xl mx-auto">
            {/* Modern App Window - Resimdeki gibi */}
            <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl overflow-hidden border border-[hsl(var(--border))]">
              {/* Window Header - macOS tarzı */}
              <div className="bg-[hsl(var(--background))] px-4 py-3 flex items-center gap-3 border-b border-[hsl(var(--border))]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#28c840]"></div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] text-sm font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    EchoDay
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  <svg className="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </div>
              
              {/* App Content - Resimdeki layout */}
              <div className="p-6 space-y-6">
                {/* Top Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sesli Görev Ekle Card */}
                  <div className="bg-[hsl(var(--muted))] rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[hsl(var(--muted)_/_0.8)] transition-colors">
                    <div className="w-14 h-14 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                      <svg className="w-7 h-7 text-[hsl(var(--primary-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-[hsl(var(--foreground))] mb-1">Sesle Görev</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Sesli komutla hızlıca ekle</p>
                    </div>
                  </div>

                  {/* AI Sohbet Card */}
                  <div className="bg-[hsl(var(--muted))] rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[hsl(var(--muted)_/_0.8)] transition-colors">
                    <div className="w-14 h-14 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center">
                      <svg className="w-7 h-7 text-[hsl(var(--accent-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-[hsl(var(--foreground))] mb-1">AI Sohbet</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Asistanınızla sohbet edin.</p>
                    </div>
                  </div>

                  {/* Resimle Card */}
                  <div className="bg-[hsl(var(--muted))] rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[hsl(var(--muted)_/_0.8)] transition-colors">
                    <div className="w-14 h-14 rounded-full bg-[hsl(var(--destructive))] flex items-center justify-center">
                      <svg className="w-7 h-7 text-[hsl(var(--destructive-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-[hsl(var(--foreground))] mb-1">Resimle</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Fotoğraftan otomatik görev oluştur</p>
                    </div>
                  </div>
                </div>

                {/* Görevlerim Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                      ⭐ Görevlerim
                      <span className="text-xs bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-2 py-0.5 rounded-full">Bugün</span>
                    </h2>
                    <button className="text-sm text-[hsl(var(--primary))] font-semibold flex items-center gap-1">
                      Liste 
                      <span className="text-xs">Zaman Sırası</span>
                    </button>
                  </div>

                  {/* Task Items */}
                  <div className="space-y-2">
                    {/* Task 1 - Red border */}
                    <div className="bg-[hsl(var(--muted))] rounded-lg p-4 border-l-4 border-[hsl(var(--primary))]">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1 w-4 h-4 rounded" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-[hsl(var(--foreground))]">Proje sunumunu hazırla ve ekibe gönder - Kategori: Önemli</h3>
                          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Zaman: Bugün 14:30</p>
                        </div>
                      </div>
                    </div>

                    {/* Task 2 */}
                    <div className="bg-[hsl(var(--muted))] rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1 w-4 h-4 rounded" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-[hsl(var(--foreground))]">Doktor randevusu - Diş kontrolü - Kategori: Sağlık</h3>
                          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Zaman: Yarın 10:00</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Günlük Not Defterim Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                      📝 Günlük Not Defterim
                    </h2>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-xs bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-lg">Basit</button>
                      <button className="px-3 py-1 text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg">Tarih Asc</button>
                      <select className="px-3 py-1 text-xs bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-lg border-none">
                        <option>Liste</option>
                        <option>Tümü</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    {/* Note 1 */}
                    <div className="bg-[hsl(var(--muted))] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 text-xs bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded">💼 İş</span>
                        <span className="px-2 py-0.5 text-xs bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded">💡 Fikir</span>
                      </div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Yeni proje için kullanıcı arayüzü tasarımı üzerinde çalışmayı unutma. Renk paletini modern ve minimal tutmak önemli.</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">Bugün 09:15</p>
                    </div>

                    {/* Note 2 */}
                    <div className="bg-[hsl(var(--muted))] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 text-xs bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded">🎓 Eğitim</span>
                        <span className="px-2 py-0.5 text-xs bg-[hsl(var(--background))] text-[hsl(var(--foreground))] rounded">📚 Kitap</span>
                      </div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">React ve TypeScript hakkında yeni kurs izlemeye devam et. Bugün 3. bölümü tamamladım, hook'lar çok ilginç.</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">Dün 18:45</p>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="flex gap-2 pt-4 border-t border-[hsl(var(--border))]">
                  <input 
                    type="text" 
                    placeholder="Yeni not ekle veya sesli görev yarat..."
                    className="flex-1 px-4 py-3 bg-[hsl(var(--input))] text-[hsl(var(--foreground))] rounded-lg border border-[hsl(var(--border))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))]" 
                  />
                  <button className="px-4 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold hover:bg-[hsl(var(--primary)_/_0.9)] transition-colors flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    Ekle
                  </button>
                  <button className="px-4 py-3 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-lg hover:bg-[hsl(var(--muted)_/_0.8)] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Floating elements around preview */}
            <div className="absolute -top-4 -left-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-bounce flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              Sesli
            </div>
            <div className="absolute -top-4 -right-4 bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-bounce flex items-center gap-2" style={{ animationDelay: '0.5s' }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z" />
                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
              </svg>
              AI
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-bounce flex items-center gap-2" style={{ animationDelay: '1s' }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              Hızlı
            </div>
          </div>
        </div>
        
        {/* Stats/Benefits Bar */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 transform transition-all duration-1000 delay-600 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl border-2 border-[var(--accent-color-300)] dark:border-[var(--accent-color-700)] shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-10 h-10 text-[var(--accent-color-600)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-3xl font-black text-[var(--accent-color-600)]">100%</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Yerel & Güvenli</p>
          </div>
          <div className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl border-2 border-purple-300 dark:border-purple-700 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-10 h-10 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z" />
                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Yapay Zeka Destekli</p>
          </div>
          <div className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl border-2 border-pink-300 dark:border-pink-700 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-10 h-10 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Sesli Komut Desteği</p>
          </div>
        </div>

        {/* CTA Buttons - SOLID RENKLER */}
        <div className={`flex flex-col sm:flex-row items-center justify-center gap-6 transform transition-all duration-1000 delay-700 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center gap-3 px-12 py-6 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)_/_0.9)] text-[hsl(var(--primary-foreground))] text-xl font-bold rounded-2xl glow-primary hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
          >
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <span>Hemen Başla</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <a
            href="https://github.com/yavuzobuz/EchoDay/releases/download/v1.0.0/Sesli.Gunluk.Planlayici.exe"
            className="group inline-flex items-center gap-3 px-12 py-6 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-xl font-bold rounded-2xl shadow-2xl hover:shadow-gray-700/50 transition-all duration-300 transform hover:scale-105 border-2 border-gray-700 dark:border-gray-600 hover:border-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Windows İçin İndir</span>
            <span className="text-sm font-normal opacity-75">(201 MB)</span>
          </a>
        </div>

        <div className={`mt-8 flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400 transform transition-all duration-1000 delay-800 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
            </svg>
            Windows, macOS ve Linux için mevcut
          </span>
          <span className="text-gray-400">|</span>
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Tamamen ücretsiz ve açık kaynak
          </span>
        </div>
      </div>
    </div>
  );
};

export default Welcome;