import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(false);
  const isWeb = Capacitor.getPlatform() === 'web';
  
  // Web Speech API için referanslar
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const transcriptReadyCalledRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const cleanedTranscriptRef = useRef<string | null>(null);
  const finalTranscriptRef = useRef('');
  
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady;
  }, [onTranscriptReady]);
  
  useEffect(() => {
    finalTranscriptRef.current = transcript;
  }, [transcript]);
  
  // Platform desteğini kontrol et
  useEffect(() => {
    if (isWeb) {
      // Web platformunda Web Speech API kullan
      if (WebSpeechRecognitionAPI) {
        setHasSupport(true);
      } else {
        console.error('Web Speech API bu tarayıcıda desteklenmiyor');
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
    if (!isWeb || !WebSpeechRecognitionAPI) return;
    
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
    
    if (isWeb) {
      // Web Speech API kullan
      if (recognitionRef.current) {
        transcriptReadyCalledRef.current = false;
        cleanedTranscriptRef.current = null;
        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
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
    
    if (isWeb) {
      // Web Speech API durdur
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

  return { isListening, transcript, startListening, stopListening, hasSupport, checkAndRequestPermission };
};