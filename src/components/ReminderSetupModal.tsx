import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ReminderConfig } from '../types';
import { MobileModal, ModalSection, ModalActions } from './MobileModal';

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
    setReminders(prev => ([...prev, {
      id: uuidv4(),
      type: 'relative',
      minutesBefore: minutes,
      triggered: false
    }]));
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

    setReminders(prev => ([...prev, {
      id: uuidv4(),
      type: 'absolute',
      absoluteTime: combinedDateTime,
      triggered: false
    }]));

    setCustomDate('');
    setCustomTime('');
  };

  const removeReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
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

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <div className="text-xl font-bold">Hatırlatma Ayarları</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bu göreve birden fazla hatırlatma ekleyebilirsiniz</div>
        </div>
      }
      fullScreen={false}
      swipeToClose={false}
      className="animate-none md:animate-none"
    >
      <div className="space-y-6">
        {reminders.length > 0 && (
          <ModalSection title="Mevcut Hatırlatmalar">
            <div className="space-y-2">
              {reminders.map(reminder => (
                <div key={reminder.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <span className="text-sm text-gray-900 dark:text-white">{formatReminderDisplay(reminder)}</span>
                  <button
                    type="button"
                    onClick={() => removeReminder(reminder.id)}
                    className="text-red-600 dark:text-red-400 text-xl leading-none min-w-[24px] min-h-[24px]"
                    aria-label="Sil"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </ModalSection>
        )}

        {taskDateTime && (
          <ModalSection title="Hızlı Ekleme">
            <div className="grid grid-cols-2 gap-2">
              {presetOptions.map(preset => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => addPresetReminder(preset.minutes)}
                  className="p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 active:scale-95 transition-transform"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </ModalSection>
        )}

        <ModalSection title="Özel Tarih/Saat">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="16/10/2025"
              value={customDate}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9\\/]/g, '');
                if (val.length <= 10) setCustomDate(val);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <button
            type="button"
            onClick={addCustomReminder}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium active:scale-95 transition-transform"
          >
            Ekle
          </button>
        </ModalSection>

        {!taskDateTime && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">⚠️ Bu görevin tarih ve saati belirlenmemiş.</p>
          </div>
        )}
      </div>

      <ModalActions>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 w-full md:w-auto"
        >
          İptal
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium w-full md:w-auto"
        >
          Kaydet
        </button>
      </ModalActions>
    </MobileModal>
  );
};

export default ReminderSetupModal;
