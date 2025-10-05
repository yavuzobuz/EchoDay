import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognitionUnified';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 transition-colors duration-300">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Yeni Görev Ekle</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none transition-colors duration-300"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Görevinizi yazın veya mikrofon ile söyleyin..."
          />
          
          {isListening && isElectron && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 İpucu: Konuşmanızı bitirmek için <strong>"tamam"</strong>, <strong>"bitti"</strong>, <strong>"kaydet"</strong>, <strong>"ekle"</strong> veya <strong>"oluştur"</strong> deyin.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                ⏱️ Otomatik olarak 15 saniye sonra duracak veya mikrofon butonuna tıklayabilirsiniz.
              </p>
            </div>
          )}
          
          <div className="mt-4 flex justify-between items-center">
            {hasSupport ? (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`p-3 rounded-full transition-all duration-200 transform hover:scale-110 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[var(--accent-color-600)] text-white hover:bg-[var(--accent-color-700)]'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Ses tanıma desteklenmiyor.</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50"
                disabled={!description.trim()}
              >
                Ekle
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
