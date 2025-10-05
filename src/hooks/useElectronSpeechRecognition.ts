import { useState, useEffect, useCallback, useRef } from 'react';
import { geminiService } from '../services/geminiService';

export const useElectronSpeechRecognition = (
  onTranscriptReady: (transcript: string) => void,
  options?: { continuous?: boolean; stopOnKeywords?: string[]; }
) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const keywordRecognitionRef = useRef<any>(null);
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
              setTranscript(text);
              onTranscriptReady(text);
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
      
      // Setup keyword detection using Web Speech API if available
      const WebSpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (WebSpeechAPI && options?.stopOnKeywords && options.stopOnKeywords.length > 0) {
        try {
          const recognition = new WebSpeechAPI();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'tr-TR';
          
          recognition.onresult = (event: any) => {
            const currentTranscript = Array.from(event.results)
              .map((result: any) => result[0])
              .map((result: any) => result.transcript)
              .join('')
              .toLowerCase()
              .trim();
            
            // Check if any stop keyword is present
            const stopKeywords = options.stopOnKeywords || [];
            const keywordDetected = stopKeywords.some(keyword => 
              currentTranscript.includes(keyword.toLowerCase())
            );
            
            if (keywordDetected) {
              console.log('[Electron SR] Stop keyword detected:', currentTranscript);
              // Stop both recognition and recording
              recognition.stop();
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
            }
          };
          
          recognition.onerror = (event: any) => {
            console.warn('[Electron SR] Keyword recognition error:', event.error);
            // Don't stop recording on recognition errors
          };
          
          recognition.start();
          keywordRecognitionRef.current = recognition;
        } catch (error) {
          console.warn('[Electron SR] Could not start keyword detection:', error);
        }
      }
      
      // Auto-stop after 10 seconds if continuous is false
      if (!options?.continuous) {
        autoStopTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          if (keywordRecognitionRef.current) {
            keywordRecognitionRef.current.stop();
          }
        }, 10000);
      }
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsListening(false);
    }
  }, [hasSupport, isListening, onTranscriptReady, options?.continuous]);
  
  const stopListening = useCallback(() => {
    // Clear auto-stop timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    
    // Stop keyword recognition
    if (keywordRecognitionRef.current) {
      try {
        keywordRecognitionRef.current.stop();
      } catch (e) {
        console.warn('[Electron SR] Error stopping keyword recognition:', e);
      }
      keywordRecognitionRef.current = null;
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