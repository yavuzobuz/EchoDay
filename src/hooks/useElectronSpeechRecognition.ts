import { useState, useEffect, useCallback, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

export const useElectronSpeechRecognition = (
  onTranscriptReady: (transcript: string) => void,
  options?: { continuous?: boolean; stopOnKeywords?: string[]; }
) => {
  // Helper function to remove stop keywords from end of transcript
  const cleanStopKeywords = (text: string, keywords?: string[]): string => {
    if (!keywords || keywords.length === 0) return text;

    let cleaned = text.trim();
    console.log('[Electron SR] 🧹 Cleaning transcript:', cleaned);
    console.log('[Electron SR] 🔍 Looking for keywords:', keywords);

    // Helper to escape regex metacharacters
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Sort keywords by length (longest first) to match longer phrases first
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

    // Try to find and remove any stop keyword from the end (case-insensitive, no lowercasing to avoid Turkish case mapping issues)
    for (const keyword of sortedKeywords) {
      // Allow optional leading spaces before the keyword and optional trailing punctuation/space after, anchored to end of string
      const re = new RegExp(`(?:\\s*)${escapeRegex(keyword)}(?:[\\s.,!?:;]*)$`, 'i');
      if (re.test(cleaned)) {
        cleaned = cleaned.replace(re, '').trim();
        console.log(`[Electron SR] ✅ Removed stop keyword "${keyword}" from transcript`);
        console.log('[Electron SR] 📝 Result:', cleaned);
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
  
  // Check if we're in Electron and MediaRecorder is available
  useEffect(() => {
    const isElectron = !!(window as any).isElectron || !!(window as any).electronAPI;
    isElectronRef.current = isElectron;
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    const hasGetUserMedia = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    
    setHasSupport(isElectron && hasMediaRecorder && hasGetUserMedia);
  }, []);
  
  const startListening = useCallback(async () => {
    if (!hasSupport || isListening) return;
    
    try {
      // Get microphone access (bind to mediaDevices to avoid Illegal invocation)
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
                console.log('[Electron SR] API key from Electron settings:', apiKey ? '✅ Found' : '❌ Not found');
              } catch (e) {
                console.warn('[Electron SR] Failed to read from Electron settings:', e);
              }
            }
            
            // Fallback to localStorage
            if (!apiKey) {
              let raw = localStorage.getItem(userScopedKey) || '';
              if (!raw) raw = localStorage.getItem('gemini-api-key') || '';
              apiKey = raw && raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
              console.log('[Electron SR] API key from localStorage:', apiKey ? '✅ Found' : '❌ Not found');
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
              // Clean stop keywords from transcript
              const cleanedText = cleanStopKeywords(text, options?.stopOnKeywords);
              console.log('[Electron SR] Final transcript (cleaned):', cleanedText);
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
        setIsListening(false);
      };
      
      // Start recording
      mediaRecorder.start();
      setIsListening(true);
      
      console.log('[Electron SR] MediaRecorder started');
      console.log('[Electron SR] Stop keywords:', options?.stopOnKeywords);
      
      // Try Web Speech API for real-time keyword detection only when NOT running in Electron
      if (!isElectronRef.current && options?.stopOnKeywords && options.stopOnKeywords.length > 0) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'tr-TR';
            recognition.continuous = true;
            recognition.interimResults = true;
            
            recognition.onresult = (event: any) => {
              const results = event.results;
              let fullTranscript = '';
              for (let i = 0; i < results.length; i++) {
                fullTranscript += results[i][0].transcript + ' ';
              }
              
              console.log('[Electron SR] 🎙️ Live:', fullTranscript.trim());
              
              // Check for stop keywords
              if (!options?.stopOnKeywords) return;
              
              const lowerTranscript = fullTranscript.toLowerCase();
              for (const keyword of options.stopOnKeywords) {
                if (lowerTranscript.includes(keyword.toLowerCase())) {
                  console.log(`[Electron SR] 🛑 STOP KEYWORD \"${keyword}\" DETECTED! Stopping...`);
                  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                  }
                  recognition.stop();
                  return;
                }
              }
            };
            
            recognition.onerror = (event: any) => {
              console.error('[Electron SR] ❌ Web Speech API ERROR:', event.error);
            };
            
            recognition.start();
            webSpeechRecognitionRef.current = recognition;
            console.log('[Electron SR] ✅ Web Speech API started for keyword detection');
            console.log('[Electron SR] 💡 Say one of these to STOP: ' + options.stopOnKeywords.join(', ').toUpperCase());
          } else {
            console.log('[Electron SR] ⚠️ Web Speech API not available');
          }
        } catch (error) {
          console.error('[Electron SR] ❌ Web Speech startup failed:', error);
        }
      } else if (isElectronRef.current && options?.stopOnKeywords && options.stopOnKeywords.length > 0) {
        console.log('[Electron SR] Keyword auto-stop via Web Speech is disabled in Electron. Use manual stop or timeout.');
      }
      
      // Auto-stop after 15 seconds if continuous is false (increased from 10 to give more time)
      if (!options?.continuous) {
        autoStopTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('[Electron SR] Auto-stopping after timeout');
            mediaRecorderRef.current.stop();
          }
        }, 15000);
      }
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsListening(false);
    }
  }, [hasSupport, isListening, onTranscriptReady, options?.continuous]);
  
  const stopListening = useCallback(() => {
    console.log('[Electron SR] Manual stop requested');
    
    // Clear auto-stop timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
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
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);
  
  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasSupport,
    checkAndRequestPermission: async () => {
      try {
        const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        await gum({ audio: true });
        return true;
      } catch {
        return false;
      }
    }
  };
};