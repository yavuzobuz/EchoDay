import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
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
  // Mobil (Capacitor) için event dinleyicileri
  const mobileListenersRef = useRef<PluginListenerHandle[] | null>(null);
  const isStoppingRef = useRef(false);
  
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
      
      // Web API cleanup
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
        recognitionRef.current = null;
      }

      // Mobile (Capacitor) dinleyicilerini kaldır
      if (mobileListenersRef.current) {
        mobileListenersRef.current.forEach((h) => h.remove());
        mobileListenersRef.current = null;
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
      setIsListening(false);
      
      // Handle specific error cases
      if (event.error === 'not-allowed') {
        // Check actual permission state
        if (navigator.permissions) {
          navigator.permissions.query({name: 'microphone'}).then(result => {
            const permState = result.state;
            
            // Mobil için detaylı alert
            alert(`🎤 Mikrofon Sorunu:\n\nDurum: ${permState}\nProtokol: ${window.location.protocol}\nGüvenli: ${window.isSecureContext}\n\nÇözüm: Tarayıcı adres çubuğundaki mikrofon simgesine bas → "Allow" seç`);
          }).catch(e => {
            alert(`🎤 Mikrofon izni sorunu!\n\nHata: ${e.message || 'Bilinmeyen'}\nProtokol: ${window.location.protocol}\n\nÇözüm: Tarayıcı ayarlarından mikrofon iznini ver`);
          });
        } else {
          alert(`🎤 Mikrofon Sorunu!\n\nTarayıcınız Permission API'yi desteklemiyor.\nProtokol: ${window.location.protocol}\n\nHTTPS gerekli!`);
        }
      } else if (event.error === 'no-speech') {
        // Bu normal bir durum, kullanıcıyı uyarmaya gerek yok
      } else if (event.error === 'audio-capture') {
        alert('Ses kaydı başarısız. Mikrofonunuzun düzgün çalıştığından emin olun.');
      } else if (event.error === 'network') {
        alert('Ağ hatası. İnternet bağlantınızı kontrol edin.');
      } else if (event.error === 'service-not-allowed') {
        alert('Ses tanıma servisi izin verilmedi.');
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
    if (!hasSupport) return;
    if (isListening) {
      return;
    }
    
    // Eğer zaten durduruluyorsa, başlatma
    if (isStoppingRef.current) {
      return;
    }
    
    // Reset retry counter on new start
    retryCountRef.current = 0;
    
    // Web Speech API kullan (Electron dahil)
    if (isWeb) {
      // Enhanced mobile permission check
      try {
        // First, test actual microphone access with getUserMedia
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000
          }
        });
        
        // If we get here, we have mic access - stop the stream immediately
        stream.getTracks().forEach(track => track.stop());
        
      } catch (micError) {
        
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
          
          if (permission.state === 'denied') {
            alert('Mikrofon izni reddedilmiş. Tarayıcı ayarlarından mikrofon iznini aktifleştirin.');
            return;
          }
        } catch (e) {
          // Permission API check failed
        }
      }
      
      try {
        // Eğer zaten dinliyorsak, önce durdur
        if (isListening && recognitionRef.current) {
          isStoppingRef.current = true;
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore stop errors
          }
          recognitionRef.current = null;
          setIsListening(false);
          // Kısa bir bekleme süresi ekle
          await new Promise(resolve => setTimeout(resolve, 100));
          isStoppingRef.current = false;
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
          
          recognitionRef.current.start();
          setIsListening(true);
        }
      } catch (error) {
        setIsListening(false);
          
        // Check if this is a security/permission issue
        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            alert('Mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini verin.');
          } else if (error.name === 'NotSupportedError') {
            alert('Bu tarayıcıda ses tanıma desteklenmiyor.');
          } else if (error.name === 'ServiceNotAvailableError') {
            alert('Ses tanıma servisi şu anda kullanılamıyor. İnternet bağlantınızı kontrol edin.');
          } else if (error.name === 'InvalidStateError') {
            // Bu durumda sadece uyarı ver, hata mesajı gösterme
            return;
          }
        } else {
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
          alert('Mikrofon iznine erişilemiyor. Lütfen cihaz ayarlarını kontrol edin.');
          setHasSupport(false);
          return;
        }
        
        // Önce eski dinleyicileri kaldır
        if (mobileListenersRef.current) {
          mobileListenersRef.current.forEach(h => h.remove());
          mobileListenersRef.current = null;
        }

        // Event dinleyicileri ekle (partial ve final sonuçlar)
        const listeners: PluginListenerHandle[] = [];

        const extractText = (data: any): string => {
          const m = (data && (data.matches || data.value || data.transcript || data.text)) || '';
          if (Array.isArray(m)) return m.join(' ').trim();
          return String(m || '').trim();
        };

        const stopWordsOption = options?.stopOnKeywords;
        const useStopWords = stopWordsOption !== false;

        const shouldStopOnKeywords = (raw: string): { triggered: boolean; cleaned?: string } => {
          if (!useStopWords) return { triggered: false };
          const normalizedTranscript = raw.toLocaleLowerCase('tr-TR').trim();
          let stopWords = ['tamam', 'bitti', 'bıttı', 'kaydet', 'kayıt', 'ekle', 'oluştur', 'ok'];
          if (Array.isArray(stopWordsOption)) {
            stopWords = stopWordsOption;
          }
          const normalizedStopWords = stopWords.map(w => w.toLocaleLowerCase('tr-TR'));
          const sorted = [...normalizedStopWords].sort((a, b) => b.length - a.length);
          const hit = sorted.find(word => {
            const pattern = new RegExp(`\\s*${word.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*[.,!?]*\\s*$`);
            return pattern.test(normalizedTranscript);
          });
          if (!hit) return { triggered: false };
          const pattern = new RegExp(`\\s*${hit.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*[.,!?]*\\s*$`);
          const match = normalizedTranscript.match(pattern);
          if (match && match.index !== undefined) {
            const cleaned = raw.substring(0, match.index).trim();
            return { triggered: true, cleaned };
          }
          return { triggered: true };
        };

        // Partial results - update live text and optionally stop on keywords
        listeners.push(await SpeechRecognition.addListener('partialResults', (data: any) => {
          const text = extractText(data);
          if (text) {
            setTranscript(text);
            const decision = shouldStopOnKeywords(text);
            if (decision.triggered && !isStoppingRef.current) {
              isStoppingRef.current = true;
              const cleaned = (decision.cleaned || text).trim();
              cleanedTranscriptRef.current = cleaned;
              if (!transcriptReadyCalledRef.current && cleaned) {
                transcriptReadyCalledRef.current = true;
                onTranscriptReadyRef.current(cleaned);
              }
              setIsListening(false);
              // Asenkron durdur - bir kez çağır
              SpeechRecognition.stop().catch(() => {}).finally(() => {
                setTimeout(() => { isStoppingRef.current = false; }, 500);
              });
            }
          }
        }));

        // Listening state - sadece state güncellemesi için
        listeners.push(await SpeechRecognition.addListener('listeningState', (data: any) => {
          if (data?.status === 'stopped' && !isStoppingRef.current) {
            setIsListening(false);
            const finalText = (cleanedTranscriptRef.current || finalTranscriptRef.current || '').trim();
            if (!transcriptReadyCalledRef.current && finalText) {
              transcriptReadyCalledRef.current = true;
              onTranscriptReadyRef.current(finalText);
            }
            cleanedTranscriptRef.current = null;
          }
        }));

        mobileListenersRef.current = listeners;

        // İzin alındı, şimdi dinlemeyi başlat
        try {
          transcriptReadyCalledRef.current = false;
          cleanedTranscriptRef.current = null;
          isStoppingRef.current = false;
          setTranscript('');
          setIsListening(true);
          
          await SpeechRecognition.start({
            language: 'tr-TR',
            partialResults: true,
            popup: false,
          });
        } catch (startError) {
          // Başlatma hatası
          setIsListening(false);
          alert('Sesli tanıma başlatılamadı. Lütfen tekrar deneyin.');
          // Dinleyicileri temizle
          if (mobileListenersRef.current) {
            mobileListenersRef.current.forEach(h => h.remove());
            mobileListenersRef.current = null;
          }
        }
      } catch (e) {
        // Genel hata - modül yüklenemedi
        setIsListening(false);
        setHasSupport(false);
        alert('Sesli tanıma özelliği bu cihazda kullanılamıyor.');
      }
    }
  }, [isListening, hasSupport, isWeb, setupRecognitionHandlers]);

  const stopListening = useCallback(async () => {
    // Eğer zaten durduruluyorsa, tekrar çağırma
    if (isStoppingRef.current) {
      return;
    }
    
    // Dinlemiyorsa bile devam et - zorla durdur
    // Bu, UI state ve gerçek mikrofon state'i arasındaki senkronizasyon sorunlarını çözer
    
    if (isWeb) {
      // Web Speech API durdur (Electron dahil)
      
      // Zorla durdurma bayrağını ayarla
      isStoppingRef.current = true;
      
      if (recognitionRef.current) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Stop hatası yoksayıldı
        }
        // Clean up the instance after stopping
        recognitionRef.current = null;
        setIsListening(false);
      } else {
        setIsListening(false);
      }
      
      // Bayrağı sıfırla
      setTimeout(() => { isStoppingRef.current = false; }, 300);
    } else {
      // Capacitor durdur - bir kez çağır
      isStoppingRef.current = true;
      
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        setIsListening(false);
        
        // Stop çağır
        await SpeechRecognition.stop().catch(() => {});
        
        const finalText = (cleanedTranscriptRef.current || finalTranscriptRef.current || '').trim();
        if (!transcriptReadyCalledRef.current && finalText) {
          transcriptReadyCalledRef.current = true;
          onTranscriptReadyRef.current(finalText);
        }
        setTranscript('');
        cleanedTranscriptRef.current = null;
      } catch (e) {
        setIsListening(false);
      } finally {
        if (mobileListenersRef.current) {
          mobileListenersRef.current.forEach(h => h.remove());
          mobileListenersRef.current = null;
        }
        // Reset flag
        setTimeout(() => { isStoppingRef.current = false; }, 500);
      }
    }
  }, [isWeb]);
  
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