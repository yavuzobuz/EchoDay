import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionOptions {
  stopOnKeywords?: string[];
  continuous?: boolean;
  stopOnSilence?: boolean;
}

// Web Speech API types
interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: WebSpeechRecognition, ev: Event) => any) | null;
  onend: ((this: WebSpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: WebSpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: WebSpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export const useWebSpeechRecognition = (
  onTranscriptReady: (transcript: string) => void,
  options?: SpeechRecognitionOptions
) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(false);
  const [error, setError] = useState<string>('');
  
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');
  
  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady;
  }, [onTranscriptReady]);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setHasSupport(true);
      console.log('[WebSpeechRecognition] Web Speech API supported');
    } else {
      setHasSupport(false);
      console.log('[WebSpeechRecognition] Web Speech API not supported');
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!hasSupport || isListening) {
      console.log('[WebSpeechRecognition] Cannot start - not supported or already listening');
      return;
    }

    try {
      const SpeechRecognition = 
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError('Tarayıcınız ses tanıma özelliğini desteklemiyor');
        return;
      }

      const recognition = new SpeechRecognition() as WebSpeechRecognition;
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'tr-TR';
      recognition.maxAlternatives = 1;

      setIsListening(true);
      setTranscript('');
      setError('');
      lastTranscriptRef.current = '';

      console.log('[WebSpeechRecognition] Starting recognition...');

      // Handle results
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('[WebSpeechRecognition] Results received');
        
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcriptText;
            console.log('[WebSpeechRecognition] Final result:', transcriptText);
          } else {
            interimTranscript += transcriptText;
          }
        }

        // Update displayed transcript
        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        lastTranscriptRef.current = currentTranscript;

        // Reset silence timeout on new speech
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // Handle final results
        if (finalTranscript.trim()) {
          const cleanText = finalTranscript.trim();
          const stopWords = options?.stopOnKeywords || ['tamam', 'bitti', 'ok', 'kaydet', 'gönder'];
          const lowerText = cleanText.toLowerCase();
          
          // Check for stop keywords
          const foundStopWord = stopWords.find(word => 
            lowerText.endsWith(word.toLowerCase())
          );

          if (foundStopWord) {
            console.log('[WebSpeechRecognition] Stop word detected:', foundStopWord);
            // Remove the stop word from the text
            const commandIndex = lowerText.lastIndexOf(foundStopWord.toLowerCase());
            const cleanedText = cleanText.substring(0, commandIndex).trim();
            
            recognition.stop();
            
            if (cleanedText) {
              setTimeout(() => {
                onTranscriptReadyRef.current(cleanedText);
              }, 100);
            }
            return;
          }
        }

        // Set silence timeout for interim results
        if (options?.stopOnSilence !== false) {
          silenceTimeoutRef.current = setTimeout(() => {
            console.log('[WebSpeechRecognition] Silence timeout reached');
            if (lastTranscriptRef.current.trim()) {
              recognition.stop();
              setTimeout(() => {
                onTranscriptReadyRef.current(lastTranscriptRef.current.trim());
              }, 100);
            }
          }, 3000); // 3 second silence timeout
        }
      };

      // Handle errors
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[WebSpeechRecognition] Error:', event.error);
        setError(`Ses tanıma hatası: ${event.error}`);
        setIsListening(false);
        
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      };

      // Handle start
      recognition.onstart = () => {
        console.log('[WebSpeechRecognition] Recognition started');
        setIsListening(true);
        setError('');
      };

      // Handle end
      recognition.onend = () => {
        console.log('[WebSpeechRecognition] Recognition ended');
        setIsListening(false);
        
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // If we have transcript but haven't processed it yet (unexpected end)
        if (lastTranscriptRef.current.trim() && !options?.continuous) {
          setTimeout(() => {
            onTranscriptReadyRef.current(lastTranscriptRef.current.trim());
          }, 100);
        }
      };

      recognition.start();

    } catch (error) {
      console.error('[WebSpeechRecognition] Start failed:', error);
      setError('Ses tanıma başlatılamadı');
      setIsListening(false);
    }
  }, [hasSupport, isListening, options]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      console.log('[WebSpeechRecognition] Stopping recognition...');
      recognitionRef.current.stop();
      
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    }
  }, [isListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasSupport,
    error
  };
};