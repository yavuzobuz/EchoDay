import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useI18n } from '../contexts/I18nContext';

export interface TTSSettings {
  enabled: boolean;
  rate: number; // 0.1 - 2.0, default 1.0
  pitch: number; // 0.0 - 2.0, default 1.0
  volume: number; // 0.0 - 1.0, default 1.0
  voice?: string; // Voice name
}

const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: true,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

const loadTTSSettings = (): TTSSettings => {
  try {
    const raw = localStorage.getItem('tts-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_TTS_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load TTS settings:', e);
  }
  return DEFAULT_TTS_SETTINGS;
};

const saveTTSSettings = (settings: TTSSettings) => {
  try {
    localStorage.setItem('tts-settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save TTS settings:', e);
  }
};

export const useTextToSpeech = () => {
  const { lang } = useI18n();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [settings, setSettings] = useState<TTSSettings>(loadTTSSettings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const hasSupport = !!synth;

  // Load available voices filtered by current language
  useEffect(() => {
    if (!hasSupport || !synth) return;
    
    const loadVoices = () => {
      const voices = synth.getVoices();
      // Filter voices by current language (tr or en)
      const langPrefix = lang === 'tr' ? 'tr' : 'en';
      const filteredVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
      setAvailableVoices(filteredVoices.length > 0 ? filteredVoices : voices);
    };
    
    loadVoices();
    
    // Chrome loads voices asynchronously
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }, [hasSupport, synth, lang]);

  const updateSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveTTSSettings(updated);
      return updated;
    });
  }, []);

  const speak = useCallback(async (text: string, customSettings?: Partial<TTSSettings>) => {
    if (!hasSupport || !text) return;
    if (!settings.enabled && !customSettings?.enabled) return;

    const isWeb = Capacitor.getPlatform() === 'web';

    // Cancel any ongoing speech
    if (isWeb && synth?.speaking) {
      synth.cancel();
    } else if (!isWeb) {
      try {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        await TextToSpeech.stop();
      } catch (e) {}
    }

    // Clean text for better speech
    const cleanedText = text
      .replace(/<table[\s\S]*?<\/table>/gm, ' Tablo içeriği sesli okuma için atlandı. ')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/•/g, '. ')
      .replace(/\n+/g, '. ')
      .replace(/\s\s+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1. $2') // Add pause between camelCase
      .trim();

    if (!cleanedText) return;

    const finalSettings = { ...settings, ...customSettings };
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    
    // Set language based on i18n context
    utterance.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
    utterance.rate = finalSettings.rate;
    utterance.pitch = finalSettings.pitch;
    utterance.volume = finalSettings.volume;
    
    // Set voice if specified, otherwise use best match for current language
    if (finalSettings.voice && availableVoices.length > 0) {
      const selectedVoice = availableVoices.find(v => v.name === finalSettings.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else if (availableVoices.length > 0) {
      // Auto-select best voice for current language
      const langPrefix = lang === 'tr' ? 'tr' : 'en';
      const langVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
      if (langVoice) {
        utterance.voice = langVoice;
      }
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    
    utterance.onpause = () => {
      setIsPaused(true);
    };
    
    utterance.onresume = () => {
      setIsPaused(false);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };
    
    utterance.onerror = (e) => {
      console.error('SpeechSynthesisUtterance.onerror', e);
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    if (isWeb) {
      utteranceRef.current = utterance;
      synth?.speak(utterance);
    } else {
      // Mobile: Use native TTS with enhanced error handling
      try {
        console.log('[TTS] Attempting to use native TextToSpeech...');
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        
        // Check if TTS is available on device
        try {
          console.log('[TTS] Checking TTS availability...');
          const isSupported = await TextToSpeech.isLanguageSupported({ lang: utterance.lang });
          console.log('[TTS] Language support check result:', isSupported);
          
          if (!isSupported.supported) {
            console.warn(`[TTS] Language ${utterance.lang} not supported, trying default language`);
            // Fallback to English if Turkish not supported
            utterance.lang = 'en-US';
          }
        } catch (checkError) {
          console.warn('[TTS] Language support check failed:', checkError);
          // Continue with original language
        }
        
        setIsSpeaking(true);
        
        console.log('[TTS] Starting native speech with config:', {
          text: cleanedText.substring(0, 100) + '...',
          lang: utterance.lang,
          rate: utterance.rate,
          pitch: utterance.pitch,
          volume: utterance.volume
        });
        
        await TextToSpeech.speak({
          text: cleanedText,
          lang: utterance.lang,
          rate: utterance.rate,
          pitch: utterance.pitch,
          volume: utterance.volume,
          category: 'ambient'
        });
        
        console.log('[TTS] Native speech completed successfully');
        setIsSpeaking(false);
      } catch (error: any) {
        console.error('[TTS] Native speech error:', error);
        console.error('[TTS] Error details:', {
          message: error.message,
          code: error.code,
          name: error.name
        });
        
        // Handle specific TTS errors
        if (error.message?.includes('not supported') || 
            error.message?.includes('no TTS engine') ||
            error.message?.includes('unnamed')) {
          console.warn('[TTS] TTS engine not available, falling back to silent mode');
          // Don't show error to user - TTS is optional
        } else if (error.message?.includes('network') || error.message?.includes('internet')) {
          console.warn('[TTS] TTS requires internet connection');
          // Don't show error - TTS is optional
        } else {
          console.error('[TTS] Unexpected TTS error:', error.message);
        }
        
        setIsSpeaking(false);
        // TTS errors should not block app functionality
      }
    }
  }, [hasSupport, synth, settings, availableVoices, lang]);

  const pause = useCallback(() => {
    if (!hasSupport || !synth?.speaking) return;
    synth.pause();
    setIsPaused(true);
  }, [hasSupport, synth]);

  const resume = useCallback(() => {
    if (!hasSupport || !synth?.paused) return;
    synth.resume();
    setIsPaused(false);
  }, [hasSupport, synth]);

  const cancel = useCallback(() => {
    if (!hasSupport) return;
    synth?.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [hasSupport, synth]);

  useEffect(() => {
    return () => {
      if (hasSupport) {
        synth?.cancel();
      }
    };
  }, [hasSupport, synth]);

  return {
    isSpeaking,
    isPaused,
    speak,
    pause,
    resume,
    cancel,
    hasSupport,
    settings,
    updateSettings,
    availableVoices,
  };
};
