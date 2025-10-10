import { Todo } from '../types';
import { supabase } from './supabaseClient';

/**
 * Task Analytics Service
 * 
 * Kullanıcı görev alışkanlıklarını analiz eder ve öğrenir
 * - Tekrar eden görevleri tespit eder
 * - Görev tamamlama sürelerini analiz eder
 * - Kategori tercihlerini öğrenir
 * - En verimli saatleri belirler
 * - Görev önceliklendirme önerileri sunar
 */

export interface TaskPattern {
  id: string;
  userId: string;
  patternType: 'recurring' | 'time_based' | 'category_based' | 'priority_based';
  description: string;
  frequency: number; // Kaç kez tekrarlandı
  confidence: number; // 0-1 arası güven skoru
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface UserHabit {
  id: string;
  userId: string;
  habitType: 'completion_time' | 'active_hours' | 'category_preference' | 'priority_style';
  habitData: Record<string, any>;
  strength: number; // 0-1 arası alışkanlık gücü
  lastUpdated: string;
}

export interface TaskInsight {
  type: 'suggestion' | 'warning' | 'pattern' | 'achievement';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  relatedTasks?: string[]; // Task IDs
}

class TaskAnalyticsService {
  
  /**
   * Görev desenlerini analiz et
   */
  async analyzeTaskPatterns(todos: Todo[], userId: string): Promise<TaskPattern[]> {
    console.log(`[TaskAnalytics] Analyzing patterns for ${todos.length} tasks`);
    
    const patterns: TaskPattern[] = [];
    
    // 1. Tekrar eden görevleri tespit et
    const recurringPatterns = this.detectRecurringTasks(todos, userId);
    patterns.push(...recurringPatterns);
    
    // 2. Zaman bazlı desenler (belirli saatlerde yapılan görevler)
    const timeBasedPatterns = this.detectTimeBasedPatterns(todos, userId);
    patterns.push(...timeBasedPatterns);
    
    // 3. Kategori bazlı desenler
    const categoryPatterns = this.detectCategoryPatterns(todos, userId);
    patterns.push(...categoryPatterns);
    
    // 4. Öncelik bazlı desenler
    const priorityPatterns = this.detectPriorityPatterns(todos, userId);
    patterns.push(...priorityPatterns);
    
    // Supabase'e kaydet
    await this.savePatternsToDatabase(patterns, userId);
    
    console.log(`[TaskAnalytics] ✅ Detected ${patterns.length} patterns`);
    return patterns;
  }
  
  /**
   * Kullanıcı alışkanlıklarını güncelle
   */
  async updateUserHabits(todos: Todo[], userId: string): Promise<UserHabit[]> {
    console.log(`[TaskAnalytics] Updating user habits`);
    
    const habits: UserHabit[] = [];
    
    // 1. Tamamlama süreleri analizi
    const completionTimeHabit = this.analyzeCompletionTimes(todos, userId);
    if (completionTimeHabit) habits.push(completionTimeHabit);
    
    // 2. Aktif saatler analizi
    const activeHoursHabit = this.analyzeActiveHours(todos, userId);
    if (activeHoursHabit) habits.push(activeHoursHabit);
    
    // 3. Kategori tercihleri
    const categoryPreferenceHabit = this.analyzeCategoryPreferences(todos, userId);
    if (categoryPreferenceHabit) habits.push(categoryPreferenceHabit);
    
    // 4. Önceliklendirme tarzı
    const priorityStyleHabit = this.analyzePriorityStyle(todos, userId);
    if (priorityStyleHabit) habits.push(priorityStyleHabit);
    
    // Supabase'e kaydet
    await this.saveHabitsToDatabase(habits, userId);
    
    console.log(`[TaskAnalytics] ✅ Updated ${habits.length} habits`);
    return habits;
  }
  
  /**
   * Kullanıcı için içgörüler ve öneriler oluştur
   */
  async generateInsights(userId: string): Promise<TaskInsight[]> {
    console.log(`[TaskAnalytics] Generating insights for user ${userId}`);
    
    const insights: TaskInsight[] = [];
    
    try {
      // Desenleri ve alışkanlıkları yükle
      const patterns = await this.loadPatternsFromDatabase(userId);
      const habits = await this.loadHabitsFromDatabase(userId);
      
      // 1. Tekrar eden görevler için öneriler
      const recurringPatterns = patterns.filter(p => p.patternType === 'recurring' && p.confidence > 0.7);
      if (recurringPatterns.length > 0) {
        insights.push({
          type: 'suggestion',
          title: 'Tekrar Eden Görevler Tespit Edildi',
          description: `${recurringPatterns.length} görev düzenli olarak tekrarlanıyor. Bunlar için otomatik hatırlatıcı oluşturmak ister misiniz?`,
          actionable: true,
          priority: 'medium',
          relatedTasks: recurringPatterns.flatMap(p => p.metadata.taskIds || [])
        });
      }
      
      // 2. En verimli saatler
      const activeHoursHabit = habits.find(h => h.habitType === 'active_hours');
      if (activeHoursHabit && activeHoursHabit.strength > 0.6) {
        const peakHours = activeHoursHabit.habitData.peakHours as string[];
        insights.push({
          type: 'pattern',
          title: 'Verimli Saatleriniz Belirlendi',
          description: `En verimli olduğunuz saatler: ${peakHours.join(', ')}. Önemli görevleri bu saatlere planlayın.`,
          actionable: false,
          priority: 'low'
        });
      }
      
      // 3. Kategori dengesizliği uyarısı
      const categoryHabit = habits.find(h => h.habitType === 'category_preference');
      if (categoryHabit) {
        const categories = categoryHabit.habitData.distribution as Record<string, number>;
        const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
        if (topCategory && topCategory[1] > 0.5) {
          insights.push({
            type: 'warning',
            title: 'Kategori Dengesizliği',
            description: `Görevlerinizin %${Math.round(topCategory[1] * 100)}'i "${topCategory[0]}" kategorisinde. Diğer alanlara da odaklanmayı deneyin.`,
            actionable: false,
            priority: 'low'
          });
        }
      }
      
      // 4. Tamamlama oranı başarısı
      const completionHabit = habits.find(h => h.habitType === 'completion_time');
      if (completionHabit && completionHabit.habitData.completionRate > 0.8) {
        insights.push({
          type: 'achievement',
          title: 'Harika İş Çıkarıyorsunuz! 🎉',
          description: `Görev tamamlama oranınız %${Math.round(completionHabit.habitData.completionRate * 100)}! Mükemmel devam edin.`,
          actionable: false,
          priority: 'low'
        });
      }
      
      console.log(`[TaskAnalytics] ✅ Generated ${insights.length} insights`);
      return insights;
      
    } catch (error) {
      console.error('[TaskAnalytics] Failed to generate insights:', error);
      return [];
    }
  }
  
  // ==================== PATTERN DETECTION METHODS ====================
  
  /**
   * Tekrar eden görevleri tespit et
   */
  private detectRecurringTasks(todos: Todo[], userId: string): TaskPattern[] {
    const patterns: TaskPattern[] = [];
    const taskTextMap = new Map<string, Todo[]>();
    
    // Görevleri metinlerine göre grupla
    todos.forEach(todo => {
      const normalizedText = this.normalizeTaskText(todo.text);
      if (!taskTextMap.has(normalizedText)) {
        taskTextMap.set(normalizedText, []);
      }
      taskTextMap.get(normalizedText)!.push(todo);
    });
    
    // Tekrar eden görevleri bul
    taskTextMap.forEach((tasks, text) => {
      if (tasks.length >= 3) { // En az 3 kez tekrarlanmalı
        const frequency = tasks.length;
        const confidence = Math.min(frequency / 10, 1); // Maksimum 10 tekrarda %100 güven
        
        // Ortalama tekrar aralığını hesapla
        const intervals = this.calculateIntervals(tasks);
        const avgInterval = intervals.length > 0
          ? intervals.reduce((sum, int) => sum + int, 0) / intervals.length
          : 0;
        
        patterns.push({
          id: `recurring_${text.slice(0, 20)}`,
          userId,
          patternType: 'recurring',
          description: `"${text}" görevi düzenli olarak tekrarlanıyor`,
          frequency,
          confidence,
          metadata: {
            taskText: text,
            taskIds: tasks.map(t => t.id),
            avgIntervalDays: Math.round(avgInterval / (1000 * 60 * 60 * 24)),
            lastOccurrence: tasks[tasks.length - 1].createdAt
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
    
    return patterns;
  }
  
  /**
   * Zaman bazlı desenler
   */
  private detectTimeBasedPatterns(todos: Todo[], userId: string): TaskPattern[] {
    const patterns: TaskPattern[] = [];
    const hourMap = new Map<number, Todo[]>();
    
    // Görevleri oluşturulma saatine göre grupla
    todos.forEach(todo => {
      const hour = new Date(todo.createdAt).getHours();
      if (!hourMap.has(hour)) {
        hourMap.set(hour, []);
      }
      hourMap.get(hour)!.push(todo);
    });
    
    // En yoğun saatleri bul
    const sortedHours = Array.from(hourMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3); // Top 3 saat
    
    sortedHours.forEach(([hour, tasks]) => {
      if (tasks.length >= 5) { // En az 5 görev
        patterns.push({
          id: `time_based_hour_${hour}`,
          userId,
          patternType: 'time_based',
          description: `Saat ${hour}:00 civarında görev oluşturma eğilimi`,
          frequency: tasks.length,
          confidence: Math.min(tasks.length / 20, 1),
          metadata: {
            hour,
            taskCount: tasks.length,
            categoryDistribution: this.getCategoryDistribution(tasks)
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
    
    return patterns;
  }
  
  /**
   * Kategori bazlı desenler
   */
  private detectCategoryPatterns(todos: Todo[], userId: string): TaskPattern[] {
    const patterns: TaskPattern[] = [];
    const categoryMap = new Map<string, Todo[]>();
    
    // Görevleri kategorilerine göre grupla
    todos.forEach(todo => {
      const category = todo.aiMetadata?.category || 'Diğer';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(todo);
    });
    
    // Baskın kategorileri tespit et
    categoryMap.forEach((tasks, category) => {
      if (tasks.length >= 10) { // En az 10 görev
        const completedCount = tasks.filter(t => t.completed).length;
        const completionRate = completedCount / tasks.length;
        
        patterns.push({
          id: `category_${category}`,
          userId,
          patternType: 'category_based',
          description: `"${category}" kategorisinde yoğun görev akışı`,
          frequency: tasks.length,
          confidence: Math.min(tasks.length / 30, 1),
          metadata: {
            category,
            taskCount: tasks.length,
            completionRate,
            avgPriority: this.getAveragePriority(tasks)
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
    
    return patterns;
  }
  
  /**
   * Öncelik bazlı desenler
   */
  private detectPriorityPatterns(todos: Todo[], userId: string): TaskPattern[] {
    const patterns: TaskPattern[] = [];
    const priorityMap = new Map<string, Todo[]>();
    
    todos.forEach(todo => {
      const priority = todo.priority || 'medium';
      if (!priorityMap.has(priority)) {
        priorityMap.set(priority, []);
      }
      priorityMap.get(priority)!.push(todo);
    });
    
    // En çok kullanılan öncelik
    const sortedPriorities = Array.from(priorityMap.entries())
      .sort((a, b) => b[1].length - a[1].length);
    
    if (sortedPriorities.length > 0) {
      const [topPriority, tasks] = sortedPriorities[0];
      const percentage = (tasks.length / todos.length) * 100;
      
      if (percentage > 50) {
        patterns.push({
          id: `priority_${topPriority}`,
          userId,
          patternType: 'priority_based',
          description: `Görevlerin %${Math.round(percentage)}'i "${topPriority}" öncelikli`,
          frequency: tasks.length,
          confidence: percentage / 100,
          metadata: {
            priority: topPriority,
            percentage,
            taskCount: tasks.length
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    return patterns;
  }
  
  // ==================== HABIT ANALYSIS METHODS ====================
  
  /**
   * Tamamlama süreleri analizi
   */
  private analyzeCompletionTimes(todos: Todo[], userId: string): UserHabit | null {
    const completedTodos = todos.filter(t => t.completed && t.datetime);
    
    if (completedTodos.length < 5) return null;
    
    let totalTime = 0;
    let count = 0;
    
    completedTodos.forEach(todo => {
      if (todo.datetime && todo.createdAt) {
        const created = new Date(todo.createdAt).getTime();
        const scheduled = new Date(todo.datetime).getTime();
        const diff = Math.abs(scheduled - created);
        
        // Makul zaman aralığı (0-30 gün)
        if (diff < 30 * 24 * 60 * 60 * 1000) {
          totalTime += diff;
          count++;
        }
      }
    });
    
    const avgCompletionTime = count > 0 ? totalTime / count : 0;
    const completionRate = completedTodos.length / todos.length;
    
    return {
      id: `completion_time_${userId}`,
      userId,
      habitType: 'completion_time',
      habitData: {
        avgCompletionTimeMs: avgCompletionTime,
        avgCompletionTimeDays: avgCompletionTime / (1000 * 60 * 60 * 24),
        completionRate,
        totalCompleted: completedTodos.length,
        totalTasks: todos.length
      },
      strength: Math.min(completedTodos.length / 50, 1),
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Aktif saatler analizi
   */
  private analyzeActiveHours(todos: Todo[], userId: string): UserHabit | null {
    if (todos.length < 10) return null;
    
    const hourCounts = new Array(24).fill(0);
    
    todos.forEach(todo => {
      const hour = new Date(todo.createdAt).getHours();
      hourCounts[hour]++;
    });
    
    // En aktif 3 saati bul
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => `${h.hour}:00-${h.hour + 1}:00`);
    
    return {
      id: `active_hours_${userId}`,
      userId,
      habitType: 'active_hours',
      habitData: {
        hourDistribution: hourCounts,
        peakHours,
        totalTasks: todos.length
      },
      strength: Math.min(todos.length / 100, 1),
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Kategori tercihleri analizi
   */
  private analyzeCategoryPreferences(todos: Todo[], userId: string): UserHabit | null {
    if (todos.length < 10) return null;
    
    const categoryCount = new Map<string, number>();
    
    todos.forEach(todo => {
      const category = todo.aiMetadata?.category || 'Diğer';
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });
    
    const distribution: Record<string, number> = {};
    categoryCount.forEach((count, category) => {
      distribution[category] = count / todos.length;
    });
    
    return {
      id: `category_preference_${userId}`,
      userId,
      habitType: 'category_preference',
      habitData: {
        distribution,
        topCategories: Array.from(categoryCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cat, count]) => ({ category: cat, count, percentage: (count / todos.length) * 100 }))
      },
      strength: Math.min(todos.length / 100, 1),
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Önceliklendirme tarzı analizi
   */
  private analyzePriorityStyle(todos: Todo[], userId: string): UserHabit | null {
    if (todos.length < 10) return null;
    
    const priorityCount = { high: 0, medium: 0, low: 0 };
    
    todos.forEach(todo => {
      const priority = (todo.priority || 'medium') as keyof typeof priorityCount;
      priorityCount[priority]++;
    });
    
    const style = priorityCount.high > todos.length * 0.4 ? 'aggressive' :
                  priorityCount.low > todos.length * 0.4 ? 'relaxed' :
                  'balanced';
    
    return {
      id: `priority_style_${userId}`,
      userId,
      habitType: 'priority_style',
      habitData: {
        style,
        distribution: {
          high: priorityCount.high / todos.length,
          medium: priorityCount.medium / todos.length,
          low: priorityCount.low / todos.length
        }
      },
      strength: Math.min(todos.length / 100, 1),
      lastUpdated: new Date().toISOString()
    };
  }
  
  // ==================== HELPER METHODS ====================
  
  private normalizeTaskText(text: string): string {
    return text.toLowerCase()
      .replace(/\d{1,2}[:\/\-]\d{1,2}([:\/\-]\d{2,4})?/g, '') // Tarihleri kaldır
      .replace(/\d+/g, '') // Sayıları kaldır
      .trim();
  }
  
  private calculateIntervals(tasks: Todo[]): number[] {
    if (tasks.length < 2) return [];
    
    const sortedTasks = [...tasks].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    const intervals: number[] = [];
    for (let i = 1; i < sortedTasks.length; i++) {
      const prev = new Date(sortedTasks[i - 1].createdAt).getTime();
      const curr = new Date(sortedTasks[i].createdAt).getTime();
      intervals.push(curr - prev);
    }
    
    return intervals;
  }
  
  private getCategoryDistribution(tasks: Todo[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    tasks.forEach(task => {
      const category = task.aiMetadata?.category || 'Diğer';
      distribution[category] = (distribution[category] || 0) + 1;
    });
    return distribution;
  }
  
  private getAveragePriority(tasks: Todo[]): string {
    const priorityScores = { low: 1, medium: 2, high: 3 };
    const total = tasks.reduce((sum, task) => {
      const priority = task.priority || 'medium';
      return sum + (priorityScores[priority as keyof typeof priorityScores] || 2);
    }, 0);
    const avg = total / tasks.length;
    
    if (avg < 1.5) return 'low';
    if (avg > 2.5) return 'high';
    return 'medium';
  }
  
  // ==================== DATABASE METHODS ====================
  
  private async savePatternsToDatabase(patterns: TaskPattern[], userId: string) {
    if (!supabase || patterns.length === 0) return;
    
    try {
      // user_task_patterns tablosuna kaydet (varsa)
      const { error } = await supabase
        .from('user_task_patterns')
        .upsert(patterns.map(p => ({
          id: p.id,
          user_id: userId,
          pattern_type: p.patternType,
          description: p.description,
          frequency: p.frequency,
          confidence: p.confidence,
          metadata: p.metadata,
          updated_at: new Date().toISOString()
        })));
      
      if (error && error.code !== '42P01') { // 42P01 = table doesn't exist
        console.error('[TaskAnalytics] Failed to save patterns:', error);
      }
    } catch (error) {
      console.warn('[TaskAnalytics] Pattern save failed (table may not exist):', error);
    }
  }
  
  private async saveHabitsToDatabase(habits: UserHabit[], userId: string) {
    if (!supabase || habits.length === 0) return;
    
    try {
      // user_habits tablosuna kaydet (varsa)
      const { error } = await supabase
        .from('user_habits')
        .upsert(habits.map(h => ({
          id: h.id,
          user_id: userId,
          habit_type: h.habitType,
          habit_data: h.habitData,
          strength: h.strength,
          last_updated: new Date().toISOString()
        })));
      
      if (error && error.code !== '42P01') {
        console.error('[TaskAnalytics] Failed to save habits:', error);
      }
    } catch (error) {
      console.warn('[TaskAnalytics] Habit save failed (table may not exist):', error);
    }
  }
  
  private async loadPatternsFromDatabase(userId: string): Promise<TaskPattern[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('user_task_patterns')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        patternType: row.pattern_type,
        description: row.description,
        frequency: row.frequency,
        confidence: row.confidence,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.warn('[TaskAnalytics] Failed to load patterns:', error);
      return [];
    }
  }
  
  private async loadHabitsFromDatabase(userId: string): Promise<UserHabit[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('user_habits')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        habitType: row.habit_type,
        habitData: row.habit_data,
        strength: row.strength,
        lastUpdated: row.last_updated
      }));
    } catch (error) {
      console.warn('[TaskAnalytics] Failed to load habits:', error);
      return [];
    }
  }
}

// Singleton instance
export const taskAnalyticsService = new TaskAnalyticsService();
