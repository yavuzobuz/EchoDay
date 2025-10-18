import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface SpeechRecognitionOptions {
  stopOnKeywords?: string[];
  continuous?: boolean;
  stopOnSilence?: boolean;
}

export const useSpeechRecognitionUnified = (
  onTranscriptReady: (transcript: string) => void,
  options?: SpeechRecognitionOptions
) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  const recognitionActiveRef = useRef(false);
  const listenersRef = useRef<any[]>([]);
  
  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady;
  }, [onTranscriptReady]);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const result = await SpeechRecognition.available();

        setHasSupport(true);
        setIsAvailable(result.available);
        console.log('[SpeechRecognition] Available:', result.available);
      } catch (error) {
        console.log('[SpeechRecognition] Not available on web platform:', error.message || 'Capacitor feature not implemented');
        setHasSupport(false);
        setIsAvailable(false);
      }
    };

    checkAvailability();
  }, []);

  const startListening = useCallback(async () => {
    if (!hasSupport || !isAvailable || recognitionActiveRef.current) {
      console.log('[SpeechRecognition] Cannot start - not available or already active');
      return;
    }

    try {
      console.log('[SpeechRecognition] Starting...');
      
      // Request permissions first
      const permissionResult = await SpeechRecognition.requestPermissions();
      if (permissionResult.speechRecognition !== 'granted') {
        console.error('[SpeechRecognition] Permission denied');
        return;
      }

      // Start listening
      await SpeechRecognition.start({
        language: 'tr-TR',
        partialResults: options?.continuous ?? true,
        popup: false,
      });

      setIsListening(true);
      recognitionActiveRef.current = true;
      setTranscript('');
      
      console.log('[SpeechRecognition] Started successfully');

      // Set up result listener
      const partialResultsListener = await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        console.log('[SpeechRecognition] Partial results:', data);
        if (data.matches && data.matches.length > 0) {
          const text = data.matches[0];
          setTranscript(text);
        }
      });

      // Set up listening state listener for final results
      const listeningStateListener = await SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
        console.log('[SpeechRecognition] State changed:', data.status);
        if (data.status === 'stopped') {
          // When listening stops, process the final transcript
          if (transcript.trim()) {
            const finalText = transcript.trim();
            
            // Check for stop keywords
            const stopWords = options?.stopOnKeywords || ['tamam', 'bitti', 'ok', 'kaydet'];
            const lowerText = finalText.toLowerCase();
            
            const foundStopWord = stopWords.find(word => 
              lowerText.endsWith(word.toLowerCase())
            );

            if (foundStopWord) {
              // Remove the stop word from the text
              const commandIndex = lowerText.lastIndexOf(foundStopWord.toLowerCase());
              const cleanedText = finalText.substring(0, commandIndex).trim();
              
              if (cleanedText) {
                onTranscriptReadyRef.current(cleanedText);
              }
            } else if (!options?.continuous) {
              // For non-continuous mode, process the result
              onTranscriptReadyRef.current(finalText);
            }
          }
          
          setIsListening(false);
          recognitionActiveRef.current = false;
        }
      });

      // Store listeners for cleanup
      listenersRef.current = [partialResultsListener, listeningStateListener];

    } catch (error) {
      console.error('[SpeechRecognition] Start failed:', error);
      setIsListening(false);
      recognitionActiveRef.current = false;
    }
  }, [hasSupport, isAvailable, options]);

  const stopListening = useCallback(async () => {
    if (!recognitionActiveRef.current) {
      return;
    }

    try {
      console.log('[SpeechRecognition] Stopping...');
      await SpeechRecognition.stop();
      
      // Remove all listeners
      listenersRef.current.forEach(listener => {
        listener.remove();
      });
      listenersRef.current = [];
      
      setIsListening(false);
      recognitionActiveRef.current = false;
      console.log('[SpeechRecognition] Stopped');
    } catch (error) {
      console.error('[SpeechRecognition] Stop failed:', error);
      setIsListening(false);
      recognitionActiveRef.current = false;
      
      // Still try to cleanup listeners even if stop failed
      listenersRef.current.forEach(listener => {
        listener.remove();
      });
      listenersRef.current = [];
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionActiveRef.current) {
        stopListening();
      }
      // Also cleanup listeners if somehow missed
      listenersRef.current.forEach(listener => {
        listener.remove();
      });
      listenersRef.current = [];
    };
  }, [stopListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasSupport: hasSupport && isAvailable,
    isAvailable,
  };
};

// Named export for easier imports
export { useSpeechRecognitionUnified as useSpeechRecognition };
