import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

interface MobileOptimizationState {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isNative: boolean;
  screenWidth: number;
  screenHeight: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export const useMobileOptimization = () => {
  const [state, setState] = useState<MobileOptimizationState>({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isNative: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  // Cihaz tespiti
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isNative = Capacitor.isNativePlatform();
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (Capacitor.getPlatform() === 'ios');
    const isAndroid = /Android/.test(userAgent) || (Capacitor.getPlatform() === 'android');
    const isMobile = isNative || /Mobi|Android/i.test(userAgent);

    setState(prev => ({
      ...prev,
      isMobile,
      isIOS,
      isAndroid,
      isNative,
    }));

    // Native platform için özel ayarlar
    if (isNative) {
      initNativeFeatures(isIOS, isAndroid);
    }
  }, []);

  // Ekran boyutu değişikliklerini izle
  useEffect(() => {
    const handleResize = () => {
      setState(prev => ({
        ...prev,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      }));
      
      // Viewport height ayarı (mobil keyboard için)
      if (state.isMobile) {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // İlk çalıştırma
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [state.isMobile]);

  // Safe area insets hesaplama (iOS için)
  useEffect(() => {
    if (state.isIOS) {
      const updateSafeArea = () => {
        const computedStyle = getComputedStyle(document.documentElement);
        const top = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0');
        const bottom = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0');
        const left = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0');
        const right = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0');

        setState(prev => ({
          ...prev,
          safeAreaInsets: { top, bottom, left, right },
        }));
      };

      updateSafeArea();
      window.addEventListener('orientationchange', updateSafeArea);
      
      return () => window.removeEventListener('orientationchange', updateSafeArea);
    }
  }, [state.isIOS]);

  // Native özellikler initialization
  const initNativeFeatures = async (isIOS: boolean, isAndroid: boolean) => {
    try {
      // Status bar ayarları
      if (isIOS) {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#1a1a1a' });
      } else if (isAndroid) {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
      }

      // Splash screen'i gizle
      await SplashScreen.hide();
    } catch (error) {
      console.warn('[MobileOptimization] Native features initialization failed:', error);
    }
  };

  // Haptic feedback
  const triggerHapticFeedback = useCallback(async (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (state.isNative) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        let style = ImpactStyle.Light;
        
        switch (type) {
          case 'medium':
            style = ImpactStyle.Medium;
            break;
          case 'heavy':
            style = ImpactStyle.Heavy;
            break;
        }
        
        await Haptics.impact({ style });
      } catch (error) {
        console.warn('[MobileOptimization] Haptic feedback failed:', error);
      }
    } else {
      // Web için vibration API
      if ('vibrate' in navigator) {
        const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 40;
        navigator.vibrate(duration);
      }
    }
  }, [state.isNative]);

  // Status bar renk değiştirme
  const setStatusBarStyle = useCallback(async (style: 'light' | 'dark') => {
    if (state.isNative) {
      try {
        await StatusBar.setStyle({ 
          style: style === 'dark' ? Style.Dark : Style.Light 
        });
      } catch (error) {
        console.warn('[MobileOptimization] Status bar style change failed:', error);
      }
    }
  }, [state.isNative]);

  // Network durumu kontrolü
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Touch-friendly class adder
  const getTouchFriendlyClass = useCallback((baseClass: string = '') => {
    if (state.isMobile) {
      return `${baseClass} btn-touch-friendly haptic-light touch-manipulation`.trim();
    }
    return baseClass;
  }, [state.isMobile]);

  // Form input optimizasyonu
  const getMobileFormClass = useCallback((baseClass: string = '') => {
    if (state.isMobile) {
      return `${baseClass} mobile-form-input`.trim();
    }
    return baseClass;
  }, [state.isMobile]);

  return {
    ...state,
    isOnline,
    triggerHapticFeedback,
    setStatusBarStyle,
    getTouchFriendlyClass,
    getMobileFormClass,
    // Utility functions
    isTouchDevice: state.isMobile || ('ontouchstart' in window),
    isLandscape: state.screenWidth > state.screenHeight,
    isSmallScreen: state.screenWidth < 768,
    isVerySmallScreen: state.screenWidth < 400,
  };
};

export default useMobileOptimization;