import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import type { PluginListenerHandle } from '@capacitor/core';

export const useSpeechRecognition = (
  onTranscriptReady: (transcript: string) => void,
  options?: { stopOnKeywords?: boolean | string[]; continuous?: boolean; }
) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const partialListenerRef = useRef<PluginListenerHandle | null>(null);
  const finalTranscriptRef = useRef('');

  const onTranscriptReadyRef = useRef(onTranscriptReady);
  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady;
  }, [onTranscriptReady]);

  const [hasSupport, setHasSupport] = useState(false);
  const [webRecognition, setWebRecognition] = useState<any>(null);
  
  useEffect(() => {
    // Önce Web Speech API kontrolü yap
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      // Web'de çalışıyoruz ve Web Speech API mevcut
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'tr-TR';
      setWebRecognition(recognition);
      setHasSupport(true);
      console.log('Web Speech API kullanılıyor');
    } else {
      // Web Speech API yok, Capacitor'ü dene
      SpeechRecognition.available()
        .then(result => {
          setHasSupport(result.available);
          if (result.available) {
            console.log('Capacitor Speech Recognition kullanılıyor');
          }
        })
        .catch(() => {
          console.log('Speech Recognition web\'de kullanılamıyor - bu beklenen bir durumdur');
          setHasSupport(false);
        });
    }
  }, []);

  const stopListening = useCallback(async () => {
    // Web Speech API için
    if (webRecognition && isListening) {
      webRecognition.stop();
      setIsListening(false);
      
      if (finalTranscriptRef.current.trim()) {
        onTranscriptReadyRef.current(finalTranscriptRef.current.trim());
      }
      
      setTranscript('');
      finalTranscriptRef.current = '';
      return;
    }
    
    // Capacitor için
    if (partialListenerRef.current) {
      partialListenerRef.current.remove();
      partialListenerRef.current = null;
    }
    await SpeechRecognition.stop();
    setIsListening(false);
    
    // Send the final transcript
    if (finalTranscriptRef.current.trim()) {
       onTranscriptReadyRef.current(finalTranscriptRef.current.trim());
    }

    setTranscript('');
    finalTranscriptRef.current = '';
  }, [webRecognition, isListening]);

  const startListening = useCallback(async () => {
    if (isListening || !hasSupport) return;

    // Web Speech API varsa onu kullan
    if (webRecognition) {
      setIsListening(true);
      setTranscript('');
      finalTranscriptRef.current = '';

      const stopWordsOption = options?.stopOnKeywords;
      const useStopWords = stopWordsOption !== false;

      webRecognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const currentTranscript = finalTranscript + interimTranscript;
        setTranscript(currentTranscript);
        finalTranscriptRef.current = currentTranscript;

        // Stop words kontrolü
        if (useStopWords && currentTranscript) {
          const lowerCaseTranscript = currentTranscript.toLowerCase().trim();
          let stopWords = ['tamam', 'bitti', 'ok'];
          if (Array.isArray(stopWordsOption)) {
            stopWords = stopWordsOption;
          }

          const sortedStopWords = [...stopWords].sort((a, b) => b.length - a.length);
          const stopWordTriggered = sortedStopWords.find(word => 
            lowerCaseTranscript.endsWith(word.toLowerCase())
          );

          if (stopWordTriggered) {
            const commandEndIndex = lowerCaseTranscript.lastIndexOf(stopWordTriggered.toLowerCase());
            const command = currentTranscript.substring(0, commandEndIndex).trim();
            finalTranscriptRef.current = command;
            stopListening();
          }
        }
      };

      webRecognition.onerror = (event: any) => {
        console.error('Web Speech error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini verin.');
        }
        setIsListening(false);
      };

      webRecognition.onend = () => {
        if (isListening && options?.continuous) {
          webRecognition.start();
        } else {
          setIsListening(false);
        }
      };

      try {
        await webRecognition.start();
      } catch (error) {
        console.error('Web Speech start error:', error);
        setIsListening(false);
      }
      return;
    }

    // Request permissions first
    const permission = await SpeechRecognition.checkPermissions();
    if (permission.speechRecognition !== 'granted') {
      const permissionResult = await SpeechRecognition.requestPermissions();
      if (permissionResult.speechRecognition !== 'granted') {
          console.error("User denied speech recognition permission.");
          return;
      }
    }
    
    setIsListening(true);
    setTranscript('');
    finalTranscriptRef.current = '';

    const stopWordsOption = options?.stopOnKeywords;
    const useStopWords = stopWordsOption !== false;

    partialListenerRef.current = await SpeechRecognition.addListener('partialResults', (data) => {
      const currentTranscript = data.matches.join(' ');
      setTranscript(currentTranscript);
      finalTranscriptRef.current = currentTranscript; // Always update the final transcript

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
          finalTranscriptRef.current = command; // Update final transcript before stopping
          stopListening();
        }
      }
    });

    // Note: 'endOfSpeech' event is not supported in the current version
    // Speech recognition will be manually stopped or stopped by keywords

    try {
        await SpeechRecognition.start({
          language: 'tr-TR',
          partialResults: true,
          popup: false, // Use the app's UI instead of native popup
        });
    } catch (e) {
        console.error("Error starting speech recognition:", e);
        setIsListening(false);
    }

  }, [isListening, hasSupport, options, stopListening, webRecognition]);
  
  const checkAndRequestPermission = useCallback(async () => {
      if(!hasSupport) return;
      const permission = await SpeechRecognition.checkPermissions();
      if (permission.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
      }
  }, [hasSupport]);

  return { isListening, transcript, startListening, stopListening, hasSupport, checkAndRequestPermission };
};
