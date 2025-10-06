import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognitionUnified';
import { MobileModal, ModalActions } from './MobileModal';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (description: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onAddTask }) => {
  const [description, setDescription] = useState('');
  const [isElectron] = useState(() => {
    return !!(window as any).isElectron || !!(window as any).electronAPI;
  });

  const handleTranscript = (transcript: string) => {
    setDescription(transcript);
  };

  const { isListening, transcript, startListening, stopListening, hasSupport } = useSpeechRecognition(
    handleTranscript,
    { 
      stopOnKeywords: ['tamam', 'bitti', 'kaydet', 'ekle', 'oluştur', 'ok'], // Works in browser only
      continuous: false // Auto-stop after 10 seconds
    }
  );
  
  useEffect(() => {
    if (isListening) {
      setDescription(transcript);
    }
  }, [transcript, isListening]);
  
  // Clear description when modal opens
  useEffect(() => {
    if(isOpen) {
        setDescription('');
    }
  }, [isOpen]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onAddTask(description.trim());
      setDescription('');
      onClose();
    }
  };

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Görev Ekle"
      fullScreen={false}
      swipeToClose={true}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <textarea
            className="
              w-full p-4 md:p-3
              border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-700
              text-gray-900 dark:text-white
              text-base md:text-sm
              focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none
              transition-colors duration-300
              min-h-[120px] md:min-h-[100px]
            "
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Görevinizi yazın veya mikrofon ile söyleyin..."
          />
          
          {isListening && isElectron && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs md:text-xs text-blue-700 dark:text-blue-300">
                💡 İpucu: Konuşmanızı bitirmek için <strong>"tamam"</strong>, <strong>"bitti"</strong>, <strong>"kaydet"</strong>, <strong>"ekle"</strong> veya <strong>"oluştur"</strong> deyin.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                ⏱️ Otomatik olarak 15 saniye sonra duracak veya mikrofon butonuna tıklayabilirsiniz.
              </p>
            </div>
          )}
        </div>

        <ModalActions className="mt-6">
          {hasSupport && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`
                flex-shrink-0 p-3 md:p-2.5 rounded-full 
                transition-all duration-200 
                active:scale-95 md:hover:scale-110
                min-h-[48px] min-w-[48px] md:min-h-[44px] md:min-w-[44px]
                flex items-center justify-center
                ${isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-[var(--accent-color-600)] text-white hover:bg-[var(--accent-color-700)]'
                }
              `}
              aria-label={isListening ? 'Kaydı durdur' : 'Kayda başla'}
            >
              {isListening ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="
              flex-1 px-4 py-3 md:py-2
              bg-gray-200 dark:bg-gray-600
              text-gray-800 dark:text-gray-200
              rounded-lg font-medium
              hover:bg-gray-300 dark:hover:bg-gray-500
              active:scale-95
              transition-all duration-150
              min-h-[48px] md:min-h-[44px]
            "
          >
            İptal
          </button>
          <button
            type="submit"
            className="
              flex-1 px-4 py-3 md:py-2
              bg-[var(--accent-color-600)] text-white
              rounded-lg font-medium
              hover:bg-[var(--accent-color-700)]
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-95
              transition-all duration-150
              min-h-[48px] md:min-h-[44px]
            "
            disabled={!description.trim()}
          >
            Ekle
          </button>
        </ModalActions>
      </form>
    </MobileModal>
  );
};

export default TaskModal;
