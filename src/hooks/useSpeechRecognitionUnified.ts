import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useElectronSpeechRecognition } from './useElectronSpeechRecognition';

// Web Speech API types
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

const WebSpeechRecognitionAPI = 
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = (
  onTranscriptReady: (transcript: string) => void,
  options?: { stopOnKeywords?: boolean | string[]; stopOnSilence?: boolean; continuous?: boolean; }
) => {
  // All hooks must be called before any conditional logic
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(false);
  
  // All useRef hooks at the top
  const retryCountRef = useRef(0);
  const isElectronRef = useRef(false);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const transcriptReadyCalledRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const cleanedTranscriptRef = useRef<string | null>(null);
  const finalTranscriptRef = useRef('');
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  
  // Platform detection after all hooks
  const isWeb = Capacitor.getPlatform() === 'web';
  const maxRetries = 3;
  
  // Update refs in useEffect hooks
  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady;
  }, [onTranscriptReady]);
  
  useEffect(() => {
    finalTranscriptRef.current = transcript;
  }, [transcript]);
  
  // Platform desteğini kontrol et
  useEffect(() => {
    // Check if running in Electron
    isElectronRef.current = !!(window as any).isElectron || !!(window as any).electronAPI;
    
    if (isWeb) {
      // Web platformunda Web Speech API kullan (Electron değilse)
      if (WebSpeechRecognitionAPI && !isElectronRef.current) {
        setHasSupport(true);
      } else if (isElectronRef.current) {
        // Electron'da Web Speech API genellikle desteklenmez; Electron fallback kullanacağız
        setHasSupport(true); // Fallback destekliyoruz
      } else {
        setHasSupport(false);
      }
    } else {
      // Mobil platformlarda Capacitor desteğini kontrol et
      import('@capacitor-community/speech-recognition').then(({ SpeechRecognition }) => {
        SpeechRecognition.available()
          .then(result => {
            setHasSupport(result.available);
          })
          .catch(() => {
            setHasSupport(false);
          });
      });
    }
  }, [isWeb]);
  
  // Web Speech API setup
  useEffect(() => {
    // Electron ortamında Web Speech API'yi kurmayalım; fallback kullanılacak
    if (!isWeb || !WebSpeechRecognitionAPI || isElectronRef.current) return;
    
    const rec = new WebSpeechRecognitionAPI();
    recognitionRef.current = rec;
    const stopWordsOption = options?.stopOnKeywords;
    const useStopWords = stopWordsOption !== false;
    const continuous = options?.continuous ?? true;
    const stopOnSilence = options?.stopOnSilence ?? false;

    rec.continuous = continuous;
    rec.interimResults = continuous;
    rec.lang = 'tr-TR';

    rec.onresult = (event: any) => {
      const currentTranscript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');
      
      setTranscript(currentTranscript);

      if (stopOnSilence && continuous) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = window.setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 1200);
      }

      if (useStopWords) {
        const lowerCaseTranscript = currentTranscript.toLowerCase().trim();
        
        let stopWords = ['tamam', 'bitti', 'ok'];
        if (Array.isArray(stopWordsOption)) {
            stopWords = stopWordsOption;
        }
        
        const sortedStopWords = [...stopWords].sort((a, b) => b.length - a.length);
        const stopWordTriggered = sortedStopWords.find(word => lowerCaseTranscript.endsWith(word.toLowerCase()));

        if (stopWordTriggered) {
          const commandEndIndex = lowerCaseTranscript.lastIndexOf(stopWordTriggered.toLowerCase());
          const command = currentTranscript.substring(0, commandEndIndex).trim();
          cleanedTranscriptRef.current = command;
          rec.stop();
        }
      }
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      // Handle specific error cases
      if (event.error === 'network') {
        console.warn('Network error in speech recognition. This might be due to offline status or security restrictions.');
        
        // Try retry with counter to prevent infinite loops
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          console.log(`Retrying speech recognition (attempt ${retryCountRef.current}/${maxRetries})`);
          
          setTimeout(() => {
            if (recognitionRef.current && hasSupport) {
              try {
                // Reset and try different settings
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                transcriptReadyCalledRef.current = false;
                cleanedTranscriptRef.current = null;
                setTranscript('');
                recognitionRef.current.start();
                setIsListening(true);
              } catch (retryError) {
                console.error('Retry failed:', retryError);
                retryCountRef.current = maxRetries; // Stop retrying
              }
            }
          }, 2000); // Longer delay
        } else {
          console.error('Max retries reached. Speech recognition unavailable.');
          setHasSupport(false);
        }
      } else if (event.error === 'not-allowed') {
        console.error('Microphone access not allowed. Please check permissions.');
      } else if (event.error === 'no-speech') {
        console.log('No speech detected. This is usually not an error.');
      }
    };

    rec.onend = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsListening(false);

      const transcriptToSend = cleanedTranscriptRef.current ?? finalTranscriptRef.current;
      
      if (!transcriptReadyCalledRef.current && transcriptToSend.trim()) {
         transcriptReadyCalledRef.current = true;
         onTranscriptReadyRef.current(transcriptToSend.trim());
      }

      cleanedTranscriptRef.current = null;
    };

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [options, isWeb]);
  
  const startListening = useCallback(async () => {
    if (!hasSupport || isListening) return;
    
    // Reset retry counter on new start
    retryCountRef.current = 0;
    
    // Electron'da her zaman fallback kullan
    if (isWeb && !isElectronRef.current) {
      // Web Speech API kullan (Electron değilse)
      if (recognitionRef.current) {
        try {
          transcriptReadyCalledRef.current = false;
          cleanedTranscriptRef.current = null;
          setTranscript('');
          recognitionRef.current.start();
          setIsListening(true);
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
          setIsListening(false);
          
          // Check if this is a security/permission issue
          if (error instanceof DOMException) {
            if (error.name === 'NotAllowedError') {
              console.error('Microphone permission denied');
            } else if (error.name === 'NotSupportedError') {
              console.error('Speech recognition not supported in this context');
            }
          }
        }
      }
    } else {
      // Capacitor kullan (dinamik import)
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        
        // İzinleri kontrol et
        const permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== 'granted') {
          const permissionResult = await SpeechRecognition.requestPermissions();
          if (permissionResult.speechRecognition !== 'granted') {
              console.error("Kullanıcı konuşma tanıma iznini reddetti");
              return;
          }
        }
        
        setIsListening(true);
        setTranscript('');
        
        await SpeechRecognition.start({
          language: 'tr-TR',
          partialResults: true,
          popup: false,
        });
      } catch (e) {
        console.error("Konuşma tanıma başlatılamadı:", e);
        setIsListening(false);
      }
    }
  }, [isListening, hasSupport, isWeb]);

  const stopListening = useCallback(async () => {
    if (!isListening) return;
    
    if (isWeb && !isElectronRef.current) {
      // Web Speech API durdur (Electron değilse)
      if (recognitionRef.current) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        recognitionRef.current.stop();
        setIsListening(false);
      }
    } else {
      // Capacitor durdur
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        await SpeechRecognition.stop();
        setIsListening(false);
        
        if (finalTranscriptRef.current.trim()) {
           onTranscriptReadyRef.current(finalTranscriptRef.current.trim());
        }
        setTranscript('');
      } catch (e) {
        console.error("Konuşma tanıma durdurulamadı:", e);
      }
    }
  }, [isListening, isWeb]);
  
  const checkAndRequestPermission = useCallback(async () => {
    if (!hasSupport) return;
    
    if (!isWeb) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        const permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== 'granted') {
            await SpeechRecognition.requestPermissions();
        }
      } catch (e) {
        console.log('İzin kontrolü başarısız:', e);
      }
    }
    // Web için otomatik olarak tarayıcı soracak
  }, [hasSupport, isWeb]);

  // Electron fallback hook'u her zaman en üstte çağırıyoruz (hook kuralları için) ve gerektiğinde kullanıyoruz
  const electronSR = useElectronSpeechRecognition((t) => onTranscriptReadyRef.current(t), { 
    continuous: options?.continuous,
    stopOnKeywords: typeof options?.stopOnKeywords === 'boolean' ? undefined : options?.stopOnKeywords
  });

  const useElectron = isElectronRef.current || (!WebSpeechRecognitionAPI && isWeb);

  if (useElectron) {
    return {
      isListening: electronSR.isListening,
      transcript: electronSR.transcript,
      startListening: electronSR.startListening,
      stopListening: electronSR.stopListening,
      hasSupport: electronSR.hasSupport,
      checkAndRequestPermission: electronSR.checkAndRequestPermission || (() => Promise.resolve()),
    };
  }

  return { isListening, transcript, startListening, stopListening, hasSupport, checkAndRequestPermission };
};