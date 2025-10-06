import React, { useEffect, useRef, useState } from 'react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { playReminderSound, ReminderSound } from '../utils/reminderSounds';

interface ReminderPopupProps {
  message: string;
  onClose: () => void;
  onSnooze?: (minutes: number) => void;
  taskId?: string;
  reminderId?: string;
  priority?: 'high' | 'medium';
}

const ReminderPopup: React.FC<ReminderPopupProps> = ({ message, onClose, onSnooze, priority = 'medium' }) => {
  const tts = useTextToSpeech();
  const hasSpokenRef = useRef(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  
  useEffect(() => {
    const pref = (localStorage.getItem('reminderSound') as ReminderSound) || 'tts';
    let stopSound: (() => void) | null = null;

    if (pref === 'tts') {
      // Auto-speak reminder if TTS is enabled
      if (tts.settings.enabled && tts.hasSupport && !hasSpokenRef.current) {
        hasSpokenRef.current = true;
        tts.speak(message);
      }
    } else {
      // Play selected alarm sound pattern
      stopSound = playReminderSound(pref);
    }
    
    const timer = setTimeout(onClose, 10000); // Stays on screen for 10 seconds
    return () => {
      clearTimeout(timer);
      if (tts.isSpeaking) {
        tts.cancel();
      }
      if (stopSound) stopSound();
    };
  }, [onClose, tts, message]);

  const snoozeOptions = [
    { label: '5 dk', minutes: 5 },
    { label: '10 dk', minutes: 10 },
    { label: '30 dk', minutes: 30 },
    { label: '1 saat', minutes: 60 },
    { label: 'Yarın', minutes: 1440 }
  ];
  
  const handleSnooze = (minutes: number) => {
    if (onSnooze) {
      onSnooze(minutes);
    }
    onClose();
  };

  const baseClasses = "fixed bottom-5 left-5 z-50 p-4 rounded-lg shadow-lg max-w-sm animate-fade-in-up";
  const typeClasses = priority === 'high' 
    ? 'bg-red-100 dark:bg-red-900/80 backdrop-blur-sm text-red-800 dark:text-red-200 border-l-4 border-red-500 ring-2 ring-red-500/50 animate-pulse'
    : 'bg-blue-100 dark:bg-blue-900/80 backdrop-blur-sm text-blue-800 dark:text-blue-200 border-l-4 border-blue-500';

  const Icon = () => {
    const iconColor = priority === 'high' ? 'text-red-500' : 'text-blue-500';
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 mr-3 ${iconColor} flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
         <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    );
  };

  return (
    <div className="fixed bottom-5 left-5 z-50">
      <div className={`${baseClasses} ${typeClasses} flex-col items-start`}>
        <div className="flex items-center w-full">
          <Icon />
          <span className="flex-1 font-medium">{message}</span>
          <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {onSnooze && (
          <div className="mt-3 w-full">
            {!showSnoozeOptions ? (
              <button
                onClick={() => setShowSnoozeOptions(true)}
                className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 text-blue-700 dark:text-blue-300 rounded-md hover:bg-white dark:hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Ertele
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                {snoozeOptions.map(option => (
                  <button
                    key={option.minutes}
                    onClick={() => handleSnooze(option.minutes)}
                    className="px-3 py-1.5 bg-white/80 dark:bg-gray-700/80 text-blue-700 dark:text-blue-300 rounded-md hover:bg-white dark:hover:bg-gray-700 transition-colors text-xs font-medium"
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowSnoozeOptions(false)}
                  className="px-3 py-1.5 bg-white/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 rounded-md hover:bg-white dark:hover:bg-gray-700 transition-colors text-xs"
                >
                  İptal
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReminderPopup;
