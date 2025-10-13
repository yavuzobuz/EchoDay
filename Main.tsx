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
import { Todo, Priority, ChatMessage, Note, DailyBriefing, AIMetadata, AnalyzedTaskData, GeoReminder } from './types';
import { AccentColor } from './App';
import { useGeoReminders } from './hooks/useGeoReminders';
import { initGeofence, addOrUpdateGeofence, removeGeofence } from './services/geofenceService';
import { useI18n } from './src/contexts/I18nContext';

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
type FilterMode = 'all' | 'active' | 'completed';
type TimeFilter = 'all' | 'today' | 'thisWeek' | 'thisMonth';

const Main: React.FC<MainProps> = ({ theme, setTheme, accentColor, setAccentColor, apiKey, assistantName, userId, onNavigateToProfile }) => {
    const { t } = useI18n();
    const [todos, setTodos] = useLocalStorage<Todo[]>('todos', []);
    const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
    const [chatHistory, setChatHistory] = useLocalStorage<ChatMessage[]>('chatHistory', []);

    // Component State
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(t('loading.aiThinking', 'AI Düşünüyor...'));
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
            setNotification({ message: t('error.noApiKey', 'Lütfen profil sayfasından Gemini API anahtarınızı girin.'), type: 'error' });
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


    // Init geofence once (mobile only, safe no-op on web)
    useEffect(() => { initGeofence(); }, []);

    // --- Task Management ---
    const handleAddTask = useCallback(async (description: string, imageBase64?: string, imageMimeType?: string, extra?: { locationReminder?: GeoReminder }) => {
        if (!checkApiKey()) return;
        setIsLoading(true);
        setLoadingMessage(t('loading.analyzingTask', 'Göreviniz analiz ediliyor...'));

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
                    locationReminder: extra?.locationReminder || null,
                };
                setTodos(prev => [newTodo, ...prev]);
                // Register geofence if provided
                if (extra?.locationReminder) {
                    addOrUpdateGeofence({
                        id: newTodo.id,
                        lat: extra.locationReminder.lat,
                        lng: extra.locationReminder.lng,
                        radius: extra.locationReminder.radius,
                        transition: extra.locationReminder.trigger,
                        title: t('notification.locationTask', 'Konum Yakınında Görev'),
                        text: newTodo.text,
                    });
                }
                setNotification({ message: t('success.taskAdded', 'Yeni görev eklendi!'), type: 'success' });
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
                locationReminder: extra?.locationReminder || null,
            };
            setTodos(prev => [newTodo, ...prev]);
            setNotification({ message: t('error.taskAddedWithoutAI', 'Görev eklendi (AI analizi başarısız).'), type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [apiKey, setTodos, checkApiKey]);
    
    const handleToggleTodo = (id: string) => {
        setTodos(todos.map(todo => {
            if (todo.id !== id) return todo;
            const updated = { ...todo, completed: !todo.completed };
            if (updated.completed) {
                // Remove geofence on completion
                removeGeofence(id);
            }
            return updated;
        }));
    };

    const handleDeleteTodo = (id: string) => {
        // Remove any registered geofence
        removeGeofence(id);
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
        setLoadingMessage(t('loading.gettingDirections', 'Yol tarifi alınıyor...'));
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
            setNotification({ message: t('error.directionsNotFound', 'Yol tarifi alınamadı.'), type: 'error' });
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
              text: t('chat.greeting', `Merhaba, ben {{assistantName}}. Size nasıl yardımcı olabilirim? Görev ekleyebilir, gününüzü özetleyebilir veya sorularınızı yanıtlayabilirim.`).replace('{{assistantName}}', assistantName)
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
            const modelMessage: ChatMessage = { role: 'model', text: t('chat.taskAdded', `Elbette, "{{description}}" görevi listeye eklendi.`).replace('{{description}}', intentResult.description) };
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
            const modelMessage: ChatMessage = { role: 'model', text: t('chat.noteAdded', `Anlaşıldı, "{{description}}" notlarınıza eklendi.`).replace('{{description}}', intentResult.description) };
            setChatHistory(prev => [...prev, modelMessage]);
            setIsLoading(false);
            return;
        }

        if (intentResult?.intent === 'get_summary') {
            await handleGetDailyBriefing();
            const modelMessage: ChatMessage = { role: 'model', text: t('chat.preparingSummary', `Tabii, günün özeti hazırlanıyor...`) };
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
            const errorMessage: ChatMessage = { role: 'model', text: t('chat.error', 'Üzgünüm, bir hata oluştu. API anahtarınızı kontrol edip tekrar deneyin.') };
            setChatHistory(prev => [...prev, errorMessage]);
        }
        setIsLoading(false);
    };


    // --- Notepad ---
    const handleAnalyzeNotes = async (selectedNotes: Note[], prompt: string) => {
        if (!checkApiKey()) return;
        setIsNotepadAiModalOpen(false);
        setIsLoading(true);
        setLoadingMessage(t('loading.processingNotes', 'Notlarınız işleniyor...'));
        
        const result = await geminiService.processNotesWithPrompt(apiKey, selectedNotes, prompt);
        
        setAiMessage(result || t('error.noResult', 'Sonuç alınamadı.'));
        setIsLoading(false);
    };

    const handleAnalyzeImageNote = async (noteId: string) => {
        if (!checkApiKey()) return;
        const note = notes.find(n => n.id === noteId);
        if (!note || !note.imageUrl) return;

        setIsLoading(true);
        setLoadingMessage(t('loading.extractingText', 'Resimdeki metin çıkarılıyor...'));
        const extractedText = await geminiService.extractTextFromImage(apiKey, note);
        setIsLoading(false);
        
        if (extractedText) {
            const updatedText = note.text ? `${note.text}\n\n--- ${t('note.aiAnalysis', 'AI Analizi')} ---\n${extractedText}` : extractedText;
            setNotes(notes.map(n => n.id === noteId ? { ...n, text: updatedText } : n));
            setNotification({ message: t('success.textExtracted', 'Resimden metin çıkarıldı.'), type: 'success' });
        } else {
            setNotification({ message: t('error.textExtractionFailed', 'Resimden metin çıkarılamadı.'), type: 'error' });
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
            setNotification({ message: t('error.dailySummaryFailed', 'Günlük özet alınamadı.'), type: 'error' });
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
                        setNotification({ message: t('success.itemsArchived', 'Tamamlanan görevler ve notlar arşivlendi.'), type: 'success' });
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

    // Konum tabanlı hatırlatıcılar (uygulama açıkken periyodik kontrol)
    useGeoReminders(todos, (todoId) => {
        setTodos(prev => prev.map(t => t.id === todoId ? ({
            ...t,
            locationReminder: t.locationReminder ? { ...t.locationReminder, lastTriggeredAt: new Date().toISOString() } : t.locationReminder
        }) : t));
    }, { intervalMs: 180000 });

    const handleUpdateGeoReminder = useCallback((id: string, reminder: GeoReminder | null) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, locationReminder: reminder } : t));
        if (reminder && reminder.enabled) {
            addOrUpdateGeofence({
                id,
                lat: reminder.lat,
                lng: reminder.lng,
                radius: reminder.radius,
                transition: reminder.trigger,
                title: t('notification.locationTask', 'Konum Yakınında Görev'),
                text: (todos.find(x => x.id === id)?.text) || t('unit.task', 'Görev'),
            });
        } else {
            removeGeofence(id);
        }
    }, [setTodos, todos]);

    // Filter todos based on current filters
    const filteredTodos = todos.filter(todo => {
        // Filter by completion status
        if (filterMode === 'active' && todo.completed) return false;
        if (filterMode === 'completed' && !todo.completed) return false;
        
        // Filter by time
        if (timeFilter !== 'all' && todo.datetime) {
            const todoDate = new Date(todo.datetime);
            const now = new Date();
            
            if (timeFilter === 'today') {
                return todoDate.toDateString() === now.toDateString();
            } else if (timeFilter === 'thisWeek') {
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                return todoDate >= startOfWeek && todoDate <= endOfWeek;
            } else if (timeFilter === 'thisMonth') {
                return todoDate.getMonth() === now.getMonth() && todoDate.getFullYear() === now.getFullYear();
            }
        } else if (timeFilter !== 'all' && !todo.datetime) {
            return false; // Exclude todos without datetime when time filter is active
        }
        
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {isLoading && <Loader message={loadingMessage} />}
            {notification && <NotificationPopup message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            {reminders.map(id => {
                 const todo = todos.find(t => t.id === id);
                 return todo ? <ReminderPopup key={id} message={`${t('reminder.upcomingTask', 'Yaklaşan Görev')}: ${todo.text}`} onClose={() => setReminders(r => r.filter(rid => rid !== id))} /> : null;
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

                {/* Enhanced Header Section */}
                <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/40 dark:border-gray-600/40 mb-6 overflow-hidden">
                    {/* Main Header */}
                    <div className="p-6 pb-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-[var(--accent-color-500)] to-[var(--accent-color-600)] rounded-lg shadow-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title.myTasks', 'Görevlerim')}</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {todos.filter(t => !t.completed).length} {t('main.stats.active', 'aktif')}, {todos.filter(t => t.completed).length} {t('main.stats.completed', 'tamamlanmış')} {t('unit.task', 'görev')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleGetDailyBriefing} 
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--accent-color-500)]/80 to-[var(--accent-color-600)]/80 backdrop-blur-xl border border-white/20 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl hover:from-[var(--accent-color-400)]/90 hover:to-[var(--accent-color-500)]/90 transform hover:scale-105 transition-all duration-300 hover:border-white/30"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <span className="hidden sm:inline">{t('main.button.dailySummary', 'Günün Özeti')}</span>
                                </button>
                                
                                <button 
                                    onClick={() => setIsArchiveModalOpen(true)} 
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-600/30 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl shadow-lg hover:shadow-xl hover:bg-white/20 dark:hover:bg-gray-700/40 hover:border-white/30 dark:hover:border-gray-500/40 transform hover:scale-105 transition-all duration-300"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                                        <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="hidden sm:inline">{t('main.button.archive', 'Arşiv')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Filter Tabs Section */}
                    <div className="border-t border-white/20 dark:border-gray-600/30 bg-white/10 dark:bg-gray-800/20 backdrop-blur-lg">
                        <div className="px-6 py-4">
                            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                                {/* Status Filter Tabs */}
                                <div className="flex items-center">
                                    <div className="flex items-center bg-white/20 dark:bg-gray-800/40 backdrop-blur-lg rounded-xl p-1 shadow-lg border border-white/30 dark:border-gray-600/30">
                                        <button 
                                            onClick={() => setFilterMode('all')}
                                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                                                filterMode === 'all' 
                                                    ? 'bg-[var(--accent-color-500)]/80 backdrop-blur-sm text-white shadow-lg border border-white/20' 
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:backdrop-blur-sm hover:border hover:border-white/20 dark:hover:border-gray-600/20'
                                            }`}
                                        >
                                            {t('main.filter.allTasks', 'Tüm Görevler')}
                                        </button>
                                        <button 
                                            onClick={() => setFilterMode('active')}
                                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                                                filterMode === 'active' 
                                                    ? 'bg-[var(--accent-color-500)]/80 backdrop-blur-sm text-white shadow-lg border border-white/20' 
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:backdrop-blur-sm hover:border hover:border-white/20 dark:hover:border-gray-600/20'
                                            }`}
                                        >
                                            {t('main.filter.active', 'Aktif')}
                                        </button>
                                        <button 
                                            onClick={() => setFilterMode('completed')}
                                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                                                filterMode === 'completed' 
                                                    ? 'bg-[var(--accent-color-500)]/80 backdrop-blur-sm text-white shadow-lg border border-white/20' 
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:backdrop-blur-sm hover:border hover:border-white/20 dark:hover:border-gray-600/20'
                                            }`}
                                        >
                                            {t('main.filter.completed', 'Tamamlanan')}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Time Filter and View Mode */}
                                <div className="flex items-center gap-3">
                                    {/* Time Filter */}
                                    <div className="flex items-center bg-white/20 dark:bg-gray-800/40 backdrop-blur-lg rounded-xl p-1 shadow-lg border border-white/30 dark:border-gray-600/30">
                                        <button 
                                            onClick={() => setTimeFilter('all')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ${
                                                timeFilter === 'all'
                                                    ? 'bg-[var(--accent-color-300)]/60 dark:bg-[var(--accent-color-600)]/60 backdrop-blur-sm text-[var(--accent-color-800)] dark:text-[var(--accent-color-200)] shadow-lg border border-[var(--accent-color-400)]/30'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:backdrop-blur-sm hover:border hover:border-white/20 dark:hover:border-gray-600/20'
                                            }`}
                                        >
                                            {t('main.timeFilter.all', 'Tümü')}
                                        </button>
                                        <button 
                                            onClick={() => setTimeFilter('today')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ${
                                                timeFilter === 'today'
                                                    ? 'bg-[var(--accent-color-300)]/60 dark:bg-[var(--accent-color-600)]/60 backdrop-blur-sm text-[var(--accent-color-800)] dark:text-[var(--accent-color-200)] shadow-lg border border-[var(--accent-color-400)]/30'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:backdrop-blur-sm hover:border hover:border-white/20 dark:hover:border-gray-600/20'
                                            }`}
                                        >
                                            {t('main.timeFilter.today', 'Bugün')}
                                        </button>
                                        <button 
                                            onClick={() => setTimeFilter('thisWeek')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ${
                                                timeFilter === 'thisWeek'
                                                    ? 'bg-[var(--accent-color-300)]/60 dark:bg-[var(--accent-color-600)]/60 backdrop-blur-sm text-[var(--accent-color-800)] dark:text-[var(--accent-color-200)] shadow-lg border border-[var(--accent-color-400)]/30'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:backdrop-blur-sm hover:border hover:border-white/20 dark:hover:border-gray-600/20'
                                            }`}
                                        >
                                            {t('main.timeFilter.thisWeek', 'Bu Hafta')}
                                        </button>
                                        <button 
                                            onClick={() => setTimeFilter('thisMonth')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ${
                                                timeFilter === 'thisMonth'
                                                    ? 'bg-[var(--accent-color-300)]/60 dark:bg-[var(--accent-color-600)]/60 backdrop-blur-sm text-[var(--accent-color-800)] dark:text-[var(--accent-color-200)] shadow-lg border border-[var(--accent-color-400)]/30'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:backdrop-blur-sm hover:border hover:border-white/20 dark:hover:border-gray-600/20'
                                            }`}
                                        >
                                            {t('main.timeFilter.thisMonth', 'Bu Ay')}
                                        </button>
                                    </div>
                                    
                                    {/* View Mode Toggle */}
                                    <div className="flex items-center bg-white/20 dark:bg-gray-800/40 backdrop-blur-lg rounded-xl p-1 shadow-lg border border-white/30 dark:border-gray-600/30">
                                        <button 
                                            onClick={() => setViewMode('list')} 
                                            className={`p-2 rounded-lg transition-all duration-300 ${
                                                viewMode === 'list' 
                                                    ? 'bg-[var(--accent-color-500)]/80 backdrop-blur-sm text-white shadow-lg border border-white/20' 
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:backdrop-blur-sm hover:border hover:border-white/20 dark:hover:border-gray-600/20'
                                            }`}
                            title={t('view.list', 'Liste Görünümü')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('timeline')} 
                                            className={`p-2 rounded-lg transition-all duration-300 ${
                                                viewMode === 'timeline' 
                                                    ? 'bg-[var(--accent-color-500)]/80 backdrop-blur-sm text-white shadow-lg border border-white/20' 
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/30 hover:backdrop-blur-sm hover:border hover:border-white/20 dark:hover:border-gray-600/20'
                                            }`}
                            title={t('view.timeline', 'Zaman Çizelgesi')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        {viewMode === 'list' ? (
                            <TodoList
                                todos={filteredTodos}
                                onToggle={handleToggleTodo}
                                onDelete={handleDeleteTodo}
                                onGetDirections={handleGetDirections}
                                onEdit={handleEditTodo}
                                onShare={(todo) => navigator.clipboard.writeText(`${t('unit.task', 'Görev')}: ${todo.text}${todo.datetime ? `\n${t('field.date', 'Tarih')}: ${new Date(todo.datetime).toLocaleString('tr-TR')}` : ''}`).then(() => setNotification({message: t('success.copiedToClipboard', 'Görev panoya kopyalandı!'), type: 'success'}))}
                                onUpdateGeoReminder={handleUpdateGeoReminder}
                            />
                        ) : (
                            <TimelineView todos={filteredTodos} />
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