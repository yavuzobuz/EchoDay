import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import Header from './components/Header';
import TodoList from './components/TodoList';
import { useNavigate, useLocation } from 'react-router-dom';
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
import ToastNotification from './components/ToastNotification';
import TimelineView from './components/TimelineView';
import ArchiveModal from './components/ArchiveModal';
import InfoBanner from './components/InfoBanner';
import ShareModal from './components/ShareModal';
import ContextInsightsPanel from './components/ContextInsightsPanel';
import ProactiveSuggestionsModal from './components/ProactiveSuggestionsModal';
import MobileBottomNav from './components/MobileBottomNav';

import useLocalStorage from './hooks/useLocalStorage';
import { useToast } from './hooks/useToast';
import { useSpeechRecognition } from './hooks/useSpeechRecognitionUnified';
import { useGeoReminders } from './hooks/useGeoReminders';
import { geminiService } from './services/geminiService';
import { pdfService } from './services/pdfService';
import { parseZamanFromText, parseRelativeTurkishDateTime } from './utils/parseTurkishDate';
import { archiveService } from './services/archiveService';
import { contextMemoryService } from './services/contextMemoryService';
import { reminderService, ActiveReminder } from './services/reminderService';
import { subscribeToIncomingMessagesForUser } from './services/messagesService';
import { useAuth } from './contexts/AuthContext';
// import { smartPriorityService } from './services/smartPriorityService';
// import { proactiveSuggestionsService } from './services/proactiveSuggestionsService';
// import { taskTemplatesService } from './services/taskTemplatesService';

// FIX: Import the new AnalyzedTaskData type.
import { Todo, Priority, ChatMessage, Note, DailyBriefing, AnalyzedTaskData, UserContext, ProactiveSuggestion, ReminderConfig, ReminderType } from './types';
import { AccentColor } from './App';

interface MainProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  apiKey: string;
  assistantName: string;
  onNavigateToProfile: () => void;
  onNavigateToHome?: () => void;
}

type ViewMode = 'list' | 'timeline';

const Main: React.FC<MainProps> = ({ theme, setTheme, accentColor, setAccentColor, apiKey, assistantName, onNavigateToProfile, onNavigateToHome }) => {
    const navigate = useNavigate();
    const location = useLocation();
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
    const [isSelectionModeActive, setIsSelectionModeActive] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('AI Düşünüyor...');
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [activeReminders, setActiveReminders] = useState<ActiveReminder[]>([]);

    // Global toast notifications
    const { toasts, removeToast, showMessage } = useToast();

    // Unified search and filter state for tasks and notes
    const [searchQuery, setSearchQuery] = useState('');
    const [contentFilter, setContentFilter] = useState<'all' | 'tasks' | 'notes'>('all');
    const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

// Date helpers for filters
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    const endOfDay = (d: Date) => { const x = startOfDay(d); x.setDate(x.getDate()+1); x.setMilliseconds(-1); return x; };
    const startOfWeek = (d: Date) => { const x = startOfDay(d); const day = x.getDay(); const diff = (day === 0 ? -6 : 1 - day); x.setDate(x.getDate() + diff); return x; };
    const endOfWeek = (d: Date) => { const x = startOfWeek(d); x.setDate(x.getDate() + 6); return endOfDay(x); };
    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999);
    const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
    const endOfYear = (d: Date) => new Date(d.getFullYear(), 11, 31, 23,59,59,999);

    const [listRange, setListRange] = useState<'all' | 'day' | 'week' | 'month' | 'year'>('all');

    // Filter and search todos
    const visibleTodos = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = todos.filter(t => !t.isDeleted);
        
        // Status filter
        if (taskStatusFilter === 'active') list = list.filter(t => !t.completed);
        if (taskStatusFilter === 'completed') list = list.filter(t => t.completed);
        
        // Date range filter for list view
        if (listRange !== 'all') {
            const now = new Date();
            let s = startOfDay(now);
            let e = endOfDay(now);
            if (listRange === 'week') {
                s = startOfWeek(now);
                e = endOfWeek(now);
            } else if (listRange === 'month') {
                s = startOfMonth(now);
                e = endOfMonth(now);
            } else if (listRange === 'year') {
                s = startOfYear(now);
                e = endOfYear(now);
            }
            list = list.filter(t => t.datetime && (new Date(t.datetime) >= s && new Date(t.datetime) <= e));
        }
        
        // Search filter
        if (q) list = list.filter(t => t.text.toLowerCase().includes(q));
        
        return list;
    }, [todos, taskStatusFilter, searchQuery, listRange]);

    // Filter and search notes
    const visibleNotes = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        let list = notes.filter(n => !n.isDeleted);
        
        // Search filter
        if (q) {
            list = list.filter(n => 
                (n.text && n.text.toLowerCase().includes(q)) ||
                (n.tags && n.tags.some(tag => tag.toLowerCase().includes(q)))
            );
        }
        
        return list;
    }, [notes, searchQuery]);

    // Calculate totals
    const totalResults = React.useMemo(() => {
        if (contentFilter === 'tasks') return visibleTodos.length;
        if (contentFilter === 'notes') return visibleNotes.length;
        return visibleTodos.length + visibleNotes.length;
    }, [contentFilter, visibleTodos.length, visibleNotes.length]);

    
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
    const [lastAddedTaskId, setLastAddedTaskId] = useState<string | null>(null); // Track last task for reminder

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
        
        const canListen = !isTaskModalOpen && !isChatOpen && !isImageTaskModalOpen && !isLocationPromptOpen && !isSuggestionsModalOpen && !isNotepadAiModalOpen && !isArchiveModalOpen && !isSelectionModeActive && !mainCommandListener.isListening;
        
        if (canListen && !wakeWordListener.isListening) {
             try {
                wakeWordListener.startListening();
             } catch (e) {
                console.error("Wake word listener start error:", e);
             }
        } else if (!canListen && wakeWordListener.isListening) {
            wakeWordListener.stopListening();
        }
    }, [isTaskModalOpen, isChatOpen, isImageTaskModalOpen, isLocationPromptOpen, isSuggestionsModalOpen, isNotepadAiModalOpen, isArchiveModalOpen, isSelectionModeActive, mainCommandListener.isListening, wakeWordListener, isElectron]);


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
                let { text, priority, datetime, reminderMinutesBefore, ...metadata } = aiResult;
                
                console.log('[Main] AI Result:', { text, priority, datetime, reminderMinutesBefore });
                
                // Fallback: parse Turkish date if AI didn't set datetime
                if (!datetime) {
                    const parsed =
                        parseZamanFromText(description) ||
                        parseZamanFromText(text || '') ||
                        // Relative forms like "yarına", "bugün 18:00"
                        (await (async () => {
                            const { parseRelativeTurkishDateTime } = await import('./utils/parseTurkishDate');
                            return (
                                parseRelativeTurkishDateTime(description) ||
                                parseRelativeTurkishDateTime(text || '')
                            );
                        })());
                    if (parsed) {
                        console.log('[Main] Parsed datetime from text:', parsed);
                        datetime = parsed;
                    }
                }
                
                // Create reminders array if reminder was extracted
                let reminders: ReminderConfig[] | undefined = undefined;
                if (reminderMinutesBefore && datetime) {
                    // Only create reminder if task has a datetime
                    console.log('[Main] Creating reminder from AI extraction:', reminderMinutesBefore);
                    reminders = [{
                        id: uuidv4(),
                        type: 'relative' as ReminderType,
                        minutesBefore: reminderMinutesBefore,
                        triggered: false,
                    }];
                }
                
                const newTodo: Todo = {
                    id: uuidv4(),
                    text: text || description,
                    priority: priority || Priority.Medium,
                    datetime: datetime || null,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    aiMetadata: metadata,
                    reminders: reminders,
                };
                setTodos(prev => [newTodo, ...prev]);
                
                // Show success message with reminder info if applicable
                let successMsg = 'Yeni görev eklendi!';
                console.log('[Main] Checking reminder status:', { hasReminders: !!reminders, hasDatetime: !!datetime });
                if (reminders && reminders.length > 0) {
                    const mins = reminderMinutesBefore || 0;
                    if (mins >= 1440) {
                        const days = Math.floor(mins / 1440);
                        successMsg += ` Hatırlatma: ${days} gün önce`;
                    } else if (mins >= 60) {
                        const hours = Math.floor(mins / 60);
                        successMsg += ` Hatırlatma: ${hours} saat önce`;
                    } else {
                        successMsg += ` Hatırlatma: ${mins} dakika önce`;
                    }
                    setNotification({ message: successMsg, type: 'success' });
                } else if (datetime && !reminders) {
                    // Task has datetime but no reminder - ask if user wants to add one
                    console.log('[Main] Task has datetime but no reminder - asking user');
                    console.log('[Main] Task ID:', newTodo.id);
                    console.log('[Main] Task text:', text);
                    console.log('[Main] Task datetime:', datetime);
                    
                    setNotification({ message: successMsg, type: 'success' });
                    
                    // Store task ID for later reminder addition
                    setLastAddedTaskId(newTodo.id);
                    
                    // Add AI message to chat asking about reminder
                    const aiQuestion: ChatMessage = {
                        role: 'model',
                        text: `Görev başarıyla eklendi! "${text}" görevi için hatırlatma eklemek ister misiniz? (Evet/Hayır)`
                    };
                    console.log('[Main] Adding AI question to chat:', aiQuestion);
                    setChatHistory(prev => {
                        console.log('[Main] Current chat history length:', prev.length);
                        return [...prev, aiQuestion];
                    });
                    console.log('[Main] Opening chat modal');
                    setIsChatOpen(true);
                } else {
                    setNotification({ message: successMsg, type: 'success' });
                }
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
    }, [apiKey, setTodos, checkApiKey, setChatHistory, setIsChatOpen]);
    
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

    const handleToggleTodo = async (id: string) => {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;
        
        const newCompleted = !todo.completed;
        
        // Update local state immediately for responsive UI
        setTodos(prev => prev.flatMap(t => {
            if (t.id !== id) return [t];
            const toggled = { ...t, completed: newCompleted } as Todo;
            if (!t.completed && toggled.completed) {
                const next = createNextOccurrence(toggled);
                return next ? [toggled, next] : [toggled];
            }
            return [toggled];
        }));
        
        // Sync to Supabase if not in guest mode
        if (userId !== 'guest') {
            try {
                const { updateTodo } = await import('./services/supabaseClient');
                await updateTodo(userId, id, { completed: newCompleted });
                console.log('[Main] Todo update synced to Supabase');
            } catch (error: any) {
                console.error('[Main] Failed to sync todo update:', error);
                
                // Revert local state on sync failure
                setTodos(prev => prev.map(t => 
                    t.id === id ? { ...t, completed: !newCompleted } : t
                ));
                
                setNotification({ 
                    message: 'Güncelleme kaydedilemedi. İnternet bağlantınızı kontrol edin.', 
                    type: 'error' 
                });
            }
        }
    };

    const handleDeleteTodo = async (id: string) => {
        // Geçici silme - görevi isDeleted flag ile işaretle
        setTodos(todos.map(todo => 
            todo.id === id 
                ? { ...todo, isDeleted: true } 
                : todo
        ));
        
        // Supabase'e silme senkronizasyonu (soft/hard otomatik)
        if (userId && userId !== 'guest') {
            try {
                const { deleteTodos } = await import('./services/supabaseClient');
                await deleteTodos(userId, [id]);
                setNotification({ 
                    message: 'Görev silindi.', 
                    type: 'success' 
                });
            } catch (error) {
                console.error('[Main] Failed to delete todo from backend:', error);
                // Geri al (revert) – sunucu silinemediyse yerelde isDeleted=false yap
                setTodos(prev => prev.map(t => t.id === id ? { ...t, isDeleted: false } : t));
                setNotification({ 
                    message: 'Görev sunucuya silinemedi. Lütfen tekrar deneyin.', 
                    type: 'error' 
                });
            }
        } else {
            setNotification({ 
                message: 'Görev geçici olarak silindi.', 
                type: 'success' 
            });
        }
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
        // Silinmiş görevleri dışlamak
        const events = todos.filter(t => !!t.datetime && !t.isDeleted).map(t => ({ id: t.id, title: t.text, start: t.datetime, durationMinutes: t.aiMetadata?.estimatedDuration || 60 }));
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

    // Helpers for agenda summaries
    const isWithin = (dt: Date, s: Date, e: Date) => dt >= s && dt <= e;
    const formatTime = (dt: Date) => dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (dt: Date) => dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });

    const computeImportance = (todo: Todo) => {
        let score = 0;
        // Priority weight
        score += (todo.priority === Priority.High) ? 50 : 20;
        // Due time proximity
        if (todo.datetime) {
            const now = new Date();
            const dt = new Date(todo.datetime);
            const diffHours = (dt.getTime() - now.getTime()) / 36e5;
            if (diffHours <= 0) score += 25; // overdue or now
            else if (diffHours <= 24) score += Math.max(0, 22 - diffHours); // closer -> higher
            else if (diffHours <= 72) score += 10;
            else if (diffHours <= 168) score += 5; // within a week
        }
        // Reminders add significance
        if (todo.reminders && todo.reminders.length > 0) score += 5;
        // Recurring tasks slightly boosted
        if (todo.recurrence) score += 3;
        // Semantic tags
        const tags = (todo.aiMetadata?.tags || []).map(t => t.toLowerCase());
        if (tags.some(t => ['acil','kritik','önemli'].includes(t))) score += 40;
        // Estimated duration (long tasks slightly prioritized)
        if (todo.aiMetadata?.estimatedDuration) {
            if (todo.aiMetadata.estimatedDuration >= 120) score += 3;
            else if (todo.aiMetadata.estimatedDuration >= 60) score += 2;
        }
        return score;
    };

    const handleSendMessage = async (message: string) => {
        if (!checkApiKey()) return;
        const userMessage: ChatMessage = { role: 'user', text: message };
        setChatHistory(prev => [...prev, userMessage]);
        setIsLoading(true);

        const intentResult = await geminiService.classifyChatIntent(apiKey, message);

        // Handle add_task intent
        if (intentResult?.intent === 'add_task') {
            // Eğer description eksikse veya boşsa, kullanıcıdan detay iste
            if (!intentResult.description || intentResult.description.includes('[Kullanıcı görev eklemek istiyor ama içerik belirtmedi]')) {
                const modelMessage: ChatMessage = { 
                    role: 'model', 
                    text: 'Tabii, görev ekleyebilirim. Hangi görevi eklemek istersiniz? Lütfen görev detaylarını belirtin.' 
                };
                setChatHistory(prev => [...prev, modelMessage]);
                setIsLoading(false);
                return;
            }
            
            // Description varsa görevi ekle
            await handleAddTask(intentResult.description);
            const modelMessage: ChatMessage = { role: 'model', text: `Elbette, "${intentResult.description}" görevi listeye eklendi.` };
            setChatHistory(prev => [...prev, modelMessage]);
            setIsLoading(false);
            return;
        }
        
        // Handle add_note intent
        if (intentResult?.intent === 'add_note') {
            // Eğer description eksikse veya boşsa, kullanıcıdan detay iste
            if (!intentResult.description || intentResult.description.includes('[Kullanıcı not eklemek istiyor ama içerik belirtmedi]')) {
                const modelMessage: ChatMessage = { 
                    role: 'model', 
                    text: 'Elbette, not ekleyebilirim. Hangi notu kaydetmek istersiniz? Lütfen not içeriğini belirtin.' 
                };
                setChatHistory(prev => [...prev, modelMessage]);
                setIsLoading(false);
                return;
            }
            
            // Description varsa notu ekle
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

        // Handle get_agenda intent (haftalık/aylık/yıllık ajanda özeti)
        if (intentResult?.intent === 'get_agenda') {
            const now = new Date();
            const period = intentResult.period || 'week';
            const ordering = intentResult.ordering || (message.toLowerCase().includes('önemliden önemsize') ? 'importance' : 'time');

            let start = now, end = now;
            if (period === 'day') { start = startOfDay(now); end = endOfDay(now); }
            if (period === 'week') { start = startOfWeek(now); end = endOfWeek(now); }
            if (period === 'month') { start = startOfMonth(now); end = endOfMonth(now); }
            if (period === 'year') { start = startOfYear(now); end = endOfYear(now); }

            const agendaTodos = todos
                .filter(t => !t.isDeleted && !t.completed && t.datetime)
                .filter(t => isWithin(new Date(t.datetime as string), start, end));

            const sorted = [...agendaTodos].sort((a, b) => {
                if (ordering === 'importance') return computeImportance(b) - computeImportance(a);
                return new Date(a.datetime!).getTime() - new Date(b.datetime!).getTime();
            });

            // Build summary text
            const rangeLabel = (
                period === 'day' ? now.toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long' }) :
                period === 'week' ? `${start.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}` :
                period === 'month' ? now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) :
                `${now.getFullYear()}`
            );

const title = period === 'day' ? 'Günlük Görev Listesi' : period === 'week' ? 'Haftalık Görev Listesi' : period === 'month' ? 'Aylık Görev Özeti' : 'Yıllık Görev Özeti';

const top = sorted;
            const bullets = top.map(t => {
                const dt = new Date(t.datetime!);
                const when = period === 'day' ? `${formatTime(dt)}` : period === 'week' ? `${dt.toLocaleDateString('tr-TR', { weekday: 'short' })} ${formatTime(dt)}` : period === 'month' ? `${formatDate(dt)} ${formatTime(dt)}` : `${dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}`;
                const pr = t.priority === Priority.High ? 'Yüksek' : 'Orta';
                return `• ${when} — ${t.text} (Öncelik: ${pr})`;
            }).join('\n');

            const body = `📅 ${title} (${rangeLabel})\nToplam: ${agendaTodos.length} görev\nSıralama: ${ordering === 'importance' ? 'Önemliden önemsize' : 'Zamana göre'}\n\n${bullets || 'Bu dönem için planlanmış görev bulunmuyor.'}`;

            const modelMessage: ChatMessage = { role: 'model', text: body };
            setChatHistory(prev => [...prev, modelMessage]);
            setIsLoading(false);
            return;
        }
        
        // Handle add_reminder_yes intent
        if (intentResult?.intent === 'add_reminder_yes') {
            if (!lastAddedTaskId) {
                const modelMessage: ChatMessage = { 
                    role: 'model', 
                    text: 'Hatırlatma eklenecek görev bulunamadı. Lütfen önce bir görev ekleyin.' 
                };
                setChatHistory(prev => [...prev, modelMessage]);
                setIsLoading(false);
                return;
            }
            
            const task = todos.find(t => t.id === lastAddedTaskId);
            if (!task) {
                const modelMessage: ChatMessage = { 
                    role: 'model', 
                    text: 'Görev bulunamadı. Lütfen tekrar deneyin.' 
                };
                setChatHistory(prev => [...prev, modelMessage]);
                setIsLoading(false);
                setLastAddedTaskId(null);
                return;
            }
            
            const modelMessage: ChatMessage = { 
                role: 'model', 
                text: `Anlaşıldı! "${task.text}" görevi için hatırlatmayı ne kadar önce almak istersiniz?\n\nÖrnekler:\n- "1 gün önce"\n- "2 saat önce"\n- "30 dakika önce"\n- "1 hafta önce"` 
            };
            setChatHistory(prev => [...prev, modelMessage]);
            setIsLoading(false);
            return;
        }
        
        // Handle add_reminder_no intent
        if (intentResult?.intent === 'add_reminder_no') {
            setLastAddedTaskId(null);
            const modelMessage: ChatMessage = { 
                role: 'model', 
                text: 'Anlaşıldı, hatırlatma eklenmedi. Başka bir şey yapabilir miyim?' 
            };
            setChatHistory(prev => [...prev, modelMessage]);
            setIsLoading(false);
            return;
        }

        // Check if user is providing reminder time (if lastAddedTaskId exists)
        if (lastAddedTaskId) {
            const task = todos.find(t => t.id === lastAddedTaskId);
            if (task) {
                // Try to parse reminder time from user message
                const reminderTimeResult = await geminiService.analyzeTask(apiKey, `hatırlatma ${message}`);
                
                if (reminderTimeResult?.reminderMinutesBefore) {
                    // Add reminder to the task
                    const newReminder: ReminderConfig = {
                        id: uuidv4(),
                        type: 'relative' as ReminderType,
                        minutesBefore: reminderTimeResult.reminderMinutesBefore,
                        triggered: false,
                    };
                    
                    const updatedTask = {
                        ...task,
                        reminders: [...(task.reminders || []), newReminder]
                    };
                    
                    setTodos(prev => prev.map(t => t.id === lastAddedTaskId ? updatedTask : t));
                    setLastAddedTaskId(null);
                    
                    // Format time nicely
                    const mins = reminderTimeResult.reminderMinutesBefore;
                    let timeStr = '';
                    if (mins >= 1440) {
                        const days = Math.floor(mins / 1440);
                        timeStr = `${days} gün önce`;
                    } else if (mins >= 60) {
                        const hours = Math.floor(mins / 60);
                        timeStr = `${hours} saat önce`;
                    } else {
                        timeStr = `${mins} dakika önce`;
                    }
                    
                    const modelMessage: ChatMessage = { 
                        role: 'model', 
                        text: `Mükemmel! "${task.text}" görevi için ${timeStr} hatırlatma eklendi. Başka bir şey yapabilir miyim?` 
                    };
                    setChatHistory(prev => [...prev, modelMessage]);
                    setIsLoading(false);
                    return;
                }
            }
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

    // PDF Analysis Handler
    const handleAnalyzePdf = useCallback(async (pdfFile: File, customPrompt?: string) => {
        if (!checkApiKey()) return;
        
        setIsLoading(true);
        setLoadingMessage('PDF analiz ediliyor...');
        
        try {
            // Convert PDF to base64
            const base64Data = await pdfService.convertToBase64(pdfFile);
            
            // Analyze with Gemini
            const analysisResult = await geminiService.analyzePdfDocument(
                apiKey,
                base64Data,
                pdfFile.name,
                customPrompt
            );
            
            if (analysisResult) {
                // Ensure arrays exist
                const suggestedTasks = Array.isArray(analysisResult.suggestedTasks) 
                    ? analysisResult.suggestedTasks 
                    : [];
                const suggestedNotes = Array.isArray(analysisResult.suggestedNotes) 
                    ? analysisResult.suggestedNotes 
                    : [];

                // Add suggested tasks
                const newTasks: Todo[] = suggestedTasks.map(task => {
                    // Destructure pdfSource to exclude it from DB sync
                    const { pdfSource: _, ...todoData } = {
                        id: uuidv4(),
                        text: task.title + (task.description ? ` - ${task.description}` : ''),
                        priority: task.priority === 'high' ? Priority.High : Priority.Medium,
                        datetime: task.dueDate || null,
                        completed: false,
                        createdAt: new Date().toISOString(),
                        userId: userId,
                        aiMetadata: {
                            category: task.category,
                        },
                    } as Todo;
                    return todoData;
                });
                
                if (newTasks.length > 0) {
                    setTodos(prev => [...newTasks, ...prev]);
                }

                // Add suggested notes
                const newNotes: Note[] = suggestedNotes.map(note => {
                    // Destructure pdfSource to exclude it from DB sync
                    const { pdfSource: _, ...noteData } = {
                        id: uuidv4(),
                        text: `**${note.title}**\n\n${note.content}`,
                        createdAt: new Date().toISOString(),
                        userId: userId,
                        tags: note.tags,
                    } as Note;
                    return noteData;
                });
                
                if (newNotes.length > 0) {
                    setNotes(prev => [...newNotes, ...prev]);
                }

                // Add to chat history
                const userMessage = customPrompt || `PDF analizi: ${pdfFile.name}`;
                const aiResponse = `📝 **${pdfFile.name}** analiz edildi.\n\n` +
                    `**Belge Türü:** ${analysisResult.documentType}\n\n` +
                    `**Özet:** ${analysisResult.summary}\n\n` +
                    `**Tespit Edilen:**\n` +
                    `- 📅 Tarihler: ${analysisResult.entities?.dates?.join(', ') || 'Yok'}\n` +
                    `- 👥 Kişiler: ${analysisResult.entities?.people?.join(', ') || 'Yok'}\n` +
                    `- 🏛️ Kurumlar: ${analysisResult.entities?.organizations?.join(', ') || 'Yok'}\n\n` +
                    `✅ **${newTasks.length} görev** görev listesine eklendi.\n` +
                    `✅ **${newNotes.length} not** not defterine eklendi.`;
                
                setChatHistory(prev => [
                    ...prev,
                    { role: 'user', text: userMessage },
                    { role: 'model', text: aiResponse }
                ]);
                
                setNotification({ 
                    message: `✅ ${newTasks.length} görev ve ${newNotes.length} not eklendi!`, 
                    type: 'success' 
                });
            } else {
                throw new Error('PDF analizi başarısız');
            }
        } catch (error: any) {
            console.error('PDF analysis error:', error);
            setNotification({ 
                message: `PDF analizi başarısız: ${error.message || 'Bilinmeyen hata'}`, 
                type: 'error' 
            });
        } finally {
            setIsLoading(false);
        }
    }, [apiKey, checkApiKey, setChatHistory, setNotification, userId, setTodos, setNotes]);

    const handleAnalyzeImageNote = useCallback(async (noteId: string) => {
        if (!checkApiKey()) return;
        const note = notes.find(n => n.id === noteId);
        if (!note || !note.imageUrl) return;

        setIsLoading(true);
        setLoadingMessage('Resimdeki metin çıkarılıyor...');

        try {
            let extractedText: string | null = null;

            // Electron uses file paths, web uses data URLs
            if (isElectron && window.electronAPI && !note.imageUrl.startsWith('data:')) {
const base64Data = await (window.electronAPI as any).readFileAsBase64(note.imageUrl);
                if (base64Data) {
                    // Re-construct data URL for the service
                    const mimeType = note.imageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
                    const dataUrl = `data:${mimeType};base64,${base64Data}`;
                    extractedText = await geminiService.extractTextFromDataUrl(apiKey, dataUrl);
                } else {
                    throw new Error('Electron could not read the image file.');
                }
            } else {
                // For web and already-base64 images in Electron
                extractedText = await geminiService.extractTextFromDataUrl(apiKey, note.imageUrl);
            }

            if (extractedText) {
                const updatedText = note.text ? `${note.text}\n\n--- AI Analizi ---\n${extractedText}` : extractedText;
                setNotes(notes.map(n => n.id === noteId ? { ...n, text: updatedText, updatedAt: new Date().toISOString() } : n));
                setNotification({ message: 'Resimden metin çıkarıldı.', type: 'success' });
            } else {
                setNotification({ message: 'Resimden metin çıkarılamadı.', type: 'error' });
            }
        } catch (error: any) {
            console.error('Image analysis error:', error);
            setNotification({ message: `Resim analizi başarısız: ${error.message || 'Bilinmeyen hata'}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [apiKey, checkApiKey, notes, setNotes, setNotification, isElectron]);
    // Auto-parse datetime for existing tasks missing schedule (e.g., "Son gün: 16 Ekim 2025")
    useEffect(() => {
        const updated: Todo[] = [];
        let changed = false;
        for (const t of todos) {
            if (!t.datetime && !t.completed && !t.isDeleted) {
                const parsed = parseZamanFromText(t.text) || parseRelativeTurkishDateTime(t.text);
                if (parsed) {
                    updated.push({ ...t, datetime: parsed });
                    changed = true;
                } else {
                    updated.push(t);
                }
            } else {
                updated.push(t);
            }
        }
        if (changed) {
            setTodos(updated);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    // --- Daily Briefing ---
    const handleGetDailyBriefing = async () => {
        if (!checkApiKey()) return;
        setIsLoading(true);
        // Silinmiş görevleri dışla
        const activeTodos = todos.filter(t => !t.completed && !t.isDeleted);
        const briefing = await geminiService.getDailyBriefing(apiKey, activeTodos);
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
                // 1) Arşiv: tamamlanmış görevler + notlar
                const completedTodos = todos.filter(t => t.completed && !t.isDeleted);
                const notesToArchive = notes.filter(note => !note.pinned && !note.favorite);
                // 2) Taşı: tamamlanmamış ve bir önceki güne ait zamanlı görevleri bugüne aktar
                const nowMidnight = new Date();
                nowMidnight.setHours(0,0,0,0);
                const prevStart = new Date(nowMidnight);
                prevStart.setDate(prevStart.getDate()-1);
                const prevEnd = new Date(nowMidnight);
                prevEnd.setMilliseconds(-1);

                const carried = todos.map(t => {
                    if (!t.isDeleted && !t.completed && t.datetime) {
                        const dt = new Date(t.datetime);
                        if (dt >= prevStart && dt <= prevEnd) {
                            const newDt = new Date(dt);
                            newDt.setDate(newDt.getDate() + 1);
                            return { ...t, datetime: newDt.toISOString() };
                        }
                    }
                    return t;
                }).filter(t => !t.completed); // completed ones will be archived and removed

                try {
                    if (completedTodos.length > 0 || notesToArchive.length > 0) {
                        await archiveService.archiveItems(completedTodos, notesToArchive, userId);
                    }
                    setTodos(carried);
                    setNotes(notes.filter(note => note.pinned || note.favorite));
                    setLastArchiveDate(todayStr);
                    setNotification({
                        message: `${completedTodos.length} görev arşivlendi. Tamamlanmayanlar sonraki güne taşındı.`,
                        type: 'success'
                    });
                } catch (error: any) {
                    console.error('[Main] Auto-archive failed:', error);
                    setNotification({
                        message: error.message || 'Otomatik arşivleme başarısız oldu.',
                        type: 'error'
                    });
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
                const pending = todos.filter(t => !t.completed && !t.isDeleted).length;
                const overdue = todos.filter(t => !t.completed && !t.isDeleted && t.datetime && new Date(t.datetime) < now).length;
                setNotification({ message: `Günaydın! ${pending} görev, ${overdue} gecikmiş. Başlayalım mı?`, type: 'success' });
                localStorage.setItem(key, today);
            }
        };
        const interval = setInterval(check, 60 * 1000);
        check();
        return () => clearInterval(interval);
    }, [todos, userId]);

    // Push notes to Supabase on change (todos are handled explicitly to avoid conflicts)
    useEffect(() => {
        (async () => {
            try {
                const { supabase, upsertNotes } = await import('./services/supabaseClient');
                if (!supabase || !userId || userId === 'guest') return;
                // Only sync notes automatically - todos are handled explicitly in handleToggleTodo
                await upsertNotes(userId, notes);
            } catch (error) {
                console.error('[Main] Supabase notes sync error:', error);
            }
        })();
    }, [notes, userId]);
    
    // Sync new todos to Supabase (but not updates)
    useEffect(() => {
        (async () => {
            if (!userId || userId === 'guest') return;
            
            // Only sync todos that don't exist in Supabase yet (new todos)
            const newTodos = todos.filter(t => {
                // Check if this todo was created very recently (within last 5 seconds)
                const createdAt = new Date(t.createdAt);
                const fiveSecondsAgo = new Date(Date.now() - 5000);
                return createdAt > fiveSecondsAgo;
            });
            
            if (newTodos.length > 0) {
                try {
                    const { supabase, upsertTodos } = await import('./services/supabaseClient');
                    if (supabase) {
                        await upsertTodos(userId, newTodos);
                        console.log('[Main] Synced', newTodos.length, 'new todos to Supabase');
                    }
                } catch (error) {
                    console.error('[Main] Failed to sync new todos:', error);
                }
            }
        })();
    }, [todos, userId]);

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
                    console.log('[Main] Merging remote data with local state');
                    
                    // Improved merge: only add truly new items (not present locally)
                    const currentTodoIds = new Set(todos.map(t => t.id));
                    const newRemoteTodos = remote.todos.filter((rt: any) => !currentTodoIds.has(rt.id));
                    
                    const currentNoteIds = new Set(notes.map(n => n.id));
                    const newRemoteNotes = remote.notes.filter((rn: any) => !currentNoteIds.has(rn.id));
                    
                    if (newRemoteTodos.length > 0) {
                        console.log(`[Main] Adding ${newRemoteTodos.length} new remote todos`);
                        setTodos(prev => [...prev, ...newRemoteTodos]);
                    }
                    
                    if (newRemoteNotes.length > 0) {
                        console.log(`[Main] Adding ${newRemoteNotes.length} new remote notes`);
                        setNotes(prev => [...prev, ...newRemoteNotes]);
                    }
                }
            } catch (error) {
                console.error('[Main] Supabase fetch error:', error);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // Initialize NotificationService and wire custom toast callback globally
    useEffect(() => {
        (async () => {
            try {
                const { NotificationService } = await import('./services/notificationService');
                await NotificationService.initialize();
                NotificationService.setCustomToastCallback((title, message, avatar, duration) => {
                    showMessage(title, message, avatar, duration);
                });
            } catch (e) {
                console.warn('[Main] NotificationService init failed:', e);
            }
        })();
    }, []);

    // Global incoming messages subscription (show notifications even when Messages page is closed)
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        (async () => {
            try {
                if (!userId || userId === 'guest') return;
                unsubscribe = await subscribeToIncomingMessagesForUser(userId, async (msg: any) => {
                    try {
                        // Skip own messages
                        if (msg.sender_id === userId) return;
                        // If on Messages page and app has focus, suppress extra notification (page handles it)
                        if (location.pathname.includes('/messages') && document.hasFocus()) return;
                        const title = 'Yeni mesaj';
                        const text = msg.type === 'text' ? (msg.body || '') : 'Dosya gönderdi';
                        const { NotificationService } = await import('./services/notificationService');
                        NotificationService.notifyMessage(title, text);
                    } catch (e) {
                        console.warn('[Main] Failed to notify incoming message:', e);
                    }
                });
            } catch (e) {
                console.warn('[Main] Global message subscription failed:', e);
            }
        })();
        return () => { try { unsubscribe && unsubscribe(); } catch {} };
    }, [userId, location.pathname]);

    // New reminder system with reminderService
    useEffect(() => {
        const checkReminders = () => {
            // Silinmiş görevlerin hatırlatmalarını kontrol etmeyelim
            const activeTodos = todos.filter(t => !t.isDeleted);
            const activeRems = reminderService.checkReminders(activeTodos);
            
            if (activeRems.length > 0) {
                // Update active reminders state
                setActiveReminders(prev => {
                    const existingIds = new Set(prev.map(r => `${r.taskId}_${r.reminderId}`));
                    const newReminders = activeRems.filter(r => !existingIds.has(`${r.taskId}_${r.reminderId}`));
                    return [...prev, ...newReminders];
                });
                
                // Send notifications (Electron native or web toast)
                activeRems.forEach(reminder => {
                    reminderService.sendNotification(reminder);
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

    // Geo reminders - location-based notifications
    const handleLocationReminderFired = useCallback((todoId: string) => {
        console.log('[Main] Location reminder fired for todo:', todoId);
        // Update the lastTriggeredAt timestamp for the todo
        setTodos(prev => prev.map(t => 
            t.id === todoId && t.locationReminder
                ? { 
                    ...t, 
                    locationReminder: { 
                        ...t.locationReminder, 
                        lastTriggeredAt: new Date().toISOString() 
                    }
                }
                : t
        ));
    }, [setTodos]);
    
    // Initialize geo reminders hook
    useGeoReminders(todos, handleLocationReminderFired, {
        intervalMs: 180000 // 3 minutes
    });


    return (
        <div className="min-h-screen overflow-x-hidden bg-gray-100 text-gray-900 dark:text-gray-100 transition-colors duration-300 dark:bg-gradient-to-br dark:from-[hsl(var(--gradient-from))] dark:via-[hsl(var(--gradient-via))] dark:to-[hsl(var(--gradient-to))] safe-area-top">
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

            <Header theme={theme} setTheme={setTheme} accentColor={accentColor} setAccentColor={setAccentColor} onNavigateToProfile={onNavigateToProfile} onNavigateToHome={onNavigateToHome} />
            
            <main className="container mx-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-24 md:pb-8 safe-area-bottom">
                {showInfoBanner && <InfoBanner assistantName={assistantName} onClose={() => setShowInfoBanner(false)} />}
                <ActionBar
                    onSimpleVoiceCommand={() => { if(checkApiKey()) setIsTaskModalOpen(true); }}
                    onOpenChat={handleOpenChat}
                    onImageTask={() => { if(checkApiKey()) setIsImageTaskModalOpen(true); }}
                    isListening={mainCommandListener.isListening}
                />
                {aiMessage && <AiAssistantMessage message={aiMessage} onClose={() => setAiMessage(null)} />}

                <div className="flex flex-col gap-4 mb-6">

                    {/* Action Buttons - Modern Grid Layout */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        <button 
                            onClick={() => navigate('/messages')} 
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-[var(--accent-color-500)] dark:hover:border-[var(--accent-color-400)] transition-all duration-200 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] group-hover:text-[var(--accent-color-700)] dark:group-hover:text-[var(--accent-color-300)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H7l-3.5 2.333A1 1 0 012 17.5V5z"/>
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                Mesajlar
                            </span>
                        </button>

                        <button 
                            onClick={() => navigate('/email')} 
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-[var(--accent-color-500)] dark:hover:border-[var(--accent-color-400)] transition-all duration-200 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] group-hover:text-[var(--accent-color-700)] dark:group-hover:text-[var(--accent-color-300)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                Email
                            </span>
                        </button>

                        <button 
                            onClick={handleGetDailyBriefing} 
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-[var(--accent-color-500)] dark:hover:border-[var(--accent-color-400)] transition-all duration-200 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] group-hover:text-[var(--accent-color-700)] dark:group-hover:text-[var(--accent-color-300)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                <span className="hidden sm:inline">Günün Özeti</span>
                                <span className="sm:hidden">Özet</span>
                            </span>
                        </button>

                        <button 
                            onClick={() => setShowContextInsights(true)} 
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-[var(--accent-color-500)] dark:hover:border-[var(--accent-color-400)] transition-all duration-200 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] group-hover:text-[var(--accent-color-700)] dark:group-hover:text-[var(--accent-color-300)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                İçgörüler
                            </span>
                        </button>

                        {proactiveSuggestions.length > 0 && (
                            <button 
                                onClick={() => setShowProactiveSuggestions(true)} 
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl hover:shadow-md transition-all duration-200 group animate-pulse"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                    AI Önerileri
                                    <span className="ml-1 text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
                                        {proactiveSuggestions.length}
                                    </span>
                                </span>
                            </button>
                        )}

                        <button 
                            onClick={() => setIsArchiveModalOpen(true)} 
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-[var(--accent-color-500)] dark:hover:border-[var(--accent-color-400)] transition-all duration-200 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] group-hover:text-[var(--accent-color-700)] dark:group-hover:text-[var(--accent-color-300)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                                <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                Arşiv
                            </span>
                        </button>

                        <button 
                            onClick={handleExportICS} 
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-[var(--accent-color-500)] dark:hover:border-[var(--accent-color-400)] transition-all duration-200 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] group-hover:text-[var(--accent-color-700)] dark:group-hover:text-[var(--accent-color-300)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                <span className="hidden sm:inline">Takvim Dışa Aktar</span>
                                <span className="sm:hidden">Dışa Aktar</span>
                            </span>
                        </button>
                    </div>

                    {/* Title and View Mode Switcher - Below Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
                        <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                            Görevlerim & Notlarım
                            <span className="text-sm px-3 py-1.5 rounded-lg bg-[var(--accent-color-600)]/10 text-[var(--accent-color-600)] font-semibold">
                                {totalResults}
                            </span>
                        </h2>
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                            <button 
                                onClick={() => setContentFilter('all')} 
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    contentFilter === 'all' 
                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                Tümü ({visibleTodos.length + visibleNotes.length})
                            </button>
                            <button 
                                onClick={() => setContentFilter('tasks')} 
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    contentFilter === 'tasks' 
                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                Görevler ({visibleTodos.length})
                            </button>
                            <button 
                                onClick={() => setContentFilter('notes')} 
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    contentFilter === 'notes' 
                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                Notlar ({visibleNotes.length})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Unified Search and Filter Bar */}
                <div className="mb-6 space-y-3">
                    {/* Search Bar */}
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <input 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            placeholder="Görevlerde ve notlarda ara..." 
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color-500)] shadow-sm transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* View Mode Switcher (moved here) */}
                        <div className="flex items-center p-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <button 
                                onClick={() => setViewMode('list')} 
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                                    viewMode === 'list' 
                                    ? 'bg-[var(--accent-color-600)] text-white shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                                Liste
                            </button>
                            <button 
                                onClick={() => setViewMode('timeline')} 
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                                    viewMode === 'timeline' 
                                    ? 'bg-[var(--accent-color-600)] text-white shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                Zaman Çizelgesi
                            </button>
                        </div>

                        {/* Task Status Filter moved into each view's own container */}

                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                    {(contentFilter === 'all' || contentFilter === 'tasks') && (
                        <div className={contentFilter === 'tasks' ? 'lg:col-span-5' : 'lg:col-span-2'}>
                            {viewMode === 'list' ? (
<div className="bg-white/80 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4">
                                    {/* List Toolbar */}
                                    <div className="flex flex-col gap-3 mb-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Status filter inside list card */}
                                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                                <button 
                                                    onClick={() => setTaskStatusFilter('all')} 
                                                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                        taskStatusFilter === 'all' 
                                                        ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                        : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    Tüm Görevler
                                                </button>
                                                <button 
                                                    onClick={() => setTaskStatusFilter('active')} 
                                                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                        taskStatusFilter === 'active' 
                                                        ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                        : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    Aktif
                                                </button>
                                                <button 
                                                    onClick={() => setTaskStatusFilter('completed')} 
                                                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                        taskStatusFilter === 'completed' 
                                                        ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                        : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    Tamamlanan
                                                </button>
                                            </div>

                                            {/* Date range below status (list) */}
                                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                                <button 
                                                    onClick={() => setListRange('day')} 
                                                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                        listRange === 'day' 
                                                        ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                        : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    Gün
                                                </button>
                                                <button 
                                                    onClick={() => setListRange('week')} 
                                                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                        listRange === 'week' 
                                                        ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                        : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    Hafta
                                                </button>
                                                <button 
                                                    onClick={() => setListRange('month')} 
                                                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                        listRange === 'month' 
                                                        ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                        : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    Ay
                                                </button>
                                                <button 
                                                    onClick={() => setListRange('year')} 
                                                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                        listRange === 'year' 
                                                        ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                        : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    Yıl
                                                </button>
                                                <button 
                                                    onClick={() => setListRange('all')} 
                                                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                        listRange === 'all' 
                                                        ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                        : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                >
                                                    Tümü
                                                </button>
                                            </div>

                                        </div>

                                    </div>

                                    <TodoList
                                        todos={visibleTodos}
                                        onToggle={handleToggleTodo}
                                        onDelete={handleDeleteTodo}
                                        onGetDirections={handleGetDirections}
                                        onEdit={handleEditTodo}
                                        onShare={(todo) => { setShareType('todo'); setShareItem(todo); setIsShareModalOpen(true); }}
                                        onUpdateReminders={handleUpdateReminders}
                                    />
                                </div>
                            ) : (
                                <div className="bg-white/80 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4">
                                    {/* Timeline Toolbar */}
                                    <div className="flex flex-col gap-3 mb-3">
                                        {/* Status filter inside timeline card */}
                                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                            <button 
                                                onClick={() => setTaskStatusFilter('all')} 
                                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                    taskStatusFilter === 'all' 
                                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                    : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                Tüm Görevler
                                            </button>
                                            <button 
                                                onClick={() => setTaskStatusFilter('active')} 
                                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                    taskStatusFilter === 'active' 
                                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                    : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                Aktif
                                            </button>
                                            <button 
                                                onClick={() => setTaskStatusFilter('completed')} 
                                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                    taskStatusFilter === 'completed' 
                                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                    : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                Tamamlanan
                                            </button>
                                        </div>

                                        {/* Date range below status (timeline) */}
                                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                            <button 
                                                onClick={() => setListRange('day')} 
                                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                    listRange === 'day' 
                                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                    : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                Gün
                                            </button>
                                            <button 
                                                onClick={() => setListRange('week')} 
                                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                    listRange === 'week' 
                                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                    : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                Hafta
                                            </button>
                                            <button 
                                                onClick={() => setListRange('month')} 
                                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                    listRange === 'month' 
                                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                    : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                Ay
                                            </button>
                                            <button 
                                                onClick={() => setListRange('year')} 
                                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                    listRange === 'year' 
                                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                    : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                Yıl
                                            </button>
                                            <button 
                                                onClick={() => setListRange('all')} 
                                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                                                    listRange === 'all' 
                                                    ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow-sm' 
                                                    : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                Tümü
                                            </button>
                                        </div>

                                    </div>

<TimelineView todos={visibleTodos} scale={(listRange === 'all' ? 'month' : listRange) as 'day' | 'week' | 'month' | 'year'} onEditTodo={(id, newText) => handleEditTodo(id, newText)} />
                                </div>
                            )}
                        </div>
                    )}
                    {(contentFilter === 'all' || contentFilter === 'notes') && (
                        <div className={contentFilter === 'notes' ? 'lg:col-span-5' : 'lg:col-span-3 mt-6 lg:mt-0'}>
                       <DailyNotepad
                           notes={contentFilter === 'notes' || contentFilter === 'all' ? visibleNotes : []}
                           setNotes={setNotes}
                           onOpenAiModal={() => { if(checkApiKey()) setIsNotepadAiModalOpen(true); }}
                           onAnalyzeImage={handleAnalyzeImageNote}
                           onShareNote={(note) => { setShareType('note'); setShareItem(note); setIsShareModalOpen(true); }}
                           setNotification={setNotification}
                           onAnalyzePdf={handleAnalyzePdf}
                           onExtractTextFromImage={async (dataUrl) => {
                               if (!checkApiKey()) return null;
                               setIsLoading(true);
                               setLoadingMessage('Resimdeki metin çıkarılıyor...');
                               const text = await geminiService.extractTextFromDataUrl(apiKey, dataUrl);
                               setIsLoading(false);
                               return text;
                           }}
                           onDeleteNotesRemote={async (ids) => {
                               try {
                                   const { deleteNotes } = await import('./services/supabaseClient');
                                   if (userId) {
                                       await deleteNotes(userId, ids);
                                       console.log(`[Main] Remote deleted ${ids.length} notes for user ${userId}`);
                                   }
                               } catch (e) {
                                   console.warn('[Main] Remote delete (bulk) failed:', e);
                               }
                           }}
                           onSelectionModeChange={setIsSelectionModeActive}
                       />
                        </div>
                    )}
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
                onAnalyzePdf={handleAnalyzePdf}
            />
            <ImageTaskModal isOpen={isImageTaskModalOpen} onClose={() => setIsImageTaskModalOpen(false)} onAddTask={handleAddTask} />
            <LocationPromptModal isOpen={isLocationPromptOpen} onClose={() => setIsLocationPromptOpen(false)} onSubmit={handleLocationSubmit} destination={todoForDirections?.aiMetadata?.destination || ''} />
            <SuggestionsModal isOpen={isSuggestionsModalOpen} onClose={() => setIsSuggestionsModalOpen(false)} briefing={dailyBriefing} />
            <NotepadAiModal isOpen={isNotepadAiModalOpen} onClose={() => setIsNotepadAiModalOpen(false)} onSubmit={handleAnalyzeNotes} notes={notes} />
            <ArchiveModal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} currentTodos={todos} currentNotes={notes} />
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
        {/* Global Toast Container */}
        <ToastNotification messages={toasts} onRemove={removeToast} />
        </div>
    );
};

export default Main;