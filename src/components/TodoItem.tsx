import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Todo, Priority, ReminderConfig, GeoReminder } from '../types';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import ReminderSetupModal from './ReminderSetupModal';
import GeoReminderModal from './GeoReminderModal';
import { useI18n } from '../contexts/I18nContext';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onGetDirections: (todo: Todo) => void;
  onEdit: (id: string, newText: string) => void;
  onShare: (todo: Todo) => void;
  onArchive?: (id: string) => void;
  onUpdateReminders?: (id: string, reminders: ReminderConfig[]) => void;
  onUpdateGeoReminder?: (id: string, geo: GeoReminder | null) => void;
}

const priorityClasses = {
  [Priority.High]: 'border-red-500 dark:border-red-500',
  [Priority.Medium]: 'border-yellow-500 dark:border-yellow-400',
};

// --- Modern SVG Icons for Route Steps ---
const WalkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const BusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const MetroIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.036A9 9 0 0117.965 15h.002" /></svg>;

const RouteStep: React.FC<{ line: string }> = ({ line }) => {
    const getIcon = () => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('metro')) return <MetroIcon />;
        if (lowerLine.includes('otobüs') || lowerLine.includes('metrobüs') || lowerLine.includes('dolmuş')) return <BusIcon />;
        if (lowerLine.includes('yürü') || lowerLine.includes('adım') || lowerLine.includes('geç')) return <WalkIcon />;
        return <div className="w-6 mr-3 flex-shrink-0" />;
    };
    return (
        <li className="flex items-center text-sm">
            {getIcon()}
            <span className="flex-1">{line.replace(/^- /, '')}</span>
        </li>
    );
};

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete, onGetDirections, onEdit, onShare, onArchive, onUpdateReminders, onUpdateGeoReminder }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t, lang } = useI18n();
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [showReminderBadge, setShowReminderBadge] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [isGeoModalOpen, setIsGeoModalOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { isSpeaking, speak, cancel, hasSupport } = useTextToSpeech();

  // Uzun ve bozuk satır sonlarını tek satıra normalize et (PDF/OCR kaynaklı \n sorunları)
  const displayedText = useMemo(() => {
    const raw = todo.text || '';
    // 1) Satır sonlarını boşluk yap 2) Birden fazla boşluğu teke indir 3) Trim
    return raw.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }, [todo.text]);

  const isLongText = useMemo(() => (displayedText.length || 0) > 80, [displayedText]);

  const mapDirectionsUrl = useMemo(() => {
    if (todo.aiMetadata?.routingInfo && todo.aiMetadata.routingOrigin && todo.aiMetadata.destination) {
      const origin = encodeURIComponent(todo.aiMetadata.routingOrigin);
      const destination = encodeURIComponent(todo.aiMetadata.destination);
      // This URL format opens Google Maps directions and doesn't require an API key.
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    }
    return null;
  }, [todo.aiMetadata]);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim() && editText.trim() !== todo.text) {
      onEdit(todo.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(todo.text);
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleSave();
    } else if (e.key === 'Escape') {
        handleCancel();
    }
  };
  
  const handleSpeakDirections = () => {
    if (!todo.aiMetadata?.routingInfo) return;
    if (isSpeaking) {
      cancel();
    } else {
      speak(todo.aiMetadata.routingInfo);
    }
  };

  const hasAIMetadata = todo.aiMetadata && Object.values(todo.aiMetadata).some(v => v !== undefined && v !== null && (!Array.isArray(v) || v.length > 0));
  const isConflict = todo.aiMetadata?.isConflict;
  const conflictClass = isConflict ? 'border-orange-500 ring-2 ring-orange-500/20 dark:ring-orange-500/30' : priorityClasses[todo.priority];
  
  const activeRemindersCount = todo.reminders?.filter(r => !r.triggered).length || 0;
  
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

  return (
    <div className={`group bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:-translate-y-0.5 transition-transform transition-shadow duration-200 border-l-4 ${conflictClass} ${todo.completed ? 'opacity-60 saturate-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => onToggle(todo.id)}
            className="hidden"
            disabled={isEditing}
          />
          <div className="flex-1 min-w-0">
            {/* Desktop: üst çubuk (sol: checkbox, sağ: işlemler) */}
            <div className="hidden sm:flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => onToggle(todo.id)}
                  className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-[var(--accent-color-600)] focus:ring-[var(--accent-color-500)] bg-gray-100 dark:bg-gray-900"
                  disabled={isEditing}
                  aria-label={t('todoItem.aria.complete', 'Görevi tamamla')}
                />
              </div>
              {!isEditing && (
                <div className="flex items-center gap-1.5">
                  {onUpdateReminders && (
                    <button 
                      onClick={() => {
                        console.log('🔔 Reminder button clicked for task:', todo.id);
                        setReminderLoading(true);
                        setTimeout(() => {
                          setIsReminderModalOpen(true);
                          setReminderLoading(false);
                        }, 100);
                      }}
                      disabled={reminderLoading}
                      className={`p-1 rounded-full transition-colors ${
                        reminderLoading 
                          ? 'text-gray-300 bg-gray-100 cursor-wait' 
                          : 'text-gray-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                      }`} 
                      aria-label={reminderLoading ? 'Yükleniyor...' : t('todoItem.aria.setReminder','Hatırlatma ayarla')}
                    >
                      {reminderLoading ? (
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                      )}
                    </button>
                  )}
                  {onUpdateGeoReminder && (
                    <button onClick={() => setIsGeoModalOpen(true)} className="p-1 rounded-full text-gray-400 hover:text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50" aria-label={t('todoItem.aria.geoReminder','Konum hatırlatıcısı')}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 19l-4.95-5.05a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                  {hasAIMetadata && (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={t('todoItem.aria.viewDetails','Detayları gör')}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                  )}
                  <button onClick={() => onShare(todo)} className="p-1 rounded-full text-gray-400 hover:text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50" aria-label={t('todoItem.aria.share','Görevi paylaş')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                  </button>
                  {onArchive && (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!todo.completed) {
                          if (!confirm(t('todoItem.archive.confirm','Görev tamamlanmadı. Yine de arşivlensin mi?'))) return;
                        }
                        onArchive(todo.id);
                      }}
                      className="p-2 min-h-[44px] min-w-[44px] rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-transform touch-manipulation" 
                      aria-label={t('todoItem.aria.archive','Arşive taşı')}
                      title={t('todoItem.aria.archive','Arşive taşı')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 3h12a2 2 0 012 2v2a2 2 0 01-2 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 01-2-2V5a2 2 0 012-2zm3 8a1 1 0 100 2h6a1 1 0 100-2H7z" />
                      </svg>
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🖊️ Desktop edit button clicked for task:', todo.id);
                      setIsEditing(true);
                    }}
                    className="p-2 min-h-[44px] min-w-[44px] rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-transform touch-manipulation" 
                    aria-label={t('todoItem.aria.edit','Görevi düzenle')}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🗑️ Desktop delete button clicked for task:', todo.id);
                      if (confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
                        onDelete(todo.id);
                      }
                    }}
                    className="p-2 min-h-[44px] min-w-[44px] rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-transform touch-manipulation" 
                    aria-label={t('todoItem.aria.delete','Görevi sil')}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                />
                <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSave();
                      }}
                      className="px-4 py-3 text-base bg-green-600 text-white rounded-md hover:bg-green-700 min-h-[44px] touch-manipulation" 
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {t('common.save','Kaydet')}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCancel();
                      }}
                      className="px-4 py-3 text-base bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 min-h-[44px] touch-manipulation" 
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {t('common.cancel','İptal')}
                    </button>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile-only header: checkbox left, actions right; text below */}
                <div className="sm:hidden mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                  <div className="touch-compact flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => onToggle(todo.id)}
                      className="h-4 w-4 flex-shrink-0 rounded border-gray-300 dark:border-gray-600 text-[var(--accent-color-600)] focus:ring-[var(--accent-color-500)] bg-gray-100 dark:bg-gray-900"
                      disabled={isEditing}
                      aria-label={t('todoItem.aria.complete','Görevi tamamla')}
                    />
                  </div>
                  <div className="flex items-center gap-1 touch-manipulation">
                  {onUpdateReminders && (
                    <button 
                      onClick={() => {
                        console.log('🔔 Mobile reminder button clicked for task:', todo.id);
                        setReminderLoading(true);
                        setTimeout(() => {
                          setIsReminderModalOpen(true);
                          setReminderLoading(false);
                        }, 100);
                      }}
                      disabled={reminderLoading}
                      className={`p-2 min-h-[44px] min-w-[44px] rounded-full transition-colors ${
                        reminderLoading 
                          ? 'text-gray-300 bg-gray-100 cursor-wait' 
                          : 'text-gray-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-95'
                      }`} 
                      aria-label={reminderLoading ? 'Yükleniyor...' : 'Hatırlatma ayarla'}
                    >
                      {reminderLoading ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                      )}
                    </button>
                  )}
                  {hasAIMetadata && (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 min-h-[44px] min-w-[44px] rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-transform" aria-label="Detayları gör">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                  )}
                  <button onClick={() => onShare(todo)} className="p-2 min-h-[44px] min-w-[44px] rounded-full text-gray-400 hover:text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 active:scale-95 transition-transform" aria-label="Görevi paylaş">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🖊️ Edit button clicked for task:', todo.id);
                      setIsEditing(true);
                    }}
                    className="p-3 min-h-[48px] min-w-[48px] rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-95 transition-transform touch-manipulation" 
                    aria-label="Görevi düzenle"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🗑️ Delete button clicked for task:', todo.id);
                      if (confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
                        onDelete(todo.id);
                      }
                    }}
                    className="p-3 min-h-[48px] min-w-[48px] rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 active:scale-95 transition-transform touch-manipulation" 
                    aria-label="Görevi sil"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                  </button>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <p
                      className={`flex-1 min-w-0 pr-0 sm:pr-0 text-sm sm:text-base font-medium text-gray-900 dark:text-white whitespace-normal leading-relaxed ${isTextExpanded ? '' : 'line-clamp-2 overflow-hidden'} break-normal ${todo.completed ? 'line-through' : ''} cursor-pointer select-none`}
                      style={{ textAlign: isTextExpanded ? 'justify' : 'left', hyphens: isTextExpanded ? 'auto' : 'manual' }}
                      onClick={() => setIsTextExpanded(prev => !prev)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsTextExpanded(prev => !prev); } }}
                      role="button"
                      tabIndex={0}
                      title={isTextExpanded ? t('todoItem.text.less','Daha az göster') : t('todoItem.text.more','Tamamını göster')}
                    >
                      {displayedText}
                    </p>
                    {isConflict && !todo.completed && (
                        <div className="flex-shrink-0 mt-0.5" title={t('todoItem.conflict','Zamanlama Çakışması')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                </div>
                {isLongText && (
                  <button
                    type="button"
                    onClick={() => setIsTextExpanded(prev => !prev)}
                    className="mt-1 text-xs text-[var(--accent-color-600)] hover:underline"
                  >
                    {isTextExpanded ? t('todoItem.text.less','Daha az göster') : t('todoItem.text.continue','Devamını gör')}
                  </button>
                )}
                {todo.datetime && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <span className="font-semibold hidden sm:inline">{t('todoItem.time','Zaman:')}</span> {new Date(todo.datetime).toLocaleString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      hour12: false
                    })}
                  </p>
                )}
                {activeRemindersCount > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                      </svg>
                      {activeRemindersCount} {t('todoItem.reminders.active','hatırlatma aktif')}
                    </span>
                    <button
                      onClick={() => setShowReminderBadge(!showReminderBadge)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {showReminderBadge ? t('common.hide','Gizle') : t('common.show','Göster')}
                    </button>
                  </div>
                )}
                {showReminderBadge && todo.reminders && todo.reminders.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {todo.reminders.filter(r => !r.triggered).map(reminder => (
                      <div key={reminder.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>{formatReminderDisplay(reminder)}</span>
                        {reminder.snoozedCount && reminder.snoozedCount > 0 && (
                          <span className="text-orange-500">(⚠️ {reminder.snoozedCount}x {t('todoItem.reminders.snoozed','ertelendi')})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Desktop sağ araçlar üst çubuğa taşındı */}
      </div>
      {isExpanded && hasAIMetadata && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
          <p><strong className="font-semibold text-gray-800 dark:text-gray-200">Kategori:</strong> {todo.aiMetadata?.category || 'Belirtilmemiş'}</p>
          <p><strong className="font-semibold text-gray-800 dark:text-gray-200">Tahmini Süre:</strong> {todo.aiMetadata?.estimatedDuration ? `${todo.aiMetadata.estimatedDuration} dakika` : 'Belirtilmemiş'}</p>
          {todo.aiMetadata?.destination && (
            <p><strong className="font-semibold text-gray-800 dark:text-gray-200">📍 Konum:</strong> {todo.aiMetadata.destination}</p>
          )}
          {todo.aiMetadata?.routingInfo && (
             <div>
                <div className="flex justify-between items-center mb-3">
                  <strong className="font-semibold text-gray-800 dark:text-gray-200">{t('todoItem.detail.directions','Yol Tarifi:')}</strong>
                   {hasSupport && (
                    <button
                      onClick={handleSpeakDirections}
                      className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label={isSpeaking ? t('todoItem.tts.stop','Okumayı durdur') : t('todoItem.tts.readDirections','Yol tarifini sesli oku')}
                      title={isSpeaking ? t('todoItem.tts.stop','Okumayı durdur') : t('todoItem.tts.readDirections','Yol tarifini sesli oku')}
                    >
                      {isSpeaking ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                <ul className="space-y-4">
                    {todo.aiMetadata.routingInfo.split('\n').filter(line => line.trim() !== '').map((line, i) => <RouteStep key={i} line={line} />)}
                </ul>
                {mapDirectionsUrl && (
                  <div className="mt-4">
                    <a
                      href={mapDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--accent-color-600)] rounded-md hover:bg-[var(--accent-color-700)] transition-colors"
                      title={`${t('todoItem.map','Harita')}: ${todo.aiMetadata.destination}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v12a1 1 0 00.293.707l6 6a1 1 0 001.414 0l6-6A1 1 0 0018 16V4a1 1 0 00-.293-.707l-6-6a1 1 0 00-1.414 0l-6 6z" clipRule="evenodd" />
                      </svg>
                      {t('todoItem.viewOnMap','Haritada Görüntüle')}
                    </a>
                  </div>
                )}
             </div>
          )}
          {todo.aiMetadata?.requiresRouting && !todo.aiMetadata?.routingInfo && (
            <button onClick={() => onGetDirections(todo)} className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[var(--accent-color-600)] rounded-md hover:bg-[var(--accent-color-700)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v12a1 1 0 00.293.707l6 6a1 1 0 001.414 0l6-6A1 1 0 0018 16V4a1 1 0 00-.293-.707l-6-6a1 1 0 00-1.414 0l-6 6z" clipRule="evenodd" /></svg>
              {t('todoItem.getDirections','Yol Tarifi Al')}
            </button>
          )}
        </div>
      )}
      
      {/* Reminder Setup Modal */}
      {onUpdateReminders && (
        <ReminderSetupModal
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          taskDateTime={todo.datetime}
          existingReminders={todo.reminders || []}
          onSave={(reminders) => {
            console.log('📋 TodoItem: Saving reminders for task:', todo.id);
            console.log('📋 TodoItem: New reminders data:', reminders);
            console.log('📋 TodoItem: Previous reminders:', todo.reminders);
            onUpdateReminders(todo.id, reminders);
          }}
        />
      )}
      {/* GeoReminder Modal */}
      {onUpdateGeoReminder && (
        <GeoReminderModal
          isOpen={isGeoModalOpen}
          onClose={() => setIsGeoModalOpen(false)}
          todo={todo}
          onSave={(geo) => onUpdateGeoReminder(todo.id, geo)}
        />
      )}
    </div>
  );
};

export default TodoItem;
