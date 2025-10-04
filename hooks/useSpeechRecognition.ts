import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognition {
  new (): SpeechRecognition;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

const SpeechRecognition =
  (window as any).SpeechRecognition || 
  (window as any).webkitSpeechRecognition ||
  (window as any).mozSpeechRecognition ||
  (window as any).msSpeechRecognition;

export const useSpeechRecognition = (
  onTranscriptReady: (transcript: string) => void,
  options?: { stopOnKeywords?: boolean | string[]; stopOnSilence?: boolean; continuous?: boolean; }
) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptReadyCalledRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const cleanedTranscriptRef = useRef<string | null>(null);

  const onTranscriptReadyRef = useRef(onTranscriptReady);
  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady;
  }, [onTranscriptReady]);
  
  const finalTranscriptRef = useRef('');
  useEffect(() => {
    finalTranscriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.error('Speech Recognition API not supported in this browser.');
      return;
    }
    
    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    const stopWordsOption = options?.stopOnKeywords;
    const useStopWords = stopWordsOption !== false;
    const continuous = options?.continuous ?? true; // Default to continuous for backward compatibility
    const stopOnSilence = options?.stopOnSilence ?? false;

    rec.continuous = continuous; 
    rec.interimResults = continuous; // Tie interim results to continuous mode for simplicity
    rec.lang = 'tr-TR';

    rec.onresult = (event: any) => {
      const currentTranscript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');
      
      setTranscript(currentTranscript);

      // Only use custom silence detection if in continuous mode
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
      if (event.error === 'network') {
        console.error('Network error in speech recognition. This might be due to offline status or security restrictions.');
        // Try to restart in case of network error in Electron
        if ((window as any).electronAPI) {
          console.log('Electron app detected - attempting workaround for network error');
          setTimeout(() => {
            if (!isListening && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                setIsListening(true);
              } catch (e) {
                console.error('Failed to restart speech recognition:', e);
                setIsListening(false);
              }
            }
          }, 1000);
        }
      }
      setIsListening(false);
    };

    rec.onend = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      // CRITICAL FIX: Set listening to false *before* processing the transcript.
      // This prevents race conditions where the parent component state doesn't update correctly.
      setIsListening(false);

      const transcriptToSend = cleanedTranscriptRef.current ?? finalTranscriptRef.current;
      
      if (!transcriptReadyCalledRef.current && transcriptToSend.trim()) {
         transcriptReadyCalledRef.current = true;
         onTranscriptReadyRef.current(transcriptToSend.trim());
      }

      // Reset for the next session
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
  }, [options]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      transcriptReadyCalledRef.current = false;
      cleanedTranscriptRef.current = null;
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognitionRef.current.stop();
      // Immediately update UI state for better responsiveness and to prevent getting stuck
      setIsListening(false);
    }
  }, [isListening]);
  
  const hasSupport = !!SpeechRecognition;

  return { isListening, transcript, startListening, stopListening, hasSupport };
};