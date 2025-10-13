import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useElectronSpeechRecognition } from './useElectronSpeechRecognition';
import { speechRecognitionManager } from './speechRecognitionManager';

// Web Speech API types
interface WebSpeechRecognition {
  new (): WebSpeechRecognition;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

const WebSpeechRecognitionAPI = 
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = (
  onTranscriptReady: (transcript: string) => void,
  options?: { stopOnKeywords?: boolean | string[]; stopOnSilence?: boolean; continuous?: boolean; }
) => {
  // All hooks must be called before any conditional logic
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSupport, setHasSupport] = useState(false);
  
  // All useRef hooks at the top
  const retryCountRef = useRef(0);
  const isElectronRef = useRef(false);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const transcriptReadyCalledRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const cleanedTranscriptRef = useRef<string | null>(null);
  const finalTranscriptRef = useRef('');
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  
  // Platform detection after all hooks
  const isWeb = Capacitor.getPlatform() === 'web';
  
  // Update refs in useEffect hooks
  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady;
  }, [onTranscriptReady]);
  
  useEffect(() => {
    finalTranscriptRef.current = transcript;
  }, [transcript]);
  
  // Platform desteğini kontrol et - singleton manager kullan
  useEffect(() => {
    if (isWeb) {
      // Web platformunda singleton manager ile kontrol et
      const { hasSupport: webHasSupport, isElectron } = speechRecognitionManager.checkSupport();
      isElectronRef.current = isElectron;
      setHasSupport(webHasSupport);
    } else {
      // Mobil platformlarda Capacitor desteğini kontrol et
      import('@capacitor-community/speech-recognition').then(({ SpeechRecognition }) => {
        SpeechRecognition.available()
          .then(result => {
            setHasSupport(result.available);
          })
          .catch(() => {
            setHasSupport(false);
          });
      });
    }
  }, [isWeb]);
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
      // Clean up if this instance was listening
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
        recognitionRef.current = null;
      }
    };
  }, [isListening]);
  
  // Setup recognition handlers when starting to listen
  const setupRecognitionHandlers = useCallback((rec: WebSpeechRecognition) => {
    const stopWordsOption = options?.stopOnKeywords;
    const useStopWords = stopWordsOption !== false;
    const continuous = options?.continuous ?? true;
    const stopOnSilence = options?.stopOnSilence ?? false;

    rec.continuous = continuous;
    rec.interimResults = continuous;
    rec.lang = 'tr-TR';

    rec.onresult = (event: any) => {
      const currentTranscript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');
      
      setTranscript(currentTranscript);

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
        // Use Turkish locale-aware case conversion for better matching
        const normalizedTranscript = currentTranscript.toLocaleLowerCase('tr-TR').trim();
        
        // Turkish final phrases that should stop recording
        // Include both i/ı variations to handle Turkish case conversion properly
        // Note: BITTI -> bıttı, bitti -> bitti
        let stopWords = ['tamam', 'bitti', 'bıttı', 'kaydet', 'kayıt', 'ok'];
        if (Array.isArray(stopWordsOption)) {
            stopWords = stopWordsOption;
        }
        
        // Normalize stop words to Turkish lowercase for consistent matching
        const normalizedStopWords = stopWords.map(word => word.toLocaleLowerCase('tr-TR'));
        const sortedStopWords = [...normalizedStopWords].sort((a, b) => b.length - a.length);
        
        // Find the stop word that matches at the end of transcript
        const stopWordTriggered = sortedStopWords.find(word => {
          // Check if transcript ends with the stop word (with optional punctuation/spaces)
          const pattern = new RegExp(`\\s*${word.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*[.,!?]*\\s*$`);
          return pattern.test(normalizedTranscript);
        });

        if (stopWordTriggered) {
          // Find the position where the stop word starts
          const pattern = new RegExp(`\\s*${stopWordTriggered.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*[.,!?]*\\s*$`);
          const match = normalizedTranscript.match(pattern);
          if (match && match.index !== undefined) {
            const command = currentTranscript.substring(0, match.index).trim();
            cleanedTranscriptRef.current = command;
            rec.stop();
          }
        }
      }
    };

    rec.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error event:', event.error, event);
      setIsListening(false);
      
      // Handle specific error cases
      if (event.error === 'not-allowed') {
        const debugInfo = {
          error: 'not-allowed',
          hasPermissionsAPI: !!navigator.permissions,
          url: window.location.href,
          isSecure: window.isSecureContext,
          protocol: window.location.protocol,
          userAgent: navigator.userAgent.substring(0, 50) + '...'
        };
        
        console.error('[SpeechRecognition] Microphone permission denied:', debugInfo);
        
        // Check actual permission state
        if (navigator.permissions) {
          navigator.permissions.query({name: 'microphone'}).then(result => {
            const permState = result.state;
            console.error('[SpeechRecognition] Permission state:', permState);
            
            // Mobil için detaylı alert
            alert(`🎤 Mikrofon Sorunu:\n\nDurum: ${permState}\nProtokol: ${window.location.protocol}\nGüvenli: ${window.isSecureContext}\n\nÇözüm: Tarayıcı adres çubuğundaki mikrofon simgesine bas → "Allow" seç`);
          }).catch(e => {
            console.error('[SpeechRecognition] Permission query failed:', e);
            alert(`🎤 Mikrofon izni sorunu!\n\nHata: ${e.message || 'Bilinmeyen'}\nProtokol: ${window.location.protocol}\n\nÇözüm: Tarayıcı ayarlarından mikrofon iznini ver`);
          });
        } else {
          alert(`🎤 Mikrofon Sorunu!\n\nTarayıcınız Permission API'yi desteklemiyor.\nProtokol: ${window.location.protocol}\n\nHTTPS gerekli!`);
        }
      } else if (event.error === 'no-speech') {
        console.warn('[SpeechRecognition] No speech detected');
        // Bu normal bir durum, kullanıcıyı uyarmaya gerek yok
      } else if (event.error === 'audio-capture') {
        console.error('[SpeechRecognition] Audio capture failed');
        alert('Ses kaydı başarısız. Mikrofonunuzun düzgün çalıştığından emin olun.');
      } else if (event.error === 'network') {
        console.error('[SpeechRecognition] Network error');
        alert('Ağ hatası. İnternet bağlantınızı kontrol edin.');
      } else if (event.error === 'service-not-allowed') {
        console.error('[SpeechRecognition] Service not allowed');
        alert('Ses tanıma servisi izin verilmedi.');
      } else {
        console.error('[SpeechRecognition] Unknown error:', event.error);
      }
    };

    rec.onend = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsListening(false);

      const transcriptToSend = cleanedTranscriptRef.current ?? finalTranscriptRef.current;
      
      if (!transcriptReadyCalledRef.current && transcriptToSend.trim()) {
         transcriptReadyCalledRef.current = true;
         onTranscriptReadyRef.current(transcriptToSend.trim());
      }

      cleanedTranscriptRef.current = null;
    };
  }, [options, hasSupport, setIsListening, setTranscript, setHasSupport, onTranscriptReadyRef, finalTranscriptRef]);
  
  const startListening = useCallback(async () => {
    if (!hasSupport || isListening) return;
    
    // Reset retry counter on new start
    retryCountRef.current = 0;
    
    // Web Speech API kullan (Electron dahil)
    if (isWeb) {
      // Enhanced mobile permission check
      try {
        // First, test actual microphone access with getUserMedia
        console.log('[SpeechRecognition] Testing microphone access...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000
          }
        });
        
        // If we get here, we have mic access - stop the stream immediately
        stream.getTracks().forEach(track => track.stop());
        console.log('[SpeechRecognition] Microphone access confirmed');
        
      } catch (micError) {
        console.error('[SpeechRecognition] Microphone access failed:', micError);
        
        let errorMsg = '🎤 Mikrofon Erişim Hatası\n\n';
        
        const error = micError as Error;
        if (error.name === 'NotAllowedError') {
          errorMsg += 'İzin reddedildi.\n\n';
          errorMsg += 'Çözüm:\n';
          errorMsg += '1. Tarayıcı adres çubuğundaki mikrofon 🎤 simgesine bas\n';
          errorMsg += '2. "Allow" veya "İzin Ver" seç\n';
          errorMsg += '3. Sayfayı yenile ve tekrar dene';
        } else if (error.name === 'NotFoundError') {
          errorMsg += 'Mikrofon bulunamadı.\n\nLütfen mikrofonunuzun düzgün bağlı olduğundan emin olun.';
        } else if (error.name === 'NotReadableError') {
          errorMsg += 'Mikrofon başka bir uygulama tarafından kullanılıyor.';
        } else {
          errorMsg += `Hata: ${error.message || 'Bilinmeyen hata'}`;
        }
        
        alert(errorMsg);
        return;
      }
      
      // Additional permission API check if available
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({name: 'microphone'});
          console.log('[SpeechRecognition] Permission API state:', permission.state);
          
          if (permission.state === 'denied') {
            alert('Mikrofon izni reddedilmiş. Tarayıcı ayarlarından mikrofon iznini aktifleştirin.');
            return;
          }
        } catch (e) {
          console.warn('[SpeechRecognition] Permission API check failed:', e);
        }
      }
      
      try {
        // Eğer zaten dinliyorsak, önce durdur
        if (isListening && recognitionRef.current) {
          console.log('[SpeechRecognition] Already listening, stopping first...');
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore stop errors
          }
          recognitionRef.current = null;
          setIsListening(false);
          // Kısa bir bekleme süresi ekle
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Create a new recognition instance for this listening session
        if (!recognitionRef.current) {
          const rec = speechRecognitionManager.createRecognitionInstance();
          recognitionRef.current = rec;
          setupRecognitionHandlers(rec);
        }
        
        if (recognitionRef.current) {
          transcriptReadyCalledRef.current = false;
          cleanedTranscriptRef.current = null;
          setTranscript('');
          
          console.log('[SpeechRecognition] Starting speech recognition...');
          recognitionRef.current.start();
          setIsListening(true);
        }
      } catch (error) {
        console.error('[SpeechRecognition] Failed to start:', error);
        setIsListening(false);
          
        // Check if this is a security/permission issue
        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            console.error('[SpeechRecognition] Mikrophone permission denied');
            alert('Mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini verin.');
          } else if (error.name === 'NotSupportedError') {
            console.error('[SpeechRecognition] Not supported in this context');
            alert('Bu tarayıcıda ses tanıma desteklenmiyor.');
          } else if (error.name === 'ServiceNotAvailableError') {
            console.error('[SpeechRecognition] Service not available');
            alert('Ses tanıma servisi şu anda kullanılamıyor. İnternet bağlantınızı kontrol edin.');
          } else if (error.name === 'InvalidStateError') {
            console.warn('[SpeechRecognition] Recognition already started, ignoring...');
            // Bu durumda sadece uyarı ver, hata mesajı gösterme
            return;
          }
        } else {
          console.error('[SpeechRecognition] Unexpected error:', error);
          alert('Ses tanıma başlatılırken beklenmeyen bir hata oluştu.');
        }
        // Clean up instance if start failed
        if (recognitionRef.current) {
          recognitionRef.current = null;
        }
      }
    } else {
      // Capacitor kullan (dinamik import) - Android/iOS
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        
        // İzinleri kontrol et - güvenli bir şekilde
        let hasPermission = false;
        try {
          const permission = await SpeechRecognition.checkPermissions();
          hasPermission = permission.speechRecognition === 'granted';
          
          if (!hasPermission) {
            // İzin iste
            const permissionResult = await SpeechRecognition.requestPermissions();
            hasPermission = permissionResult.speechRecognition === 'granted';
            
            if (!hasPermission) {
              // İzin reddedildi - kullanıcıya bilgi ver
              alert('Mikrofon izni gerekli. Lütfen ayarlardan mikrofon iznini açın veya klavye ile yazın.');
              return;
            }
          }
        } catch (permError) {
          // İzin kontrolü/isteği başarısız - graceful fallback
          console.error('İzin hatası:', permError);
          alert('Mikrofon iznine erişilemiyor. Lütfen cihaz ayarlarını kontrol edin.');
          setHasSupport(false);
          return;
        }
        
        // İzin alındı, şimdi dinlemeyi başlat
        try {
          setIsListening(true);
          setTranscript('');
          
          await SpeechRecognition.start({
            language: 'tr-TR',
            partialResults: true,
            popup: false,
          });
        } catch (startError) {
          // Başlatma hatası
          console.error('Sesli tanıma başlatma hatası:', startError);
          setIsListening(false);
          alert('Sesli tanıma başlatılamadı. Lütfen tekrar deneyin.');
        }
      } catch (e) {
        // Genel hata - modül yüklenemedi
        console.error("Konuşma tanıma modülü yüklenemedi:", e);
        setIsListening(false);
        setHasSupport(false);
        alert('Sesli tanıma özelliği bu cihazda kullanılamıyor.');
      }
    }
  }, [isListening, hasSupport, isWeb, setupRecognitionHandlers]);

  const stopListening = useCallback(async () => {
    if (!isListening) return;
    
    if (isWeb) {
      // Web Speech API durdur (Electron dahil)
      if (recognitionRef.current) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
        // Clean up the instance after stopping
        recognitionRef.current = null;
        setIsListening(false);
      }
    } else {
      // Capacitor durdur
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        await SpeechRecognition.stop();
        setIsListening(false);
        
        if (finalTranscriptRef.current.trim()) {
           onTranscriptReadyRef.current(finalTranscriptRef.current.trim());
        }
        setTranscript('');
      } catch (e) {
        console.error("Konuşma tanıma durdurulamadı:", e);
      }
    }
  }, [isListening, isWeb]);
  
  const checkAndRequestPermission = useCallback(async () => {
    if (!hasSupport) return;
    
    if (!isWeb) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        const permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== 'granted') {
            await SpeechRecognition.requestPermissions();
        }
      } catch (e) {
        // Permission check failed - silent
      }
    }
    // Web için otomatik olarak tarayıcı soracak
  }, [hasSupport, isWeb]);

  // Electron fallback hook - ALWAYS use in Electron because Web Speech API has network issues
  const electronSR = useElectronSpeechRecognition((t) => onTranscriptReadyRef.current(t), { 
    continuous: options?.continuous,
    stopOnKeywords: typeof options?.stopOnKeywords === 'boolean' ? undefined : options?.stopOnKeywords
  });

  // Check if running in Electron
  const isElectron = isElectronRef.current;
  
  // ALWAYS use Electron SR in Electron environment (Web Speech API causes network errors)
  if (isWeb && isElectron) {
    return {
      isListening: electronSR.isListening,
      transcript: electronSR.transcript,
      startListening: electronSR.startListening,
      stopListening: electronSR.stopListening,
      hasSupport: electronSR.hasSupport,
      checkAndRequestPermission: electronSR.checkAndRequestPermission || (() => Promise.resolve()),
    };
  }
  
  // Fallback to Electron SR if Web Speech API not available
  const useElectronFallback = !WebSpeechRecognitionAPI && isWeb;

  if (useElectronFallback) {
    return {
      isListening: electronSR.isListening,
      transcript: electronSR.transcript,
      startListening: electronSR.startListening,
      stopListening: electronSR.stopListening,
      hasSupport: electronSR.hasSupport,
      checkAndRequestPermission: electronSR.checkAndRequestPermission || (() => Promise.resolve()),
    };
  }

  return { isListening, transcript, startListening, stopListening, hasSupport, checkAndRequestPermission };
};