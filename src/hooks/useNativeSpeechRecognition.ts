import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import debugLogger from '../utils/debugLogger';
import { triggerHaptic } from '../utils/hapticFeedback';


// Web Speech API fallback types
interface WebSpeechRecognition {
  new (): WebSpeechRecognition;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export interface SpeechRecognitionOptions {
  stopOnKeywords?: boolean | string[];
  stopOnSilence?: boolean;
  continuous?: boolean;
  language?: string;
}

export const useNativeSpeechRecognition = (
  onTranscriptReady: (transcript: string) => void,
  options: SpeechRecognitionOptions = {}
) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  // Refs
  const listenersRef = useRef<PluginListenerHandle[]>([]);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const isStoppingRef = useRef(false);
  const currentTranscriptRef = useRef('');

  // Platform detection
  const platform = Capacitor.getPlatform();
  const isNative = platform !== 'web';

  // Options with defaults
  const {
    stopOnKeywords = true,
    stopOnSilence = false,
    continuous = true,
    language = 'tr-TR'
  } = options;

  // Turkish stop words
  const defaultStopWords = ['tamam', 'bitti', 'bıttı', 'kaydet', 'kayıt', 'ok', 'dur', 'bitir'];
  const stopWords = Array.isArray(stopOnKeywords) ? stopOnKeywords : defaultStopWords;

  // Initialize speech recognition support
  useEffect(() => {
    const initializeSpeechSupport = async () => {
      try {
        if (isNative) {
          // Native Capacitor approach
          const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
          
          // Check availability
          const availabilityResult = await SpeechRecognition.available();
          setHasSupport(availabilityResult.available);
          
          if (availabilityResult.available) {
            // Check permissions
            const permissionResult = await SpeechRecognition.requestPermissions();
            setPermissionStatus(permissionResult.speechRecognition === 'granted' ? 'granted' : 'denied');
            debugLogger.speech('NativeSpeech', 'Native speech initialized', { 
              data: { available: true, permission: permissionResult.speechRecognition } 
            });
          }
        } else {
          // Web Speech API fallback
          const WebSpeechRecognitionAPI = 
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          
          if (WebSpeechRecognitionAPI) {
            setHasSupport(true);
            setPermissionStatus('unknown'); // Will be determined on first use
            debugLogger.speech('NativeSpeech', 'Web Speech API detected');
          } else {
            setHasSupport(false);
            setError('Speech recognition not supported in this browser');
          }
        }
      } catch (error) {
        console.error('[NativeSpeech] Initialization failed:', error);
        setHasSupport(false);
        setError(`Speech recognition initialization failed: ${error}`);
      }
    };

    initializeSpeechSupport();
  }, [isNative]);

  // Check for stop words in transcript
  const checkStopWords = useCallback((text: string): { shouldStop: boolean; cleanedText: string } => {
    if (!stopOnKeywords) return { shouldStop: false, cleanedText: text };

    const normalizedText = text.toLocaleLowerCase('tr-TR').trim();
    
    // Find stop word at the end
    const stopWord = stopWords.find(word => {
      const pattern = new RegExp(`\\s*${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[.,!?]*\\s*$`);
      return pattern.test(normalizedText);
    });

    if (stopWord) {
      // Remove stop word from text
      const pattern = new RegExp(`\\s*${stopWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[.,!?]*\\s*$`);
      const cleanedText = text.replace(pattern, '').trim();
      return { shouldStop: true, cleanedText };
    }

    return { shouldStop: false, cleanedText: text };
  }, [stopOnKeywords, stopWords]);

  // Handle transcript updates
  const handleTranscriptUpdate = useCallback((newTranscript: string, isFinal = false) => {
    setTranscript(newTranscript);
    currentTranscriptRef.current = newTranscript;

    if (stopOnSilence && continuous && !isFinal) {
      // Reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
      silenceTimerRef.current = window.setTimeout(() => {
        debugLogger.speech('NativeSpeech', 'Stopping due to silence');
        stopListening();
      }, 1500);
    }

    // Check for stop words
    const { shouldStop, cleanedText } = checkStopWords(newTranscript);
    
    if (shouldStop || isFinal) {
      debugLogger.speech('NativeSpeech', 'Final transcript', { data: { text: cleanedText, reason: shouldStop ? 'stopword' : 'final' } });
      onTranscriptReady(cleanedText);
      if (shouldStop) {
        stopListening();
      }
    }
  }, [stopOnSilence, continuous, checkStopWords, onTranscriptReady]);

  // Native speech recognition
  const startNativeRecognition = useCallback(async () => {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      
      // Clear previous listeners
      await SpeechRecognition.removeAllListeners();
      listenersRef.current.forEach(listener => listener.remove());
      listenersRef.current = [];

      // Add listeners
      const partialListener = await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        const transcript = data.matches[0] || '';
        handleTranscriptUpdate(transcript, false);
      });

      const stateListener = await SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
        if (data.status === 'stopped') {
          // Process final transcript when listening stops
          if (currentTranscriptRef.current.trim()) {
            handleTranscriptUpdate(currentTranscriptRef.current, true);
          }
          setIsListening(false);
        }
      });

      listenersRef.current = [partialListener, stateListener];

      // Start recognition
      await SpeechRecognition.start({
        language,
        partialResults: true,
        popup: false,
        maxResults: 1
      });

      setIsListening(true);
      setError(null);
      setTranscript('');
      currentTranscriptRef.current = '';
      
      // Haptic feedback for recording start
      triggerHaptic.voiceStart();
      
      debugLogger.speech('NativeSpeech', 'Native recognition started');

    } catch (error) {
      console.error('[NativeSpeech] Native recognition failed:', error);
      setError(`Native speech recognition failed: ${error}`);
      setIsListening(false);
      
      // Fallback to web speech API if on hybrid platform
      if (platform === 'web') {
        await startWebRecognition();
      }
    }
  }, [language, handleTranscriptUpdate, platform]);

  // Web speech recognition fallback
  const startWebRecognition = useCallback(async () => {
    try {
      const WebSpeechRecognitionAPI = 
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!WebSpeechRecognitionAPI) {
        throw new Error('Web Speech API not available');
      }

      const recognition = new WebSpeechRecognitionAPI();
      recognitionRef.current = recognition;

      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        const isFinal = event.results[event.results.length - 1]?.isFinal;
        handleTranscriptUpdate(transcript, isFinal);
      };

      recognition.onerror = (event: any) => {
        console.error('[NativeSpeech] Web recognition error:', event);
        setError(`Web speech recognition error: ${event.error}`);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          setPermissionStatus('denied');
        }
      };

      recognition.onend = () => {
        if (!isStoppingRef.current) {
          debugLogger.speech('NativeSpeech', 'Web recognition ended unexpectedly');
        }
        setIsListening(false);
      };

      recognition.start();
      setIsListening(true);
      setError(null);
      setTranscript('');
      currentTranscriptRef.current = '';
      
      // Haptic feedback for recording start
      triggerHaptic.voiceStart();
      
      debugLogger.speech('NativeSpeech', 'Web recognition started');

    } catch (error) {
      console.error('[NativeSpeech] Web recognition failed:', error);
      setError(`Web speech recognition failed: ${error}`);
      setIsListening(false);
    }
  }, [continuous, language, handleTranscriptUpdate]);

  // Start listening
  const startListening = useCallback(async () => {
    if (isListening || !hasSupport) return;

    setError(null);
    isStoppingRef.current = false;

    if (isNative) {
      await startNativeRecognition();
    } else {
      await startWebRecognition();
    }
  }, [isListening, hasSupport, isNative, startNativeRecognition, startWebRecognition]);

  // Stop listening
  const stopListening = useCallback(async () => {
    if (!isListening) return;

    isStoppingRef.current = true;

    // Clear silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    try {
      if (isNative) {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        // Ensure stop is called properly
        try {
          await SpeechRecognition.stop();
        } catch (stopError) {
          console.warn('[NativeSpeech] Stop method error (may be already stopped):', stopError);
        }
        
        // Clean up listeners
        listenersRef.current.forEach(listener => listener.remove());
        listenersRef.current = [];
        
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (stopError) {
          console.warn('[NativeSpeech] Web recognition stop error:', stopError);
        }
        recognitionRef.current = null;
      }
      
      // Process final transcript if available
      if (currentTranscriptRef.current.trim()) {
        const { cleanedText } = checkStopWords(currentTranscriptRef.current);
        onTranscriptReady(cleanedText);
      }

    } catch (error) {
      console.error('[NativeSpeech] Stop failed:', error);
    } finally {
      // Haptic feedback for recording stop
      triggerHaptic.voiceStop();
      
      setIsListening(false);
      isStoppingRef.current = false;
      debugLogger.speech('NativeSpeech', 'Recognition stopped');
    }
  }, [isListening, isNative, checkStopWords, onTranscriptReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Clean up native listeners
      if (isNative && listenersRef.current.length > 0) {
        import('@capacitor-community/speech-recognition').then(({ SpeechRecognition }) => {
          SpeechRecognition.removeAllListeners();
        });
        listenersRef.current.forEach(listener => listener.remove());
      }

      // Clean up web recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [isNative]);

  return {
    isListening,
    transcript,
    hasSupport,
    error,
    permissionStatus,
    startListening,
    stopListening,
    platform
  };
};