import { useState, useEffect, useCallback, useRef } from 'react';
import { geminiService } from '../services/geminiService';

export const useElectronSpeechRecognition = (
  onTranscriptReady: (transcript: string) => void,
  options?: { continuous?: boolean; stopOnKeywords?: string[]; }
) => {
  // Helper function to remove stop keywords from end of transcript
  const cleanStopKeywords = (text: string, keywords?: string[]): string => {
    if (!keywords || keywords.length === 0) return text;
    
    let cleaned = text.trim();
    const lowerText = cleaned.toLowerCase();
    
    // Check if text ends with any stop keyword
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerText.endsWith(lowerKeyword)) {
        // Remove the keyword from the end
        cleaned = cleaned.slice(0, -(lowerKeyword.length)).trim();
        console.log(`[Electron SR] Removed stop keyword "${keyword}" from transcript`);
        break;
      }
      // Also check with common punctuation
      if (lowerText.endsWith(lowerKeyword + '.') || 
          lowerText.endsWith(lowerKeyword + '!') ||
          lowerText.endsWith(lowerKeyword + ',')) {
        cleaned = cleaned.slice(0, -(lowerKeyword.length + 1)).trim();
        console.log(`[Electron SR] Removed stop keyword "${keyword}" (with punctuation) from transcript`);
        break;
      }
    }
    
    return cleaned;
  };
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStopTimerRef = useRef<number | null>(null);
  
  // Check if we're in Electron and MediaRecorder is available
  useEffect(() => {
    const isElectron = !!(window as any).isElectron || !!(window as any).electronAPI;
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
      
      // Create MediaRecorder
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
            // Read API key from localStorage (same key used in App.tsx)
            const raw = localStorage.getItem('gemini-api-key') || '';
            const apiKey = raw && raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
            if (!apiKey) {
              console.warn('Gemini API anahtarı bulunamadı. Profil sayfasından ekleyin.');
              setTranscript('');
              onTranscriptReady('');
              return;
            }
            const text = await geminiService.speechToText(apiKey, base64Data, 'audio/webm');
            if (text) {
              // Clean stop keywords from transcript
              const cleanedText = cleanStopKeywords(text, options?.stopOnKeywords);
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
      
      // NOTE: Keyword detection via Web Speech API is disabled in Electron
      // because it causes network errors and doesn't work reliably in Electron.
      // Users should manually click the mic button to stop recording,
      // or the recording will auto-stop after the timeout.
      console.log('[Electron SR] Keyword detection disabled in Electron (use manual stop or timeout)');
      
      // Web Speech API keyword detection is NOT used in Electron
      // because Electron/Chromium has issues with Web Speech API network access
      
      // Auto-stop after 10 seconds if continuous is false
      if (!options?.continuous) {
        autoStopTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('[Electron SR] Auto-stopping after timeout');
            mediaRecorderRef.current.stop();
          }
        }, 10000);
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