import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatMessage, Note } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognitionUnified';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  notes?: Note[];
  onProcessNotes?: (selectedNotes: Note[], prompt: string) => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, chatHistory, onSendMessage, isLoading, notes = [], onProcessNotes }) => {
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNoteProcessor, setShowNoteProcessor] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [notePrompt, setNotePrompt] = useState('');
  const [isElectron] = useState(() => {
    return !!(window as any).isElectron || !!(window as any).electronAPI;
  });

  const handleTranscriptReady = useCallback((transcript: string) => {
    if (transcript.trim()) {
      onSendMessage(transcript.trim());
    }
  }, [onSendMessage]);

  const speechRecognitionOptions = useMemo(() => ({
    stopOnKeywords: ['tamam', 'bitti', 'ok', 'oldu', 'kaydet', 'oluştur', 'gönder'],
    continuous: true,
  }), []);

  const { isListening, startListening, stopListening, hasSupport } = useSpeechRecognition(
    handleTranscriptReady,
    speechRecognitionOptions
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);
  
  useEffect(() => {
      if (!isOpen) {
          if (isListening) {
            stopListening();
          }
          setUserInput('');
          setShowNoteProcessor(false);
          setSelectedNoteIds([]);
          setNotePrompt('');
      }
  }, [isOpen, isListening, stopListening]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    } else if (userInput.trim() && !isLoading) {
      onSendMessage(userInput.trim());
      setUserInput('');
    }
  };
  
  const handleMicClick = () => {
      if (isListening) {
          stopListening();
      } else {
          setUserInput(''); // Explicitly clear input before starting a new voice session.
          startListening();
      }
  };

  const handleToggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev => 
      prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]
    );
  };

  const handleProcessSelectedNotes = () => {
    if (selectedNoteIds.length > 0 && notePrompt.trim() && onProcessNotes) {
      const selectedNotes = notes.filter(note => selectedNoteIds.includes(note.id));
      onProcessNotes(selectedNotes, notePrompt.trim());
      setShowNoteProcessor(false);
      setSelectedNoteIds([]);
      setNotePrompt('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col">
        <header className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">AI Asistan</h2>
            {notes.length > 0 && onProcessNotes && (
              <button
                onClick={() => setShowNoteProcessor(!showNoteProcessor)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-[var(--accent-color-100)] dark:bg-[var(--accent-color-900)] text-[var(--accent-color-700)] dark:text-[var(--accent-color-300)] rounded-md hover:bg-[var(--accent-color-200)] dark:hover:bg-[var(--accent-color-800)] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a1 1 0 100 2H6a4 4 0 01-4-4V5a4 4 0 014-4h4a1 1 0 001-1h2a1 1 0 011 1 1 1 0 001 1h4a4 4 0 014 4v8a4 4 0 01-4 4h-4a1 1 0 110-2h4a2 2 0 002-2V7a2 2 0 00-2-2h-2a1 1 0 110-2h2a4 4 0 014 4v8a4 4 0 01-4 4H9.5a1 1 0 00-.707.293l-2 2a1 1 0 01-1.414-1.414l2-2A3 3 0 019 13h5a2 2 0 002-2V7a2 2 0 00-2-2H6z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Notu AI ile işle</span>
                <span className="sm:hidden">Not işle</span>
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        {showNoteProcessor && notes.length > 0 && (
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-xs sm:text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Notları Seç ve AI'ya Komut Ver:</h3>
            <div className="grid gap-2 sm:gap-3">
              <div className="max-h-24 sm:max-h-32 overflow-y-auto space-y-1 p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600">
                {notes.map((note) => (
                  <label key={note.id} className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNoteIds.includes(note.id)}
                      onChange={() => handleToggleNoteSelection(note.id)}
                      className="h-4 w-4 flex-shrink-0 rounded border-gray-300 dark:border-gray-600 text-[var(--accent-color-600)] focus:ring-[var(--accent-color-500)]"
                    />
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate">{note.text || '(Resimli Not)'}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={notePrompt}
                  onChange={(e) => setNotePrompt(e.target.value)}
                  placeholder="Seçili notlarla ne yapmamı istersiniz?"
                  className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                />
                <button
                  onClick={handleProcessSelectedNotes}
                  disabled={selectedNoteIds.length === 0 || !notePrompt.trim()}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  İşle
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-grow p-4 overflow-y-auto space-y-4">
          {chatHistory.length === 0 && !isLoading && (
            <div className="max-w-xl mx-auto p-4 sm:p-5 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--accent-color-500)] flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 3C7 3 5 5 5 7.5c0 1.5 0.5 2.5 0.5 4s-0.5 2-0.5 3.5c0 2 1.5 4 4 4.5" />
                    <path d="M14.5 3C17 3 19 5 19 7.5c0 1.5-0.5 2.5-0.5 4s0.5 2 0.5 3.5c0 2-1.5 4-4 4.5" />
                    <circle cx="7" cy="8" r="1" fill="currentColor" />
                    <circle cx="12" cy="6" r="1" fill="currentColor" />
                    <circle cx="17" cy="8" r="1" fill="currentColor" />
                    <circle cx="7" cy="12" r="1" fill="currentColor" />
                    <circle cx="12" cy="10" r="1" fill="currentColor" />
                    <circle cx="17" cy="12" r="1" fill="currentColor" />
                    <circle cx="7" cy="16" r="1" fill="currentColor" />
                    <circle cx="12" cy="14" r="1" fill="currentColor" />
                    <circle cx="17" cy="16" r="1" fill="currentColor" />
                    <circle cx="12" cy="18" r="1" fill="currentColor" />
                    <line x1="7" y1="8" x2="12" y2="6" strokeWidth="0.8" opacity="0.5" />
                    <line x1="12" y1="6" x2="17" y2="8" strokeWidth="0.8" opacity="0.5" />
                    <line x1="7" y1="12" x2="12" y2="10" strokeWidth="0.8" opacity="0.5" />
                    <line x1="12" y1="10" x2="17" y2="12" strokeWidth="0.8" opacity="0.5" />
                    <line x1="7" y1="16" x2="12" y2="14" strokeWidth="0.8" opacity="0.5" />
                    <line x1="12" y1="14" x2="17" y2="16" strokeWidth="0.8" opacity="0.5" />
                    <line x1="12" y1="14" x2="12" y2="18" strokeWidth="0.8" opacity="0.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100">Hoş geldiniz! Ben AI asistanınız.</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">Aşağıdakileri yapabilirim:</p>
                  <ul className="mt-2 text-xs sm:text-sm list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-200">
                    <li>Görev ekleme ve hatırlatma: "Yarın 10:00'da doktoru ara"</li>
                    <li>Not ekleme ve Günlük Not Defteri ile çalışma: notları özetletme, yapılacaklar çıkarma, resimden metin çıkarma</li>
                    <li>Günün özeti ve odak önerileri: "Günün özetini ver"</li>
                    <li>Genel sohbet ve sorular</li>
                    <li>Sesli kullanım: mikrofon simgesine basıp konuşarak mesaj/görev ekleme</li>
                  </ul>
                  <div className="mt-3">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Örnek komutlar:</p>
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <span className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">Yarın 09:30'da müşteri araması ekle</span>
                      <span className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">Bunu not et: Alışveriş listesi</span>
                      <span className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">Günün özetini ver</span>
                      <span className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">Seçili notlardan yapılacaklar listesi çıkar</span>
                      <span className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">Bu notları özetle</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2">İpucu: "yarın", "bugün 15:00" gibi zamanlar cihazınızın saat dilimine göre yorumlanır.</p>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">{hasSupport ? 'Mikrofon simgesine basıp konuşarak hızlıca mesaj gönderebilirsiniz. ActionBar’daki "Sesle Görev" düğmesiyle doğrudan görev de ekleyebilirsiniz.' : 'Bu cihazda sesli tanıma desteklenmiyor; yine de metinle tüm özellikleri kullanabilirsiniz.'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {chatHistory.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent-color-500)] flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 3C7 3 5 5 5 7.5c0 1.5 0.5 2.5 0.5 4s-0.5 2-0.5 3.5c0 2 1.5 4 4 4.5" />
                    <path d="M14.5 3C17 3 19 5 19 7.5c0 1.5-0.5 2.5-0.5 4s0.5 2 0.5 3.5c0 2-1.5 4-4 4.5" />
                    <circle cx="7" cy="8" r="1" fill="currentColor" />
                    <circle cx="12" cy="6" r="1" fill="currentColor" />
                    <circle cx="17" cy="8" r="1" fill="currentColor" />
                    <circle cx="7" cy="12" r="1" fill="currentColor" />
                    <circle cx="12" cy="10" r="1" fill="currentColor" />
                    <circle cx="17" cy="12" r="1" fill="currentColor" />
                    <circle cx="7" cy="16" r="1" fill="currentColor" />
                    <circle cx="12" cy="14" r="1" fill="currentColor" />
                    <circle cx="17" cy="16" r="1" fill="currentColor" />
                    <circle cx="12" cy="18" r="1" fill="currentColor" />
                    <line x1="7" y1="8" x2="12" y2="6" strokeWidth="0.8" opacity="0.5" />
                    <line x1="12" y1="6" x2="17" y2="8" strokeWidth="0.8" opacity="0.5" />
                    <line x1="7" y1="12" x2="12" y2="10" strokeWidth="0.8" opacity="0.5" />
                    <line x1="12" y1="10" x2="17" y2="12" strokeWidth="0.8" opacity="0.5" />
                    <line x1="7" y1="16" x2="12" y2="14" strokeWidth="0.8" opacity="0.5" />
                    <line x1="12" y1="14" x2="17" y2="16" strokeWidth="0.8" opacity="0.5" />
                    <line x1="12" y1="14" x2="12" y2="18" strokeWidth="0.8" opacity="0.5" />
                  </svg>
                </div>
              )}
              <div className={`max-w-md lg:max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-[var(--accent-color-600)] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent-color-500)] flex items-center justify-center text-white">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M9.5 3C7 3 5 5 5 7.5c0 1.5 0.5 2.5 0.5 4s-0.5 2-0.5 3.5c0 2 1.5 4 4 4.5" />
                   <path d="M14.5 3C17 3 19 5 19 7.5c0 1.5-0.5 2.5-0.5 4s0.5 2 0.5 3.5c0 2-1.5 4-4 4.5" />
                   <circle cx="7" cy="8" r="1" fill="currentColor" />
                   <circle cx="12" cy="6" r="1" fill="currentColor" />
                   <circle cx="17" cy="8" r="1" fill="currentColor" />
                   <circle cx="7" cy="12" r="1" fill="currentColor" />
                   <circle cx="12" cy="10" r="1" fill="currentColor" />
                   <circle cx="17" cy="12" r="1" fill="currentColor" />
                   <circle cx="7" cy="16" r="1" fill="currentColor" />
                   <circle cx="12" cy="14" r="1" fill="currentColor" />
                   <circle cx="17" cy="16" r="1" fill="currentColor" />
                   <circle cx="12" cy="18" r="1" fill="currentColor" />
                   <line x1="7" y1="8" x2="12" y2="6" strokeWidth="0.8" opacity="0.5" />
                   <line x1="12" y1="6" x2="17" y2="8" strokeWidth="0.8" opacity="0.5" />
                   <line x1="7" y1="12" x2="12" y2="10" strokeWidth="0.8" opacity="0.5" />
                   <line x1="12" y1="10" x2="17" y2="12" strokeWidth="0.8" opacity="0.5" />
                   <line x1="7" y1="16" x2="12" y2="14" strokeWidth="0.8" opacity="0.5" />
                   <line x1="12" y1="14" x2="17" y2="16" strokeWidth="0.8" opacity="0.5" />
                   <line x1="12" y1="14" x2="12" y2="18" strokeWidth="0.8" opacity="0.5" />
                 </svg>
              </div>
              <div className="max-w-md lg:max-w-lg p-3 rounded-lg bg-gray-200 dark:bg-gray-700">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {isListening && isElectron && (
            <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 İpucu: Konuşmanızı bitirmek için <strong>"tamam"</strong>, <strong>"bitti"</strong>, <strong>"kaydet"</strong> veya <strong>"gönder"</strong> deyin.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={isListening ? 'Dinleniyor...' : 'Mesajınızı yazın...'}
              className="flex-grow p-2 sm:p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
              disabled={isLoading || isListening}
            />
             {hasSupport && (
              <button
                type="button"
                onClick={handleMicClick}
                className={`p-3 rounded-md transition-colors duration-200 flex items-center justify-center ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'}`}
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
            <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50 flex items-center justify-center" disabled={isLoading || (isListening ? false : !userInput.trim())}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
};

export default ChatModal;