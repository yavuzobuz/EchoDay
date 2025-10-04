import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smarttodo.assistant',
  appName: 'Sesli Asistan',
  webDir: 'dist',
  plugins: {
    SpeechRecognition: {
      locale: 'tr-TR',
      prompt: 'Size nasıl yardımcı olabilirim?',
      partialResults: true,
    },
  },
};

export default config;
