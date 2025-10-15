import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognitionUnified';
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
  const { t, lang } = useI18n();
  const [isElectron] = useState(() => {
    return !!(window as any).isElectron || !!(window as any).electronAPI;
  });

  // Geo reminder state (optional)
  const [useGeoReminder, setUseGeoReminder] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoRadius, setGeoRadius] = useState<number>(200);
  const [geoTrigger, setGeoTrigger] = useState<'near' | 'enter' | 'exit'>('near');

  const handleTranscript = (transcript: string) => {
    
    // Otomatik görev ekleme komutlarını kontrol et
    const addTaskCommands = lang === 'tr' 
      ? ['tamam', 'bitti', 'kaydet', 'ekle', 'oluştur', 'ok', 'gönder', 'tamamdır', 'bitirdim']
      : ['ok', 'done', 'finished', 'complete', 'that\'s it', 'save', 'create', 'add', 'send'];
      
    const lowerTranscript = transcript.toLowerCase().trim();
    const foundCommand = addTaskCommands.find(cmd => 
      lowerTranscript.endsWith(cmd.toLowerCase())
    );
    
    if (foundCommand) {
      // Komut bulundu - komutu temizle ve görevi otomatik ekle (mobil ve Electron)
      const commandIndex = lowerTranscript.lastIndexOf(foundCommand.toLowerCase());
      const cleanedTranscript = transcript.substring(0, commandIndex).trim();
      
      if (cleanedTranscript) {
        // Dinlemeyi güvenli şekilde durdur
        try { (stopListening as any)?.(); } catch {}
        
        console.log(`[TaskModal] Komut "${foundCommand}" algılandı, görev ekleniyor:`, cleanedTranscript);
        onAddTask(cleanedTranscript, undefined, undefined, undefined);
        setDescription('');
        onClose();
        return;
      }
    }
    
    // Normal transcript güncelleme
    setDescription(transcript);
  };

  const { isListening, transcript, startListening, stopListening, hasSupport } = useSpeechRecognition(
    handleTranscript,
    { 
      stopOnKeywords: ['tamam', 'bitti', 'kaydet', 'kayıt', 'ekle', 'oluştur', 'ok'], // Turkish final phrases
      continuous: true // Allow longer speech input
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
          {isListening && isElectron && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs md:text-xs text-blue-700 dark:text-blue-300">
                🎤 <strong>Dinliyor...</strong> Konuşmanızı bitirdiğinizde <strong>mikrofon butonuna tekrar basın</strong>.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                💡 İpucu: "tamam", "bitti", "kaydet" gibi kelimeler metin işlendikten sonra otomatik silinir.
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
            <button 
              type="button"
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
              onClick={() => {
                console.log('[TaskModal] Mic toggle click', { isListening, hasSupport });
                try {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                } catch {}
              }}
              className="p-3 rounded-full bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] active:scale-95 transition-all shadow-lg hover:shadow-xl"
              title={t('taskModal.mic.start','Mikrofonu aç/kapat')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <button 
              type="button"
              className="p-3 rounded-full bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] active:scale-95 transition-all shadow-lg hover:shadow-xl"
              title={t('taskModal.mic.start','Basılı tutarak sesli görev kaydet')}
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
