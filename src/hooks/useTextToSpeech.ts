import { useState, useEffect, useCallback, useRef } from 'react';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const hasSupport = !!synth;

  const speak = useCallback((text: string) => {
    if (!hasSupport || !text) return;

    if (synth?.speaking) {
      synth.cancel();
    }

    const cleanedText = text
      .replace(/<table[\s\S]*?<\/table>/gm, ' Tablo içeriği sesli okuma için atlandı. ')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/•/g, '. ')
      .replace(/\n/g, '. ')
      .replace(/\s\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'tr-TR';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
    };
    utterance.onerror = (e) => {
        console.error('SpeechSynthesisUtterance.onerror', e);
        setIsSpeaking(false);
        utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    synth?.speak(utterance);
  }, [hasSupport, synth]);

  const cancel = useCallback(() => {
    if (!hasSupport) return;
    synth?.cancel();
    setIsSpeaking(false);
  }, [hasSupport, synth]);

  useEffect(() => {
    return () => {
      if (hasSupport) {
        synth?.cancel();
      }
    };
  }, [hasSupport, synth]);

  return { isSpeaking, speak, cancel, hasSupport };
};
