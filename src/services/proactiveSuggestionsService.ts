// Proactive Suggestions Service - Kullanıcıya proaktif önerilerde bulunan AI sistemi
import { v4 as uuidv4 } from 'uuid';
import { 
  ProactiveSuggestion, 
  Todo, 
  UserContext, 
  // TaskPattern,
  TaskDependency 
} from '../types';

// ==================== SUGGESTION GENERATORS ====================

/**
 * Pattern tabanlı görev önerileri oluştur
 */
export const generatePatternBasedSuggestions = (
  userContext: UserContext,
  currentTodos: Todo[]
): ProactiveSuggestion[] => {
  const suggestions: ProactiveSuggestion[] = [];
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  
  // Pattern'leri kontrol et
  userContext.patterns.forEach(pattern => {
    // Güven skoru yeterince yüksek mi?
    if (pattern.confidence < 0.6) return;
    
    // Bu pattern'e uyan görev bugün eklendi mi?
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hasTaskToday = currentTodos.some(t => 
      new Date(t.createdAt) >= todayStart &&
      t.text.toLowerCase().includes(pattern.pattern.toLowerCase())
    );
    
    if (hasTaskToday) return; // Zaten eklenmişse önerme
    
    // Gün uyuyor mu?
    if (pattern.dayOfWeek !== undefined && pattern.dayOfWeek === currentDay) {
      // Saat uyuyor mu veya yaklaşıyor mu?
      if (pattern.timeOfDay) {
        const patternHour = parseInt(pattern.timeOfDay.split(':')[0]);
        const hourDiff = Math.abs(currentHour - patternHour);
        
        if (hourDiff <= 2) { // 2 saat içinde
          suggestions.push({
            id: uuidv4(),
            type: 'task',
            title: 'Günlük Rutininiz',
            description: `Genellikle bu saatlerde "${pattern.pattern}" görevi ekliyorsunuz. Eklemek ister misiniz?`,
            actionable: true,
            action: {
              type: 'add_task',
              data: {
                text: pattern.pattern,
                category: pattern.category,
                timeOfDay: pattern.timeOfDay
              }
            },
            priority: pattern.frequency >= 5 ? 'high' : 'medium',
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  });
  
  return suggestions;
};

/**
 * Tamamlama oranına dayalı öneriler
 */
export const generateCompletionRateSuggestions = (
  userContext: UserContext,
  currentTodos: Todo[]
): ProactiveSuggestion[] => {
  const suggestions: ProactiveSuggestion[] = [];
  const incompleteTasks = currentTodos.filter(t => !t.completed);
  const completionRate = userContext.completionStats.completionRate;
  
  // Düşük tamamlama oranı uyarısı
  if (completionRate < 0.4 && incompleteTasks.length > 5) {
    suggestions.push({
      id: uuidv4(),
      type: 'warning',
      title: 'Görev Yükü Fazla',
      description: `${incompleteTasks.length} tamamlanmamış göreviniz var ve tamamlama oranınız %${(completionRate * 100).toFixed(0)}. Bazı görevleri basitleştirmeyi veya ertelemeyi düşünün.`,
      actionable: false,
      priority: 'high',
      createdAt: new Date().toISOString()
    });
  }
  
  // Yüksek başarı tebriği
  if (completionRate > 0.85 && incompleteTasks.length > 0) {
    suggestions.push({
      id: uuidv4(),
      type: 'insight',
      title: 'Harika Performans! 🎉',
      description: `Görevlerinizin %${(completionRate * 100).toFixed(0)}'ini tamamlıyorsunuz. Bugün de ${incompleteTasks.length} görev daha var, devam edin!`,
      actionable: false,
      priority: 'low',
      createdAt: new Date().toISOString()
    });
  }
  
  return suggestions;
};

/**
 * Zaman çakışması ve optimizasyon önerileri
 */
export const generateTimeOptimizationSuggestions = (
  currentTodos: Todo[],
  _userContext: UserContext
): ProactiveSuggestion[] => {
  const suggestions: ProactiveSuggestion[] = [];
  const scheduledTasks = currentTodos.filter(t => !t.completed && t.datetime);
  
  // Zamanlanmış görevleri sırala
  scheduledTasks.sort((a, b) => 
    new Date(a.datetime!).getTime() - new Date(b.datetime!).getTime()
  );
  
  // Çakışma kontrolü
  for (let i = 0; i < scheduledTasks.length - 1; i++) {
    const task1 = scheduledTasks[i];
    const task2 = scheduledTasks[i + 1];
    
    const time1 = new Date(task1.datetime!);
    const time2 = new Date(task2.datetime!);
    const duration1 = task1.aiMetadata?.estimatedDuration || 30;
    
    const endTime1 = new Date(time1.getTime() + duration1 * 60000);
    
    // Çakışma var mı?
    if (endTime1 > time2) {
      suggestions.push({
        id: uuidv4(),
        type: 'warning',
        title: 'Zaman Çakışması Tespit Edildi',
        description: `"${task1.text}" ve "${task2.text}" görevleri aynı saate denk geliyor. Birini yeniden zamanlamak ister misiniz?`,
        actionable: true,
        action: {
          type: 'reschedule',
          data: { taskIds: [task1.id, task2.id] }
        },
        priority: 'high',
        createdAt: new Date().toISOString()
      });
    }
  }
  
  // Aynı kategorideki görevleri gruplama önerisi
  const categoryGroups: { [key: string]: Todo[] } = {};
  currentTodos.filter(t => !t.completed).forEach(todo => {
    const category = todo.aiMetadata?.category || 'Diğer';
    if (!categoryGroups[category]) categoryGroups[category] = [];
    categoryGroups[category].push(todo);
  });
  
  Object.entries(categoryGroups).forEach(([category, tasks]) => {
    if (tasks.length >= 3) {
      suggestions.push({
        id: uuidv4(),
        type: 'optimization',
        title: 'Görev Gruplama Önerisi',
        description: `${category} kategorisinde ${tasks.length} göreviniz var. Bunları aynı zaman diliminde toplu yapmak daha verimli olabilir.`,
        actionable: true,
        action: {
          type: 'group_tasks',
          data: { category, taskIds: tasks.map(t => t.id) }
        },
        priority: 'medium',
        createdAt: new Date().toISOString()
      });
    }
  });
  
  return suggestions;
};

/**
 * Çalışma saatleri dışı görev önerileri
 */
export const generateWorkingHoursSuggestions = (
  currentTodos: Todo[],
  userContext: UserContext
): ProactiveSuggestion[] => {
  const suggestions: ProactiveSuggestion[] = [];
  const now = new Date();
  const currentHour = now.getHours();
  
  // const workStart = parseInt(userContext.workingHours.weekdayStart.split(':')[0]);
  const workEnd = parseInt(userContext.workingHours.weekdayEnd.split(':')[0]);
  
  // Mesai dışı ama görev var mı?
  const isAfterWork = currentHour >= workEnd;
  const incompleteTasks = currentTodos.filter(t => !t.completed);
  
  if (isAfterWork && incompleteTasks.length > 0) {
    const urgentTasks = incompleteTasks.filter(t => {
      if (!t.datetime) return false;
      const taskTime = new Date(t.datetime);
      const hoursUntil = (taskTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil < 12; // 12 saat içinde
    });
    
    if (urgentTasks.length > 0) {
      suggestions.push({
        id: uuidv4(),
        type: 'reminder',
        title: 'Yarınki Acil Görevler',
        description: `Yarın için ${urgentTasks.length} acil göreviniz var. İlk önceliklerinizi şimden belirleyin.`,
        actionable: false,
        priority: 'medium',
        createdAt: new Date().toISOString()
      });
    }
  }
  
  // Üretken saatlerde olmayan zamanlanmış görevler
  const unproductiveScheduledTasks = currentTodos.filter(t => {
    if (!t.datetime || t.completed) return false;
    const taskHour = new Date(t.datetime).getHours();
    return !userContext.workingHours.mostProductiveHours.includes(taskHour);
  });
  
  if (unproductiveScheduledTasks.length >= 3) {
    suggestions.push({
      id: uuidv4(),
      type: 'optimization',
      title: 'Zamanlama Optimizasyonu',
      description: `${unproductiveScheduledTasks.length} göreviniz en üretken saatleriniz dışında planlanmış (${userContext.workingHours.mostProductiveHours.slice(0, 2).join(', ')}:00). Yeniden zamanlamak ister misiniz?`,
      actionable: true,
      action: {
        type: 'reschedule',
        data: { taskIds: unproductiveScheduledTasks.map(t => t.id) }
      },
      priority: 'low',
      createdAt: new Date().toISOString()
    });
  }
  
  return suggestions;
};

/**
 * Mola ve dinlenme önerileri
 */
export const generateBreakSuggestions = (
  currentTodos: Todo[],
  userContext: UserContext
): ProactiveSuggestion[] => {
  const suggestions: ProactiveSuggestion[] = [];
  
  // Bugün çok fazla görev mi eklendi?
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysTasks = currentTodos.filter(t => 
    new Date(t.createdAt) >= today
  );
  
  const avgTasksPerDay = userContext.preferences.averageTasksPerDay;
  
  if (todaysTasks.length > avgTasksPerDay * 1.5 && avgTasksPerDay > 0) {
    suggestions.push({
      id: uuidv4(),
      type: 'warning',
      title: 'Yoğun Bir Gün',
      description: `Bugün normalden %${((todaysTasks.length / avgTasksPerDay - 1) * 100).toFixed(0)} daha fazla görev eklediniz. Mola vermeyi unutmayın!`,
      actionable: false,
      priority: 'medium',
      createdAt: new Date().toISOString()
    });
  }
  
  return suggestions;
};

/**
 * Bağımlılık bazlı öneriler
 */
export const generateDependencySuggestions = (
  currentTodos: Todo[],
  dependencies: TaskDependency[]
): ProactiveSuggestion[] => {
  const suggestions: ProactiveSuggestion[] = [];
  
  // Bağımlı görevler için uyarılar
  dependencies.forEach(dep => {
    const dependentTask = currentTodos.find(t => t.id === dep.taskId);
    const blockerTasks = dep.dependsOn
      .map(id => currentTodos.find(t => t.id === id))
      .filter(t => t && !t.completed);
    
    if (dependentTask && !dependentTask.completed && blockerTasks.length > 0) {
      const blockerNames = blockerTasks.map(t => t!.text).join(', ');
      
      suggestions.push({
        id: uuidv4(),
        type: 'reminder',
        title: 'Bağımlı Görev Uyarısı',
        description: `"${dependentTask.text}" görevini yapabilmek için önce şu görevleri tamamlamalısınız: ${blockerNames}`,
        actionable: false,
        priority: 'high',
        createdAt: new Date().toISOString()
      });
    }
  });
  
  return suggestions;
};

// ==================== MAIN SUGGESTION ENGINE ====================

/**
 * Tüm önerileri oluştur ve filtrele
 */
export const generateAllSuggestions = (
  todos: Todo[],
  userContext: UserContext,
  dependencies: TaskDependency[] = []
): ProactiveSuggestion[] => {
  const allSuggestions: ProactiveSuggestion[] = [
    ...generatePatternBasedSuggestions(userContext, todos),
    ...generateCompletionRateSuggestions(userContext, todos),
    ...generateTimeOptimizationSuggestions(todos, userContext),
    ...generateWorkingHoursSuggestions(todos, userContext),
    ...generateBreakSuggestions(todos, userContext),
    ...generateDependencySuggestions(todos, dependencies)
  ];
  
  // Süresi dolmuş önerileri filtrele
  const now = new Date();
  const validSuggestions = allSuggestions.filter(s => {
    if (!s.expiresAt) return true;
    return new Date(s.expiresAt) > now;
  });
  
  // Önceliğe göre sırala
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  validSuggestions.sort((a, b) => 
    priorityOrder[b.priority] - priorityOrder[a.priority]
  );
  
  // Maksimum 10 öneri döndür
  return validSuggestions.slice(0, 10);
};

/**
 * Belirli bir tip için öneriler al
 */
export const getSuggestionsByType = (
  suggestions: ProactiveSuggestion[],
  type: ProactiveSuggestion['type']
): ProactiveSuggestion[] => {
  return suggestions.filter(s => s.type === type);
};

/**
 * Yüksek öncelikli önerileri al
 */
export const getHighPrioritySuggestions = (
  suggestions: ProactiveSuggestion[]
): ProactiveSuggestion[] => {
  return suggestions.filter(s => s.priority === 'high');
};

// ==================== EXPORTS ====================

export const proactiveSuggestionsService = {
  generateAllSuggestions,
  generatePatternBasedSuggestions,
  generateCompletionRateSuggestions,
  generateTimeOptimizationSuggestions,
  generateWorkingHoursSuggestions,
  generateBreakSuggestions,
  generateDependencySuggestions,
  getSuggestionsByType,
  getHighPrioritySuggestions
};
