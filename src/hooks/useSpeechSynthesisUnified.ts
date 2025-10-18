import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useI18n } from '../contexts/I18nContext';

interface SpeechSynthesisOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export const useSpeechSynthesisUnified = (options?: SpeechSynthesisOptions) => {
  const { lang } = useI18n();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasSupport, setHasSupport] = useState(false);
  const isWeb = Capacitor.getPlatform() === 'web';
  const currentTextRef = useRef('');

  useEffect(() => {
    if (isWeb) {
      setHasSupport('speechSynthesis' in window);
    } else {
      // Mobile - always has support via native TTS
      setHasSupport(true);
    }
  }, [isWeb]);

  const speak = useCallback(async (text: string) => {
    if (!hasSupport || !text.trim()) return false;
    currentTextRef.current = text;

    try {
      if (isWeb) {
        // Web: Use Web Speech API
        if (!window.speechSynthesis) return false;
        
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options?.rate || 1.0;
        utterance.pitch = options?.pitch || 1.0;
        utterance.volume = options?.volume || 1.0;
        utterance.lang = options?.lang || (lang === 'tr' ? 'tr-TR' : 'en-US');
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
        return true;
      } else {
        // Mobile: Use Capacitor native TTS
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        
        setIsSpeaking(true);
        await TextToSpeech.speak({
          text,
          lang: options?.lang || (lang === 'tr' ? 'tr-TR' : 'en-US'),
          rate: options?.rate || 1.0,
          pitch: options?.pitch || 1.0,
          volume: options?.volume || 1.0,
          category: 'ambient'
        });
        setIsSpeaking(false);
        return true;
      }
    } catch (error) {
      console.error('[TTS] Speech error:', error);
      setIsSpeaking(false);
      return false;
    }
  }, [hasSupport, isWeb, options, lang]);

  const stop = useCallback(async () => {
    if (!hasSupport) return;

    try {
      if (isWeb) {
        window.speechSynthesis?.cancel();
      } else {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        await TextToSpeech.stop();
      }
      setIsSpeaking(false);
    } catch (error) {
      console.error('[TTS] Stop error:', error);
      setIsSpeaking(false);
    }
  }, [hasSupport, isWeb]);

  return {
    speak,
    stop,
    isSpeaking,
    hasSupport
  };
};
