import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';
import { OfflineSpeechPlugin, OfflineSpeechOptions, SpeechRecognitionResult } from '../interfaces/OfflineSpeech';

// Register the custom plugin
const OfflineSpeech = registerPlugin<OfflineSpeechPlugin>('OfflineSpeech');

export interface UseEnhancedSpeechRecognitionOptions extends OfflineSpeechOptions {
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: { code: number; message: string; recoverable: boolean }) => void;
  onStateChange?: (state: 'idle' | 'listening' | 'processing' | 'error') => void;
  stopOnKeywords?: string[];
  continuous?: boolean;
}

export const useEnhancedSpeechRecognition = (options: UseEnhancedSpeechRecognitionOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  const [currentMode, setCurrentMode] = useState<'offline' | 'online' | 'hybrid'>('offline');
  const [accuracy] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  const listenersRef = useRef<PluginListenerHandle[]>([]);
  const optionsRef = useRef(options);
  const fallbackAttempted = useRef(false);
  const listenerSetupDone = useRef(false);
  
  // Platform detection
  const platform = Capacitor.getPlatform();
  const isNative = platform !== 'web';
  
  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  
  // Initialize plugin and check availability
  useEffect(() => {
    const initializePlugin = async () => {
      if (!isNative) {
        // Web fallback - use existing Web Speech API
        const webSupport = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
        setIsAvailable(webSupport);
        setIsOfflineAvailable(false);
        setCurrentMode('online');
        return;
      }
      
      try {
        console.log('[EnhancedSpeech] Checking offline speech availability...');
        const availability = await OfflineSpeech.isAvailable();
        console.log('[EnhancedSpeech] Offline speech available:', availability.available);
        
        setIsAvailable(true);
        setIsOfflineAvailable(availability.available);
        setCurrentMode(availability.available ? 'offline' : 'online');
      } catch (error) {
        console.error('[EnhancedSpeech] Failed to check availability:', error);
        setIsAvailable(false);
        setIsOfflineAvailable(false);
      }
    };
    
    initializePlugin();
  }, [isNative]);
  
  // Setup event listeners for native plugin (only once)
  useEffect(() => {
    if (!isNative || !isAvailable || listenerSetupDone.current) return;
    
    const setupListeners = async () => {
      try {
        console.log('[EnhancedSpeech] Setting up event listeners...');
        
        // Results listener
        const resultsListener = await OfflineSpeech.addListener('speechResults', (data) => {
          console.log('[EnhancedSpeech] 🎯 Final results received:', data);
          const bestResult = data.results?.[0] || '';
          console.log('[EnhancedSpeech] Best result text:', bestResult);
          
          if (!bestResult) {
            console.warn('[EnhancedSpeech] Result is empty!');
            setIsListening(false);
            return;
          }
          
          setTranscript(bestResult);
          
          // Check for stop keywords
          if (optionsRef.current.stopOnKeywords && bestResult) {
            const lowerResult = bestResult.toLowerCase();
            const hasStopKeyword = optionsRef.current.stopOnKeywords.some(keyword => 
              lowerResult.includes(keyword.toLowerCase())
            );
            
            if (hasStopKeyword) {
              console.log('[EnhancedSpeech] Stop keyword detected, cleaning result');
              const cleanedResult = bestResult.replace(
                new RegExp(optionsRef.current.stopOnKeywords.join('|'), 'gi'), 
                ''
              ).trim();
              
              const result: SpeechRecognitionResult = {
                text: cleanedResult,
                confidence: 0.95,
                isFinal: true,
                isOffline: currentMode === 'offline',
                source: currentMode
              };
              
              console.log('[EnhancedSpeech] ✅ Calling onResult with cleaned:', cleanedResult);
              optionsRef.current.onResult?.(result);
              setIsListening(false);
              return;
            }
          }
          
          const result: SpeechRecognitionResult = {
            text: bestResult,
            confidence: 0.95,
            isFinal: true,
            isOffline: currentMode === 'offline',
            source: currentMode
          };
          
          console.log('[EnhancedSpeech] ✅ Calling onResult with:', bestResult);
          optionsRef.current.onResult?.(result);
          setIsListening(false);
        });
        
        // Partial results listener
        const partialListener = await OfflineSpeech.addListener('speechPartialResults', (data) => {
          console.log('[EnhancedSpeech] Partial result:', data.text);
          setTranscript(data.text);
          
          const result: SpeechRecognitionResult = {
            text: data.text,
            confidence: 0.7, // Partial results have lower confidence
            isFinal: false,
            isOffline: currentMode === 'offline',
            source: currentMode
          };
          
          optionsRef.current.onResult?.(result);
        });
        
        // Error listener
        const errorListener = await OfflineSpeech.addListener('speechError', (data) => {
          console.error('[EnhancedSpeech] Error:', data);
          setIsListening(false);
          setError(data.error);
          
          // Handle fallback logic
          if (data.suggestOffline && currentMode === 'online' && !fallbackAttempted.current) {
            console.log('[EnhancedSpeech] Network error, attempting offline fallback...');
            fallbackAttempted.current = true;
            setCurrentMode('offline');
            // Retry with offline mode
            setTimeout(() => startListening(), 500);
            return;
          }
          
          if (data.isNetworkError && currentMode === 'offline' && !fallbackAttempted.current) {
            console.log('[EnhancedSpeech] Offline failed, attempting online fallback...');
            fallbackAttempted.current = true;
            setCurrentMode('online');
            // Retry with online mode
            setTimeout(() => startListening(), 500);
            return;
          }
          
          // Don't show errors for no match or timeout
          if (!data.shouldShowError) {
            optionsRef.current.onStateChange?.('idle');
            return;
          }
          
          const errorInfo = {
            code: data.errorCode,
            message: data.error,
            recoverable: data.suggestOffline || false
          };
          
          optionsRef.current.onError?.(errorInfo);
          optionsRef.current.onStateChange?.('error');
        });
        
        // State change listener
        const stateListener = await OfflineSpeech.addListener('speechStateChange', (data) => {
          console.log('[EnhancedSpeech] State change:', data.status);
          
          switch (data.status) {
            case 'ready':
              optionsRef.current.onStateChange?.('listening');
              break;
            case 'speaking':
              optionsRef.current.onStateChange?.('processing');
              break;
            case 'ended':
              optionsRef.current.onStateChange?.('idle');
              break;
          }
        });
        
        listenersRef.current = [resultsListener, partialListener, errorListener, stateListener];
        console.log('[EnhancedSpeech] Event listeners setup complete');
        
      } catch (error) {
        console.error('[EnhancedSpeech] Failed to setup listeners:', error);
      }
    };
    
    setupListeners();
    listenerSetupDone.current = true;
    
    return () => {
      // Cleanup on unmount
      if (listenersRef.current.length > 0) {
        listenersRef.current.forEach(listener => listener.remove());
        listenersRef.current = [];
      }
    };
  }, [isNative, isAvailable]);
  
  const startListening = useCallback(async () => {
    if (!isAvailable || isListening) return;
    
    setError(null);
    setTranscript('');
    fallbackAttempted.current = false;
    
    console.log(`[EnhancedSpeech] Starting recognition in ${currentMode} mode...`);
    
    if (isNative) {
      try {
        const preferOffline = currentMode === 'offline' && isOfflineAvailable;
        
        await OfflineSpeech.startListening({
          preferOffline,
          language: options.language || 'tr-TR'
        });
        
        setIsListening(true);
        optionsRef.current.onStateChange?.('listening');
        
      } catch (error: any) {
        console.error('[EnhancedSpeech] Failed to start recognition:', error);
        setError(error.message || 'Failed to start recognition');
        optionsRef.current.onError?.({
          code: -1,
          message: error.message || 'Failed to start recognition',
          recoverable: true
        });
      }
    } else {
      // Web fallback implementation
      await startWebSpeechRecognition();
    }
  }, [isAvailable, isListening, currentMode, isOfflineAvailable, options.language, isNative]);
  
  const stopListening = useCallback(async () => {
    if (!isListening) return;
    
    console.log('[EnhancedSpeech] Stopping recognition...');
    
    if (isNative) {
      try {
        await OfflineSpeech.stopListening();
      } catch (error) {
        console.error('[EnhancedSpeech] Error stopping recognition:', error);
      }
    } else {
      // Stop web recognition
      // Implementation for web
    }
    
    setIsListening(false);
    optionsRef.current.onStateChange?.('idle');
  }, [isListening, isNative]);
  
  const cancel = useCallback(async () => {
    if (!isListening) return;
    
    console.log('[EnhancedSpeech] Cancelling recognition...');
    
    if (isNative) {
      try {
        await OfflineSpeech.cancel();
      } catch (error) {
        console.error('[EnhancedSpeech] Error cancelling recognition:', error);
      }
    }
    
    setIsListening(false);
    setTranscript('');
    optionsRef.current.onStateChange?.('idle');
  }, [isListening, isNative]);
  
  // Web Speech API fallback
  const startWebSpeechRecognition = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Web Speech API not supported');
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = options.continuous ?? true;
    recognition.interimResults = true;
    recognition.lang = options.language || 'tr-TR';
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      
      setTranscript(transcript);
      
      const isFinal = event.results[event.results.length - 1]?.isFinal;
      const result: SpeechRecognitionResult = {
        text: transcript,
        confidence: event.results[event.results.length - 1]?.[0]?.confidence || 0.8,
        isFinal,
        isOffline: false,
        source: 'online'
      };
      
      optionsRef.current.onResult?.(result);
      
      if (isFinal) {
        setIsListening(false);
        optionsRef.current.onStateChange?.('idle');
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('[EnhancedSpeech] Web Speech error:', event.error);
      setError(event.error);
      setIsListening(false);
      
      optionsRef.current.onError?.({
        code: -1,
        message: event.error,
        recoverable: event.error === 'network'
      });
    };
    
    recognition.onend = () => {
      setIsListening(false);
      optionsRef.current.onStateChange?.('idle');
    };
    
    recognition.start();
    setIsListening(true);
    optionsRef.current.onStateChange?.('listening');
  }, [options.continuous, options.language]);
  
  return {
    isListening,
    transcript,
    isAvailable,
    isOfflineAvailable,
    currentMode,
    accuracy,
    error,
    startListening,
    stopListening,
    cancel,
    setMode: setCurrentMode
  };
};