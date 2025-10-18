import React, { useState, useEffect, useRef } from 'react';
import { AIService, AIMessage } from '../src/services/aiService';
import { AIProvider } from '../src/types/ai';
import { useSpeechRecognitionUnified } from '../src/hooks/useSpeechRecognitionUnified';

interface WebhookChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  webhookContext?: {
    type?: string;
    name?: string;
    setupInstructions?: string[];
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // Base64 encoded images
  timestamp: Date;
}

const WebhookChatbot: React.FC<WebhookChatbotProps> = ({ isOpen, onClose, webhookContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [aiService, setAiService] = useState<AIService | null>(null);
  const [error, setError] = useState<string>('');
  
  // Speech recognition
  const handleSpeechResult = (transcript: string) => {
    if (transcript.trim()) {
      setInput(prevInput => prevInput + ' ' + transcript.trim());
      // Focus the textarea after speech input
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };
  
  const {
    isListening,
    transcript: speechTranscript,
    startListening,
    stopListening,
    hasSupport: hasSpeechSupport
  } = useSpeechRecognitionUnified(handleSpeechResult, {
    stopOnKeywords: ['tamam', 'bitti', 'ok', 'kaydet', 'gönder'],
    continuous: false,
    stopOnSilence: true
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize AI service from localStorage
  useEffect(() => {
    try {
      // Try to get current AI service using the app's actual storage keys
      const currentProvider = (localStorage.getItem('ai-provider') as AIProvider) || AIProvider.GEMINI;
      let apiKey = localStorage.getItem(`${currentProvider}-api-key`);
      
      // Fallback for Gemini (backward compatibility)
      if (!apiKey && currentProvider === AIProvider.GEMINI) {
        apiKey = localStorage.getItem('gemini-api-key');
      }
      
      if (apiKey) {
        setAiService(new AIService(currentProvider, apiKey));
        
        // Add welcome message
        if (messages.length === 0) {
          setMessages([{
            role: 'assistant',
            content: webhookContext?.type 
              ? `Merhaba! ${webhookContext.name || webhookContext.type} webhook kurulumunda size yardımcı olabilirim. Sorunuz nedir?`
              : 'Merhaba! Webhook kurulumunda size nasıl yardımcı olabilirim? Ekran görüntüsü paylaşabilir veya soru sorabilirsiniz.',
            timestamp: new Date()
          }]);
        }
        setError(''); // Clear any previous errors
      } else {
        setError('AI yapılandırması bulunamadı. Lütfen önce ayarlardan API anahtarınızı ve model seçiminizi yapın.');
      }
    } catch (error) {
      console.error('AI service initialization error:', error);
      setError('AI servisi başlatılamadı. Lütfen ayarlarınızı kontrol edin.');
    }
  }, [webhookContext]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!isOpen) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              setSelectedImages(prev => [...prev, base64]);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setSelectedImages(prev => [...prev, base64]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Remove image
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async () => {
    if ((!input.trim() && selectedImages.length === 0) || !aiService) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim() || 'Bu görselde yardım eder misin?',
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImages([]);
    setIsLoading(true);
    setError('');

    try {
      // Build context-aware system prompt
      let systemPrompt = `Sen bir webhook kurulum asistanısın. Kullanıcıya Türkçe, açık ve adım adım yardım et.`;
      
      if (webhookContext) {
        systemPrompt += `\n\nŞu anda ${webhookContext.name || webhookContext.type} webhook'u için kurulum yapılıyor.`;
        
        if (webhookContext.setupInstructions) {
          systemPrompt += `\n\nKurulum Adımları:\n${webhookContext.setupInstructions.join('\n')}`;
        }
      }
      
      systemPrompt += `\n\nKullanıcı ekran görüntüleri paylaşabilir. Görselleri analiz edip, hangi adımda olduklarını ve ne yapmaları gerektiğini açıkla.`;
      systemPrompt += `\n\nHata mesajları görürsen, çözüm öner. Kısa, net ve pratik cevaplar ver.`;

      // Prepare messages for AI
      const aiMessages: AIMessage[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Add recent conversation history (last 10 messages)
      // Skip the initial assistant welcome message to avoid Gemini role issues
      const recentMessages = messages.slice(-10).filter((msg, index, arr) => {
        // Skip first assistant message if it's the welcome message
        if (index === 0 && msg.role === 'assistant' && arr.length > 1) {
          return false;
        }
        return true;
      });
      
      recentMessages.forEach(msg => {
        aiMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      });

      // Add current message
      let currentContent = userMessage.content;
      if (userMessage.images && userMessage.images.length > 0) {
        currentContent += `\n\n[Kullanıcı ${userMessage.images.length} adet görsel paylaştı]`;
        // Note: Image analysis would need vision-capable models (GPT-4 Vision, Gemini Pro Vision)
        // For now, we acknowledge the image but can't analyze it fully
      }
      
      aiMessages.push({
        role: 'user',
        content: currentContent
      });

      const response = await aiService.generateWithHistory(aiMessages, {
        temperature: 0.7,
        maxTokens: 500
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.text,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI Error:', err);
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin veya sorunuzu farklı bir şekilde sorun.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">🤖 Webhook Kurulum Asistanı</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {webhookContext?.name || 'Webhook kurulumunda size yardımcı oluyorum'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 p-3 m-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                
                {/* Display images if any */}
                {msg.images && msg.images.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {msg.images.map((img, imgIdx) => (
                      <img
                        key={imgIdx}
                        src={img}
                        alt={`Uploaded ${imgIdx + 1}`}
                        className="rounded-lg max-h-32 object-cover"
                      />
                    ))}
                  </div>
                )}
                
                <div className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview */}
        {selectedImages.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2 overflow-x-auto">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <img src={img} alt={`Preview ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Resim ekle veya Ctrl+V ile yapıştır"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            
            {/* Microphone Button */}
            {hasSpeechSupport && (
              <button
                onClick={isListening ? stopListening : startListening}
                className={`p-3 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                title={isListening ? 'Ses kaydını durdur' : 'Sesli mesaj kaydet'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isListening ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın veya Ctrl+V ile resim yapıştırın..."
              className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={!aiService}
            />

            <button
              onClick={handleSendMessage}
              disabled={(!input.trim() && selectedImages.length === 0) || isLoading || !aiService}
              className="p-3 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          {/* Speech transcript display */}
          {isListening && speechTranscript && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                🎤 Dinleniyor... ("tamam", "bitti", "ok", "kaydet", "gönder" diyerek bitirin)
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                {speechTranscript || '...'}
              </div>
            </div>
          )}
          
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            💡 İpucu: Ekran görüntülerini Ctrl+V ile yapıştırabilirsiniz{hasSpeechSupport && ' • Mikrofon butonu ile sesli mesaj gönderebilirsiniz'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookChatbot;
