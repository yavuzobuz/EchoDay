import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechSynthesisOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export const useSpeechSynthesis = (options?: SpeechSynthesisOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const interruptedRef = useRef(false);
  const pausedPositionRef = useRef(0);
  const textChunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const autoplayTestRef = useRef(false);

  const hasSupport = 'speechSynthesis' in window;

  // Load available voices
  useEffect(() => {
    if (!hasSupport) return;

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [hasSupport]);

  // Test autoplay capability and enable it
  const enableAutoplay = useCallback(async () => {
    if (autoplayTestRef.current) {
      return isAutoplayEnabled;
    }

    try {
      autoplayTestRef.current = true;
      
      // Create a silent test utterance
      const testUtterance = new SpeechSynthesisUtterance('');
      testUtterance.volume = 0;
      testUtterance.rate = 10; // Very fast
      
      const testPromise = new Promise<boolean>((resolve) => {
        let resolved = false;
        
        testUtterance.onstart = () => {
          if (!resolved) {
            resolved = true;
            speechSynthesis.cancel();
            resolve(true);
          }
        };
        
        testUtterance.onerror = () => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        };
        
        // Timeout after 1 second
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            speechSynthesis.cancel();
            resolve(false);
          }
        }, 1000);
      });
      
      speechSynthesis.speak(testUtterance);
      const result = await testPromise;
      
      setIsAutoplayEnabled(result);
      return result;
    } catch (error) {
      console.error('Autoplay test failed:', error);
      setIsAutoplayEnabled(false);
      return false;
    }
  }, [isAutoplayEnabled]);

  // Get Turkish voice or fallback
  const getTurkishVoice = useCallback(() => {
    if (options?.voice) return options.voice;
    
    // Try to find Turkish voice
    const turkishVoice = voices.find(voice => 
      voice.lang.includes('tr') || voice.lang.includes('TR')
    );
    
    if (turkishVoice) return turkishVoice;
    
    // Fallback to default voice
    return voices[0] || null;
  }, [voices, options?.voice]);

  // Split text into smaller chunks for better control
  const splitTextIntoChunks = useCallback((text: string, maxLength: number = 200): string[] => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence.trim();
      } else {
        currentChunk += (currentChunk.length > 0 ? '. ' : '') + sentence.trim();
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [text];
  }, []);

  // Speak a chunk of text
  const speakChunk = useCallback((text: string, chunkIndex: number, totalChunks: number) => {
    if (!hasSupport || !text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getTurkishVoice();
    
    if (voice) utterance.voice = voice;
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume || 1.0;
    utterance.lang = options?.lang || 'tr-TR';

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      if (interruptedRef.current) {
        interruptedRef.current = false;
        return;
      }

      // Move to next chunk if available
      if (chunkIndex < totalChunks - 1) {
        currentChunkRef.current = chunkIndex + 1;
        const nextChunk = textChunksRef.current[chunkIndex + 1];
        if (nextChunk) {
          setTimeout(() => speakChunk(nextChunk, chunkIndex + 1, totalChunks), 100);
        }
      } else {
        // All chunks completed
        setIsSpeaking(false);
        setCurrentUtterance(null);
        setCurrentText('');
        setCurrentIndex(0);
        utteranceRef.current = null;
        textChunksRef.current = [];
        currentChunkRef.current = 0;
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      setCurrentUtterance(null);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    setCurrentUtterance(utterance);
    speechSynthesis.speak(utterance);
  }, [hasSupport, getTurkishVoice, options]);

  // Main speak function
  const speak = useCallback((text: string) => {
    if (!hasSupport || !text.trim()) return false;

    try {
      // Stop any current speech
      if (isSpeaking) {
        speechSynthesis.cancel();
        interruptedRef.current = true;
      }

      // Reset state
      setCurrentText(text);
      setCurrentIndex(0);
      interruptedRef.current = false;
      pausedPositionRef.current = 0;
      currentChunkRef.current = 0;

      // Split text into chunks
      const chunks = splitTextIntoChunks(text);
      textChunksRef.current = chunks;

      // Start speaking first chunk
      if (chunks.length > 0) {
        speakChunk(chunks[0], 0, chunks.length);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Speech error:', error);
      return false;
    }
  }, [hasSupport, isSpeaking, splitTextIntoChunks, speakChunk]);

  // Stop speaking
  const stop = useCallback(() => {
    if (!hasSupport) return;
    
    speechSynthesis.cancel();
    interruptedRef.current = true;
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentUtterance(null);
    setCurrentText('');
    setCurrentIndex(0);
    utteranceRef.current = null;
    textChunksRef.current = [];
    currentChunkRef.current = 0;
    pausedPositionRef.current = 0;
  }, [hasSupport]);

  // Pause speaking
  const pause = useCallback(() => {
    if (!hasSupport || !isSpeaking) return;
    
    speechSynthesis.pause();
    setIsPaused(true);
  }, [hasSupport, isSpeaking]);

  // Resume speaking
  const resume = useCallback(() => {
    if (!hasSupport || !isPaused) return;
    
    speechSynthesis.resume();
    setIsPaused(false);
  }, [hasSupport, isPaused]);

  // Resume from interruption - continues from where it was interrupted
  const resumeFromInterruption = useCallback(() => {
    if (!hasSupport || !textChunksRef.current.length) return;

    const remainingChunks = textChunksRef.current.slice(currentChunkRef.current);
    if (remainingChunks.length > 0) {
      speakChunk(remainingChunks[0], currentChunkRef.current, textChunksRef.current.length);
    }
  }, [hasSupport, speakChunk]);

  return {
    speak,
    stop,
    pause,
    resume,
    resumeFromInterruption,
    enableAutoplay,
    isSpeaking,
    isPaused,
    voices,
    hasSupport,
    isAutoplayEnabled,
    currentText,
    currentIndex
  };
};