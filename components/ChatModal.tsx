import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChatMessage } from '../types';
import { useSpeechRecognitionUnified } from '../src/hooks/useSpeechRecognitionUnified';
import { useSpeechSynthesis } from '../src/hooks/useSpeechSynthesis';
import { useI18n } from '../src/contexts/I18nContext';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  voiceModeEnabled?: boolean;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, chatHistory, onSendMessage, isLoading, voiceModeEnabled = false }) => {
  const { t } = useI18n();
  const [userInput, setUserInput] = useState('');
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(voiceModeEnabled);
  const [lastAIMessageIndex, setLastAIMessageIndex] = useState(-1);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);
  const [wasInterrupted, setWasInterrupted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  // Speech synthesis hook
  const { 
    speak, 
    stop: stopSpeaking, 
    isSpeaking, 
    hasSupport: hasSpeechSynthesis
  } = useSpeechSynthesis({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  });

  // Handle when user starts/stops speaking
  const handleUserSpeaking = useCallback((speaking: boolean) => {
    console.log('🎤 User speaking state changed:', speaking);
    if (speaking && isVoiceModeActive && hasSpeechSynthesis && isSpeaking) {
      // User started speaking while AI is speaking - interrupt AI
      console.log('⛔ Stopping AI speech due to user interruption');
      stopSpeaking();
      setWasInterrupted(true);
    }
  }, [isVoiceModeActive, stopSpeaking, hasSpeechSynthesis, isSpeaking]);

  const handleTranscriptReady = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    // Check for stop commands
    const stopCommands = ['sus', 'dur', 'stop', 'kapat', 'sustun', 'tamam dur', 'yeter'];
    const hasStopCommand = stopCommands.some(cmd => lowerTranscript.includes(cmd));
    
    if (hasStopCommand) {
      console.log('🛑 Stop command detected:', transcript);
      if (isSpeaking) {
        stopSpeaking();
      }
      // Don't send the stop command as a message
      return;
    }
    
    if (transcript.trim() && !isProcessingRef.current) {
      console.log('📤 Sending user message:', transcript);
      isProcessingRef.current = true;
      onSendMessage(transcript.trim());
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    }
  }, [onSendMessage, isSpeaking, stopSpeaking]);

  const speechRecognitionOptions = useMemo(() => ({
    stopOnKeywords: [], // Empty array - we handle stop commands in transcript callback
    stopOnSilence: false, // Turn off custom silence detection
    continuous: isVoiceModeActive ? true : false, // Continuous mode for voice chat
  }), [isVoiceModeActive]);

  const { isListening, startListening, stopListening, hasSupport } = useSpeechRecognitionUnified(
    handleTranscriptReady,
    speechRecognitionOptions
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);
  
  // Auto-speak new AI messages in voice mode
  useEffect(() => {
    console.log('🔊 AUTO-SPEAK EFFECT RAN:', {
      isVoiceModeActive,
      hasSpeechSynthesis,
      chatHistoryLength: chatHistory.length,
      isLoading,
      lastAIMessageIndex
    });

    if (!isVoiceModeActive) {
      console.log('❌ Voice mode not active');
      return;
    }
    
    if (!hasSpeechSynthesis) {
      console.log('❌ Speech synthesis not supported');
      return;
    }
    
    if (chatHistory.length === 0) {
      console.log('❌ No chat history');
      return;
    }
    
    if (isLoading) {
      console.log('❌ Still loading');
      return;
    }

    const lastMessage = chatHistory[chatHistory.length - 1];
    const currentIndex = chatHistory.length - 1;
    
    console.log('📝 Last message check:', {
      role: lastMessage.role,
      text: lastMessage.text?.substring(0, 30),
      currentIndex,
      lastAIMessageIndex,
      isNew: currentIndex > lastAIMessageIndex
    });
    
    // Check if this is a new AI message that we haven't spoken yet
    if (lastMessage.role === 'model' && currentIndex > lastAIMessageIndex) {
      console.log('✅✅✅ WILL SPEAK NOW:', lastMessage.text.substring(0, 50));
      setLastAIMessageIndex(currentIndex);
      
      // Speak immediately
      setTimeout(() => {
        console.log('🔊 CALLING SPEAK()');
        speak(lastMessage.text);
        // Enable autoplay on first successful speak
        if (!isAutoplayEnabled) {
          setIsAutoplayEnabled(true);
        }
      }, 100);
    } else {
      console.log('❌ Not speaking because:', {
        isModel: lastMessage.role === 'model',
        isNew: currentIndex > lastAIMessageIndex
      });
    }
  }, [chatHistory, isVoiceModeActive, hasSpeechSynthesis, isLoading, lastAIMessageIndex, speak, isAutoplayEnabled]); // FULL dependencies
  
  // Start/stop listening when voice mode changes
  useEffect(() => {
    if (isOpen && isVoiceModeActive && hasSupport && !isListening && !isLoading) {
      // Auto-start listening in voice mode
      setTimeout(() => {
        startListening();
      }, 1000);
    } else if (!isVoiceModeActive && isListening) {
      // Stop listening when voice mode is disabled
      stopListening();
    }
  }, [isVoiceModeActive, isOpen, hasSupport, isListening, isLoading, startListening, stopListening]);
  
  // Auto-restart listening after AI finishes speaking in voice mode
  useEffect(() => {
    if (isVoiceModeActive && !isSpeaking && !isListening && !isLoading && isOpen) {
      // Shorter delay if it was interrupted, longer if completed naturally
      const delay = wasInterrupted ? 500 : 1500;
      
      console.log(`⏱️ Scheduling listening restart in ${delay}ms (interrupted: ${wasInterrupted})`);
      
      const restartTimer = setTimeout(() => {
        if (isVoiceModeActive && !isSpeaking && !isListening && !isLoading) {
          console.log('🎤 Auto-restarting listening');
          startListening();
          setWasInterrupted(false);
        }
      }, delay);
      
      return () => clearTimeout(restartTimer);
    }
  }, [isVoiceModeActive, isSpeaking, isListening, isLoading, isOpen, startListening, wasInterrupted]);
  
  useEffect(() => {
      if (!isOpen) {
          if (isListening) {
            stopListening();
          }
          if (isSpeaking) {
            stopSpeaking();
          }
          setUserInput('');
          setIsVoiceModeActive(voiceModeEnabled);
          setLastAIMessageIndex(-1);
          isProcessingRef.current = false;
      }
  }, [isOpen, isListening, stopListening, isSpeaking, stopSpeaking, voiceModeEnabled]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('modal.chat.title', 'AI Asistan Sohbeti')}</h2>
            {hasSupport && hasSpeechSynthesis && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsVoiceModeActive(!isVoiceModeActive);
                    if (isSpeaking) stopSpeaking();
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isVoiceModeActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  title={t('modal.chat.voiceModeTooltip', 'Sesli sohbet modu')}
                >
                  <div className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    {t('modal.chat.voiceMode', 'Sesli Mod')}
                  </div>
                </button>
                {isSpeaking && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>{t('modal.chat.speaking', 'Konuşuyor...')}</span>
                  </div>
                )}
                {wasInterrupted && !isSpeaking && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t('modal.chat.interrupted', 'Kesildi')}</span>
                  </div>
                )}
                {isVoiceModeActive && !isAutoplayEnabled && (
                  <button
                    onClick={() => {
                      // User interaction trigger - this enables autoplay
                      speak(t('modal.chat.audioSystemActive', 'Ses sistemi aktif!'));
                      setIsAutoplayEnabled(true);
                    }}
                    className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded text-xs font-medium hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                    title={t('modal.chat.audioPermissionTooltip', 'AI\'nin otomatik konuşması için ses izni gerekiyor')}
                  >
                    🔊 {t('modal.chat.giveAudioPermission', 'Ses İzni Ver')}
                  </button>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="flex-grow p-4 overflow-y-auto space-y-4">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent-color-500)] flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                </div>
              )}
              <div className={`max-w-md lg:max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-[var(--accent-color-600)] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                {msg.role === 'model' && isVoiceModeActive && hasSpeechSynthesis && (
                  <button
                    onClick={() => {
                      speak(msg.text);
                      if (!isAutoplayEnabled) {
                        setIsAutoplayEnabled(true);
                      }
                    }}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                    title={t('modal.chat.readAloudTooltip', 'Bu mesajı sesli oku')}
                  >
                    🔊 {t('modal.chat.readAloud', 'Sesli Oku')}
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent-color-500)] flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
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

        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={isListening ? t('modal.chat.listening', 'Dinleniyor...') : t('modal.chat.placeholder', 'Mesajınızı yazın...')}
              className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
              disabled={isLoading || isListening}
            />
             {hasSupport && (
              <button
                type="button"
                onClick={handleMicClick}
                className={`p-3 rounded-md transition-colors duration-200 flex items-center justify-center relative ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : isVoiceModeActive 
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
                disabled={isLoading}
                title={isVoiceModeActive ? t('modal.chat.voiceModeActive', 'Sesli mod aktif') : t('modal.chat.microphone', 'Mikrofon')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {isVoiceModeActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                )}
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
