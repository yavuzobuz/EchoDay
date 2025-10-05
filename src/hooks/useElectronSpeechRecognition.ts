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
    
    // Sort keywords by length (longest first) to match longer phrases first
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    
    // Try to find and remove any stop keyword from the end
    for (const keyword of sortedKeywords) {
      const lowerKeyword = keyword.toLowerCase();
      const lowerCleaned = cleaned.toLowerCase();
      
      // Check if text ends with keyword (with or without punctuation)
      // Match: "keyword", "keyword.", "keyword!", "keyword,", "keyword?"
      const punctuationPattern = new RegExp(`\\s*${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s,.!?;:]*$`, 'i');
      
      if (punctuationPattern.test(cleaned)) {
        cleaned = cleaned.replace(punctuationPattern, '').trim();
        console.log(`[Electron SR] ✅ Removed stop keyword "${keyword}" from transcript`);
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
  const webSpeechRecognitionRef = useRef<any>(null);
  
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
      
      // Try Web Speech API for real-time keyword detection
      if (options?.stopOnKeywords && options.stopOnKeywords.length > 0) {
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
              const lowerTranscript = fullTranscript.toLowerCase();
              for (const keyword of options.stopOnKeywords) {
                if (lowerTranscript.includes(keyword.toLowerCase())) {
                  console.log(`[Electron SR] 🛑 STOP KEYWORD "${keyword}" DETECTED! Stopping...`);
                  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                  }
                  recognition.stop();
                  return;
                }
              }
            };
            
            recognition.onerror = (event: any) => {
              console.warn('[Electron SR] Web Speech error (will use manual stop):', event.error);
            };
            
            recognition.start();
            webSpeechRecognitionRef.current = recognition;
            console.log('[Electron SR] ✅ Web Speech API started for keyword detection');
            console.log('[Electron SR] 💡 Say: ' + options.stopOnKeywords.join(', '));
          } else {
            console.log('[Electron SR] ⚠️ Web Speech API not available - use manual stop');
          }
        } catch (error) {
          console.warn('[Electron SR] Web Speech failed (non-critical):', error);
        }
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