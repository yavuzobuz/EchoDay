import { Todo } from '../types/todo';
import { UserContext } from '../types/userContext';
import { getCurrentAIService } from '../utils/aiHelper';
import { AIProvider } from '../types/ai';

export interface SmartSuggestion {
  id: string;
  type: 'task' | 'reminder' | 'optimization' | 'motivation' | 'break' | 'planning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  action?: {
    type: 'add_task' | 'set_reminder' | 'open_modal' | 'show_analytics';
    data?: any;
  };
  timestamp: number;
  relevanceScore: number;
}

export interface SuggestionContext {
  currentTime: Date;
  userActivity: 'active' | 'idle' | 'focused';
  recentTasks: Todo[];
  upcomingTasks: Todo[];
  completedTasksToday: number;
  workingHours: { start: number; end: number };
  userMood?: 'productive' | 'stressed' | 'relaxed' | 'motivated';
  lastInteraction: Date;
}

export class SmartSuggestionsService {
  private static instance: SmartSuggestionsService;
  private suggestionHistory: SmartSuggestion[];

  constructor() {
    this.suggestionHistory = [];
  }

  static getInstance(): SmartSuggestionsService {
    if (!SmartSuggestionsService.instance) {
      SmartSuggestionsService.instance = new SmartSuggestionsService();
    }
    return SmartSuggestionsService.instance;
  }

  async generateSuggestions(
    todos: Todo[],
    userContext?: UserContext
  ): Promise<SmartSuggestion[]> {
    const context = this.buildSuggestionContext(todos);
    const suggestions: SmartSuggestion[] = [];

    // Zaman bazlı öneriler
    suggestions.push(...this.generateTimeBasedSuggestions(context));

    // Görev bazlı öneriler
    suggestions.push(...this.generateTaskBasedSuggestions(context, todos));

    // Verimlilik önerileri
    suggestions.push(...this.generateProductivitySuggestions(context, userContext));

    // Motivasyon önerileri
    suggestions.push(...this.generateMotivationSuggestions(context));

    // AI destekli öneriler
    const aiSuggestions = await this.generateAISuggestions(context, todos);
    suggestions.push(...aiSuggestions);

    // Önerileri puanla ve sırala
    return this.rankSuggestions(suggestions);
  }

  private buildSuggestionContext(todos: Todo[]): SuggestionContext {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const recentTasks = todos
      .filter(todo => new Date(todo.createdAt) > new Date(now.getTime() - 24 * 60 * 60 * 1000))
      .slice(0, 5);

    const upcomingTasks = todos
      .filter(todo => !todo.completed && todo.datetime)
      .sort((a, b) => new Date(a.datetime!).getTime() - new Date(b.datetime!).getTime())
      .slice(0, 5);

    const completedTasksToday = todos.filter(todo => 
      todo.completed && 
      todo.createdAt && 
      new Date(todo.createdAt) >= today
    ).length;

    return {
      currentTime: now,
      userActivity: this.detectUserActivity(),
      recentTasks,
      upcomingTasks,
      completedTasksToday,
      workingHours: { start: 9, end: 17 }, // Varsayılan çalışma saatleri
      lastInteraction: new Date()
    };
  }

  private generateTimeBasedSuggestions(context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const hour = context.currentTime.getHours();

    // Sabah önerileri
    if (hour >= 8 && hour <= 10) {
      suggestions.push({
        id: `morning-${Date.now()}`,
        type: 'planning',
        title: 'Güne Başlangıç',
        description: 'Bugün için öncelikli görevlerinizi planlayın ve hedeflerinizi belirleyin.',
        priority: 'high',
        actionable: true,
        action: { type: 'show_analytics' },
        timestamp: Date.now(),
        relevanceScore: 0.9
      });
    }

    // Öğle arası önerileri
    if (hour >= 12 && hour <= 14) {
      suggestions.push({
        id: `lunch-${Date.now()}`,
        type: 'break',
        title: 'Mola Zamanı',
        description: 'Kısa bir mola verin ve enerjinizi yenileyin. Bugün şimdiye kadar harika gidiyorsunuz!',
        priority: 'medium',
        actionable: false,
        timestamp: Date.now(),
        relevanceScore: 0.7
      });
    }

    // Akşam önerileri
    if (hour >= 17 && hour <= 19) {
      suggestions.push({
        id: `evening-${Date.now()}`,
        type: 'planning',
        title: 'Gün Sonu Değerlendirmesi',
        description: 'Bugün tamamladığınız görevleri gözden geçirin ve yarın için plan yapın.',
        priority: 'medium',
        actionable: true,
        action: { type: 'show_analytics' },
        timestamp: Date.now(),
        relevanceScore: 0.8
      });
    }

    return suggestions;
  }

  private generateTaskBasedSuggestions(context: SuggestionContext, todos: Todo[]): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Yaklaşan deadline'lar
    const urgentTasks = context.upcomingTasks.filter(task => {
      if (!task.datetime) return false;
      const dueDate = new Date(task.datetime);
      const timeDiff = dueDate.getTime() - context.currentTime.getTime();
      return timeDiff <= 24 * 60 * 60 * 1000; // 24 saat içinde
    });

    if (urgentTasks.length > 0) {
      suggestions.push({
        id: `urgent-${Date.now()}`,
        type: 'task',
        title: 'Acil Görevler',
        description: `${urgentTasks.length} görevinizin deadline'ı yaklaşıyor. Öncelik verin!`,
        priority: 'high',
        actionable: true,
        action: { 
          type: 'show_task_list', 
          data: { 
            tasks: urgentTasks,
            title: 'Acil Görevler'
          } 
        },
        timestamp: Date.now(),
        relevanceScore: 0.95
      });
    }

    // Tamamlanmamış yüksek öncelikli görevler
    const highPriorityTasks = todos.filter(todo => 
      !todo.completed && todo.priority === 'high'
    );

    if (highPriorityTasks.length > 0) {
      suggestions.push({
        id: `priority-${Date.now()}`,
        type: 'task',
        title: 'Yüksek Öncelikli Görevler',
        description: `${highPriorityTasks.length} yüksek öncelikli göreviniz bekliyor.`,
        priority: 'high',
        actionable: true,
        action: { 
          type: 'show_task_list', 
          data: { 
            tasks: highPriorityTasks,
            title: 'Yüksek Öncelikli Görevler'
          } 
        },
        timestamp: Date.now(),
        relevanceScore: 0.9
      });
    }

    // Hatırlatıcı önerileri
    const tasksWithoutReminders = todos.filter(todo => 
      !todo.completed && todo.datetime && (!todo.reminders || todo.reminders.length === 0)
    );

    if (tasksWithoutReminders.length > 0) {
      suggestions.push({
        id: `reminder-${Date.now()}`,
        type: 'reminder',
        title: 'Hatırlatıcı Ekleyin',
        description: `${tasksWithoutReminders.length} göreviniz için hatırlatıcı eklemeyi unutmayın.`,
        priority: 'medium',
        actionable: true,
        action: { 
          type: 'set_reminder', 
          data: { 
            taskIds: tasksWithoutReminders.map(t => t.id),
            tasks: tasksWithoutReminders 
          } 
        },
        timestamp: Date.now(),
        relevanceScore: 0.6
      });
    }

    return suggestions;
  }

  private generateProductivitySuggestions(
    context: SuggestionContext, 
    _userContext?: UserContext
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Verimlilik analizi
    if (context.completedTasksToday === 0 && context.currentTime.getHours() > 12) {
      suggestions.push({
        id: `productivity-${Date.now()}`,
        type: 'motivation',
        title: 'Harekete Geçin',
        description: 'Bugün henüz görev tamamlamadınız. Küçük bir görevle başlayın!',
        priority: 'medium',
        actionable: true,
        action: { type: 'add_task' },
        timestamp: Date.now(),
        relevanceScore: 0.8
      });
    }

    // Çok fazla görev varsa
    const incompleteTasks = context.recentTasks.filter(task => !task.completed);
    if (incompleteTasks.length > 10) {
      suggestions.push({
        id: `organize-${Date.now()}`,
        type: 'optimization',
        title: 'Görevlerinizi Düzenleyin',
        description: 'Çok fazla açık göreviniz var. Öncelik sırasına göre düzenlemeyi deneyin.',
        priority: 'medium',
        actionable: true,
        action: { type: 'show_analytics' },
        timestamp: Date.now(),
        relevanceScore: 0.7
      });
    }

    return suggestions;
  }

  private generateMotivationSuggestions(context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Başarı kutlaması
    if (context.completedTasksToday >= 3) {
      suggestions.push({
        id: `celebration-${Date.now()}`,
        type: 'motivation',
        title: 'Harika İş Çıkarıyorsunuz!',
        description: `Bugün ${context.completedTasksToday} görev tamamladınız. Kendinizi ödüllendirin!`,
        priority: 'low',
        actionable: false,
        timestamp: Date.now(),
        relevanceScore: 0.6
      });
    }

    return suggestions;
  }

  private async generateAISuggestions(
    context: SuggestionContext, 
    _todos: Todo[]
  ): Promise<SmartSuggestion[]> {
    try {
      // Try to get AI service - will throw if no API key is configured
      const aiService = getCurrentAIService();
      
      const prompt = `
Kullanıcının görev durumunu analiz et ve akıllı öneriler sun:

Mevcut Durum:
- Bugün tamamlanan görev: ${context.completedTasksToday}
- Yaklaşan görevler: ${context.upcomingTasks.length}
- Son aktivite: ${context.userActivity}
- Saat: ${context.currentTime.getHours()}

Lütfen 1-2 kısa, eyleme dönük öneri sun. JSON formatında yanıtla:
{
  "suggestions": [
    {
      "title": "Öneri başlığı",
      "description": "Açıklama",
      "type": "task|reminder|optimization|motivation",
      "priority": "low|medium|high"
    }
  ]
}
`;

      const response = await aiService.generate(prompt);
      const aiData = JSON.parse(response.text);
      
      return aiData.suggestions.map((suggestion: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        type: suggestion.type,
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority,
        actionable: true,
        timestamp: Date.now(),
        relevanceScore: 0.8
      }));
    } catch (error: any) {
      // This is expected when no API key is configured - don't spam console
      if (error?.message?.includes('No API key configured') || 
          error?.message?.includes('API key not valid') ||
          error?.message?.includes('API_KEY_INVALID')) {
        // Silently skip AI suggestions when no API key is configured or invalid
        return [];
      }
      console.log('[SmartSuggestions] AI önerileri oluşturulamadı:', error?.message || error);
      return [];
    }
  }

  private detectUserActivity(): 'active' | 'idle' | 'focused' {
    // Basit aktivite tespiti - gerçek uygulamada daha gelişmiş olabilir
    const lastActivity = localStorage.getItem('lastUserActivity');
    if (!lastActivity) return 'active';
    
    const timeDiff = Date.now() - parseInt(lastActivity);
    if (timeDiff > 30 * 60 * 1000) return 'idle'; // 30 dakika
    if (timeDiff < 5 * 60 * 1000) return 'focused'; // 5 dakika
    return 'active';
  }

  private rankSuggestions(suggestions: SmartSuggestion[]): SmartSuggestion[] {
    return suggestions
      .sort((a, b) => {
        // Önce öncelik, sonra relevans skoru
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityWeight[a.priority];
        const bPriority = priorityWeight[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return b.relevanceScore - a.relevanceScore;
      })
      .slice(0, 5); // En fazla 5 öneri
  }

  // Öneri geçmişini yönet
  addToHistory(suggestion: SmartSuggestion): void {
    this.suggestionHistory.push(suggestion);
    // Son 50 öneriyi sakla
    if (this.suggestionHistory.length > 50) {
      this.suggestionHistory = this.suggestionHistory.slice(-50);
    }
  }

  getSuggestionHistory(): SmartSuggestion[] {
    return this.suggestionHistory;
  }

  // Kullanıcı aktivitesini güncelle
  updateUserActivity(): void {
    localStorage.setItem('lastUserActivity', Date.now().toString());
  }
}
