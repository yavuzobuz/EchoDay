import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.echoday.assistant',
  appName: 'EchoDay',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true, // Development için gerekli
    allowNavigation: [
      'https://*.supabase.co',
      'https://*.googleapis.com',
      'https://*.google.com'
    ]
  },
  plugins: {
    SpeechRecognition: {
      locale: 'tr-TR',
      prompt: 'Size nasıl yardımcı olabilirim?',
      partialResults: true,
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
    Geolocation: {
      permissions: ['location'],
    },
    Clipboard: {
      // Native clipboard kullanımı için
    },
    // Native performans iyileştirmeleri
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a1a',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a1a',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Production için false
    buildOptions: {
      // Signing bilgileri gradle.properties'den alınır
      // keystorePath, keystoreAlias, keystorePassword environment variables'dan okunmalı
      releaseType: 'APK'
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
};

export default config;
