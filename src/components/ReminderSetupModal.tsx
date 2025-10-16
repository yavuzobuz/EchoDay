import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import { ReminderConfig } from '../types';

interface ReminderSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskDateTime: string | null;
  existingReminders: ReminderConfig[];
  onSave: (reminders: ReminderConfig[]) => void;
}

const ReminderSetupModal: React.FC<ReminderSetupModalProps> = ({
  isOpen,
  onClose,
  taskDateTime,
  existingReminders,
  onSave
}) => {
  const [reminders, setReminders] = useState<ReminderConfig[]>(existingReminders);
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  
  useEffect(() => {
    setReminders(existingReminders);
  }, [existingReminders]);
  
  const presetOptions = [
    { label: '5 dakika önce', minutes: 5 },
    { label: '10 dakika önce', minutes: 10 },
    { label: '15 dakika önce', minutes: 15 },
    { label: '30 dakika önce', minutes: 30 },
    { label: '1 saat önce', minutes: 60 },
    { label: '1 gün önce', minutes: 1440 },
    { label: '1 hafta önce', minutes: 10080 }
  ];
  
  const addPresetReminder = (minutes: number) => {
    if (!taskDateTime) {
      alert('Hatırlatma eklemek için görevin tarih ve saati belirlenmelidir.');
      return;
    }
    
    setReminders([...reminders, {
      id: uuidv4(),
      type: 'relative',
      minutesBefore: minutes,
      triggered: false
    }]);
  };
  
  const addCustomReminder = () => {
    if (!customDate || !customTime) {
      alert('Lütfen hatırlatma için tarih ve saat seçiniz.');
      return;
    }
    
    const [day, month, year] = customDate.split('/');
    if (!day || !month || !year || day.length !== 2 || month.length !== 2 || year.length !== 4) {
      alert('Lütfen geçerli bir tarih girin (gg/aa/yyyy formatında).');
      return;
    }
    
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const combinedDateTime = `${isoDate}T${customTime}:00`;
    
    setReminders([...reminders, {
      id: uuidv4(),
      type: 'absolute',
      absoluteTime: combinedDateTime,
      triggered: false
    }]);
    
    setCustomDate('');
    setCustomTime('');
  };
  
  const removeReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };
  
  const formatReminderDisplay = (reminder: ReminderConfig): string => {
    if (reminder.type === 'relative' && reminder.minutesBefore) {
      if (reminder.minutesBefore < 60) {
        return `${reminder.minutesBefore} dakika önce`;
      } else if (reminder.minutesBefore < 1440) {
        const hours = Math.floor(reminder.minutesBefore / 60);
        return `${hours} saat önce`;
      } else {
        const days = Math.floor(reminder.minutesBefore / 1440);
        return `${days} gün önce`;
      }
    } else if (reminder.type === 'absolute' && reminder.absoluteTime) {
      const date = new Date(reminder.absoluteTime);
      return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return 'Bilinmeyen';
  };

  const handleSave = () => {
    onSave(reminders);
    onClose();
  };
  
  // Body scroll lock when modal open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  
  const modalEl = (
    <div className="fixed inset-0 z-[20001] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overscrollBehavior: 'contain' }}>
      <div role="dialog" aria-modal="true" className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg" style={{ height: '600px', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
        
        {/* HEADER - SABIT */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hatırlatma Ayarları</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bu göreve birden fazla hatırlatma ekleyebilirsiniz</p>
        </div>
        
        {/* CONTENT - SCROLLABLE */}
        <div style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="p-6">
            
            {/* Mevcut Hatırlatmalar */}
            {reminders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mevcut Hatırlatmalar</h3>
                <div className="space-y-2">
                  {reminders.map(reminder => (
                    <div key={reminder.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <span className="text-sm text-gray-900 dark:text-white">{formatReminderDisplay(reminder)}</span>
                      <button onClick={() => removeReminder(reminder.id)} className="text-red-600 dark:text-red-400 text-xl leading-none" style={{ width: '24px', height: '24px' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Hızlı Ekleme */}
            {taskDateTime && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Hızlı Ekleme</h3>
                <div className="grid grid-cols-2 gap-2">
                  {presetOptions.map(preset => (
                    <button
                      key={preset.minutes}
                      onClick={() => addPresetReminder(preset.minutes)}
                      className="p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                      style={{ cursor: 'pointer' }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Özel Tarih/Saat */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Özel Tarih/Saat</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="16/10/2025"
                  value={customDate}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9\/]/g, '');
                    if (val.length <= 10) setCustomDate(val);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  style={{ outline: 'none' }}
                />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  style={{ outline: 'none' }}
                />
              </div>
              <button
                onClick={addCustomReminder}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                style={{ cursor: 'pointer' }}
              >
                Ekle
              </button>
            </div>
            
            {!taskDateTime && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">⚠️ Bu görevin tarih ve saati belirlenmemiş.</p>
              </div>
            )}
            
          </div>
        </div>
        
        {/* FOOTER - SABIT */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300" style={{ cursor: 'pointer' }}>İptal</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium" style={{ cursor: 'pointer' }}>Kaydet</button>
        </div>
        
      </div>
    </div>
  );

  return createPortal(modalEl, document.body);
};

export default ReminderSetupModal;
