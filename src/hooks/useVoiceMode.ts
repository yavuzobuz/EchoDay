import { useState, useEffect, useCallback } from 'react';

interface VoiceModeConfig {
  enabledByDefault?: boolean;
  autoStartListening?: boolean;
  speechRate?: number;
  speechPitch?: number;
  speechVolume?: number;
}

export const useVoiceMode = (config?: VoiceModeConfig) => {
  const [isVoiceModeSupported, setIsVoiceModeSupported] = useState(false);
  const [voiceModeError, setVoiceModeError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check browser support
  useEffect(() => {
    const checkSupport = async () => {
      try {
        setVoiceModeError(null);
        
        // Check Speech Recognition support
        const SpeechRecognition = 
          (window as any).SpeechRecognition || 
          (window as any).webkitSpeechRecognition ||
          (window as any).mozSpeechRecognition ||
          (window as any).msSpeechRecognition;

        // Check Speech Synthesis support
        const hasSpeechSynthesis = 'speechSynthesis' in window;

        if (!SpeechRecognition) {
          throw new Error('Speech Recognition API desteklenmiyor. Lütfen Chrome, Edge veya Safari kullanın.');
        }

        if (!hasSpeechSynthesis) {
          throw new Error('Speech Synthesis API desteklenmiyor. Lütfen tarayıcınızı güncelleyin.');
        }

        // Check microphone permissions
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (permissionError) {
            console.warn('Mikrofon izni alınamadı:', permissionError);
            // Don't throw error here as speech recognition might still work
          }
        }

        // Wait for voices to load
        if (hasSpeechSynthesis) {
          const waitForVoices = () => {
            return new Promise<void>((resolve) => {
              const voices = speechSynthesis.getVoices();
              if (voices.length > 0) {
                resolve();
              } else {
                speechSynthesis.onvoiceschanged = () => {
                  resolve();
                  speechSynthesis.onvoiceschanged = null;
                };
              }
            });
          };

          await waitForVoices();
        }

        setIsVoiceModeSupported(true);
      } catch (error) {
        console.error('Sesli mod başlatma hatası:', error);
        setVoiceModeError(error instanceof Error ? error.message : 'Bilinmeyen hata oluştu');
        setIsVoiceModeSupported(false);
      } finally {
        setIsInitialized(true);
      }
    };

    checkSupport();
  }, []);

  // Get browser-specific recommendations
  const getBrowserRecommendations = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome')) {
      return {
        browser: 'Chrome',
        recommendations: [
          'Mikrofonunuza izin verdiğinizden emin olun',
          'HTTPS bağlantısı kullandığınızdan emin olun',
          'Tarayıcınızı güncel tutun'
        ]
      };
    } else if (userAgent.includes('safari')) {
      return {
        browser: 'Safari',
        recommendations: [
          'Safari 14.1+ kullandığınızdan emin olun',
          'Mikrofon izinlerini kontrol edin',
          'Site ayarlarında ses izinlerini aktif edin'
        ]
      };
    } else if (userAgent.includes('edge')) {
      return {
        browser: 'Edge',
        recommendations: [
          'Microsoft Edge 79+ kullanın',
          'Mikrofon izinlerini kontrol edin',
          'Windows ses ayarlarını kontrol edin'
        ]
      };
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        recommendations: [
          'Firefox sesli özellikleri sınırlı destekler',
          'Chrome veya Edge tarayıcı kullanmanızı öneririz',
          'Mikrofon izinlerini kontrol edin'
        ]
      };
    }
    
    return {
      browser: 'Bilinmeyen',
      recommendations: [
        'Chrome, Safari veya Edge tarayıcı kullanın',
        'Tarayıcınızı güncel tutun',
        'Mikrofon izinlerini kontrol edin'
      ]
    };
  }, []);

  // Test voice functionality
  const testVoiceMode = useCallback(async () => {
    if (!isVoiceModeSupported) {
      throw new Error('Sesli mod desteklenmiyor');
    }

    try {
      // Test speech synthesis
      const utterance = new SpeechSynthesisUtterance('Test mesajı');
      utterance.volume = config?.speechVolume || 0.5;
      utterance.rate = config?.speechRate || 1.0;
      utterance.pitch = config?.speechPitch || 1.0;
      
      return new Promise<boolean>((resolve, reject) => {
        utterance.onend = () => resolve(true);
        utterance.onerror = (event) => reject(new Error(`Ses sentezi hatası: ${event.error}`));
        
        speechSynthesis.speak(utterance);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          speechSynthesis.cancel();
          reject(new Error('Ses testi zaman aşımına uğradı'));
        }, 5000);
      });
    } catch (error) {
      throw new Error(`Sesli mod testi başarısız: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  }, [isVoiceModeSupported, config]);

  // Get voice configuration
  const getOptimalVoiceConfig = useCallback(() => {
    if (!isVoiceModeSupported) return null;

    const voices = speechSynthesis.getVoices();
    const turkishVoice = voices.find(voice => 
      voice.lang.includes('tr') || voice.lang.includes('TR')
    );

    return {
      voice: turkishVoice || voices[0] || null,
      rate: config?.speechRate || 1.0,
      pitch: config?.speechPitch || 1.0,
      volume: config?.speechVolume || 1.0,
      lang: 'tr-TR'
    };
  }, [isVoiceModeSupported, config]);

  return {
    isVoiceModeSupported,
    voiceModeError,
    isInitialized,
    getBrowserRecommendations,
    testVoiceMode,
    getOptimalVoiceConfig
  };
};