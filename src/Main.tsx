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
import ContextInsightsPanel from './components/ContextInsightsPanel';
import ProactiveSuggestionsModal from './components/ProactiveSuggestionsModal';
import MobileBottomNav from './components/MobileBottomNav';

import useLocalStorage from './hooks/useLocalStorage';
import { useSpeechRecognition } from './hooks/useSpeechRecognitionUnified';
import { geminiService } from './services/geminiService';
import { archiveService } from './services/archiveService';
import { contextMemoryService } from './services/contextMemoryService';
import { reminderService, ActiveReminder } from './services/reminderService';
import { useAuth } from './contexts/AuthContext';
// import { smartPriorityService } from './services/smartPriorityService';
// import { proactiveSuggestionsService } from './services/proactiveSuggestionsService';
// import { taskTemplatesService } from './services/taskTemplatesService';

// FIX: Import the new AnalyzedTaskData type.
import { Todo, Priority, ChatMessage, Note, DailyBriefing, AnalyzedTaskData, UserContext, ProactiveSuggestion, ReminderConfig } from './types';
import { AccentColor } from './App';

interface MainProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  apiKey: string;
  assistantName: string;
  onNavigateToProfile: () => void;
  onShowWelcome: () => void;
}

type ViewMode = 'list' | 'timeline';

const Main: React.FC<MainProps> = ({ theme, setTheme, accentColor, setAccentColor, apiKey, assistantName, onNavigateToProfile, onShowWelcome }) => {
    // Get authenticated user
    const { user } = useAuth();
    const userId = user?.id || 'guest';
    
    // User-specific localStorage keys
    const [todos, setTodos] = useLocalStorage<Todo[]>(`todos_${userId}`, []);
    const [notes, setNotes] = useLocalStorage<Note[]>(`notes_${userId}`, []);
    const [chatHistory, setChatHistory] = useLocalStorage<ChatMessage[]>(`chatHistory_${userId}`, []);
    const [showInfoBanner, setShowInfoBanner] = useLocalStorage<boolean>(`show-info-banner_${userId}`, true);
    const [lastArchiveDate, setLastArchiveDate] = useLocalStorage<string>(`lastArchiveDate_${userId}`, '');
    
    // New AI Features State
    const [userContext, setUserContext] = useState<UserContext>(contextMemoryService.getUserContext());
    const [proactiveSuggestions, setProactiveSuggestions] = useState<ProactiveSuggestion[]>([]);
    // const [taskDependencies, setTaskDependencies] = useState<TaskDependency[]>([]);
    const [showContextInsights, setShowContextInsights] = useState(false);
    const [showProactiveSuggestions, setShowProactiveSuggestions] = useState(false);

    // Component State
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('AI Düşünüyor...');
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [activeReminders, setActiveReminders] = useState<ActiveReminder[]>([]);
    
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
                console.log('[Main] Command received:', command);
                handleAddTask(command);
            }
        },
        { 
            continuous: false,
            stopOnKeywords: ['tamam', 'bitti', 'kaydet', 'ekle', 'oluştur', 'ok']
        }
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
    
    const createNextOccurrence = (todo: Todo): Todo | null => {
        if (!todo.recurrence) return null;
        const rule = todo.recurrence;
        const base = todo.datetime ? new Date(todo.datetime) : new Date();
        let next = new Date(base);
        if (rule.frequency === 'daily') {
            next.setDate(base.getDate() + (rule.interval || 1));
        } else if (rule.frequency === 'weekly') {
            if (rule.byWeekday && rule.byWeekday.length > 0) {
                // find next weekday
                const currentDow = base.getDay();
                const sorted = [...rule.byWeekday].sort((a,b)=>a-b);
                const after = sorted.find(d => d > currentDow);
                const target = after ?? (sorted[0] + 7);
                const delta = target - currentDow;
                next.setDate(base.getDate() + delta);
            } else {
                next.setDate(base.getDate() + 7 * (rule.interval || 1));
            }
        } else if (rule.frequency === 'monthly') {
            next.setMonth(base.getMonth() + (rule.interval || 1));
        }
        const occurrencesDone = (rule.occurrencesDone || 0) + 1;
        if (rule.ends?.type === 'count' && rule.ends.count && occurrencesDone >= rule.ends.count) {
            return null; // stop creating new ones
        }
        if (rule.ends?.type === 'on' && rule.ends.onDate) {
            const end = new Date(rule.ends.onDate);
            if (next > end) return null;
        }
        const newTodo: Todo = {
            ...todo,
            id: uuidv4(),
            completed: false,
            createdAt: new Date().toISOString(),
            datetime: todo.datetime ? next.toISOString() : null,
            recurrence: { ...rule, occurrencesDone },
            reminders: (todo.reminders || []).map(r => ({ ...r, triggered: false })),
            parentId: todo.parentId || todo.id,
        };
        return newTodo;
    };

    const handleToggleTodo = (id: string) => {
        setTodos(prev => prev.flatMap(todo => {
            if (todo.id !== id) return [todo];
            const toggled = { ...todo, completed: !todo.completed } as Todo;
            if (!todo.completed && toggled.completed) {
                const next = createNextOccurrence(toggled);
                return next ? [toggled, next] : [toggled];
            }
            return [toggled];
        }));
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

  const handleExportICS = () => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const events = todos.filter(t => !!t.datetime).map(t => ({ id: t.id, title: t.text, start: t.datetime, durationMinutes: t.aiMetadata?.estimatedDuration || 60 }));
        import('./utils/ics' /* webpackChunkName: "ics" */).then(({ generateICS, downloadICS }) => {
            const ics = generateICS(events, { calendarName: 'EchoDay', timezone: tz });
            downloadICS(`echoday-${new Date().toISOString().slice(0,10)}`, ics);
        });
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

    // ==================== NEW AI FEATURES ====================
    
    // Update user context whenever todos change
    useEffect(() => {
        const updatedContext = contextMemoryService.updateUserContext(todos);
        setUserContext(updatedContext);
        
        // Generate proactive suggestions
        // if (apiKey && todos.length > 0) {
        //     const suggestions = proactiveSuggestionsService.generateAllSuggestions(
        //         todos,
        //         updatedContext,
        //         taskDependencies
        //     );
        //     setProactiveSuggestions(suggestions);
        // }
    }, [todos, apiKey]);
    
    // Show proactive suggestions automatically if there are high priority ones
    // useEffect(() => {
    //     const highPrioritySuggestions = proactiveSuggestionsService.getHighPrioritySuggestions(proactiveSuggestions);
    //     if (highPrioritySuggestions.length > 0 && !showProactiveSuggestions) {
    //         // Auto-show after 2 seconds if there are high priority suggestions
    //         const timer = setTimeout(() => {
    //             setShowProactiveSuggestions(true);
    //         }, 2000);
    //         return () => clearTimeout(timer);
    //     }
    // }, [proactiveSuggestions, showProactiveSuggestions]);
    
    // Handler for accepting suggestions
    const handleAcceptSuggestion = useCallback(async (suggestion: ProactiveSuggestion) => {
        if (!suggestion.actionable || !suggestion.action) return;
        
        switch (suggestion.action.type) {
            case 'add_task':
                const taskData = suggestion.action.data;
                await handleAddTask(taskData.text || suggestion.title);
                break;
            case 'reschedule':
                // TODO: Implement reschedule logic
                setNotification({ message: 'Yeniden zamanlama özelliği yakında!', type: 'success' });
                break;
            case 'break_task':
                // TODO: Implement break task logic
                setNotification({ message: 'Görev bölme özelliği yakında!', type: 'success' });
                break;
            case 'group_tasks':
                // TODO: Implement group tasks logic
                setNotification({ message: 'Görev gruplama özelliği yakında!', type: 'success' });
                break;
        }
        
        // Remove the accepted suggestion
        setProactiveSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    }, [handleAddTask, setNotification]);
    
    const handleDismissSuggestion = useCallback((suggestionId: string) => {
        setProactiveSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    }, []);
    
    // ==================== END NEW AI FEATURES ====================

    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (lastArchiveDate !== todayStr) {
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);
            const timeToMidnight = midnight.getTime() - Date.now();
            
            const timer = setTimeout(async () => {
                const completedTodos = todos.filter(t => t.completed);
                if (completedTodos.length > 0 || notes.length > 0) {
                    try {
                        await archiveService.archiveItems(completedTodos, notes, userId);
                        setTodos(todos.filter(t => !t.completed));
                        setNotes([]);
                        setLastArchiveDate(todayStr);
                        setNotification({
                            message: `${completedTodos.length} görev ve ${notes.length} not arşivlendi.`, 
                            type: 'success' 
                        });
                    } catch (error: any) {
                        console.error('[Main] Auto-archive failed:', error);
                        setNotification({ 
                            message: error.message || 'Otomatik arşivleme başarısız oldu.', 
                            type: 'error' 
                        });
                    }
                } else {
                     setLastArchiveDate(todayStr);
                }
            }, timeToMidnight > 0 ? timeToMidnight : 1000); // Run immediately if past midnight

            return () => clearTimeout(timer);
        }
    }, [lastArchiveDate, notes, setLastArchiveDate, setNotes, setTodos, todos]);

    // Daily summary notifier
    useEffect(() => {
        const getSetting = () => (localStorage.getItem(`daily-summary-time_${userId}`) || '08:00');
        const check = () => {
            const time = getSetting();
            const [hh, mm] = time.split(':').map(Number);
            const now = new Date();
            const key = `daily-summary-last_${userId}`;
            const today = now.toISOString().split('T')[0];
            const last = localStorage.getItem(key);
            if (last === today) return;
            if (now.getHours() === (hh || 8) && Math.abs(now.getMinutes() - (mm || 0)) < 2) {
                const pending = todos.filter(t => !t.completed).length;
                const overdue = todos.filter(t => !t.completed && t.datetime && new Date(t.datetime) < now).length;
                setNotification({ message: `Günaydın! ${pending} görev, ${overdue} gecikmiş. Başlayalım mı?`, type: 'success' });
                localStorage.setItem(key, today);
            }
        };
        const interval = setInterval(check, 60 * 1000);
        check();
        return () => clearInterval(interval);
    }, [todos, userId]);

    // Push todos/notes to Supabase on change (if configured)
    useEffect(() => {
        (async () => {
            try {
                const { supabase, upsertTodos, upsertNotes } = await import('./services/supabaseClient');
                if (!supabase || !userId || userId === 'guest') return;
                await upsertTodos(userId, todos);
                await upsertNotes(userId, notes);
            } catch (error) {
                console.error('[Main] Supabase sync error:', error);
            }
        })();
    }, [todos, notes, userId]);

    // Supabase initial fetch (if configured)
    useEffect(() => {
        if (!userId || userId === 'guest') return;
        
        (async () => {
            try {
                const { supabase, fetchAll } = await import('./services/supabaseClient');
                if (!supabase) return;
                
                console.log('[Main] Fetching data for user:', userId);
                const remote = await fetchAll(userId);
                
                if (remote.todos.length || remote.notes.length) {
                    // naive merge: prefer newer createdAt
                    const byId: any = {};
                    [...todos, ...remote.todos].forEach((t: any) => {
                        const cur = byId[t.id];
                        if (!cur || new Date(t.createdAt) > new Date(cur.createdAt)) byId[t.id] = t;
                    });
                    setTodos(Object.values(byId));

                    const byN: any = {};
                    [...notes, ...remote.notes].forEach((n: any) => {
                        const cur = byN[n.id];
                        if (!cur || new Date(n.createdAt) > new Date(cur.createdAt)) byN[n.id] = n;
                    });
                    setNotes(Object.values(byN));
                }
            } catch (error) {
                console.error('[Main] Supabase fetch error:', error);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // New reminder system with reminderService
    useEffect(() => {
        const checkReminders = () => {
            const activeRems = reminderService.checkReminders(todos);
            
            if (activeRems.length > 0) {
                // Update active reminders state
                setActiveReminders(prev => {
                    const existingIds = new Set(prev.map(r => `${r.taskId}_${r.reminderId}`));
                    const newReminders = activeRems.filter(r => !existingIds.has(`${r.taskId}_${r.reminderId}`));
                    return [...prev, ...newReminders];
                });
                
                // Send browser notifications
                activeRems.forEach(reminder => {
                    reminderService.sendBrowserNotification(reminder);
                });
            }
        };
        
        // Check immediately on mount/update
        checkReminders();
        
        // Then check every minute
        const interval = setInterval(checkReminders, 60 * 1000);

        return () => clearInterval(interval);
    }, [todos]);
    
    const handleSnoozeReminder = useCallback((taskId: string, reminderId: string, minutes: number) => {
        console.log('[Main] Snoozing reminder:', taskId, reminderId, minutes);
        const updatedTodos = reminderService.snoozeReminder(todos, taskId, reminderId, minutes);
        setTodos(updatedTodos);
        
        // Remove from active reminders
        setActiveReminders(prev => prev.filter(r => !(r.taskId === taskId && r.reminderId === reminderId)));
        
        // Clear notification tracking so it can trigger again
        reminderService.clearNotification(taskId, reminderId);
        
        setNotification({ message: `Hatırlatma ${minutes} dakika ertelendi`, type: 'success' });
    }, [todos, setTodos]);
    
    const handleCloseReminder = useCallback((taskId: string, reminderId: string) => {
        console.log('[Main] Closing reminder:', taskId, reminderId);
        // Mark reminder as triggered
        const updatedTodos = reminderService.markReminderTriggered(todos, taskId, reminderId);
        setTodos(updatedTodos);
        
        // Remove from active reminders
        setActiveReminders(prev => prev.filter(r => !(r.taskId === taskId && r.reminderId === reminderId)));
    }, [todos, setTodos]);
    
    const handleUpdateReminders = useCallback((todoId: string, reminders: ReminderConfig[]) => {
        console.log('[Main] Updating reminders for todo:', todoId);
        setTodos(prev => prev.map(todo => 
            todo.id === todoId ? { ...todo, reminders } : todo
        ));
        setNotification({ message: 'Hatırlatmalar güncellendi', type: 'success' });
    }, [setTodos]);


    return (
        <div className="min-h-screen overflow-x-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {isLoading && <Loader message={loadingMessage} />}
            {notification && <NotificationPopup message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            
            {/* Mobile Bottom Navigation */}
            <MobileBottomNav
                onVoiceCommand={() => { if(checkApiKey()) setIsTaskModalOpen(true); }}
                onOpenChat={handleOpenChat}
                onImageTask={() => { if(checkApiKey()) setIsImageTaskModalOpen(true); }}
                onShowArchive={() => setIsArchiveModalOpen(true)}
                onShowProfile={onNavigateToProfile}
                isListening={mainCommandListener.isListening}
            />
            {activeReminders.map(reminder => (
                <ReminderPopup 
                    key={`${reminder.taskId}_${reminder.reminderId}`}
                    message={reminder.message}
                    priority={reminder.priority}
                    taskId={reminder.taskId}
                    reminderId={reminder.reminderId}
                    onClose={() => handleCloseReminder(reminder.taskId, reminder.reminderId)}
                    onSnooze={(minutes) => handleSnoozeReminder(reminder.taskId, reminder.reminderId, minutes)}
                />
            ))}

            <Header theme={theme} setTheme={setTheme} accentColor={accentColor} setAccentColor={setAccentColor} onNavigateToProfile={onNavigateToProfile} onShowWelcome={onShowWelcome} />
            
            <main className="container mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
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
                            <button onClick={() => setShowContextInsights(true)} className="inline-flex items-center gap-1 text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:underline">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>
                                <span className="hidden sm:inline">📊 İçgörüler</span>
                                <span className="sm:hidden">İçgörü</span>
                            </button>
                            {proactiveSuggestions.length > 0 && (
                                <button onClick={() => setShowProactiveSuggestions(true)} className="inline-flex items-center gap-1 text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:underline animate-pulse">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                    <span className="hidden sm:inline">🤖 AI Önerileri ({proactiveSuggestions.length})</span>
                                    <span className="sm:hidden">🤖 ({proactiveSuggestions.length})</span>
                                </button>
                            )}
                            <button onClick={() => setIsArchiveModalOpen(true)} className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-[var(--accent-color-600)] dark:hover:text-[var(--accent-color-400)] hover:underline">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                <span className="hidden sm:inline">Arşivi Görüntüle</span>
                                <span className="sm:hidden">Arşiv</span>
                            </button>
                            <button onClick={handleExportICS} className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-[var(--accent-color-600)] dark:hover:text-[var(--accent-color-400)] hover:underline">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h2a1 1 0 011 1v1h6V3a1 1 0 112 0v1h1a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1V3zm0 5h14v9H3V8z" clipRule="evenodd" /></svg>
                                <span className="hidden sm:inline">Takvime Dışa Aktar (.ics)</span>
                                <span className="sm:hidden">ICS</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-lg self-start sm:self-auto">
                        <button onClick={() => setViewMode('list')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Liste</button>
                        <button onClick={() => setViewMode('timeline')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Zaman Çizelgesi</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
                    <div className="lg:col-span-2">
                        {viewMode === 'list' ? (
                            <TodoList
                                todos={todos}
                                onToggle={handleToggleTodo}
                                onDelete={handleDeleteTodo}
                                onGetDirections={handleGetDirections}
                                onEdit={handleEditTodo}
                                onShare={(todo) => { setShareType('todo'); setShareItem(todo); setIsShareModalOpen(true); }}
                                onUpdateReminders={handleUpdateReminders}
                            />
                        ) : (
                            <TimelineView todos={todos} />
                        )}
                    </div>
                    <div className="lg:col-span-3 mt-4 lg:mt-0">
                       <DailyNotepad
                           notes={notes}
                           setNotes={setNotes}
                           onOpenAiModal={() => { if(checkApiKey()) setIsNotepadAiModalOpen(true); }}
                           onAnalyzeImage={handleAnalyzeImageNote}
                           onShareNote={(note) => { setShareType('note'); setShareItem(note); setIsShareModalOpen(true); }}
                           setNotification={setNotification}
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
            
            {/* New AI Features Modals */}
            {showContextInsights && (
                <ContextInsightsPanel 
                    userContext={userContext} 
                    onClose={() => setShowContextInsights(false)} 
                />
            )}
            {showProactiveSuggestions && (
                <ProactiveSuggestionsModal
                    suggestions={proactiveSuggestions}
                    onClose={() => setShowProactiveSuggestions(false)}
                    onAcceptSuggestion={handleAcceptSuggestion}
                    onDismissSuggestion={handleDismissSuggestion}
                />
            )}
        </div>
    );
};

export default Main;