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

  // Check permissions safely
  const checkAndRequestPermissions = useCallback(async () => {
    if (!isNative) return 'granted';
    
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      
      // First check current status
      const currentStatus = await SpeechRecognition.checkPermissions();
      if (currentStatus.speechRecognition === 'granted') {
        return 'granted';
      }
      
      // Request if not granted
      const requestResult = await SpeechRecognition.requestPermissions();
      return requestResult.speechRecognition === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      console.warn('[NativeSpeech] Permission check failed:', error);
      return 'denied';
    }
  }, [isNative]);

  // Initialize speech recognition support
  useEffect(() => {
    const initializeSpeechSupport = async () => {
      try {
        if (isNative) {
          // Native Capacitor approach
          const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
          
          // Check availability first
          const availabilityResult = await SpeechRecognition.available();
          setHasSupport(availabilityResult.available);
          
          if (availabilityResult.available) {
            // Check permissions without requesting yet
            const permissionStatus = await checkAndRequestPermissions();
            setPermissionStatus(permissionStatus);
            debugLogger.speech('NativeSpeech', 'Native speech initialized', { 
              data: { available: true, permission: permissionStatus } 
            });
          }
        } else {
          // Web Speech API fallback
          const WebSpeechRecognitionAPI = 
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          
          if (WebSpeechRecognitionAPI) {
            setHasSupport(true);
            setPermissionStatus('granted'); // Web Speech API doesn't need explicit permission request
            debugLogger.speech('NativeSpeech', 'Web Speech API detected and ready');
          } else {
            setHasSupport(false);
            setError('Tarayıcınız sesli komut özelliğini desteklemiyor');
          }
        }
      } catch (error) {
        console.error('[NativeSpeech] Initialization failed:', error);
        setHasSupport(false);
        
        // More specific error messages for Turkish users
        let errorMessage = 'Sesli asistan başlatılamadı';
        if (error instanceof Error) {
          if (error.message.includes('permission')) {
            errorMessage = 'Mikrofon izni verilmedi. Lütfen uygulama ayarlarından mikrofon iznini aktifleştirin.';
          } else if (error.message.includes('not available') || error.message.includes('not supported')) {
            errorMessage = 'Bu cihazda sesli asistan desteklenmiyor.';
          } else {
            errorMessage = `Sesli asistan hatası: ${error.message}`;
          }
        }
        setError(errorMessage);
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

    // Only check for stop words on final results to prevent premature stopping
    if (isFinal) {
      const { shouldStop, cleanedText } = checkStopWords(newTranscript);
      
      debugLogger.speech('NativeSpeech', 'Final transcript', { data: { text: cleanedText, reason: shouldStop ? 'stopword' : 'final' } });
      onTranscriptReady(cleanedText);
      
      // Note: Actual stopping will be handled by the caller or recognition end event
    }
  }, [checkStopWords, onTranscriptReady]);

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
        
        // Update the transcript for UI display
        setTranscript(transcript);
        currentTranscriptRef.current = transcript;
        
        // Check for stop words in partial results
        const { shouldStop, cleanedText } = checkStopWords(transcript);
        
        if (shouldStop) {
          // Stop word detected - stop recognition immediately
          debugLogger.speech('NativeSpeech', 'Stop word detected in partial result', { data: { cleanedText } });
          
          // Update with cleaned text
          currentTranscriptRef.current = cleanedText;
          
          // Stop the recognition
          SpeechRecognition.stop().catch(err => {
            console.warn('[NativeSpeech] Stop on keyword error:', err);
          });
          
          return;
        }
        
        // Optional: Auto-stop on silence detection for partial results
        if (stopOnSilence && continuous) {
          // Reset silence timer on each new partial result
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          silenceTimerRef.current = window.setTimeout(async () => {
            debugLogger.speech('NativeSpeech', 'Stopping due to silence (partial)');
            try {
              await SpeechRecognition.stop();
            } catch (err) {
              console.warn('[NativeSpeech] Auto-stop error:', err);
            }
          }, 2000); // 2 seconds of silence
        }
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
      
      // More specific error messages for Turkish users
      let errorMessage = 'Sesli tanıma başlatılamadı';
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Mikrofon izni reddedildi. Lütfen uygulama ayarlarından mikrofon iznini aktifleştirin.';
        } else if (error.message.includes('not available')) {
          errorMessage = 'Sesli tanıma servisi kullanılamıyor. Cihazınızda Google uygulamasının güncel olduğundan emin olun.';
        } else if (error.message.includes('network')) {
          errorMessage = 'İnternet bağlantısı gerekli. Lütfen bağlantınızı kontrol edin.';
        } else {
          errorMessage = `Sesli tanıma hatası: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      setIsListening(false);
      
      // Fallback to web speech API if on hybrid platform
      if (platform === 'web') {
        try {
          await startWebRecognition();
        } catch (webError) {
          console.error('[NativeSpeech] Web fallback also failed:', webError);
        }
      }
    }
  }, [language, handleTranscriptUpdate, platform, stopOnSilence, continuous, checkStopWords]);

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
        
        // Update transcript
        setTranscript(transcript);
        currentTranscriptRef.current = transcript;
        
        // Check for stop words
        const { shouldStop, cleanedText } = checkStopWords(transcript);
        
        if (shouldStop) {
          // Stop word detected - stop recognition immediately
          debugLogger.speech('NativeSpeech', 'Stop word detected in web result', { data: { cleanedText } });
          
          // Update with cleaned text
          currentTranscriptRef.current = cleanedText;
          
          // Stop the recognition
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (err) {
              console.warn('[NativeSpeech] Stop on keyword error:', err);
            }
          }
          
          return;
        }
        
        // Check if the last result is final
        const lastResult = event.results[event.results.length - 1];
        const isFinal = lastResult?.isFinal === true;
        
        if (isFinal) {
          handleTranscriptUpdate(transcript, true);
        }
        
        // Optional: Auto-stop on silence detection for web recognition
        if (stopOnSilence && continuous && !isFinal) {
          // Reset silence timer on each new result
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          silenceTimerRef.current = window.setTimeout(() => {
            debugLogger.speech('NativeSpeech', 'Stopping due to silence (web)');
            try {
              if (recognitionRef.current) {
                recognitionRef.current.stop();
              }
            } catch (err) {
              console.warn('[NativeSpeech] Auto-stop error:', err);
            }
          }, 2000); // 2 seconds of silence
        }
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
  }, [continuous, language, handleTranscriptUpdate, stopOnSilence, checkStopWords]);

  // Show permission denied modal with text input fallback
  const showPermissionDeniedModal = useCallback(() => {
    const event = new CustomEvent('showTextInputModal', {
      detail: {
        title: 'Mikrofon İzni Gerekli',
        message: 'Sesli girdi için mikrofon izni gerekiyor. Alternatif olarak yazarak da görev ekleyebilirsiniz.',
        showTextInput: true
      }
    });
    window.dispatchEvent(event);
  }, []);

  // Start listening with safe permission check
  const startListening = useCallback(async () => {
    if (isListening || !hasSupport) return;

    setError(null);
    isStoppingRef.current = false;

    // Check permissions before starting (especially for Android)
    if (isNative) {
      const permissionStatus = await checkAndRequestPermissions();
      setPermissionStatus(permissionStatus);
      
      if (permissionStatus !== 'granted') {
        setError('Mikrofon izni verilmedi. Klavye ile yazarak görev ekleyebilirsiniz.');
        showPermissionDeniedModal();
        return;
      }
      
      await startNativeRecognition();
    } else {
      await startWebRecognition();
    }
  }, [isListening, hasSupport, isNative, checkAndRequestPermissions, startNativeRecognition, startWebRecognition, showPermissionDeniedModal]);

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