import React, { useState, useEffect } from 'react';
import Logo from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

interface WelcomeProps {
  onGetStarted: () => void;
  onNavigateToAuth?: () => void;
  isFirstRun?: boolean;
  onFinishOnboarding?: () => void;
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


const Welcome: React.FC<WelcomeProps> = ({ onGetStarted, onNavigateToAuth, isFirstRun = false, onFinishOnboarding }) => {
  const { t, lang, setLang } = useI18n();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded] = useState(true); // Instantly visible
  const [currentScene, setCurrentScene] = useState(0);
  const scenes = 4; // Total scenes
  
  // Routing and auth
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // OS detection and direct download links
  const getOS = () => {
    try {
      const platform = (navigator?.platform || '').toLowerCase();
      const ua = (navigator?.userAgent || '').toLowerCase();
      if (platform.includes('win')) return 'windows';
      if (platform.includes('mac')) return 'mac';
      if (platform.includes('linux')) return 'linux';
      if (/android/.test(ua)) return 'android';
      if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    } catch (_) {}
    return 'windows';
  };

  const os = getOS();

  const downloadLinks = {
    windows: 'https://github.com/yavuzobuz/EchoDay/releases/download/v1.0.0/EchoDay-Windows-Portable-1.0.0.zip',
    mac: 'https://github.com/yavuzobuz/EchoDay/releases/download/v1.0.0/SesliGunlukPlanlayici_macOS.dmg',
    linux: 'https://github.com/yavuzobuz/EchoDay/releases/download/v1.0.0/SesliGunlukPlanlayici_Linux.AppImage',
    android: 'https://github.com/yavuzobuz/EchoDay/releases/download/v1.0.0/EchoDay-Android-Debug-1.0.0.apk',
  } as const;

  const primaryDownloadHref = os === 'mac' ? downloadLinks.mac : os === 'linux' ? downloadLinks.linux : os === 'android' ? downloadLinks.android : downloadLinks.windows;
  const primaryLabel = os === 'mac' ? t('welcome.downloadLabel.mac', 'macOS için İndir') : os === 'linux' ? t('welcome.downloadLabel.linux', 'Linux için İndir') : os === 'android' ? t('welcome.downloadLabel.android', 'Android için İndir (APK)') : t('welcome.downloadLabel.windows', 'Windows için İndir');
  

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Auto scene change - Every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % scenes);
    }, 5000); // 5000ms = 5 seconds

    return () => clearInterval(interval);
  }, [scenes]);

  const nextScene = () => {
    setCurrentScene((prev) => (prev + 1) % scenes);
  };

  const prevScene = () => {
    setCurrentScene((prev) => (prev - 1 + scenes) % scenes);
  };
  
  // Quick start button under logo: go to /app if already signed in, else go to auth/start
  const handleQuickStart = () => {
    if (user) {
      navigate('/app');
    } else if (onNavigateToAuth) {
      onNavigateToAuth();
    } else {
      onGetStarted();
    }
  };
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[hsl(var(--gradient-from))] via-[hsl(var(--gradient-via))] to-[hsl(var(--gradient-to))] text-[hsl(var(--foreground))] p-4 sm:p-6 lg:p-8 transition-colors duration-300 overflow-x-hidden relative">
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
      
      <div className="text-center max-w-7xl mx-auto relative z-10 w-full px-2 sm:px-4 break-words">
        {/* Top Navigation Bar - Magical Glassmorphic Design */}
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left side - Logo & Navigation Links */}
            <div className="flex items-center gap-8">
              {/* Mini Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/20 dark:border-gray-700/50">
                  <Logo className="w-6 h-6" />
                </div>
                <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent">EchoDay</span>
              </div>
              
              {/* Navigation Pills */}
              <nav className="hidden md:flex items-center bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl rounded-full p-1 border border-white/20 dark:border-gray-700/50">
                <button
                  onClick={() => {
                    const element = document.getElementById('new-features');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="group px-5 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300 relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {t('welcome.nav.features', 'Özellikler')}
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))]/20 to-[hsl(var(--accent))]/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
                
                <button
                  onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group px-5 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300 relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('welcome.nav.about', 'Hakkında')}
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))]/20 to-[hsl(var(--accent))]/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
                
                <button
                  onClick={() => navigate('/faq')}
                  className="group px-5 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300 relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('welcome.nav.faq', 'SSS')}
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))]/20 to-[hsl(var(--accent))]/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
              </nav>
              
              {/* Mobile Menu Button */}
              <button className="md:hidden p-2 rounded-lg bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {/* Right side - Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <button
                onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl rounded-xl border border-white/20 dark:border-gray-700/50 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300"
                title={lang === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {lang === 'tr' ? 'EN' : 'TR'}
                </span>
              </button>
              
              {/* Pricing Button with Glow Effect */}
              <button
                onClick={() => navigate('/pricing')}
                className="group relative px-5 py-2.5 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white rounded-xl font-semibold shadow-lg shadow-[hsl(var(--primary))]/25 hover:shadow-xl hover:shadow-[hsl(var(--primary))]/30 transition-all duration-300 hover:scale-105"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">{t('welcome.pricing', 'Fiyatlandırma')}</span>
                  <span className="sm:hidden">Pro</span>
                </span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Logo with pulse animation - BÜYÜTÜLDÜ - Preloaded */}
        <div className="inline-block p-8 bg-[hsl(var(--card))]/80 backdrop-blur-lg rounded-3xl mb-8 mt-20 glow-primary transform scale-100 opacity-100 rotate-0 transition-all duration-300">
          <img 
            src="/app-icon.png" 
            alt="EchoDay logo" 
            className="w-32 h-32 animate-pulse"
            loading="eager"
            fetchpriority="high"
            decoding="async"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== '/icon-512.svg') {
                target.src = '/icon-512.svg';
              }
            }}
          />
        </div>
        
        {/* Auth link */}
        <div className={`mb-3 transform transition-all duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}>
          {onNavigateToAuth && (
            <button
              onClick={handleQuickStart}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--accent))] text-white font-semibold shadow hover:shadow-md hover:bg-[hsl(var(--accent)_/_0.9)] transition-all"
              title={t('welcome.getStartedTitle', 'Hemen Başla')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5m5 5H3" /></svg>
              {t('welcome.getStartedButton', 'Hemen Başla')}
            </button>
          )}
        </div>

        {/* Main Title with gradient animation */}
        <h1 className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-4 gradient-text animate-gradient-x transform transition-all duration-1000 break-words hyphens-auto ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          EchoDay
        </h1>
        
        {/* Subtitle with typing effect feel */}
        <div className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4 transform transition-all duration-1000 delay-200 px-4 break-words ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <svg className="w-6 h-6 sm:w-10 sm:h-10 text-[hsl(var(--accent))] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <p className="text-xl sm:text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] break-words">
            {t('welcome.tagline','Echo of Your Day')}
          </p>
        </div>
        
        {/* Description with fade in */}
        <p className={`text-lg md:text-xl text-[hsl(var(--muted-foreground))] mb-12 max-w-3xl mx-auto leading-relaxed transform transition-all duration-1000 delay-300 break-words hyphens-auto ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          {t('welcome.heroDescription','Boost your productivity with AI-powered voice commands, smart suggestions, and powerful analysis features.')}
        </p>

        {/* Features Grid with stagger animation */}
        <div id="features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-16 scroll-mt-20">
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
            title={t('welcome.feature1.title','Voice Management')}
            delay={100}
          >
            {t('welcome.feature1.desc','Add your tasks and notes with voice commands, chat with your AI assistant.')}
          </Feature>
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
            title={t('welcome.feature2.title','Smart Analysis')}
            delay={200}
          >
            {t('welcome.feature2.desc','AI automatically extracts details like date, priority, and location.')}
          </Feature>
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            title={t('welcome.feature3.title','Task from Image')}
            delay={300}
          >
            {t('welcome.feature3.desc','Create tasks instantly from invoices, calendars, or handwritten notes.')}
          </Feature>
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
            title={t('welcome.feature4.title','Proactive Suggestions')}
            delay={400}
          >
            {t('welcome.feature4.desc','AI learns your habits and offers personalized suggestions.')}
          </Feature>
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
            title={t('welcome.feature5.title','Task from PDF')}
            delay={500}
          >
            {t('welcome.feature5.desc','Upload your PDF documents, AI automatically extracts tasks and notes - Multilingual support!')}
          </Feature>
        </div>
        
        {/* App Preview Mockup - 3 SAHNE */}
        <div className={`mb-16 transform transition-all duration-1000 delay-500 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
            <div className="relative max-w-6xl mx-auto w-full overflow-hidden">
            {/* Navigation Arrows */}
            <button 
              onClick={prevScene}
              className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 p-3 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] rounded-full shadow-lg transition-colors z-10"
              aria-label={t('welcome.scenes.prev', 'Önceki sahne')}
            >
              <svg className="w-6 h-6 text-[hsl(var(--foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button 
              onClick={nextScene}
              className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 p-3 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] rounded-full shadow-lg transition-colors z-10"
              aria-label={t('welcome.scenes.next', 'Sonraki sahne')}
            >
              <svg className="w-6 h-6 text-[hsl(var(--foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
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
              
              {/* App Content - Sahneler */}
              <div className="p-6 space-y-6 min-h-[600px]">
                {/* SAHNE 1: Ana Ekran */}
                {currentScene === 0 && (
                  <>
                {/* Top Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sesli Görev Ekle Card */}
                  <div className="bg-[hsl(var(--muted))] rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[hsl(var(--muted)_/_0.8)] transition-colors">
                    <div className="w-14 h-14 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                      <svg className="w-7 h-7 text-[hsl(var(--primary-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-[hsl(var(--foreground))] mb-1">{t('welcome.mockup.voiceTask','Voice Task')}</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.mockup.voiceTaskDesc','Add quickly with voice command')}</p>
                    </div>
                  </div>

                  {/* AI Sohbet Card */}
                  <div className="bg-[hsl(var(--muted))] rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[hsl(var(--muted)_/_0.8)] transition-colors">
                    <div className="w-14 h-14 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center">
                      <svg className="w-7 h-7 text-[hsl(var(--accent-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-[hsl(var(--foreground))] mb-1">{t('welcome.mockup.aiChat','AI Chat')}</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.mockup.aiChatDesc','Chat with your assistant.')}</p>
                    </div>
                  </div>

                  {/* Resimle Card */}
                  <div className="bg-[hsl(var(--muted))] rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[hsl(var(--muted)_/_0.8)] transition-colors">
                    <div className="w-14 h-14 rounded-full bg-[hsl(var(--destructive))] flex items-center justify-center">
                      <svg className="w-7 h-7 text-[hsl(var(--destructive-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-[hsl(var(--foreground))] mb-1">{t('welcome.mockup.fromImage','From Image')}</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.mockup.fromImageDesc','Create task from photo automatically')}</p>
                    </div>
                  </div>
                </div>

                {/* Görevlerim Section - Sadece Task 1 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                      ⭐ {t('welcome.mockup.myTasks','My Tasks')}
                      <span className="text-xs bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-2 py-0.5 rounded-full">{t('welcome.mockup.today','Today')}</span>
                    </h2>
                    <button className="text-sm text-[hsl(var(--primary))] font-semibold flex items-center gap-1">
                      {t('welcome.mockup.list','List')} 
                      <span className="text-xs">{t('welcome.mockup.timeline','Timeline')}</span>
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

                  </div>
                </div>
                  </>
                )}

                {/* SAHNE 2: AI Asistan Sohbet */}
                {currentScene === 1 && (
                  <>
                {/* Görevlerim Section - Task 2 görünür */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                      ⭐ {t('welcome.mockup.myTasks', 'Görevlerim')}
                      <span className="text-xs bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-2 py-0.5 rounded-full">{t('welcome.mockup.today', 'Bugün')}</span>
                    </h2>
                  </div>

                  {/* Task Items */}
                  <div className="space-y-2">
                    {/* Task 2 - AI Asistan ile eklenen */}
                    <div className="bg-[hsl(var(--muted))] rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1 w-4 h-4 rounded" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-[hsl(var(--foreground))]">hastane randevusu saat 12.35'te boğaz kontrolü diş kontrolü için hastaneye gidilecek</h3>
                          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Zaman: 6 Eki 2025 12:35</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="p-1 hover:bg-[hsl(var(--background))] rounded" title="Paylaş">
                            <svg className="w-4 h-4 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                          </button>
                          <button className="p-1 hover:bg-[hsl(var(--background))] rounded" title="Düzenle">
                            <svg className="w-4 h-4 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button className="p-1 hover:bg-[hsl(var(--background))] rounded" title="Sil">
                            <svg className="w-4 h-4 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Task 3 */}
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

                {/* AI Asistan Sohbet Section - SAHNE 2 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                      🤖 {t('welcome.mockup.aiAssistant','AI Assistant')}
                    </h2>
                    <button className="p-1 hover:bg-[hsl(var(--muted))] rounded" title={t('welcome.mockup.close','Close')}>
                      <svg className="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  {/* Chat Messages */}
                  <div className="space-y-3">
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                        <p className="text-sm">hastane randevusu saat 12.35'te boğaz kontrolü diş kontrolü için hastaneye gidilecek</p>
                      </div>
                    </div>

                    {/* AI Response */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[hsl(var(--accent-foreground))]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 7H7v6h6V7z" />
                          <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="bg-[hsl(var(--muted))] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] break-words">
                        <p className="text-sm text-[hsl(var(--foreground))]">"Hastane randevusu - 12:35 boğaz ve diş kontrolü" görevi başarıyla listeye eklendi.</p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-[hsl(var(--border))]">
                    <input 
                      type="text" 
                      placeholder={t('welcome.mockup.typePlaceholder','Type your message...')}
                      className="w-full px-4 py-2 bg-[hsl(var(--input))] text-[hsl(var(--foreground))] rounded-lg border border-[hsl(var(--border))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))] text-sm" 
                    />
                    <div className="flex gap-2">
                      <button className="flex-1 sm:flex-none p-2 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-lg hover:bg-[hsl(var(--muted)_/_0.8)] transition-colors flex items-center justify-center gap-2" title={t('welcome.mockup.voiceMessage','Voice message')}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        <span className="text-xs sm:hidden">Sesli</span>
                      </button>
                      <button className="flex-1 sm:flex-none p-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)_/_0.9)] transition-colors flex items-center justify-center gap-2" title={t('welcome.mockup.send','Send')}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-xs sm:hidden">Gönder</span>
                      </button>
                    </div>
                  </div>
                </div>

                  </>
                )}

                {/* SAHNE 3: Not Defteri */}
                {currentScene === 2 && (
                  <>
                {/* AI Asistan Sohbet Section - Kapatılmış */}
                <div className="space-y-3" style={{ display: 'none' }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                      🤖 {t('welcome.mockup.aiAssistant', 'AI Asistan')}
                    </h2>
                    <button className="p-1 hover:bg-[hsl(var(--muted))] rounded" title={t('welcome.mockup.close', 'Kapat')}>
                      <svg className="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  {/* Chat Messages */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                        <p className="text-sm">hastane randevusu saat 12.35'te boğaz kontrolü diş kontrolü için hastaneye gidilecek</p>
                      </div>
                    </div>

                    {/* AI Response */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[hsl(var(--accent-foreground))]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 7H7v6h6V7z" />
                          <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="bg-[hsl(var(--muted))] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] break-words">
                        <p className="text-sm text-[hsl(var(--foreground))]">"Hastane randevusu - 12:35 boğaz ve diş kontrolü" görevi başarıyla listeye eklendi.</p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))]">
                    <input 
                      type="text" 
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 px-4 py-2 bg-[hsl(var(--input))] text-[hsl(var(--foreground))] rounded-lg border border-[hsl(var(--border))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))] text-sm" 
                    />
                    <button className="p-2 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-lg hover:bg-[hsl(var(--muted)_/_0.8)] transition-colors" title="Sesli mesaj">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                    <button className="p-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)_/_0.9)] transition-colors" title="Gönder">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                  </div>
                </div>

                {/* Günlük Not Defterim Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                      📝 {t('welcome.mockup.myNotepad','My Daily Notepad')}
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
                  <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-[hsl(var(--border))]">
                  <input 
                    type="text" 
                    placeholder={t('welcome.mockup.newNotePlaceholder','Add a new note or create voice task...')}
                    className="flex-1 px-4 py-3 bg-[hsl(var(--input))] text-[hsl(var(--foreground))] rounded-lg border border-[hsl(var(--border))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] placeholder:text-[hsl(var(--muted-foreground))]" 
                  />
                  <button className="px-4 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold hover:bg-[hsl(var(--primary)_/_0.9)] transition-colors flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    {t('welcome.mockup.add','Add')}
                  </button>
                  <button className="px-4 py-3 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-lg hover:bg-[hsl(var(--muted)_/_0.8)] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                </div>
                  </>
                )}

                {/* SAHNE 4: PDF Analizi */}
                {currentScene === 3 && (
                  <>
                {/* PDF Upload Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                      📝 {t('welcome.mockup.pdfAnalysis','PDF Analysis')}
                      <span className="text-xs bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white px-3 py-1 rounded-full animate-pulse">{t('welcome.mockup.new','NEW!')}</span>
                    </h2>
                  </div>

                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-8 bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/50 transition-colors">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-2">{t('welcome.mockup.uploadPdf','Upload Your PDF Document')}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">{t('welcome.mockup.pdfDesc','Court summons, invoices, meeting notes... AI will analyze automatically!')}</p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          {t('welcome.mockup.selectPdf','Select PDF')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Result */}
                  <div className="bg-gradient-to-r from-[hsl(var(--primary))]/10 to-[hsl(var(--accent))]/10 border border-[hsl(var(--primary))]/30 rounded-xl p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 7H7v6h6V7z" />
                          <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
<h3 className="text-lg font-bold text-[hsl(var(--foreground))]">Toplanti_Daveti_2024-11-15.pdf</h3>
                          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">✓ {t('welcome.mockup.analysisComplete','Analysis Complete')}</span>
                        </div>
<p className="text-sm text-[hsl(var(--muted-foreground))]">Belge Türü: <strong>Toplantı Daveti</strong> | Dil: <strong>Türkçe</strong></p>
                      </div>
                    </div>

                    {/* Extracted Tasks */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        3 {t('welcome.mockup.taskExtracted','Task Extracted')} (TR)
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-sm">
<div className="font-semibold text-[hsl(var(--foreground))] mb-1">• Toplantıya katıl</div>
<div className="text-[hsl(var(--muted-foreground))] text-xs">Toplantı Odası A - 15 Kasım 2024, 10:00</div>
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-sm">
<div className="font-semibold text-[hsl(var(--foreground))] mb-1">• Gündem maddelerini hazırla</div>
<div className="text-[hsl(var(--muted-foreground))] text-xs">Toplantı öncesi hazırlık - 14 Kasım 2024</div>
                      </div>

                      <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))] mt-3">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                        2 {t('welcome.mockup.noteAdded','Note Added')} (TR)
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-sm">
<div className="font-semibold text-[hsl(var(--foreground))] mb-1">Toplantı Bilgileri</div>
<div className="text-[hsl(var(--muted-foreground))] text-xs">Toplantı: Q4 Planlama | Yer: Toplantı Odası A</div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-[hsl(var(--primary))]/10 rounded-lg border border-[hsl(var(--primary))]/30">
                      <div className="flex items-center gap-2 text-xs text-[hsl(var(--foreground))]">
                        <svg className="w-4 h-4 text-[hsl(var(--primary))]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        <span><strong>{t('welcome.mockup.multilingualSupport','Multilingual Support: PDF can be in Turkish, English, German, or another language - AI responds in the same language!')}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Scene Indicator Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {[0, 1, 2, 3].map((scene) => (
                <button
                  key={scene}
                  onClick={() => setCurrentScene(scene)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    currentScene === scene 
                      ? 'bg-[hsl(var(--primary))] w-8' 
                      : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted-foreground))]'
                  }`}
                  aria-label={t('welcome.scenes.indicator', 'Sahne {number}').replace('{number}', (scene + 1).toString())}
                />
              ))}
            </div>
            
            {/* Floating elements around preview - Hidden on mobile */}
            <div className="hidden md:flex absolute -top-4 -left-4 bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg animate-bounce items-center gap-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              {t('welcome.badge.voice','Voice')}
            </div>
            <div className="hidden md:flex absolute -top-4 -right-4 bg-purple-500 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg animate-bounce items-center gap-2" style={{ animationDelay: '0.5s' }}>
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z" />
                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
              </svg>
              {t('welcome.badge.ai','AI')}
            </div>
            <div className="hidden md:flex absolute -bottom-4 left-1/2 -translate-x-1/2 bg-pink-500 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg animate-bounce items-center gap-2" style={{ animationDelay: '1s' }}>
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              {t('welcome.badge.fast','Fast')}
            </div>
          </div>
        </div>
        
        {/* Stats/Benefits Bar */}
        <div id="about" className={`grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 transform transition-all duration-1000 delay-600 scroll-mt-20 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl border-2 border-[var(--accent-color-300)] dark:border-[var(--accent-color-700)] shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-10 h-10 text-[var(--accent-color-600)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-3xl font-black text-[var(--accent-color-600)]">100%</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">{t('welcome.stats.secure', 'Yerel & Güvenli')}</p>
          </div>
          <div className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl border-2 border-purple-300 dark:border-purple-700 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-10 h-10 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z" />
                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">{t('welcome.stats.aiEnabled', 'Yapay Zeka Destekli')}</p>
          </div>
          <div className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl border-2 border-pink-300 dark:border-pink-700 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-10 h-10 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold">{t('welcome.stats.voiceCommands', 'Sesli Komut Desteği')}</p>
          </div>
        </div>

        {/* Sosyal Kanıt - Kullanıcı Yorumları ve İstatistikler */}
        <div className={`mb-16 transform transition-all duration-1000 delay-625 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[hsl(var(--foreground))] mb-8 text-center">
            {t('welcome.socialProof.title', 'Kullanıcılarımız Ne Diyor?')}
          </h3>
          
          {/* İstatistikler */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-[hsl(var(--border))]">
              <div className="text-3xl font-bold text-[hsl(var(--primary))]">5,000+</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.stats.activeUsers', 'Aktif Kullanıcı')}</div>
            </div>
            <div className="text-center p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-[hsl(var(--border))]">
              <div className="text-3xl font-bold text-[hsl(var(--accent))]">150K+</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.stats.tasksCreated', 'Oluşturulan Görev')}</div>
            </div>
            <div className="text-center p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-[hsl(var(--border))]">
              <div className="text-3xl font-bold text-emerald-600">4.8/5</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.stats.rating', 'Kullanıcı Puanı')}</div>
            </div>
            <div className="text-center p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-[hsl(var(--border))]">
              <div className="text-3xl font-bold text-purple-600">98%</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.stats.satisfaction', 'Memnuniyet')}</div>
            </div>
          </div>
          
          {/* Kullanıcı Yorumları Carousel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Yorum 1 */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 border border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-[hsl(var(--foreground))] mb-4 italic">
                "Sesli komutlarla görev eklemek hayatımı çok kolaylaştırdı. PDF'den otomatik görev çıkarma özelliği muhteşem!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  AY
                </div>
                <div>
                  <div className="font-semibold text-sm text-[hsl(var(--foreground))]">Ayşe Y.</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Proje Yöneticisi</div>
                </div>
              </div>
            </div>
            
            {/* Yorum 2 */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 border border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-[hsl(var(--foreground))] mb-4 italic">
                "AI asistan gerçekten akıllı! E-postalarımı analiz edip otomatik görev oluşturuyor. Zaman tasarrufu inanılmaz."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-bold">
                  MK
                </div>
                <div>
                  <div className="font-semibold text-sm text-[hsl(var(--foreground))]">Mehmet K.</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Yazılım Geliştirici</div>
                </div>
              </div>
            </div>
            
            {/* Yorum 3 */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 border border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(4)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <p className="text-sm text-[hsl(var(--foreground))] mb-4 italic">
                "Günlük özet ve hatırlatma özellikleri süper. Artık hiçbir şeyi unutmuyorum. Takvim entegrasyonu da çok pratik."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold">
                  ZD
                </div>
                <div>
                  <div className="font-semibold text-sm text-[hsl(var(--foreground))]">Zeynep D.</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Öğrenci</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Güven Rozetleri */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-full">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">{t('welcome.trust.verified', 'Doğrulanmış Kullanıcılar')}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{t('welcome.trust.privacy', 'Gizlilik Öncelikli')}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">{t('welcome.trust.performance', '7/24 Hızlı Performans')}</span>
            </div>
          </div>
        </div>

        {/* Yeni Özellikler - Commitlerden öne çıkanlar */}
        <div id="new-features" className={`mb-12 transform transition-all duration-1000 delay-650 scroll-mt-20 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-500 text-white text-xs">✓</span>
            {t('welcome.newFeaturesTitle', 'Yeni Özellikler')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Email → Görev/Not */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18a1 1 0 011 1v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a1 1 0 011-1zm0 2l9 6 9-6"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.emailTask.title', 'E-postadan Görev/Not')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.emailTask.desc', 'AI özet ve aksiyon maddeleri; tek tıkla Görev Oluştur/Notlara Ekle')}</div>
              </div>
            </div>
            {/* Email Yanıtlama */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4h4a7 7 0 000-14h-1v2h1a5 5 0 010 10h-4z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.emailReply.title', 'E-postaya Yanıtla')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.emailReply.desc', 'Zengin editör, şablonlar, ek dosyalar; Yanıtla/Tümünü yanıtla')}</div>
              </div>
            </div>
            {/* Real-time Voice Chat */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z"/><path d="M5 11a7 7 0 0014 0h-2a5 5 0 11-10 0H5z"/><path d="M11 18h2v3h-2v-3z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.realTimeVoice.title', 'Gerçek Zamanlı Sesli Sohbet')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.realTimeVoice.desc', 'Anahtar kelime dinleme ve anlık AI transkripsiyonla akıcı sohbet')}</div>
              </div>
            </div>
            {/* Yinelenen Görevler */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6v2a4 4 0 014 4h2a6 6 0 00-6-6zm-6 6H4a8 8 0 008 8v-2a6 6 0 01-6-6zm12 0a8 8 0 01-8 8v2a10 10 0 0010-10h-2zM6 12a6 6 0 016-6V4a8 8 0 00-8 8h2z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.recurringTasks.title', 'Yinelenen Görevler')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.recurringTasks.desc', 'Tamamlayınca bir sonraki oluşumu otomatik oluştur')}</div>
              </div>
            </div>
            {/* ICS Export */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2a1 1 0 012 0v2h6V2a1 1 0 112 0v2h1a2 2 0 012 2v2H4V6a2 2 0 012-2h1V2z"/><path d="M4 10h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.icsExport.title', 'ICS Dışa Aktarma')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.icsExport.desc', 'AI süre tahminiyle takvime ekleyin')}</div>
              </div>
            </div>
            {/* Zaman Çizelgesi + Gün Özeti */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zm1-6h-2v3h2V2zM4.22 5.64L2.8 7.06l2.12 2.12 1.42-1.42L4.22 5.64zM18.36 5.64l-1.42 1.42 2.12 2.12 1.42-1.42-2.12-2.12zM21 11h-3v2h3v-2zM6 13H3v-2h3v2zm1.78 5.36L6.36 19.2l-2.12 2.12 1.42 1.42 2.12-2.12zM19.78 19.78l-2.12-2.12-1.42 1.42 2.12 2.12 1.42-1.42z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.timelineDaily.title', 'Zaman Çizelgesi + Gün Özeti')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.timelineDaily.desc', 'Zaman bazlı görünüm ve günlük özet bildirimleri')}</div>
              </div>
            </div>
            {/* Supabase Sync */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3-3.582 3-8 3-8-1.343-8-3zm16 5c0 1.657-3.582 3-8 3s-8-1.343-8-3"/><path d="M4 17c0 1.657 3.582 3 8 3s8-1.343 8-3V7"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.supabaseSync.title', 'Supabase Senkronizasyonu')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.supabaseSync.desc', 'Kullanıcıya özel verilerle opsiyonel senk')}</div>
              </div>
            </div>
            {/* PDF Analysis Multilingual */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h8l5 5v13a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm8 7h5l-5-5v5z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.pdfAnalysisMult.title', 'PDF Analizi (Çok Dilli)')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.pdfAnalysisMult.desc', 'Belgelerden otomatik görev/not çıkarımı')}</div>
              </div>
            </div>
            {/* Konum + Yol Tarifi */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9a2 2 0 110-4 2 2 0 010 4z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.locationReminder.title', 'Konum Hatırlatıcı + Yol Tarifi')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.locationReminder.desc', 'Konuma bağlı tetikleyiciler ve AI yönlendirme')}</div>
              </div>
            </div>
            {/* Message Notifications */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4a2 2 0 00-2 2v13a2 2 0 002 2h3l4 3 4-3h5a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.messageNotifs.title', 'Mesaj Bildirimleri')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.messageNotifs.desc', 'Electron yerel bildirim + toast; geliştirilmiş konuşma başlığı')}</div>
              </div>
            </div>
            {/* Reminder Sounds */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 21h4a2 2 0 11-4 0zm10-5h-1V9a7 7 0 10-14 0v7H4v2h16v-2z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.reminderSounds.title', 'Hatırlatma Sesleri')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.reminderSounds.desc', 'TTS ve 3 farklı alarm seçeneği')}</div>
              </div>
            </div>
            {/* Android APK + OS Detection */}
            <div className="p-4 rounded-xl bg-[hsl(var(--card))]/80 border border-[hsl(var(--border))] shadow-sm hover:shadow-md hover:bg-[hsl(var(--card))] transition-all flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-500/10 text-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>
              </div>
              <div>
                <div className="font-semibold text-[hsl(var(--foreground))]">{t('welcome.feature.androidOS.title', 'Android APK + OS Algılama')}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">{t('welcome.feature.androidOS.desc', 'Cihaza uygun doğrudan indirme bağlantısı')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons - SOLID RENKLER */}
        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4 transform transition-all duration-1000 delay-700 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          {isFirstRun && onFinishOnboarding ? (
            <button
              onClick={onFinishOnboarding}
              className="group inline-flex items-center gap-2 sm:gap-3 px-8 sm:px-12 py-4 sm:py-6 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)_/_0.9)] text-[hsl(var(--primary-foreground))] text-lg sm:text-xl font-bold rounded-2xl glow-primary hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 w-full sm:w-auto"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{t('welcome.startButton', 'Başlayalım!')}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 sm:gap-3 px-8 sm:px-12 py-4 sm:py-6 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)_/_0.9)] text-[hsl(var(--primary-foreground))] text-lg sm:text-xl font-bold rounded-2xl glow-primary hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 w-full sm:w-auto"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span>{t('welcome.getStartedButton', 'Hemen Başla')}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}

          <a
            href={primaryDownloadHref}
            className="group inline-flex flex-col items-center gap-2 px-8 sm:px-12 py-4 sm:py-6 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-lg sm:text-xl font-bold rounded-2xl shadow-2xl hover:shadow-gray-700/50 transition-all duration-300 transform hover:scale-105 border-2 border-gray-700 dark:border-gray-600 hover:border-gray-600 w-full sm:w-auto"
            download
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{primaryLabel}</span>
            </div>
            <span className="text-xs font-normal opacity-75">{t('welcome.downloadDirectLabel', 'Doğrudan indirme')}</span>
          </a>
        </div>

        {/* Secondary direct links for all platforms */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 px-4">
          <a className="underline hover:opacity-80" href={downloadLinks.windows} download>
            Windows (.zip)
          </a>
          <span className="opacity-50">|</span>
          <a className="underline hover:opacity-80" href={downloadLinks.mac} download>
            macOS (.dmg)
          </a>
          <span className="opacity-50">|</span>
          <a className="underline hover:opacity-80" href={downloadLinks.linux} download>
            Linux (.AppImage)
          </a>
          <span className="opacity-50">|</span>
          <a className="underline hover:opacity-80 flex items-center gap-1" href={downloadLinks.android} download>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.6 10.81L16.19 9.4l-3.56 3.55V1h-2v11.95l-3.56-3.55L5.66 10.81 12 17.17l6.34-6.36M23 19v2H1v-2h22z"/></svg>
            Android (.apk)
          </a>
        </div>

        {/* QR Code for Android APK */}
        <div className={`mt-6 flex flex-col items-center justify-center gap-3 transform transition-all duration-1000 delay-850 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>
              {t('welcome.qrCode.title', 'Android APK - QR ile İndir')}
            </h3>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border-2 border-[hsl(var(--border))] shadow-lg hover:shadow-xl transition-shadow">
              <img 
                src="/android-apk-qr.png" 
                alt={t('welcome.qrCode.alt', 'Android APK QR Code')} 
                className="w-24 h-24 sm:w-32 sm:h-32"
              />
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 max-w-xs">
              {t('welcome.qrCode.description', 'Telefonunuzla QR kodu tarayarak APK dosyasını doğrudan indirin')}
            </p>
          </div>
        </div>

        <div className={`mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400 transform transition-all duration-1000 delay-800 px-4 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
            </svg>
            {t('welcome.availability', 'Windows, macOS ve Linux için mevcut')}
          </span>
          <span className="text-gray-400">|</span>
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            {t('welcome.freeOpen', 'Tamamen ücretsiz ve açık kaynak')}
          </span>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gradient-to-b from-transparent to-black/20 dark:to-black/40 border-t border-white/10 dark:border-gray-700/30 mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl shadow-lg">
                  <Logo className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent">
                    EchoDay
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('footer.tagline', 'Echo of Your Day')}</p>
                </div>
              </div>
              
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 leading-relaxed">
                {t('footer.description', 'AI destekli görev yönetimi ve günlük planlama asistanınız. Sesli komutlarla hayatınızı organize edin.')}
              </p>
              
              {/* Social Links */}
              <div className="flex items-center gap-2">
                <a href="https://github.com/echoday" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-gray-800/30 hover:dark:bg-gray-800/50 transition-all group" title="GitHub">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a href="https://twitter.com/echoday" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-gray-800/30 hover:dark:bg-gray-800/50 transition-all group" title="Twitter">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="https://discord.gg/echoday" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-gray-800/30 hover:dark:bg-gray-800/50 transition-all group" title="Discord">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                  </svg>
                </a>
                <a href="https://linkedin.com/company/echoday" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-gray-800/30 hover:dark:bg-gray-800/50 transition-all group" title="LinkedIn">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
                <a href="https://instagram.com/echoday" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-gray-800/30 hover:dark:bg-gray-800/50 transition-all group" title="Instagram">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] mb-6 uppercase tracking-wider">
                {t('footer.contactTitle', 'İletişim')}
              </h4>
              <div className="space-y-3">
                <a href="mailto:support@echoday.com" className="group flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--primary))]/20 transition-colors">
                    <svg className="w-4 h-4 text-[hsl(var(--primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span>support@echoday.com</span>
                </a>
                
                <a href="tel:+905555555555" className="group flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--primary))]/20 transition-colors">
                    <svg className="w-4 h-4 text-[hsl(var(--primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <span>+90 555 555 55 55</span>
                </a>
                
                <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[hsl(var(--primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span>{t('footer.address', 'İstanbul, Türkiye')}</span>
                </div>
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="lg:col-span-1">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] mb-6 uppercase tracking-wider">{t('footer.quickLinks', 'Hızlı Bağlantılar')}</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => navigate('/')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.home', 'Ana Sayfa')}
                  </button>
                </li>
                <li>
                  <button onClick={() => {
                    const element = document.getElementById('new-features');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.features', 'Özellikler')}
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/pricing')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.pricing', 'Fiyatlandırma')}
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/faq')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.faq', 'SSS')}
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/app')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.app', 'Uygulamayı Başlat')}
                  </button>
                </li>
                <li>
                  <a href="https://github.com/echoday/docs" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.docs', 'Dokümantasyon')}
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Support & Legal */}
            <div className="lg:col-span-1">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] mb-6 uppercase tracking-wider">{t('footer.support', 'Destek & Yasal')}</h4>
              <ul className="space-y-3">
                <li>
                  <a href="mailto:support@echoday.com" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.contact', 'İletişim')}
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.privacy', 'Gizlilik Politikası')}
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.terms', 'Kullanım Koşulları')}
                  </a>
                </li>
                <li>
                  <a href="/cookies" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.cookies', 'Çerez Politikası')}
                  </a>
                </li>
                <li>
                  <a href="/sitemap" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.sitemap', 'Site Haritası')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Newsletter Section */}
          <div className="mt-12 pt-8 border-t border-white/10 dark:border-gray-700/30">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-xl font-bold text-[hsl(var(--foreground))] mb-2">
                {t('footer.newsletter.title', 'Yeniliklerden Haberdar Olun!')}
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] mb-6">
                {t('footer.newsletter.desc', 'Yeni özellikler ve güncellemelerden ilk siz haberdar olun.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder={t('footer.newsletter.placeholder', 'E-posta adresiniz')}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
                <button className="px-6 py-3 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  {t('footer.newsletter.button', 'Abone Ol')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/10 dark:border-gray-700/30 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                © 2024 EchoDay. {t('footer.rights', 'Tüm hakları saklıdır.')}
              </p>
              <div className="flex items-center gap-6">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  {t('footer.madeWith', 'Made with')} ❤️ {t('footer.in', 'in')} İstanbul
                </span>
                <div className="flex items-center gap-2">
                  <img src="/turkey-flag.svg" alt="Turkey" className="w-5 h-5" />
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t('footer.country', 'Türkiye')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;