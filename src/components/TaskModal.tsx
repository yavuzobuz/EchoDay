import React, { useState, useEffect, useRef } from 'react';
import { useNativeSpeechRecognition } from '../hooks/useNativeSpeechRecognition';
import { MobileModal, ModalActions } from './MobileModal';
import { getCurrentCoords } from '../services/locationService';
import type { GeoReminder } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (description: string, imageBase64?: string, imageMimeType?: string, extra?: { locationReminder?: GeoReminder }) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onAddTask }) => {
  const [description, setDescription] = useState('');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const isProcessingRef = useRef(false); // useRef kullan - closure sorununu çöz
  const { t } = useI18n();

  // Geo reminder state (optional)
  const [useGeoReminder, setUseGeoReminder] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoRadius, setGeoRadius] = useState<number>(200);
  const [geoTrigger, setGeoTrigger] = useState<'near' | 'enter' | 'exit'>('near');

  // Final transcript geldiğinde direkt görev ekle
  // (Stop kelimeleri zaten hook tarafından temizlenmiş olarak geliyor)
  const handleTranscript = (transcript: string) => {
    console.log('[TaskModal] Final transcript received:', transcript);
    
    // Duplikasyonu önle - useRef ile GERÇEK kontrol
    if (isProcessingRef.current) {
      console.log('[TaskModal] ❌ Already processing, skipping duplicate');
      return;
    }
    
    if (transcript.trim()) {
      // İşleme başla - flag'i HEMEN set et
      isProcessingRef.current = true;
      console.log('[TaskModal] ✅ Görev ekleniyor:', transcript);
      
      // Geo reminder varsa ekle
      const extra = (useGeoReminder && geoCoords) ? { 
        locationReminder: {
          lat: geoCoords.lat,
          lng: geoCoords.lng,
          radius: geoRadius,
          trigger: geoTrigger,
          enabled: true as const,
        }
      } : undefined;
      
      onAddTask(transcript.trim(), undefined, undefined, extra);
      setDescription('');
      
      // Modal kapatıldıktan sonra processing flag'i sıfırla
      setTimeout(() => {
        onClose();
        setTimeout(() => {
          isProcessingRef.current = false;
          console.log('[TaskModal] 🔄 Processing flag reset');
        }, 200);
      }, 100);
    }
  };

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    hasSupport
  } = useNativeSpeechRecognition(
    (finalTranscript: string) => {
      console.log('[TaskModal] Final transcript:', finalTranscript);
      if (finalTranscript.trim()) {
        handleTranscript(finalTranscript);
      }
    },
    {
      stopOnKeywords: ['tamam', 'bitti', 'kaydet', 'kayıt', 'ekle', 'oluştur', 'ok'],
      continuous: true,
      stopOnSilence: true // Kullanıcı konuşmayı bitirdiğinde 2 saniye sessizlikten sonra durdur
    }
  );
  
  
  useEffect(() => {
    if (isListening) {
      setDescription(transcript);
    }
  }, [transcript, isListening]);
  
  // Clear description when modal opens and stop mic on close
  useEffect(() => {
    if (isOpen) {
      setDescription('');
      isProcessingRef.current = false; // Reset processing flag on open
    } else {
      try { (stopListening as any)?.(); } catch {}
    }
  }, [isOpen, stopListening]);

  // Emergency auto-stop after 15s to avoid stuck mic
  useEffect(() => {
    if (!isListening) return;
    const t = setTimeout(() => {
      try { (stopListening as any)?.(); } catch {}
    }, 15000);
    return () => clearTimeout(t);
  }, [isListening, stopListening]);

  // Listen for permission denied modal events
  useEffect(() => {
    const handlePermissionModal = (event: any) => {
      if (event.detail?.showTextInput) {
        setShowPermissionHelp(true);
      }
    };
    
    window.addEventListener('showTextInputModal', handlePermissionModal);
    return () => window.removeEventListener('showTextInputModal', handlePermissionModal);
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      const extra = (useGeoReminder && geoCoords) ? { locationReminder: {
        lat: geoCoords.lat,
        lng: geoCoords.lng,
        radius: geoRadius,
        trigger: geoTrigger,
        enabled: true as const,
      }} : undefined;
      onAddTask(description.trim(), undefined, undefined, extra);
      setDescription('');
      onClose();
    }
  };

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('taskModal.title','Yeni Görev Ekle')}
      fullScreen={false}
      swipeToClose={true}
    >
      <div>
        <div className="space-y-4">
          {/* Enhanced Speech Recognition Info */}
          {isListening && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs md:text-xs font-medium text-blue-700 dark:text-blue-300">
                🎤 <strong>Dinliyor...</strong> 🌐 Online Mod
              </p>
              <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                🌐 Google sunucularını kullanıyor
              </p>
              <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                💡 İpucu: "tamam", "bitti", "kaydet" söylürseniz otomatik kaydeder
              </p>
            </div>
          )}

          {/* Geo Reminder Section */}
          <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
            <label className="flex items-center gap-3 min-h-[44px]">
              <input 
                type="checkbox" 
                checked={useGeoReminder} 
                onChange={(e) => setUseGeoReminder(e.target.checked)} 
                className="h-6 w-6 accent-[var(--accent-color-600)] border-gray-300 rounded-md flex-shrink-0"
              />
              <span className="text-sm font-medium">{t('taskModal.geo.enable','Konum tabanlı hatırlatıcı ekle')}</span>
            </label>

            {useGeoReminder && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const coords = await getCurrentCoords();
                      if (coords) setGeoCoords(coords);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    {t('taskModal.geo.useCurrent','Şu anki konumumu kullan')}
                  </button>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {geoCoords ? `Lat: ${geoCoords.lat.toFixed(5)}, Lng: ${geoCoords.lng.toFixed(5)}` : t('taskModal.geo.notFetched','Konum alınmadı')}
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-300">{t('taskModal.geo.radius','Yarıçap (m)')}</label>
                  <input type="number" min={50} step={50} value={geoRadius} onChange={(e) => setGeoRadius(parseInt(e.target.value || '200', 10))} className="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm" />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-300">{t('taskModal.geo.trigger','Tetik')}</label>
                  <select value={geoTrigger} onChange={(e) => setGeoTrigger(e.target.value as any)} className="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm">
                    <option value="near">{t('taskModal.geo.trigger.near','Yakındayken')}</option>
                    <option value="enter">{t('taskModal.geo.trigger.enter','Bölgeye girince')}</option>
                    <option value="exit">{t('taskModal.geo.trigger.exit','Bölgeden çıkınca')}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {showPermissionHelp && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-red-100 dark:bg-red-900/50">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                    Mikrofon İzni Gerekli
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                    Android'de sesli görev eklemek için mikrofon iznine ihtiyacım var. 
                    İzni vermek için:
                  </p>
                  <ol className="text-sm text-red-700 dark:text-red-300 list-decimal ml-4 space-y-1 mb-3">
                    <li>Uygulama ayarlarına git</li>
                    <li>"İzinler" bölümüne tıkla</li>
                    <li>"Mikrofon" iznini aktifleştir</li>
                    <li>Uygulamayı yeniden başlat</li>
                  </ol>
                  <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                    💡 <strong>Alternatif:</strong> Yukarıdaki metin kutusunu kullanarak yazarak da görev ekleyebilirsin!
                  </p>
                  <button 
                    onClick={() => setShowPermissionHelp(false)}
                    className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    Tamam
                  </button>
                </div>
              </div>
            </div>
          )}


          {!hasSupport && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Ses girişi desteklenmiyor:</strong><br/>
                • HTTPS bağlantısı gerekli (HTTP'de çalışmaz)<br/>
                • Modern tarayıcı gerekli (Chrome, Firefox, Safari)<br/>
                • Mikrofon izni verilmeli<br/>
                <small>Mevcut protokol: {window.location.protocol}</small>
              </p>
            </div>
          )}
        </div>

        {/* Messages-style Input Area */}
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 mt-6">
          <div className="flex-1 relative">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isListening ? t('taskModal.listening','Dinleniyor...') : t('taskModal.placeholder','Görevinizi yazın veya mikrofon ile söyleyin...')}
              className="w-full px-4 py-3 pr-12 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color-600)]/50 text-sm"
            />
            {/* Emoji shortcut button */}
            <button 
              type="button"
              onClick={() => setDescription(prev => prev + ' 😀')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          
          {description.trim() ? (
            <button 
              type="submit" 
              className="p-3 rounded-full bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] transition-all shadow-lg hover:shadow-xl"
              title={t('taskModal.add','Ekle')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          ) : hasSupport ? (
            <button 
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                console.log('[TaskModal] 🎤 Mikrofon durumu:', { isListening, hasSupport });
                try {
                  if (isListening) {
                    console.log('[TaskModal] Mikrofon durduruluyor...');
                    await stopListening();
                  } else {
                    console.log('[TaskModal] Mikrofon başlatılıyor...');
                    await startListening();
                  }
                } catch (error) {
                  console.error('[TaskModal] Mikrofon toggle hatası:', error);
                }
              }}
              className={`p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] text-white'
              }`}
              title={isListening ? t('taskModal.mic.stop', 'Mikrofonu durdur') : t('taskModal.mic.start','Mikrofonu başlat')}
            >
              {isListening ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <rect x="6" y="6" width="12" height="12" rx="2" ry="2"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ) : (
            <button 
              type="button"
              disabled
              className="p-3 rounded-full bg-gray-400 cursor-not-allowed opacity-50 shadow-lg"
              title={t('taskModal.mic.notSupported','Mikrofon desteklenmiyor')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </form>

        <ModalActions className="mt-4">
          <button
            type="button"
            onClick={onClose}
            className="
              w-full px-4 py-3
              bg-gray-200 dark:bg-gray-600
              text-gray-800 dark:text-gray-200
              rounded-lg font-medium
              hover:bg-gray-300 dark:hover:bg-gray-500
              active:scale-95
              transition-all duration-150
            "
          >
            {t('common.cancel','İptal')}
          </button>
        </ModalActions>
      </div>
    </MobileModal>
  );
};

export default TaskModal;
