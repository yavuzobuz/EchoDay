// Contextual Memory Service - Kullanıcı davranışlarını öğrenen ve analiz eden sistem
import { 
  UserContext, 
  TaskPattern, 
  WorkingHoursProfile, 
  TaskCompletionStats, 
  Todo 
} from '../types';

const STORAGE_KEY = 'user_context';
const MIN_PATTERN_FREQUENCY = 3; // En az 3 kez tekrar eden görevleri pattern olarak kabul et

// ==================== UTILITY FUNCTIONS ====================

/**
 * LocalStorage'dan kullanıcı bağlamını yükle
 */
export const loadUserContext = (): UserContext | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserContext;
  } catch (error) {
    console.error('Error loading user context:', error);
    return null;
  }
};

/**
 * Kullanıcı bağlamını LocalStorage'a kaydet
 */
export const saveUserContext = (context: UserContext): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch (error) {
    console.error('Error saving user context:', error);
  }
};

/**
 * Yeni bir kullanıcı bağlamı oluştur
 */
export const initializeUserContext = (): UserContext => {
  return {
    userId: 'default_user',
    patterns: [],
    workingHours: {
      weekdayStart: '09:00',
      weekdayEnd: '18:00',
      mostProductiveHours: [9, 10, 14, 15],
      breakTimes: [{ start: '12:00', end: '13:00' }]
    },
    completionStats: {
      totalTasksCreated: 0,
      totalTasksCompleted: 0,
      completionRate: 0,
      averageCompletionTime: 0,
      categoryPerformance: {},
      timeAccuracy: 0
    },
    preferences: {
      favoriteCategories: [],
      averageTasksPerDay: 0,
      preferredReminderTime: 15 // 15 dakika önceden varsayılan
    },
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Mevcut bağlamı al veya yenisini oluştur
 */
export const getUserContext = (): UserContext => {
  const context = loadUserContext();
  if (context) return context;
  
  const newContext = initializeUserContext();
  saveUserContext(newContext);
  return newContext;
};

// ==================== PATTERN DETECTION ====================

/**
 * İki görev metninin benzer olup olmadığını kontrol et
 */
const isSimilarTask = (task1: string, task2: string): boolean => {
  const normalize = (text: string) => 
    text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
  
  const t1 = normalize(task1);
  const t2 = normalize(task2);
  
  // Levenshtein distance veya basit kelime eşleşmesi
  const words1 = t1.split(/\s+/);
  const words2 = t2.split(/\s+/);
  
  const commonWords = words1.filter(w => words2.includes(w));
  const similarity = commonWords.length / Math.max(words1.length, words2.length);
  
  return similarity > 0.6; // %60+ benzerlik
};

/**
 * Görev listesinden pattern'leri tespit et
 */
export const detectPatterns = (todos: Todo[]): TaskPattern[] => {
  const patterns: TaskPattern[] = [];
  const grouped: { [key: string]: Todo[] } = {};
  
  // Benzer görevleri grupla
  todos.forEach(todo => {
    let foundGroup = false;
    
    for (const key in grouped) {
      if (isSimilarTask(key, todo.text)) {
        grouped[key].push(todo);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      grouped[todo.text] = [todo];
    }
  });
  
  // Pattern'leri oluştur
  for (const [key, tasks] of Object.entries(grouped)) {
    if (tasks.length >= MIN_PATTERN_FREQUENCY) {
      // Gün ve saat analizi
      const dates = tasks.map(t => new Date(t.createdAt));
      const daysOfWeek = dates.map(d => d.getDay());
      const timesOfDay = tasks
        .filter(t => t.datetime)
        .map(t => {
          const date = new Date(t.datetime!);
          return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });
      
      // En sık tekrar eden gün
      const dayFrequency: { [day: number]: number } = {};
      daysOfWeek.forEach(day => {
        dayFrequency[day] = (dayFrequency[day] || 0) + 1;
      });
      const mostCommonDay = Object.keys(dayFrequency).reduce((a, b) => 
        dayFrequency[parseInt(a)] > dayFrequency[parseInt(b)] ? a : b
      );
      
      // En sık tekrar eden saat
      const timeFrequency: { [time: string]: number } = {};
      timesOfDay.forEach(time => {
        timeFrequency[time] = (timeFrequency[time] || 0) + 1;
      });
      const mostCommonTime = Object.keys(timeFrequency).length > 0
        ? Object.keys(timeFrequency).reduce((a, b) => 
            timeFrequency[a] > timeFrequency[b] ? a : b
          )
        : undefined;
      
      patterns.push({
        id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pattern: key,
        frequency: tasks.length,
        dayOfWeek: parseInt(mostCommonDay),
        timeOfDay: mostCommonTime,
        category: tasks[0].aiMetadata?.category,
        lastOccurrence: tasks[tasks.length - 1].createdAt,
        confidence: Math.min(tasks.length / 10, 1) // Her 10 tekrarda %100 güven
      });
    }
  }
  
  return patterns;
};

// ==================== WORKING HOURS ANALYSIS ====================

/**
 * Görevlerden çalışma saatlerini analiz et
 */
export const analyzeWorkingHours = (todos: Todo[]): WorkingHoursProfile => {
  const tasksWithTime = todos.filter(t => t.datetime);
  
  if (tasksWithTime.length === 0) {
    return {
      weekdayStart: '09:00',
      weekdayEnd: '18:00',
      mostProductiveHours: [9, 10, 14, 15],
      breakTimes: []
    };
  }
  
  const weekdayTasks = tasksWithTime.filter(t => {
    const day = new Date(t.datetime!).getDay();
    return day >= 1 && day <= 5; // Pazartesi-Cuma
  });
  
  const weekendTasks = tasksWithTime.filter(t => {
    const day = new Date(t.datetime!).getDay();
    return day === 0 || day === 6; // Pazar veya Cumartesi
  });
  
  // Saat dağılımı analizi
  const hourCounts: { [hour: number]: number } = {};
  tasksWithTime.forEach(t => {
    const hour = new Date(t.datetime!).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  // En üretken saatler (en çok görev oluşturulan)
  const sortedHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([hour]) => parseInt(hour));
  
  // Başlangıç ve bitiş saatlerini bul
  const weekdayHours = weekdayTasks.map(t => new Date(t.datetime!).getHours());
  const weekdayStart = weekdayHours.length > 0 
    ? `${Math.min(...weekdayHours).toString().padStart(2, '0')}:00`
    : '09:00';
  const weekdayEnd = weekdayHours.length > 0
    ? `${Math.max(...weekdayHours).toString().padStart(2, '0')}:00`
    : '18:00';
  
  return {
    weekdayStart,
    weekdayEnd,
    weekendStart: weekendTasks.length > 0 
      ? `${Math.min(...weekendTasks.map(t => new Date(t.datetime!).getHours())).toString().padStart(2, '0')}:00`
      : undefined,
    weekendEnd: weekendTasks.length > 0
      ? `${Math.max(...weekendTasks.map(t => new Date(t.datetime!).getHours())).toString().padStart(2, '0')}:00`
      : undefined,
    mostProductiveHours: sortedHours,
    breakTimes: [] // Daha gelişmiş analiz gerektirir
  };
};

// ==================== COMPLETION STATS ====================

/**
 * Görev tamamlama istatistiklerini hesapla
 */
export const calculateCompletionStats = (todos: Todo[]): TaskCompletionStats => {
  const totalTasksCreated = todos.length;
  const totalTasksCompleted = todos.filter(t => t.completed).length;
  const completionRate = totalTasksCreated > 0 ? totalTasksCompleted / totalTasksCreated : 0;
  
  // Kategori bazında performans
  const categoryPerformance: { [category: string]: { completed: number; total: number; rate: number } } = {};
  
  todos.forEach(todo => {
    const category = todo.aiMetadata?.category || 'Diğer';
    if (!categoryPerformance[category]) {
      categoryPerformance[category] = { completed: 0, total: 0, rate: 0 };
    }
    categoryPerformance[category].total++;
    if (todo.completed) {
      categoryPerformance[category].completed++;
    }
  });
  
  // Her kategori için tamamlanma oranını hesapla
  for (const category in categoryPerformance) {
    const { completed, total } = categoryPerformance[category];
    categoryPerformance[category].rate = total > 0 ? completed / total : 0;
  }
  
  // Ortalama tamamlama süresi (basitleştirilmiş)
  // Not: Gerçek zamanlama için görevin ne zaman tamamlandığını da kaydetmemiz gerekir
  const averageCompletionTime = 0; // Şimdilik placeholder
  
  return {
    totalTasksCreated,
    totalTasksCompleted,
    completionRate,
    averageCompletionTime,
    categoryPerformance,
    timeAccuracy: 0.8 // Placeholder - gerçek zamanlama verileriyle hesaplanmalı
  };
};

// ==================== CONTEXT UPDATE ====================

/**
 * Kullanıcı bağlamını güncel görev listesiyle güncelle
 */
export const updateUserContext = (todos: Todo[]): UserContext => {
  const context = getUserContext();
  
  // Pattern'leri tespit et
  context.patterns = detectPatterns(todos);
  
  // Çalışma saatlerini analiz et
  context.workingHours = analyzeWorkingHours(todos);
  
  // İstatistikleri hesapla
  context.completionStats = calculateCompletionStats(todos);
  
  // Tercihler - favori kategoriler
  const categoryCounts: { [category: string]: number } = {};
  todos.forEach(t => {
    const category = t.aiMetadata?.category || 'Diğer';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  
  context.preferences.favoriteCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat);
  
  // Günlük ortalama görev sayısı
  const uniqueDays = new Set(todos.map(t => new Date(t.createdAt).toDateString())).size;
  context.preferences.averageTasksPerDay = uniqueDays > 0 ? todos.length / uniqueDays : 0;
  
  context.lastUpdated = new Date().toISOString();
  
  saveUserContext(context);
  return context;
};

// ==================== CONTEXT-AWARE SUGGESTIONS ====================

/**
 * Bağlamsal bilgilere dayalı öneriler oluştur
 */
export const getContextualInsights = (context: UserContext): string[] => {
  const insights: string[] = [];
  
  // Pattern tabanlı öneriler
  if (context.patterns.length > 0) {
    const topPattern = context.patterns.reduce((a, b) => 
      a.frequency > b.frequency ? a : b
    );
    
    if (topPattern.dayOfWeek !== undefined && topPattern.timeOfDay) {
      const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      insights.push(
        `Genellikle ${days[topPattern.dayOfWeek]} günleri saat ${topPattern.timeOfDay} civarında "${topPattern.pattern}" görevi ekliyorsunuz.`
      );
    }
  }
  
  // Tamamlama oranı önerisi
  if (context.completionStats.completionRate < 0.5) {
    insights.push('Görev tamamlama oranınız düşük. Daha az görev eklemeyi veya daha gerçekçi hedefler koymayı deneyin.');
  } else if (context.completionStats.completionRate > 0.8) {
    insights.push('Harika! Görevlerinizin %' + (context.completionStats.completionRate * 100).toFixed(0) + '\'ini tamamlıyorsunuz.');
  }
  
  // Üretken saatler
  if (context.workingHours.mostProductiveHours.length > 0) {
    const hours = context.workingHours.mostProductiveHours.slice(0, 2);
    insights.push(`En üretken saatleriniz: ${hours.map(h => h + ':00').join(', ')}`);
  }
  
  // Favori kategoriler
  if (context.preferences.favoriteCategories.length > 0) {
    insights.push(`En çok odaklandığınız kategori: ${context.preferences.favoriteCategories[0]}`);
  }
  
  return insights;
};

// ==================== EXPORTS ====================

export const contextMemoryService = {
  loadUserContext,
  saveUserContext,
  initializeUserContext,
  getUserContext,
  detectPatterns,
  analyzeWorkingHours,
  calculateCompletionStats,
  updateUserContext,
  getContextualInsights
};
