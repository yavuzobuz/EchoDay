import { useState, useEffect, useCallback, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

export const useElectronSpeechRecognition = (
  onTranscriptReady: (transcript: string) => void,
  options?: { 
    continuous?: boolean; 
    stopOnKeywords?: string[] | boolean;
    realTimeMode?: boolean;
    onUserSpeaking?: (isSpeaking: boolean) => void;
  }
) => {
  const { lang } = useI18n();
  
  // Helper function to remove stop keywords from end of transcript
  const cleanStopKeywords = (text: string, keywords?: string[] | boolean): string => {
    // If keywords is boolean or not an array, return text as is
    if (!keywords || typeof keywords === 'boolean' || !Array.isArray(keywords) || keywords.length === 0) return text;

    let cleaned = text.trim();
    
    // Helper to escape regex metacharacters
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

    // Sort keywords by length (longest first) to match longer phrases first
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    
    // Use Turkish locale-aware case conversion
    const normalizedText = cleaned.toLocaleLowerCase('tr-TR');

    // Try to find and remove any stop keyword from the end with Turkish locale support
    for (const keyword of sortedKeywords) {
      const normalizedKeyword = keyword.toLocaleLowerCase('tr-TR');
      // Allow optional leading spaces before the keyword and optional trailing punctuation/space after, anchored to end of string
      const re = new RegExp(`(?:\\s*)${escapeRegex(normalizedKeyword)}(?:[\\s.,!?:;]*)$`);
      const match = normalizedText.match(re);
      if (match && match.index !== undefined) {
        // Remove the matched keyword from the original text, preserving original casing
        cleaned = text.substring(0, match.index).trim();
        break;
      }
    }

    return cleaned;
  };
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(false);

  // Auth (for per-user API key)
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStopTimerRef = useRef<number | null>(null);
  const webSpeechRecognitionRef = useRef<any>(null);
  const isElectronRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceDetectionTimerRef = useRef<number | null>(null);
  
  // Check if we're in Electron and MediaRecorder is available
  useEffect(() => {
    const isElectron = !!(window as any).isElectron || !!(window as any).electronAPI;
    isElectronRef.current = isElectron;
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    const hasGetUserMedia = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    const hasWebSpeechAPI = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    // Support both Electron (with MediaRecorder + Gemini STT) and browsers (with Web Speech API)
    setHasSupport((isElectron && hasMediaRecorder && hasGetUserMedia) || (!isElectron && hasWebSpeechAPI));
  }, []);
  
  const startListening = useCallback(async () => {
    if (!hasSupport || isListening) return;
    
    try {
      // For non-Electron browsers, use Web Speech API
      if (!isElectronRef.current && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        webSpeechRecognitionRef.current = recognition;
        
        recognition.continuous = options?.continuous || true;
        recognition.interimResults = true;
        recognition.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
        
        let finalTranscript = '';
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Update transcript with interim results
          setTranscript(finalTranscript + interimTranscript);
          
          // Check for stop keywords in final results
          if (finalTranscript) {
            const stopKeywordsArray = Array.isArray(options?.stopOnKeywords) 
              ? options.stopOnKeywords 
              : (options?.stopOnKeywords !== false 
                ? (lang === 'tr' 
                    ? ['tamam', 'bitti', 'bıttı', 'kaydet', 'kayıt', 'ok', 'oldu', 'tamamdır', 'bitirdim', 'bıtırdım']
                    : ['ok', 'done', 'finished', 'complete', 'save'])
                : undefined);
            
            const fullText = finalTranscript + interimTranscript;
            let shouldStop = false;
            
            if (stopKeywordsArray) {
              for (const keyword of stopKeywordsArray) {
                if (fullText.toLowerCase().includes(keyword.toLowerCase())) {
                  shouldStop = true;
                  break;
                }
              }
            }
            
            if (shouldStop) {
              recognition.stop();
            }
          }
        };
        
        recognition.onend = () => {
          const cleanedText = finalTranscript ? cleanStopKeywords(finalTranscript, 
            Array.isArray(options?.stopOnKeywords) 
              ? options.stopOnKeywords 
              : (options?.stopOnKeywords !== false 
                ? (lang === 'tr' 
                    ? ['tamam', 'bitti', 'bıttı', 'kaydet', 'kayıt', 'ok', 'oldu', 'tamamdır', 'bitirdim', 'bıtırdım']
                    : ['ok', 'done', 'finished', 'complete', 'save'])
                : undefined)
          ) : '';
          
          setTranscript(cleanedText);
          onTranscriptReady(cleanedText);
          setIsListening(false);
          webSpeechRecognitionRef.current = null;
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          webSpeechRecognitionRef.current = null;
        };
        
        recognition.start();
        setIsListening(true);
        return;
      }
      
      // Electron path: Get microphone access (bind to mediaDevices to avoid Illegal invocation)
      const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      const stream = await gum({ audio: true });
      streamRef.current = stream;
      
      // Create MediaRecorder with timeslice for chunked recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          // Remove data URL prefix
          const base64Data = base64Audio.split(',')[1];
          
          try {
            // Read API key - check Electron settings first, then fallback to localStorage
            const userScopedKey = `gemini-api-key_${userId}`;
            let apiKey = '';
            
            // Try Electron IPC first (if available)
            if ((window as any).electronAPI?.getSetting) {
              try {
                apiKey = await (window as any).electronAPI.getSetting(userScopedKey);
              } catch (e) {
                console.warn('[Electron SR] Failed to read from Electron settings:', e);
              }
            }
            
            // Fallback to localStorage
            if (!apiKey) {
              let raw = localStorage.getItem(userScopedKey) || '';
              if (!raw) raw = localStorage.getItem('gemini-api-key') || '';
              apiKey = raw && raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
            }
            
            if (!apiKey) {
              console.warn('❌ Gemini API anahtarı bulunamadı. Profil sayfasından ekleyin.');
              alert('⚠️ API anahtarı bulunamadı!\n\nLütfen Profil sayfasından Gemini API anahtarınızı ekleyin.');
              setTranscript('');
              onTranscriptReady('');
              return;
            }
            const text = await geminiService.speechToText(apiKey, base64Data, 'audio/webm');
            if (text) {
              // Clean stop keywords from transcript if they are provided as an array
              const stopKeywordsArray = Array.isArray(options?.stopOnKeywords) 
                ? options.stopOnKeywords 
                : (options?.stopOnKeywords !== false 
                  ? (lang === 'tr' 
                      ? ['tamam', 'bitti', 'bıttı', 'kaydet', 'kayıt', 'ok', 'oldu', 'tamamdır', 'bitirdim', 'bıtırdım']
                      : ['ok', 'done', 'finished', 'complete', 'save'])
                  : undefined);
              
              const cleanedText = stopKeywordsArray 
                ? cleanStopKeywords(text, stopKeywordsArray)
                : text;
              setTranscript(cleanedText);
              onTranscriptReady(cleanedText);
            } else {
              setTranscript('');
              onTranscriptReady('');
            }
          } catch (e: any) {
            if (e?.message === 'API_QUOTA_EXCEEDED') {
              console.warn('Gemini API günlük kullanım limiti aşıldı. Sesli komutlar geçici olarak devre dışı.');
              alert('⚠️ API kullanım limiti aşıldı. Lütfen manuel görev ekleme kullanın veya yarın tekrar deneyin.');
            } else {
              console.error('Speech-to-text işleminde hata:', e);
            }
            setTranscript('');
            onTranscriptReady('');
          }
        };
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Clean up audio analysis
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close();
            audioContextRef.current = null;
            analyserRef.current = null;
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        
        // Stop Web Speech Recognition if still active
        if (webSpeechRecognitionRef.current) {
          try {
            webSpeechRecognitionRef.current.stop();
            webSpeechRecognitionRef.current = null;
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        
        setIsListening(false);
      };
      
      // Stop keywords will be checked in the final Gemini transcript
      // No need to pre-calculate array here since Web Speech API is disabled
      
      // Audio level monitoring disabled - was causing premature stops
      // Only rely on keyword detection and manual stop
      
      // Start recording
      mediaRecorder.start();
      setIsListening(true);
      
      // Web Speech API disabled in Electron - causes network errors
      // Keywords will be detected only in the final Gemini transcript
      // Users should use manual stop (microphone button) to end recording
      
      // Auto-stop after 60 seconds to prevent infinite recording (safety measure)
      // Users should use keywords or manual stop for normal operation
      autoStopTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('[Electron SR] Auto-stopping after 60 seconds for safety');
          mediaRecorderRef.current.stop();
        }
      }, 60000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsListening(false);
    }
  }, [hasSupport, isListening, onTranscriptReady, options?.continuous, options?.stopOnKeywords, lang]);
  
  const stopListening = useCallback(() => {
    
    // Clear auto-stop timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    
    // Clear silence detection timer
    if (silenceDetectionTimerRef.current) {
      clearTimeout(silenceDetectionTimerRef.current);
      silenceDetectionTimerRef.current = null;
    }
    
    // Clean up audio analysis
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    // Stop Web Speech Recognition if active
    if (webSpeechRecognitionRef.current) {
      try {
        webSpeechRecognitionRef.current.stop();
        webSpeechRecognitionRef.current = null;
      } catch (e) {
        // Ignore errors when stopping
      }
    }
    
    // Clean up media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsListening(false);
  }, []);
  
  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasSupport,
    checkAndRequestPermission: async () => {
      try {
        // For Web Speech API, we don't need explicit media permission check
        if (!isElectronRef.current && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
          return true;
        }
        
        // For Electron, check microphone access
        const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        await gum({ audio: true });
        return true;
      } catch {
        return false;
      }
    }
  };
};
