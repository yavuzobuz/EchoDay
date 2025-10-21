import React, { useState, useEffect } from 'react';
import { ReminderConfig } from '../types';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminders: ReminderConfig[]) => void;
  existingReminders?: ReminderConfig[];
  taskTitle?: string;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingReminders = [],
  taskTitle = ''
}) => {
  const [reminders, setReminders] = useState<ReminderConfig[]>([]);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReminders(existingReminders);
      // Default to tomorrow at 9:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setNewDate(tomorrow.toISOString().split('T')[0]);
      setNewTime('09:00');
    }
  }, [isOpen, existingReminders]);

  const handleAddReminder = () => {
    if (!newDate || !newTime) return;

    const dateTime = new Date(`${newDate}T${newTime}`);
    if (dateTime <= new Date()) {
      alert('Hatırlatma zamanı gelecekte olmalı!');
      return;
    }

    const newReminder: ReminderConfig = {
      id: `reminder_${Date.now()}`,
      type: 'absolute',
      absoluteTime: dateTime.toISOString(),
      triggered: false
    };

    setReminders([...reminders, newReminder]);
    
    // Reset inputs
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNewDate(tomorrow.toISOString().split('T')[0]);
    setNewTime('09:00');
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const handleSave = () => {
    onSave(reminders);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">⏰ Hatırlatmalar</h2>
              {taskTitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{taskTitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Existing Reminders */}
          {reminders.length > 0 && (
            <div className="mb-6 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mevcut Hatırlatmalar</h3>
              {reminders.map(reminder => {
                const date = new Date(reminder.absoluteTime || reminder.minutesBefore ? new Date(Date.now() + reminder.minutesBefore! * 60000) : new Date());
                const now = new Date();
                const isPast = date < now;
                
                return (
                  <div
                    key={reminder.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isPast || reminder.triggered
                        ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 opacity-60'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {date.toLocaleDateString('tr-TR', { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        {reminder.triggered && ' (Tetiklendi)'}
                        {isPast && !reminder.triggered && ' (Geçmiş)'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Reminder */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Yeni Hatırlatma Ekle</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📅 Tarih
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🕐 Saat
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleAddReminder}
                disabled={!newDate || !newTime}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Hatırlatma Ekle
              </button>
            </div>
          </div>

          {/* Quick Options */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Hızlı Seçenekler</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '1 Saat Sonra', minutes: 60 },
                { label: 'Yarın 9:00', hours: 'tomorrow-9' },
                { label: '3 Saat Sonra', minutes: 180 },
                { label: '1 Hafta Sonra', days: 7 }
              ].map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const date = new Date();
                    if (option.minutes) {
                      date.setMinutes(date.getMinutes() + option.minutes);
                    } else if (option.days) {
                      date.setDate(date.getDate() + option.days);
                    } else if (option.hours === 'tomorrow-9') {
                      date.setDate(date.getDate() + 1);
                      date.setHours(9, 0, 0, 0);
                    }
                    
                    const newReminder: ReminderConfig = {
                      id: `reminder_${Date.now()}`,
                      type: 'absolute',
                      absoluteTime: date.toISOString(),
                      triggered: false
                    };
                    setReminders([...reminders, newReminder]);
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReminderModal;
