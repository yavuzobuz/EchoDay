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
import InfoBanner from './components/InfoBanner';
import ShareModal from './components/ShareModal';

import useLocalStorage from './hooks/useLocalStorage';
import { useSpeechRecognition } from './hooks/useSpeechRecognitionUnified';
import { geminiService } from './services/geminiService';
import { archiveService } from './services/archiveService';

// FIX: Import the new AnalyzedTaskData type.
import { Todo, Priority, ChatMessage, Note, DailyBriefing, AnalyzedTaskData } from './types';
import { AccentColor } from './App';

interface MainProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  apiKey: string;
  assistantName: string;
  onNavigateToProfile: () => void;
}

type ViewMode = 'list' | 'timeline';

const Main: React.FC<MainProps> = ({ theme, setTheme, accentColor, setAccentColor, apiKey, assistantName, onNavigateToProfile }) => {
    const [todos, setTodos] = useLocalStorage<Todo[]>('todos', []);
    const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
    const [chatHistory, setChatHistory] = useLocalStorage<ChatMessage[]>('chatHistory', []);
    const [showInfoBanner, setShowInfoBanner] = useLocalStorage<boolean>('show-info-banner', true);

    // Component State
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('AI Düşünüyor...');
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [activeReminders, setActiveReminders] = useState<string[]>([]);
    const [notifiedTaskIds, setNotifiedTaskIds] = useState<string[]>([]);
    
    // Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isImageTaskModalOpen, setIsImageTaskModalOpen] = useState(false);
    const [isLocationPromptOpen, setIsLocationPromptOpen] = useState(false);
    const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
    const [isNotepadAiModalOpen, setIsNotepadAiModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareItem, setShareItem] = useState<Todo | Note | null>(null);
    const [shareType, setShareType] = useState<'todo' | 'note'>('todo');

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
        { continuous: true, stopOnKeywords: [assistantName.toLowerCase()] }
    );
    
    // --- Main Command Recognition (after wake word) ---
    const mainCommandListener = useSpeechRecognition(
        (command) => {
            if (command) {
                handleAddTask(command);
            }
        },
        { continuous: false }
    );
    
    // Detect if running in Electron
    const [isElectron] = useState(() => {
        return !!(window as any).isElectron || !!(window as any).electronAPI;
    });

    // Request speech permission on mount
    useEffect(() => {
        // Disable wake word listener in Electron (causes network errors)
        if (isElectron) {
            console.log('[Main] Wake word listener disabled in Electron');
            // Don't show warning - user can still use manual buttons
            return;
        }
        
        wakeWordListener.checkAndRequestPermission();
    }, [wakeWordListener.checkAndRequestPermission, isElectron]);


    // Wake word effect management (disabled in Electron)
    useEffect(() => {
        // Skip wake word listener in Electron
        if (isElectron) {
            return;
        }
        
        const canListen = !isTaskModalOpen && !isChatOpen && !isImageTaskModalOpen && !isLocationPromptOpen && !isSuggestionsModalOpen && !isNotepadAiModalOpen && !isArchiveModalOpen && !mainCommandListener.isListening;
        
        if (canListen && !wakeWordListener.isListening) {
             try {
                wakeWordListener.startListening();
             } catch (e) {
                console.error("Wake word listener start error:", e);
             }
        } else if (!canListen && wakeWordListener.isListening) {
            wakeWordListener.stopListening();
        }
    }, [isTaskModalOpen, isChatOpen, isImageTaskModalOpen, isLocationPromptOpen, isSuggestionsModalOpen, isNotepadAiModalOpen, isArchiveModalOpen, mainCommandListener.isListening, wakeWordListener, isElectron]);


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
        setIsChatOpen(true);
      }, [checkApiKey]);

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
        // chatHistory'ye yeni user mesajını da ekledik, artık güncel history'yi gönderebiliriz
        const updatedHistory = [...chatHistory, userMessage];
        const response = await geminiService.startChat(apiKey, updatedHistory, message);
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
                    archiveService.archiveItems(completedTodos, notes).then(() => {
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

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        // Function to check reminders
        const checkReminders = () => {
            const now = new Date();
            console.log('[Reminder Check] Current time:', now.toISOString());
            console.log('[Reminder Check] Total todos:', todos.length);
            console.log('[Reminder Check] Notified task IDs:', notifiedTaskIds);
            
            const upcomingTodos = todos.filter(todo => {
                if (!todo.datetime || todo.completed) return false;
                const todoTime = new Date(todo.datetime);
                const diffMinutes = (todoTime.getTime() - now.getTime()) / (1000 * 60);
                
                console.log(`[Reminder Check] Task: "${todo.text}"`);
                console.log(`  - datetime: ${todo.datetime}`);
                console.log(`  - todoTime: ${todoTime.toISOString()}`);
                console.log(`  - diffMinutes: ${diffMinutes.toFixed(2)}`);
                console.log(`  - notified: ${notifiedTaskIds.includes(todo.id)}`);
                
                // Remind if task is within 15 mins and we haven't reminded for it yet
                return diffMinutes > 0 && diffMinutes <= 15 && !notifiedTaskIds.includes(todo.id);
            });

            console.log('[Reminder Check] Upcoming todos count:', upcomingTodos.length);

            if (upcomingTodos.length > 0) {
                const newReminderIds = upcomingTodos.map(t => t.id);
                console.log('[Reminder Check] Triggering reminders for:', newReminderIds);
                
                // Add to notified list so we don't show it again
                setNotifiedTaskIds(prev => [...new Set([...prev, ...newReminderIds])]);
                // Add to active reminders to show the popup
                setActiveReminders(prev => [...new Set([...prev, ...newReminderIds])]);
                
                // Send browser notifications if permission granted
                if ('Notification' in window && Notification.permission === 'granted') {
                    upcomingTodos.forEach(todo => {
                        const todoTime = new Date(todo.datetime!);
                        const diffMinutes = Math.round((todoTime.getTime() - now.getTime()) / (1000 * 60));
                        new Notification('EchoDay Hatırlatma', {
                            body: `${diffMinutes} dakika içinde: ${todo.text}`,
                            icon: '/icon-192.png',
                            badge: '/icon-192.png',
                            tag: todo.id,
                            requireInteraction: false
                        });
                    });
                }
            }
        };
        
        // Check immediately on mount/update
        checkReminders();
        
        // Then check every minute
        const interval = setInterval(checkReminders, 60 * 1000);

        return () => clearInterval(interval);
    }, [todos, notifiedTaskIds]);


    return (
        <div className="min-h-screen overflow-x-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {isLoading && <Loader message={loadingMessage} />}
            {notification && <NotificationPopup message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            {activeReminders.map(id => {
                 const todo = todos.find(t => t.id === id);
                 return todo ? <ReminderPopup key={id} message={`Yaklaşan Görev: ${todo.text}`} onClose={() => setActiveReminders(r => r.filter(rid => rid !== id))} /> : null;
            })}

            <Header theme={theme} setTheme={setTheme} accentColor={accentColor} setAccentColor={setAccentColor} onNavigateToProfile={onNavigateToProfile} />
            
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {showInfoBanner && <InfoBanner assistantName={assistantName} onClose={() => setShowInfoBanner(false)} />}
                <ActionBar
                    onSimpleVoiceCommand={() => { if(checkApiKey()) setIsTaskModalOpen(true); }}
                    onOpenChat={handleOpenChat}
                    onImageTask={() => { if(checkApiKey()) setIsImageTaskModalOpen(true); }}
                    isListening={mainCommandListener.isListening}
                />
                {aiMessage && <AiAssistantMessage message={aiMessage} onClose={() => setAiMessage(null)} />}

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                        <h2 className="text-xl sm:text-2xl font-bold">Görevlerim</h2>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={handleGetDailyBriefing} className="inline-flex items-center gap-1 text-xs sm:text-sm text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] hover:underline">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                <span className="hidden sm:inline">Günün Özetini Al</span>
                                <span className="sm:hidden">Özet</span>
                            </button>
                            <button onClick={() => setIsArchiveModalOpen(true)} className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-[var(--accent-color-600)] dark:hover:text-[var(--accent-color-400)] hover:underline">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                <span className="hidden sm:inline">Arşivi Görüntüle</span>
                                <span className="sm:hidden">Arşiv</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-lg self-start sm:self-auto">
                        <button onClick={() => setViewMode('list')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Liste</button>
                        <button onClick={() => setViewMode('timeline')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Zaman Çizelgesi</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div className="lg:col-span-1">
                        {viewMode === 'list' ? (
                            <TodoList
                                todos={todos}
                                onToggle={handleToggleTodo}
                                onDelete={handleDeleteTodo}
                                onGetDirections={handleGetDirections}
                                onEdit={handleEditTodo}
                                onShare={(todo) => { setShareType('todo'); setShareItem(todo); setIsShareModalOpen(true); }}
                            />
                        ) : (
                            <TimelineView todos={todos} />
                        )}
                    </div>
                    <div className="lg:col-span-1 mt-4 lg:mt-0">
                       <DailyNotepad
                           notes={notes}
                           setNotes={setNotes}
                           onOpenAiModal={() => { if(checkApiKey()) setIsNotepadAiModalOpen(true); }}
                           onAnalyzeImage={handleAnalyzeImageNote}
                           onShareNote={(note) => { setShareType('note'); setShareItem(note); setIsShareModalOpen(true); }}
                       />
                    </div>
                </div>

            </main>

            {/* Modals */}
            <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onAddTask={handleAddTask} />
            <ChatModal 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)} 
                chatHistory={chatHistory} 
                onSendMessage={handleSendMessage} 
                isLoading={isLoading && isChatOpen}
                notes={notes}
                onProcessNotes={handleAnalyzeNotes}
            />
            <ImageTaskModal isOpen={isImageTaskModalOpen} onClose={() => setIsImageTaskModalOpen(false)} onAddTask={handleAddTask} />
            <LocationPromptModal isOpen={isLocationPromptOpen} onClose={() => setIsLocationPromptOpen(false)} onSubmit={handleLocationSubmit} destination={todoForDirections?.aiMetadata?.destination || ''} />
            <SuggestionsModal isOpen={isSuggestionsModalOpen} onClose={() => setIsSuggestionsModalOpen(false)} briefing={dailyBriefing} />
            <NotepadAiModal isOpen={isNotepadAiModalOpen} onClose={() => setIsNotepadAiModalOpen(false)} onSubmit={handleAnalyzeNotes} notes={notes} />
            <ArchiveModal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} currentTodos={todos} />
            <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} item={shareItem} type={shareType} />
        </div>
    );
};

export default Main;