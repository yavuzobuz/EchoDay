import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatMessage, Note } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognitionUnified';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { pdfService } from '../services/pdfService';
import { MobileModal, ModalSection, ModalActions } from './MobileModal';

// Convert a base64 data URL to a Blob without performing any network request
function dataURLToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const match = header.match(/data:(.*?);base64/);
  const mime = match?.[1] || 'application/octet-stream';
  const byteString = atob(data);
  const len = byteString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

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

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfError('');
    const validation = pdfService.validatePdf(file, 15, 10);
    
    if (!validation.valid) {
      setPdfError(validation.error || 'Geçersiz PDF dosyası');
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }

    setSelectedPdfFile(file);
  };

  // Electron native file picker
  const handleElectronPdfPicker = async () => {
    console.log('[ChatModal] Electron PDF picker clicked');
    try {
      const pdfData = await pdfService.selectPdfFile();
      console.log('[ChatModal] PDF data received:', pdfData ? 'File selected' : 'No file');
      if (!pdfData) return; // Kullanıcı iptal etti

      setPdfError('');
      
      // Validation
      if (pdfData.size > 10 * 1024 * 1024) {
        setPdfError('Dosya boyutu 10MB\'dan küçük olmalıdır.');
        return;
      }

      // File objesi oluştur (Electron'dan gelen veriyle) - data: URL'i doğrudan Blob'a çevir (CSP ihlali olmadan)
      const blob = dataURLToBlob(pdfData.dataUrl);
      const file = new File([blob], pdfData.name, { type: pdfData.type || 'application/pdf' });
      console.log('[ChatModal] PDF file created:', file.name, file.size, 'bytes');
      setSelectedPdfFile(file);
    } catch (error) {
      console.error('[ChatModal] Error selecting PDF:', error);
      setPdfError('PDF dosyası seçilirken hata oluştu.');
    }
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
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title={(
        <div className="flex items-center gap-2 sm:gap-3">
          <span>AI Asistan</span>
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
      )}
      fullScreen={true}
      swipeToClose={true}
    >

      {showNoteProcessor && notes.length > 0 && (
        <ModalSection>
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Notları Seç ve AI'ya Komut Ver:</h3>
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
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{note.text || '(Resimli Not)'}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={notePrompt}
                  onChange={(e) => setNotePrompt(e.target.value)}
                  placeholder="Seçili notlarla ne yapmamı istersiniz?"
                  className="flex-1 px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                />
                <button
                  onClick={handleProcessSelectedNotes}
                  disabled={selectedNoteIds.length === 0 || !notePrompt.trim()}
                  className="px-4 py-3 sm:py-2 text-base sm:text-sm bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] sm:min-h-[44px] font-medium"
                >
                  İşle
                </button>
              </div>
            </div>
          </div>
        </ModalSection>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 custom-scrollbar">
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
              <div className="flex flex-col gap-1">
                <div className={`max-w-md lg:max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-[var(--accent-color-600)] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
                {msg.role === 'model' && tts.hasSupport && tts.settings.enabled && (
                  <button
                    onClick={() => handleSpeakMessage(msg.text, index)}
                    className="self-start flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-[var(--accent-color-600)] dark:hover:text-[var(--accent-color-400)] transition-colors rounded"
                    title={speakingMessageIndex === index ? 'Okumayı durdur' : 'Sesli oku'}
                  >
                    {speakingMessageIndex === index ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Durdur
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                        Sesli oku
                      </>
                    )}
                  </button>
                )}
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
      </div>

      <ModalActions className="mt-0 sticky bottom-0 bg-white dark:bg-gray-800">
        {isListening && isElectron && (
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 İpuçu: Konuşmanızı bitirmek için <strong>"tamam"</strong>, <strong>"bitti"</strong>, <strong>"kaydet"</strong> veya <strong>"gönder"</strong> deyin.
            </p>
          </div>
        )}
          
        {/* PDF Preview */}
        {selectedPdfFile && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
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
                title="PDF'i kaldır"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              🤖 PDF analiz edilecek. İsteğe bağlı olarak anlatım ekleyebilirsiniz.
            </p>
          </div>
        )}

        {/* PDF Error */}
        {pdfError && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">⚠️ {pdfError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={selectedPdfFile ? 'PDF hakkında soru sorun (isteğe bağlı)...' : isListening ? 'Dinleniyor...' : 'Mesajınızı yazın...'}
              className="flex-1 px-3 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none resize-none leading-6 min-h-[56px] max-h-[180px]"
              rows={3}
              disabled={isLoading || isListening}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && userInput.trim() && !isListening) {
                    onSendMessage(userInput.trim());
                    setUserInput('');
                  }
                }
              }}
            />
            <div className="flex gap-2">
              {hasSupport && !selectedPdfFile && (
                <button
                  type="button"
                  onClick={handleMicClick}
                  className={`p-3 rounded-lg transition-all duration-200 flex items-center justify-center min-h-[48px] min-w-[48px] touch-manipulation ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'}`}
                  disabled={isLoading}
                  title="Sesli mesaj"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
              
              {/* PDF Upload Button */}
              {onAnalyzePdf && !selectedPdfFile && (
                <>
                  {!isElectron && (
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfFileChange}
                      className="hidden"
                    />
                  )}
                  <button
                    type="button"
                    onClick={isElectron ? handleElectronPdfPicker : () => pdfInputRef.current?.click()}
                    className="p-3 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all flex items-center justify-center min-h-[48px] min-w-[48px] touch-manipulation"
                    disabled={isLoading || isListening}
                    title={isElectron ? 'PDF seç ve analiz et' : 'PDF yükle ve analiz et'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </button>
                </>
              )}

              {/* Send Button */}
              {selectedPdfFile ? (
                <button
                  type="button"
                  onClick={handleSendPdfAnalysis}
                  className="px-4 py-3 sm:py-2 bg-[var(--accent-color-600)] text-white rounded-lg hover:bg-[var(--accent-color-700)] disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] font-medium touch-manipulation"
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  <span className="sm:inline">Analiz Et</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-4 py-3 sm:py-2 bg-[var(--accent-color-600)] text-white rounded-lg hover:bg-[var(--accent-color-700)] disabled:opacity-50 flex items-center justify-center min-h-[48px] min-w-[48px] touch-manipulation"
                  disabled={isLoading || (isListening ? false : !userInput.trim())}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </form>
      </ModalActions>
    </MobileModal>
  );
};

export default ChatModal;