import React from 'react';
import { DailyBriefing } from '../types';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface DailyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  briefing: DailyBriefing | null;
}

const SuggestionsModal: React.FC<DailyBriefingModalProps> = ({ isOpen, onClose, briefing }) => {
  if (!isOpen || !briefing) return null;

  const { isSpeaking, speak, cancel, hasSupport } = useTextToSpeech();

  const handleSpeakClick = () => {
    if (isSpeaking) {
      cancel();
    } else {
      const fullBriefingText = `
        ${briefing.summary}.
        Bugünkü odak alanlarınız: ${briefing.focus.join(', ')}.
        Plan analizi: ${briefing.conflicts}.
      `;
      speak(fullBriefingText);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-color-100)] dark:bg-[var(--accent-color-900)] text-[var(--accent-color-600)] dark:text-[var(--accent-color-300)] flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Günün Özeti</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI asistanınız güne başlamanıza yardımcı oluyor.</p>
              </div>
            </div>
            {hasSupport && (
                <button
                    onClick={handleSpeakClick}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
                    aria-label={isSpeaking ? "Okumayı durdur" : "Özeti sesli oku"}
                    title={isSpeaking ? "Okumayı durdur" : "Özeti sesli oku"}
                >
                    {isSpeaking ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                    )}
                </button>
            )}
        </div>
        
        <p className="text-gray-700 dark:text-gray-300">{briefing.summary}</p>

        {briefing.focus.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Odak Alanları</h3>
            <ul className="space-y-2 list-disc list-inside pl-2">
              {briefing.focus.map((task, index) => (
                <li key={index} className="text-gray-700 dark:text-gray-300">{task}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
            <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Plan Analizi</h3>
            <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 p-3 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p>{briefing.conflicts}</p>
            </div>
        </div>

        <div className="mt-2 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]"
          >
            Harika, Başlayalım!
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuggestionsModal;
