import React, { useState, useEffect } from 'react';
import { ReminderConfig, ReminderType } from '../types';

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
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customDateTime, setCustomDateTime] = useState<string>('');
  
  useEffect(() => {
    setReminders(existingReminders);
  }, [existingReminders]);
  
  // Preset reminder options (in minutes)
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
    
    const newReminder: ReminderConfig = {
      id: `reminder_${Date.now()}_${Math.random()}`,
      type: 'relative',
      minutesBefore: minutes,
      triggered: false
    };
    
    setReminders([...reminders, newReminder]);
    setSelectedPreset(null);
  };
  
  const addCustomReminder = () => {
    if (!customDateTime) {
      alert('Lütfen hatırlatma için tarih ve saat seçiniz.');
      return;
    }
    
    const newReminder: ReminderConfig = {
      id: `reminder_${Date.now()}_${Math.random()}`,
      type: 'absolute',
      absoluteTime: customDateTime,
      triggered: false
    };
    
    setReminders([...reminders, newReminder]);
    setCustomDateTime('');
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
        day: 'numeric',
        month: 'short',
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
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Hatırlatma Ayarları
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Bu göreve birden fazla hatırlatma ekleyebilirsiniz
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {/* Existing Reminders */}
          {reminders.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Mevcut Hatırlatmalar
              </h3>
              <div className="space-y-2">
                {reminders.map(reminder => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-blue-600 dark:text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatReminderDisplay(reminder)}
                      </span>
                      {reminder.snoozedCount && reminder.snoozedCount > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          (Ertelendi: {reminder.snoozedCount}x)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeReminder(reminder.id)}
                      className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                      aria-label="Hatırlatmayı sil"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Preset Options */}
          {taskDateTime && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Hızlı Ekleme
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {presetOptions.map(preset => (
                  <button
                    key={preset.minutes}
                    onClick={() => addPresetReminder(preset.minutes)}
                    className="p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-[var(--accent-color-50)] dark:hover:bg-[var(--accent-color-900)] hover:border-[var(--accent-color-500)] transition-colors text-gray-700 dark:text-gray-300"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Custom DateTime Reminder */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Özel Tarih/Saat
            </h3>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
              />
              <button
                onClick={addCustomReminder}
                className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-lg hover:bg-[var(--accent-color-700)] transition-colors text-sm font-medium"
              >
                Ekle
              </button>
            </div>
          </div>
          
          {!taskDateTime && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Bu görevin tarih ve saati belirlenmemiş. Göreceli hatırlatmalar eklemek için önce görevin tarihini ayarlayın.
              </p>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-lg hover:bg-[var(--accent-color-700)] transition-colors font-medium"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReminderSetupModal;
