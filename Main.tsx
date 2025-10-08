import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import Header from './components/Header';
import TodoList from './components/TodoList';
import ActionBar from './components/ActionBar';
import TaskModal from './components/TaskModal';
import ChatModal from './components/ChatModal';
import ImageTaskModal from './components/ImageTaskModal';
import LocationPromptModal from './components/LocationPromptModal';
import SuggestionsModal from './components/SuggestionsModal';
import NotepadAiModal from './components/NotepadAiModal';
import AiAssistantMessage from './components/AiAssistantMessage';
import Loader from './components/Loader';
import NotificationPopup from './components/NotificationPopup';
import ReminderPopup from './components/ReminderPopup';
import DailyNotepad from './components/DailyNotepad';
import TimelineView from './components/TimelineView';
import ArchiveModal from './components/ArchiveModal';

import useLocalStorage from './hooks/useLocalStorage';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { geminiService } from './services/geminiService';
import { archiveService } from './services/archiveService';

// FIX: Import the new AnalyzedTaskData type.
import { Todo, Priority, ChatMessage, Note, DailyBriefing, AIMetadata, AnalyzedTaskData } from './types';
import { AccentColor } from './App';

interface MainProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  apiKey: string;
  assistantName: string;
  userId: string;
  onNavigateToProfile: () => void;
}

type ViewMode = 'list' | 'timeline';

const Main: React.FC<MainProps> = ({ theme, setTheme, accentColor, setAccentColor, apiKey, assistantName, userId, onNavigateToProfile }) => {
    const [todos, setTodos] = useLocalStorage<Todo[]>('todos', []);
    const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
    const [chatHistory, setChatHistory] = useLocalStorage<ChatMessage[]>('chatHistory', []);

    // Component State
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('AI Düşünüyor...');
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [reminders, setReminders] = useState<string[]>([]);
    
    // Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isImageTaskModalOpen, setIsImageTaskModalOpen] = useState(false);
    const [isLocationPromptOpen, setIsLocationPromptOpen] = useState(false);
    const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
    const [isNotepadAiModalOpen, setIsNotepadAiModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    const [todoForDirections, setTodoForDirections] = useState<Todo | null>(null);
    const [dailyBriefing, setDailyBriefing] = useState<DailyBriefing | null>(null);

    const checkApiKey = useCallback(() => {
        if (!apiKey) {
            setNotification({ message: 'Lütfen profil sayfasından Gemini API anahtarınızı girin.', type: 'error' });
            return false;
        }
        return true;
    }, [apiKey]);
    
    // --- Wake Word Recognition ---
    const wakeWordListener = useSpeechRecognition(
        (transcript) => {
            if (transcript) {
                mainCommandListener.startListening();
            }
        },
        { continuous: true, stopOnKeywords: [assistantName.toLowerCase()], stopOnSilence: false }
    );
    
    // --- Main Command Recognition (after wake word) ---
    const mainCommandListener = useSpeechRecognition(
        (command) => {
            if (command) {
                handleAddTask(command);
            }
        },
        { continuous: false, stopOnSilence: true }
    );
    
    // Wake word effect management
    useEffect(() => {
        const canListen = !isTaskModalOpen && !isChatOpen && !isImageTaskModalOpen && !isLocationPromptOpen && !isSuggestionsModalOpen && !isNotepadAiModalOpen && !isArchiveModalOpen && !mainCommandListener.isListening;
        
        if (canListen && !wakeWordListener.isListening) {
             try {
                wakeWordListener.startListening();
             } catch (e) {
                console.error("Wake word listener start error:", e);
                // This can happen if start is called too quickly again.
                // The logic tries to prevent this, but as a fallback, we catch it.
             }
        } else if (!canListen && wakeWordListener.isListening) {
            wakeWordListener.stopListening();
        }
    }, [isTaskModalOpen, isChatOpen, isImageTaskModalOpen, isLocationPromptOpen, isSuggestionsModalOpen, isNotepadAiModalOpen, isArchiveModalOpen, mainCommandListener.isListening, wakeWordListener]);


    // --- Task Management ---
    const handleAddTask = useCallback(async (description: string, imageBase64?: string, imageMimeType?: string) => {
        if (!checkApiKey()) return;
        setIsLoading(true);
        setLoadingMessage('Göreviniz analiz ediliyor...');

        try {
            // FIX: Use the specific AnalyzedTaskData type for the AI result.
            const aiResult: AnalyzedTaskData | null = imageBase64 && imageMimeType
                ? await geminiService.analyzeImageForTask(apiKey, description, imageBase64, imageMimeType)
                : await geminiService.analyzeTask(apiKey, description);

            if (aiResult) {
                // FIX: Destructure the AI result to separate core Todo properties from metadata.
                // This resolves the type error and provides a cleaner data structure.
                const { text, priority, datetime, ...metadata } = aiResult;
                const newTodo: Todo = {
                    id: uuidv4(),
                    text: text || description,
                    priority: priority || Priority.Medium,
                    datetime: datetime || null,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    aiMetadata: metadata,
                };
                setTodos(prev => [newTodo, ...prev]);
                setNotification({ message: 'Yeni görev eklendi!', type: 'success' });
            } else {
                throw new Error("AI analysis returned null.");
            }
        } catch (error) {
            console.error("Error adding task:", error);
            const newTodo: Todo = {
                id: uuidv4(),
                text: description,
                priority: Priority.Medium,
                datetime: null,
                completed: false,
                createdAt: new Date().toISOString(),
            };
            setTodos(prev => [newTodo, ...prev]);
            setNotification({ message: 'Görev eklendi (AI analizi başarısız).', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [apiKey, setTodos, checkApiKey]);
    
    const handleToggleTodo = (id: string) => {
        setTodos(todos.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo));
    };

    const handleDeleteTodo = (id: string) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };

    const handleEditTodo = (id: string, newText: string) => {
        setTodos(todos.map(todo => todo.id === id ? { ...todo, text: newText } : todo));
    };

    // --- Directions ---
    const handleGetDirections = (todo: Todo) => {
        if (!checkApiKey()) return;
        if (todo.aiMetadata?.destination) {
            setTodoForDirections(todo);
            setIsLocationPromptOpen(true);
        }
    };

    const handleLocationSubmit = async (origin: string) => {
        setIsLocationPromptOpen(false);
        if (!todoForDirections || !todoForDirections.aiMetadata?.destination) return;
        if (!checkApiKey()) return;

        setIsLoading(true);
        setLoadingMessage('Yol tarifi alınıyor...');
        const directions = await geminiService.getDirections(apiKey, origin, todoForDirections.aiMetadata.destination);
        setIsLoading(false);

        if (directions) {
            setTodos(todos.map(t => t.id === todoForDirections.id ? {
                ...t,
                aiMetadata: {
                    ...t.aiMetadata,
                    routingInfo: directions,
                    routingOrigin: origin
                }
            } : t));
        } else {
            setNotification({ message: 'Yol tarifi alınamadı.', type: 'error' });
        }
        setTodoForDirections(null);
    };

    // --- Chat ---
    const handleOpenChat = useCallback(() => {
        if (!checkApiKey()) return;
        if (chatHistory.length === 0) {
          setChatHistory([
            {
              role: 'model',
              text: `Merhaba, ben ${assistantName}. Size nasıl yardımcı olabilirim? Görev ekleyebilir, gününüzü özetleyebilir veya sorularınızı yanıtlayabilirim.`
            },
          ]);
        }
        setIsChatOpen(true);
      }, [chatHistory, setChatHistory, checkApiKey, assistantName]);

    const handleSendMessage = async (message: string) => {
        if (!checkApiKey()) return;
        const userMessage: ChatMessage = { role: 'user', text: message };
        setChatHistory(prev => [...prev, userMessage]);
        setIsLoading(true);

        const intentResult = await geminiService.classifyChatIntent(apiKey, message);

        if (intentResult?.intent === 'add_task' && intentResult.description) {
            await handleAddTask(intentResult.description);
            const modelMessage: ChatMessage = { role: 'model', text: `Elbette, "${intentResult.description}" görevi listeye eklendi.` };
            setChatHistory(prev => [...prev, modelMessage]);
            setIsLoading(false);
            return;
        }
        
        if (intentResult?.intent === 'add_note' && intentResult.description) {
            const newNote: Note = {
                id: uuidv4(),
                text: intentResult.description,
                createdAt: new Date().toISOString(),
            };
            setNotes(prev => [newNote, ...prev]);
            const modelMessage: ChatMessage = { role: 'model', text: `Anlaşıldı, "${intentResult.description}" notlarınıza eklendi.` };
            setChatHistory(prev => [...prev, modelMessage]);
            setIsLoading(false);
            return;
        }

        if (intentResult?.intent === 'get_summary') {
            await handleGetDailyBriefing();
            const modelMessage: ChatMessage = { role: 'model', text: `Tabii, günün özeti hazırlanıyor...` };
            setChatHistory(prev => [...prev, modelMessage]);
            setIsLoading(false);
            setIsChatOpen(false); // Close chat to show the summary modal
            return;
        }

        // Default to general chat
        const response = await geminiService.startChat(apiKey, chatHistory, message);
        if (response && response.text) {
            const modelMessage: ChatMessage = { role: 'model', text: response.text };
            setChatHistory(prev => [...prev, modelMessage]);
        } else {
            const errorMessage: ChatMessage = { role: 'model', text: 'Üzgünüm, bir hata oluştu. API anahtarınızı kontrol edip tekrar deneyin.' };
            setChatHistory(prev => [...prev, errorMessage]);
        }
        setIsLoading(false);
    };


    // --- Notepad ---
    const handleAnalyzeNotes = async (selectedNotes: Note[], prompt: string) => {
        if (!checkApiKey()) return;
        setIsNotepadAiModalOpen(false);
        setIsLoading(true);
        setLoadingMessage('Notlarınız işleniyor...');
        
        const result = await geminiService.processNotesWithPrompt(apiKey, selectedNotes, prompt);
        
        setAiMessage(result || 'Sonuç alınamadı.');
        setIsLoading(false);
    };

    const handleAnalyzeImageNote = async (noteId: string) => {
        if (!checkApiKey()) return;
        const note = notes.find(n => n.id === noteId);
        if (!note || !note.imageUrl) return;

        setIsLoading(true);
        setLoadingMessage('Resimdeki metin çıkarılıyor...');
        const extractedText = await geminiService.extractTextFromImage(apiKey, note);
        setIsLoading(false);
        
        if (extractedText) {
            const updatedText = note.text ? `${note.text}\n\n--- AI Analizi ---\n${extractedText}` : extractedText;
            setNotes(notes.map(n => n.id === noteId ? { ...n, text: updatedText } : n));
            setNotification({ message: 'Resimden metin çıkarıldı.', type: 'success' });
        } else {
            setNotification({ message: 'Resimden metin çıkarılamadı.', type: 'error' });
        }
    };
    
    // --- Daily Briefing ---
    const handleGetDailyBriefing = async () => {
        if (!checkApiKey()) return;
        setIsLoading(true);
        const briefing = await geminiService.getDailyBriefing(apiKey, todos.filter(t => !t.completed));
        setIsLoading(false);

        if (briefing) {
            setDailyBriefing(briefing);
            setIsSuggestionsModalOpen(true);
        } else {
            setNotification({ message: 'Günlük özet alınamadı.', type: 'error' });
        }
    };

    // --- Reminders & Archive ---
    const [lastArchiveDate, setLastArchiveDate] = useLocalStorage<string>('lastArchiveDate', '');

    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (lastArchiveDate !== todayStr) {
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);
            const timeToMidnight = midnight.getTime() - Date.now();
            
            const timer = setTimeout(() => {
                const completedTodos = todos.filter(t => t.completed);
                if (completedTodos.length > 0 || notes.length > 0) {
                    archiveService.archiveItems(completedTodos, notes, userId).then(() => {
                        setTodos(todos.filter(t => !t.completed));
                        setNotes([]);
                        setLastArchiveDate(todayStr);
                        setNotification({ message: 'Tamamlanan görevler ve notlar arşivlendi.', type: 'success' });
                    });
                } else {
                     setLastArchiveDate(todayStr);
                }
            }, timeToMidnight > 0 ? timeToMidnight : 1000); // Run immediately if past midnight

            return () => clearTimeout(timer);
        }
    }, [lastArchiveDate, notes, setLastArchiveDate, setNotes, setTodos, todos]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const upcomingTodos = todos.filter(todo => {
                if (!todo.datetime || todo.completed) return false;
                const todoTime = new Date(todo.datetime);
                const diffMinutes = (todoTime.getTime() - now.getTime()) / (1000 * 60);
                // Remind if task is within 15 mins and we haven't reminded for it yet
                return diffMinutes > 0 && diffMinutes <= 15 && !reminders.includes(todo.id);
            });

            if (upcomingTodos.length > 0) {
                const newReminderIds = upcomingTodos.map(t => t.id);
                setReminders(prev => [...new Set([...prev, ...newReminderIds])]);
            }
        }, 60 * 1000); // Check every minute

        return () => clearInterval(interval);
    }, [todos, reminders]);


    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {isLoading && <Loader message={loadingMessage} />}
            {notification && <NotificationPopup message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            {reminders.map(id => {
                 const todo = todos.find(t => t.id === id);
                 return todo ? <ReminderPopup key={id} message={`Yaklaşan Görev: ${todo.text}`} onClose={() => setReminders(r => r.filter(rid => rid !== id))} /> : null;
            })}

            <Header theme={theme} setTheme={setTheme} accentColor={accentColor} setAccentColor={setAccentColor} onNavigateToProfile={onNavigateToProfile} />
            
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <ActionBar
                    onSimpleVoiceCommand={() => { if(checkApiKey()) setIsTaskModalOpen(true); }}
                    onOpenChat={handleOpenChat}
                    onImageTask={() => { if(checkApiKey()) setIsImageTaskModalOpen(true); }}
                    isListening={mainCommandListener.isListening}
                />
                {aiMessage && <AiAssistantMessage message={aiMessage} onClose={() => setAiMessage(null)} />}

                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold">Görevlerim</h2>
                        <button onClick={handleGetDailyBriefing} className="hidden sm:inline-flex items-center gap-2 text-sm text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] hover:underline">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            Günün Özetini Al
                        </button>
                         <button onClick={() => setIsArchiveModalOpen(true)} className="hidden sm:inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--accent-color-600)] dark:hover:text-[var(--accent-color-400)] hover:underline">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                             Arşivi Görüntüle
                        </button>
                    </div>
                    <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Liste</button>
                        <button onClick={() => setViewMode('timeline')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Zaman Çizelgesi</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        {viewMode === 'list' ? (
                            <TodoList
                                todos={todos}
                                onToggle={handleToggleTodo}
                                onDelete={handleDeleteTodo}
                                onGetDirections={handleGetDirections}
                                onEdit={handleEditTodo}
                                onShare={(todo) => navigator.clipboard.writeText(`Görev: ${todo.text}${todo.datetime ? `\nTarih: ${new Date(todo.datetime).toLocaleString('tr-TR')}` : ''}`).then(() => setNotification({message: 'Görev panoya kopyalandı!', type: 'success'}))}
                            />
                        ) : (
                            <TimelineView todos={todos} />
                        )}
                    </div>
                    <div className="lg:col-span-1">
                       <DailyNotepad notes={notes} setNotes={setNotes} onOpenAiModal={() => {if(checkApiKey()) setIsNotepadAiModalOpen(true);}} onAnalyzeImage={handleAnalyzeImageNote} />
                    </div>
                </div>

            </main>

            {/* Modals */}
            <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onAddTask={handleAddTask} />
            <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} chatHistory={chatHistory} onSendMessage={handleSendMessage} isLoading={isLoading && isChatOpen} />
            <ImageTaskModal isOpen={isImageTaskModalOpen} onClose={() => setIsImageTaskModalOpen(false)} onAddTask={handleAddTask} />
            <LocationPromptModal isOpen={isLocationPromptOpen} onClose={() => setIsLocationPromptOpen(false)} onSubmit={handleLocationSubmit} destination={todoForDirections?.aiMetadata?.destination || ''} />
            <SuggestionsModal isOpen={isSuggestionsModalOpen} onClose={() => setIsSuggestionsModalOpen(false)} briefing={dailyBriefing} />
            <NotepadAiModal isOpen={isNotepadAiModalOpen} onClose={() => setIsNotepadAiModalOpen(false)} onSubmit={handleAnalyzeNotes} notes={notes} />
            <ArchiveModal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} currentTodos={todos} />
        </div>
    );
};

export default Main;