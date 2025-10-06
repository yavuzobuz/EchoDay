import { useState, useEffect, useCallback, useRef } from 'react';

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [settings, setSettings] = useState<TTSSettings>(loadTTSSettings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const hasSupport = !!synth;

  // Load available voices
  useEffect(() => {
    if (!hasSupport || !synth) return;
    
    const loadVoices = () => {
      const voices = synth.getVoices();
      // Filter Turkish voices
      const turkishVoices = voices.filter(v => v.lang.startsWith('tr'));
      setAvailableVoices(turkishVoices.length > 0 ? turkishVoices : voices);
    };
    
    loadVoices();
    
    // Chrome loads voices asynchronously
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }, [hasSupport, synth]);

  const updateSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveTTSSettings(updated);
      return updated;
    });
  }, []);

  const speak = useCallback((text: string, customSettings?: Partial<TTSSettings>) => {
    if (!hasSupport || !text) return;
    if (!settings.enabled && !customSettings?.enabled) return;

    // Cancel any ongoing speech
    if (synth?.speaking) {
      synth.cancel();
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
    
    utterance.lang = 'tr-TR';
    utterance.rate = finalSettings.rate;
    utterance.pitch = finalSettings.pitch;
    utterance.volume = finalSettings.volume;
    
    // Set voice if specified
    if (finalSettings.voice && availableVoices.length > 0) {
      const selectedVoice = availableVoices.find(v => v.name === finalSettings.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
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

    utteranceRef.current = utterance;
    synth?.speak(utterance);
  }, [hasSupport, synth, settings, availableVoices]);

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
