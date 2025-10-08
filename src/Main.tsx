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
import { geminiService } from './services/geminiService';
import { pdfService } from './services/pdfService';
import { archiveService } from './services/archiveService';
import { contextMemoryService } from './services/contextMemoryService';
import { reminderService, ActiveReminder } from './services/reminderService';
import { subscribeToIncomingMessagesForUser } from './services/messagesService';
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

    // Tasks UI state (filter + search)
    const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [taskQuery, setTaskQuery] = useState('');

    const visibleTodos = React.useMemo(() => {
        const q = taskQuery.trim().toLowerCase();
        // İlk olarak silinmiş görevleri filtrele
        let list = todos.filter(t => !t.isDeleted);
        if (taskFilter === 'active') list = list.filter(t => !t.completed);
        if (taskFilter === 'completed') list = list.filter(t => t.completed);
        if (q) list = list.filter(t => t.text.toLowerCase().includes(q));
        return list;
    }, [todos, taskFilter, taskQuery]);
    
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
                // Silinmiş görevleri aralarında hariç tutarak tamamlanmış görevleri bul
                const completedTodos = todos.filter(t => t.completed && !t.isDeleted);
                // Sabitlenen ve favorilenen notları hariç tut
                const notesToArchive = notes.filter(note => !note.pinned && !note.favorite);
                if (completedTodos.length > 0 || notesToArchive.length > 0) {
                    try {
                        await archiveService.archiveItems(completedTodos, notesToArchive, userId);
                        // Tamamlanmış görevleri ve silinmiş görevleri local state'ten kaldır
                        setTodos(todos.filter(t => !t.completed && !t.isDeleted));
                        // Arşivlenen notları kaldır, sabitlenmiş ve favorileri koru
                        setNotes(notes.filter(note => note.pinned || note.favorite));
                        setLastArchiveDate(todayStr);
                        setNotification({
                            message: `${completedTodos.length} görev ve ${notesToArchive.length} not arşivlendi. Sabitlenmiş ve favori notlar korundu.`, 
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

            <Header theme={theme} setTheme={setTheme} accentColor={accentColor} setAccentColor={setAccentColor} onNavigateToProfile={onNavigateToProfile} onShowWelcome={onShowWelcome} />
            
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
                    {/* Header Row with Title and View Mode Switcher */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                            Görevlerim
                            <span className="text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-[var(--accent-color-600)]/10 text-[var(--accent-color-600)] font-medium">
                                {visibleTodos.length}
                            </span>
                        </h2>
                        <div className="flex items-center p-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <button 
                                onClick={() => setViewMode('list')} 
                                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                                    viewMode === 'list' 
                                    ? 'bg-[var(--accent-color-600)] text-white shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                Liste
                            </button>
                            <button 
                                onClick={() => setViewMode('timeline')} 
                                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                                    viewMode === 'timeline' 
                                    ? 'bg-[var(--accent-color-600)] text-white shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                Zaman Çizelgesi
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons - Modern Grid Layout */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        <button 
                            onClick={() => navigate('/messages')} 
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-[var(--accent-color-500)] dark:hover:border-[var(--accent-color-400)] transition-all duration-200 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-[var(--accent-color-600)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H7l-3.5 2.333A1 1 0 012 17.5V5z"/>
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                Mesajlar
                            </span>
                        </button>

                        <button 
                            onClick={handleGetDailyBriefing} 
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-[var(--accent-color-500)] dark:hover:border-[var(--accent-color-400)] transition-all duration-200 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 group-hover:text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500 group-hover:text-purple-600" viewBox="0 0 20 20" fill="currentColor">
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-[var(--accent-color-600)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-[var(--accent-color-600)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                <span className="hidden sm:inline">Takvim Dışa Aktar</span>
                                <span className="sm:hidden">Dışa Aktar</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Tasks toolbar: filters + search */}
                <div className="mb-4 mt-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                            <button onClick={() => setTaskFilter('all')} className={`px-3 py-1.5 text-xs sm:text-sm rounded-full ${taskFilter==='all' ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Tümü</button>
                            <button onClick={() => setTaskFilter('active')} className={`px-3 py-1.5 text-xs sm:text-sm rounded-full ${taskFilter==='active' ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Aktif</button>
                            <button onClick={() => setTaskFilter('completed')} className={`px-3 py-1.5 text-xs sm:text-sm rounded-full ${taskFilter==='completed' ? 'bg-white dark:bg-gray-700 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Tamamlanan</button>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <div className="relative">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                            <input value={taskQuery} onChange={(e)=>setTaskQuery(e.target.value)} placeholder="Görevlerde ara..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/80 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color-500)]" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                    <div className="lg:col-span-2">
                        {viewMode === 'list' ? (
                            <div className="bg-white/80 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4">
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
                            <TimelineView todos={todos.filter(t => !t.isDeleted)} />
                        )}
                    </div>
                    <div className="lg:col-span-3 mt-6 lg:mt-0">
                       <DailyNotepad
                           notes={notes}
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