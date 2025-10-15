import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatMessage, Note } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognitionUnified';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { pdfService } from '../services/pdfService';
import { useI18n } from '../contexts/I18nContext';



interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  notes?: Note[];
  onProcessNotes?: (selectedNotes: Note[], prompt: string) => void;
  onAnalyzePdf?: (pdfFile: File, prompt?: string) => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, chatHistory, onSendMessage, isLoading, notes = [], onProcessNotes, onAnalyzePdf }) => {
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNoteProcessor, setShowNoteProcessor] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [notePrompt, setNotePrompt] = useState('');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string>('');
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isElectron] = useState(() => {
    return !!(window as any).isElectron || !!(window as any).electronAPI;
  });
  const { t } = useI18n();
  
  // Voice mode state
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [lastAIMessageIndex, setLastAIMessageIndex] = useState(-1);

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
  
  const tts = useTextToSpeech();
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);

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
          if (tts.isSpeaking) {
            tts.cancel();
          }
          setUserInput('');
          setShowNoteProcessor(false);
          setSelectedNoteIds([]);
          setNotePrompt('');
          setSpeakingMessageIndex(null);
      }
  }, [isOpen, isListening, stopListening, tts.isSpeaking, tts.cancel]);
  
  const handleSpeakMessage = useCallback((text: string, index: number) => {
    if (speakingMessageIndex === index) {
      tts.cancel();
      setSpeakingMessageIndex(null);
    } else {
      setSpeakingMessageIndex(index);
      tts.speak(text);
    }
  }, [tts, speakingMessageIndex]);
  
  // Reset speaking index when TTS finishes
  useEffect(() => {
    if (!tts.isSpeaking && speakingMessageIndex !== null) {
      setSpeakingMessageIndex(null);
    }
  }, [tts.isSpeaking, speakingMessageIndex]);
  
  // AUTO-SPEAK: Automatically speak new AI messages in voice mode
  useEffect(() => {
    if (!isVoiceModeActive || chatHistory.length === 0 || isLoading) {
      return;
    }

    const lastMessage = chatHistory[chatHistory.length - 1];
    const currentIndex = chatHistory.length - 1;
    
    if (lastMessage.role === 'model' && currentIndex > lastAIMessageIndex) {
      setLastAIMessageIndex(currentIndex);
      setTimeout(() => {
        tts.speak(lastMessage.text);
        setSpeakingMessageIndex(currentIndex);
      }, 300);
    }
  }, [chatHistory, isVoiceModeActive, isLoading, lastAIMessageIndex, tts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    } else if (userInput.trim() && !isLoading) {
      onSendMessage(userInput.trim());
      setUserInput('');
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

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfError('');
    const validation = pdfService.validatePdf(file, 15, 10);
    
    if (!validation.valid) {
      setPdfError(validation.error || t('chat.pdf.error.invalid', 'Geçersiz PDF dosyası'));
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }

    setSelectedPdfFile(file);
  };



  const handleSendPdfAnalysis = () => {
    if (selectedPdfFile && onAnalyzePdf) {
      const prompt = userInput.trim() || 'Bu PDF belgesini analiz et ve önemli bilgileri çıkar.';
      onAnalyzePdf(selectedPdfFile, prompt);
      setSelectedPdfFile(null);
      setUserInput('');
      setPdfError('');
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleRemovePdf = () => {
    setSelectedPdfFile(null);
    setPdfError('');
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  return (
    <div className={`fixed inset-0 z-[10000] ${!isOpen ? 'hidden' : ''}`}>
      <div className="fixed inset-0 flex flex-col bg-white dark:bg-gray-800">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between min-h-[60px]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg font-semibold text-gray-900 dark:text-white truncate">{t('chat.title', 'AI Asistan')}</span>
            <button
              onClick={() => {
                const newValue = !isVoiceModeActive;
                setIsVoiceModeActive(newValue);
                if (tts.isSpeaking) tts.cancel();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-colors flex-shrink-0 min-h-[36px] ${
                isVoiceModeActive 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
              title={t('chat.voiceMode', 'Sesli sohbet modu')}
              aria-label={t('chat.voiceMode', 'Sesli sohbet modu')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="hidden xs:inline">{t('chat.voice', 'Ses')}</span>
            </button>
            {notes.length > 0 && onProcessNotes && (
              <button
                onClick={() => setShowNoteProcessor(!showNoteProcessor)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--accent-color-100)] dark:bg-[var(--accent-color-900)] text-[var(--accent-color-700)] dark:text-[var(--accent-color-300)] rounded-full hover:bg-[var(--accent-color-200)] dark:hover:bg-[var(--accent-color-800)] transition-colors flex-shrink-0 min-h-[36px]"
                title={t('chat.noteProcessor.title', 'Notları Seç ve AI ya Komut Ver:')}
                aria-label={t('chat.noteProcessor.title', 'Notları Seç ve AI ya Komut Ver:')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6M9 3h6a2 2 0 012 2v1h1a1 1 0 011 1v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7a1 1 0 011-1h1V5a2 2 0 012-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M9 16h6M7 12h.01M7 16h.01" />
                </svg>
                <span className="hidden xs:inline">{t('common.notes', 'Not')}</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showNoteProcessor && notes.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">{t('chat.noteProcessor.title', 'Notları Seç ve AI ya Komut Ver:')}</h3>
            <div className="space-y-3">
              <div className="max-h-32 overflow-y-auto space-y-2 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600">
                {notes.map((note) => (
                  <label key={note.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer touch-manipulation">
                    <input
                      type="checkbox"
                      checked={selectedNoteIds.includes(note.id)}
                      onChange={() => handleToggleNoteSelection(note.id)}
                      className="h-5 w-5 flex-shrink-0 rounded border-gray-300 dark:border-gray-600 text-[var(--accent-color-600)] focus:ring-[var(--accent-color-500)]"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{note.text || t('chat.note.imagePlaceholder', '(Resimli Not)')}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={notePrompt}
                  onChange={(e) => setNotePrompt(e.target.value)}
                  placeholder={t('chat.noteProcessor.placeholder', 'Seçili notlarla ne yapmamı istersiniz?')}
                  className="flex-1 px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                />
                <button
                  onClick={handleProcessSelectedNotes}
                  disabled={selectedNoteIds.length === 0 || !notePrompt.trim()}
                  className="px-4 py-3 sm:py-2 text-base sm:text-sm bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] sm:min-h-[44px] font-medium"
                >
                  {t('chat.noteProcessor.process', 'İşle')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-0">
          <div className="space-y-3 sm:space-y-4 pb-4">
            {chatHistory.length === 0 && !isLoading && (
              <div className="p-4 sm:p-5 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600">
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
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100">{t('chat.welcome.title', 'Hoş geldiniz! Ben AI asistanınız.')}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">{t('chat.welcome.subtitle', 'Aşağıdakileri yapabilirim:')}</p>
                    <ul className="mt-2 text-xs sm:text-sm list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-200">
                      <li>{t('chat.welcome.list1', 'Görev ekleme ve hatırlatma: "Yarın 10:00 da doktoru ara"')}</li>
                      <li>{t('chat.welcome.list2', 'Not ekleme ve günlük notlarla çalışma: özet, yapılacak çıkarma, resimden metin çıkarma')}</li>
                      <li>{t('chat.welcome.list3', 'Günün özeti ve odak önerileri: "Günün özetini ver"')}</li>
                      <li>{t('chat.welcome.list4', 'Genel sohbet ve sorular')}</li>
                      <li>{t('chat.welcome.list5', 'Sesli kullanım: mikrofon simgesine basıp konuşarak mesaj/görev ekleme')}</li>
                    </ul>
                    <div className="mt-3">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{t('chat.welcome.examples', 'Örnek komutlar:')}</p>
                      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <span className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">{t('chat.examples.cmd1', 'Yarın 09:30 da müşteri araması ekle')}</span>
                        <span className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">{t('chat.examples.cmd2', 'Bunu not et: Alışveriş listesi')}</span>
                        <span className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">{t('chat.examples.cmd3', 'Günün özetini ver')}</span>
                        <span className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">{t('chat.examples.cmd4', 'Seçili notlardan yapılacaklar listesi çıkar')}</span>
                        <span className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">{t('chat.examples.cmd5', 'Bu notları özetle')}</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2">{t('chat.welcome.hint1', 'İpucu: "yarın", "bugün 15:00" gibi zamanlar cihazınızın saat dilimine göre yorumlanır.')}</p>
                      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {hasSupport 
                          ? t('chat.welcome.hint2_supported', 'Mikrofon simgesine basıp konuşarak hızlaca mesaj gönderebilirsiniz. ActionBar daki "Sesle Görev" düğmesiyle doğrudan görev de ekleyebilirsiniz.') 
                          : t('chat.welcome.hint2_notsupported', 'Bu cihazda sesli tanıma desteklenmiyor; yine de metinle tüm özellikleri kullanabilirsiniz.')
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex items-end gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--accent-color-500)] flex items-center justify-center text-white">
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
                <div className="flex flex-col gap-1">
                  <div className={`w-full max-w-[85%] sm:max-w-md lg:max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-[var(--accent-color-600)] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                    <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                  </div>
                  {msg.role === 'model' && tts.hasSupport && tts.settings.enabled && (
                    <button
                      onClick={() => handleSpeakMessage(msg.text, index)}
                      className="self-start flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-[var(--accent-color-600)] dark:hover:text-[var(--accent-color-400)] transition-colors rounded"
                      title={speakingMessageIndex === index ? t('chat.tts.stop', 'Okumayı durdur') : t('chat.tts.readAloud', 'Sesli oku')}
                    >
                      {speakingMessageIndex === index ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {t('chat.tts.stop', 'Durdur')}
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                          </svg>
                          {t('chat.tts.readAloud', 'Sesli oku')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-end gap-2 sm:gap-3 justify-start">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--accent-color-500)] flex items-center justify-center text-white">
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
                <div className="w-full max-w-[85%] sm:max-w-md lg:max-w-lg p-3 rounded-lg bg-gray-200 dark:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 pb-20 sm:pb-3">
          <div className="space-y-3">
            {isListening && isElectron && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 {t('chat.voice.hintLabel', 'İpucu')}: {t('chat.voice.hintPrefix', 'Konuşmanızı bitirmek için')} <strong>"{t('chat.voice.keyword.ok', 'tamam')}"</strong>, <strong>"{t('chat.voice.keyword.done', 'bitti')}"</strong>, <strong>"{t('chat.voice.keyword.save', 'kaydet')}"</strong> {t('common.or', 'veya')} <strong>"{t('chat.voice.keyword.send', 'gönder')}"</strong> {t('chat.voice.hintSuffix', 'deyin.')}
                </p>
              </div>
            )}
            
            {selectedPdfFile && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedPdfFile.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pdfService.formatFileSize(selectedPdfFile.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemovePdf}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0 min-h-[44px] min-w-[44px] touch-manipulation"
                    title={t('chat.pdf.removeTooltip', 'PDF yi kaldır')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {t('chat.pdf.pending', '🤖 PDF analiz edilecek. İsteğe bağlı olarak anlatım ekleyebilirsiniz.')}
                </p>
              </div>
            )}

            {pdfError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">⚠️ {pdfError}</p>
              </div>
            )}

            {/* Hidden PDF Input */}
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              onChange={handlePdfFileChange}
              className="hidden"
            />

            {/* Messages-style Input Area */}
        <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 shadow-lg">
              <button 
                type="button" 
                onClick={() => pdfInputRef.current?.click()} 
                className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" 
                title={t('messages.attachFile','Dosya ekle')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={selectedPdfFile ? t('chat.placeholderPdf', 'PDF hakkında soru sorun (isteğe bağlı)...') : isListening ? t('chat.listening', 'Dinleniyor...') : t('chat.placeholder', 'Mesajınızı yazın...')}
                  className="w-full px-4 py-3 pr-12 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color-600)]/50 text-sm"
                  disabled={isLoading || isListening}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!isLoading && userInput.trim() && !isListening) {
                        onSendMessage(userInput.trim());
                        setUserInput('');
                      }
                    }
                  }}
                />
                <button 
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>



                {selectedPdfFile ? (
                  <button
                    type="button"
                    onClick={handleSendPdfAnalysis}
                    className="px-4 py-3 bg-[var(--accent-color-600)] text-white rounded-full hover:bg-[var(--accent-color-700)] disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition-all shadow-lg hover:shadow-xl"
                    disabled={isLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <span>{t('chat.pdf.analyze', 'Analiz Et')}</span>
                  </button>
                ) : userInput.trim() ? (
                  <button
                    type="submit"
                    disabled={isLoading || isListening}
                    className="p-3 rounded-full bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] text-white transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                ) : hasSupport ? (
                  <button
                    type="button"
                    onClick={() => (isListening ? stopListening() : startListening())}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      isListening 
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg scale-110' 
                        : 'bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] text-white shadow-md'
                    }`}
                    disabled={isLoading}
                    title={isListening ? t('common.stopRecording', 'Kaydı Durdur') : t('common.startRecording', 'Ses Kaydı Başlat')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="p-3 rounded-full bg-gray-400 text-white cursor-not-allowed"
                    disabled
                    title={t('chat.send', 'Gönder')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;