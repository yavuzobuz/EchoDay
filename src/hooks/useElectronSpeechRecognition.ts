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
  const fullTranscriptRef = useRef<string>('');
  
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
      fullTranscriptRef.current = ''; // Reset full transcript
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Real-time keyword detection: analyze this chunk
          if (options?.stopOnKeywords && options.stopOnKeywords.length > 0 && mediaRecorder.state === 'recording') {
            try {
              const chunkBlob = new Blob([event.data], { type: 'audio/webm' });
              const chunkReader = new FileReader();
              
              chunkReader.onloadend = async () => {
                try {
                  const base64Audio = chunkReader.result as string;
                  const base64Data = base64Audio.split(',')[1];
                  
                  const raw = localStorage.getItem('gemini-api-key') || '';
                  const apiKey = raw && raw.startsWith('\"') && raw.endsWith('\"') ? JSON.parse(raw) : raw;
                  
                  if (apiKey) {
                    const chunkText = await geminiService.speechToText(apiKey, base64Data, 'audio/webm');
                    if (chunkText) {
                      fullTranscriptRef.current += ' ' + chunkText;
                      console.log('[Electron SR] 🔊 Chunk transcript:', chunkText);
                      
                      // Check for stop keywords in this chunk
                      const lowerChunkText = chunkText.toLowerCase();
                      for (const keyword of options.stopOnKeywords) {
                        if (lowerChunkText.includes(keyword.toLowerCase())) {
                          console.log(`[Electron SR] 🛑 STOP KEYWORD "${keyword}" DETECTED! Stopping...`);
                          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                            mediaRecorderRef.current.stop();
                          }
                          return;
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.warn('[Electron SR] Chunk analysis error (non-critical):', e);
                }
              };
              
              chunkReader.readAsDataURL(chunkBlob);
            } catch (e) {
              console.warn('[Electron SR] Chunk processing error:', e);
            }
          }
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
            // Use full transcript from chunks if available, otherwise process the complete audio
            let finalText = fullTranscriptRef.current.trim();
            
            // If no chunks were processed, analyze the complete audio
            if (!finalText) {
              finalText = await geminiService.speechToText(apiKey, base64Data, 'audio/webm') || '';
            }
            
            if (finalText) {
              // Clean stop keywords from transcript
              const cleanedText = cleanStopKeywords(finalText, options?.stopOnKeywords);
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
      
      // Start recording with timeslice for real-time keyword detection
      // This creates chunks every 2 seconds that we can analyze
      mediaRecorder.start(2000); // 2 second chunks
      setIsListening(true);
      
      console.log('[Electron SR] MediaRecorder started with 2-second chunking for keyword detection');
      console.log('[Electron SR] Stop keywords:', options?.stopOnKeywords);
      console.log('[Electron SR] 💡 Say one of these words to stop recording:', options?.stopOnKeywords?.join(', '));
      
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