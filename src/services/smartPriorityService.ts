// Smart Priority Service - Dinamik ve akıllı görev önceliklendirme sistemi
import { 
  Todo, 
  SmartPriority, 
  PriorityFactors, 
  UserContext, 
  TaskDependency, 
  Priority 
} from '../types';

// Öncelik ağırlıkları (toplam = 1.0)
const PRIORITY_WEIGHTS = {
  deadlineUrgency: 0.35,      // En önemli faktör
  userImportance: 0.25,        // Kullanıcının belirlediği
  dependencyImpact: 0.20,      // Başka görevleri etkiler mi
  historicalPattern: 0.10,     // Geçmiş davranışlar
  estimatedEffort: 0.05,       // Efor miktarı
  contextRelevance: 0.05       // Şu anki bağlam
};

// ==================== FACTOR CALCULATIONS ====================

/**
 * Deadline'a yakınlığa göre aciliyet hesapla (0-1)
 */
const calculateDeadlineUrgency = (todo: Todo): number => {
  if (!todo.datetime) return 0.3; // Tarih yok = orta aciliyet
  
  const now = new Date();
  const deadline = new Date(todo.datetime);
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Geçmiş tarih
  if (diffHours < 0) return 1.0; // Maksimum acil!
  
  // Saat bazlı aciliyet
  if (diffHours < 1) return 1.0;      // 1 saat içinde
  if (diffHours < 3) return 0.9;      // 3 saat içinde
  if (diffHours < 6) return 0.8;      // 6 saat içinde
  if (diffHours < 12) return 0.7;     // 12 saat içinde
  if (diffHours < 24) return 0.6;     // 1 gün içinde
  if (diffHours < 48) return 0.5;     // 2 gün içinde
  if (diffHours < 72) return 0.4;     // 3 gün içinde
  if (diffHours < 168) return 0.3;    // 1 hafta içinde
  
  return 0.2; // 1 haftadan fazla
};

/**
 * Kullanıcının belirlediği öneme göre skor (0-1)
 */
const calculateUserImportance = (todo: Todo): number => {
  switch (todo.priority) {
    case Priority.High:
      return 1.0;
    case Priority.Medium:
      return 0.5;
    default:
      return 0.3;
  }
};

/**
 * Görevin başka görevleri etkileme derecesi (0-1)
 */
const calculateDependencyImpact = (
  todo: Todo, 
  _allTodos: Todo[], 
  dependencies: TaskDependency[]
): number => {
  // Bu göreve bağımlı kaç görev var
  const dependentTasksCount = dependencies.filter(dep => 
    dep.dependsOn.includes(todo.id) && dep.dependencyType === 'before'
  ).length;
  
  if (dependentTasksCount === 0) return 0.2; // Hiç bağımlı yok
  if (dependentTasksCount === 1) return 0.5; // 1 görev bağımlı
  if (dependentTasksCount === 2) return 0.7; // 2 görev bağımlı
  
  return 1.0; // 3+ görev bağımlı = kritik
};

/**
 * Geçmiş davranış kalıplarına göre skor (0-1)
 */
const calculateHistoricalPattern = (todo: Todo, userContext: UserContext): number => {
  if (!userContext.patterns || userContext.patterns.length === 0) {
    return 0.5; // Bilgi yok = nötr
  }
  
  // Bu görev bilinen bir pattern'e uyuyor mu?
  const matchingPattern = userContext.patterns.find(p => {
    const taskLower = todo.text.toLowerCase();
    const patternLower = p.pattern.toLowerCase();
    return taskLower.includes(patternLower) || patternLower.includes(taskLower);
  });
  
  if (!matchingPattern) return 0.4; // Pattern yok
  
  // Güven skoru ve sıklığa göre
  const frequencyScore = Math.min(matchingPattern.frequency / 10, 1); // Her 10 tekrarda max
  return matchingPattern.confidence * 0.7 + frequencyScore * 0.3;
};

/**
 * Tahmini efor miktarına göre skor (0-1)
 * Düşük efor = yüksek skor (kolay görevler önce)
 */
const calculateEstimatedEffort = (todo: Todo): number => {
  const duration = todo.aiMetadata?.estimatedDuration || 30; // Varsayılan 30 dk
  
  // Ters ölçeklendirme: kısa görevler yüksek skor
  if (duration <= 5) return 1.0;     // 5 dk veya daha az
  if (duration <= 15) return 0.8;    // 15 dk veya daha az
  if (duration <= 30) return 0.6;    // 30 dk veya daha az
  if (duration <= 60) return 0.4;    // 1 saat veya daha az
  if (duration <= 120) return 0.3;   // 2 saat veya daha az
  
  return 0.2; // 2 saatten fazla
};

/**
 * Şu anki bağlama uygunluk (0-1)
 */
const calculateContextRelevance = (todo: Todo, userContext: UserContext): number => {
  const now = new Date();
  const currentHour = now.getHours();
  // const currentDay = now.getDay();
  
  // Çalışma saatleri içinde mi?
  const workStart = parseInt(userContext.workingHours.weekdayStart.split(':')[0]);
  const workEnd = parseInt(userContext.workingHours.weekdayEnd.split(':')[0]);
  const isWorkingHours = currentHour >= workStart && currentHour < workEnd;
  
  // En üretken saatler içinde mi?
  const isProductiveHour = userContext.workingHours.mostProductiveHours.includes(currentHour);
  
  // Kategori uygunluğu
  const category = todo.aiMetadata?.category || '';
  const isFavoriteCategory = userContext.preferences.favoriteCategories.includes(category);
  
  let score = 0.5; // Başlangıç
  
  if (isWorkingHours) score += 0.2;
  if (isProductiveHour) score += 0.2;
  if (isFavoriteCategory) score += 0.1;
  
  return Math.min(score, 1.0);
};

// ==================== MAIN PRIORITY CALCULATION ====================

/**
 * Görev için akıllı öncelik hesapla
 */
export const calculateSmartPriority = (
  todo: Todo,
  allTodos: Todo[],
  userContext: UserContext,
  dependencies: TaskDependency[] = []
): SmartPriority => {
  // Her faktörü hesapla
  const factors: PriorityFactors = {
    deadlineUrgency: calculateDeadlineUrgency(todo),
    userImportance: calculateUserImportance(todo),
    dependencyImpact: calculateDependencyImpact(todo, allTodos, dependencies),
    historicalPattern: calculateHistoricalPattern(todo, userContext),
    estimatedEffort: calculateEstimatedEffort(todo),
    contextRelevance: calculateContextRelevance(todo, userContext)
  };
  
  // Ağırlıklı toplam skor (0-100)
  const score = Math.round(
    factors.deadlineUrgency * PRIORITY_WEIGHTS.deadlineUrgency * 100 +
    factors.userImportance * PRIORITY_WEIGHTS.userImportance * 100 +
    factors.dependencyImpact * PRIORITY_WEIGHTS.dependencyImpact * 100 +
    factors.historicalPattern * PRIORITY_WEIGHTS.historicalPattern * 100 +
    factors.estimatedEffort * PRIORITY_WEIGHTS.estimatedEffort * 100 +
    factors.contextRelevance * PRIORITY_WEIGHTS.contextRelevance * 100
  );
  
  // Eisenhower matrisi kategorisi
  const recommendation = getEisenhowerCategory(factors);
  
  // Önerilen zaman
  const suggestedTime = calculateSuggestedTime(todo, factors, userContext);
  
  // Açıklama
  const reasoning = generateReasoning(factors, score);
  
  return {
    score,
    factors,
    recommendation,
    suggestedTime,
    reasoning
  };
};

/**
 * Eisenhower matrisine göre kategori belirle
 */
const getEisenhowerCategory = (factors: PriorityFactors): SmartPriority['recommendation'] => {
  const isUrgent = factors.deadlineUrgency > 0.6;
  const isImportant = factors.userImportance > 0.6 || factors.dependencyImpact > 0.6;
  
  if (isUrgent && isImportant) return 'urgent';      // Acil ve Önemli → Hemen yap
  if (!isUrgent && isImportant) return 'schedule';   // Önemli ama Acil değil → Planla
  if (isUrgent && !isImportant) return 'delegate';   // Acil ama Önemli değil → Devret/Basitleştir
  
  return 'eliminate'; // Ne Acil ne Önemli → Gerçekten gerekli mi?
};

/**
 * Görev için en uygun zamanı öner
 */
const calculateSuggestedTime = (
  todo: Todo, 
  factors: PriorityFactors, 
  userContext: UserContext
): string | undefined => {
  if (todo.datetime) return undefined; // Zaten zamanlanmış
  
  const now = new Date();
  
  // Çok acil ise hemen
  if (factors.deadlineUrgency > 0.8) {
    return now.toISOString();
  }
  
  // Üretken saatlerde planla
  const productiveHours = userContext.workingHours.mostProductiveHours;
  if (productiveHours.length > 0) {
    const nextProductiveHour = productiveHours.find(h => h > now.getHours());
    
    if (nextProductiveHour) {
      const suggested = new Date(now);
      suggested.setHours(nextProductiveHour, 0, 0, 0);
      return suggested.toISOString();
    }
  }
  
  // Yarın sabah
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.toISOString();
};

/**
 * Önceliklendirme için açıklama oluştur
 */
const generateReasoning = (factors: PriorityFactors, score: number): string => {
  const reasons: string[] = [];
  
  if (factors.deadlineUrgency > 0.7) {
    reasons.push('⏰ Deadline çok yakın');
  }
  
  if (factors.userImportance > 0.7) {
    reasons.push('⭐ Yüksek öncelikli görev');
  }
  
  if (factors.dependencyImpact > 0.7) {
    reasons.push('🔗 Başka görevleri etkiliyor');
  }
  
  if (factors.historicalPattern > 0.7) {
    reasons.push('📊 Alışkanlıklarınıza uygun');
  }
  
  if (factors.estimatedEffort > 0.7) {
    reasons.push('⚡ Hızlı tamamlanabilir');
  }
  
  if (factors.contextRelevance > 0.7) {
    reasons.push('🎯 Şu anki bağlama uygun');
  }
  
  if (reasons.length === 0) {
    return `Öncelik skoru: ${score}/100`;
  }
  
  return reasons.join(' • ');
};

// ==================== BATCH PRIORITIZATION ====================

/**
 * Tüm görevleri önceliklendir ve sırala
 */
export const prioritizeAllTasks = (
  todos: Todo[],
  userContext: UserContext,
  dependencies: TaskDependency[] = []
): Array<{ todo: Todo; priority: SmartPriority }> => {
  // Her görev için öncelik hesapla
  const prioritized = todos
    .filter(t => !t.completed) // Sadece tamamlanmamış görevler
    .map(todo => ({
      todo,
      priority: calculateSmartPriority(todo, todos, userContext, dependencies)
    }));
  
  // Skora göre sırala (yüksekten düşüğe)
  return prioritized.sort((a, b) => b.priority.score - a.priority.score);
};

/**
 * Günün öncelikli görevlerini al (Top N)
 */
export const getTopPriorityTasks = (
  todos: Todo[],
  userContext: UserContext,
  dependencies: TaskDependency[] = [],
  topN: number = 3
): Array<{ todo: Todo; priority: SmartPriority }> => {
  const prioritized = prioritizeAllTasks(todos, userContext, dependencies);
  return prioritized.slice(0, topN);
};

/**
 * Görev öncelik durumu analizi
 */
export const analyzePriorityDistribution = (
  todos: Todo[],
  userContext: UserContext,
  dependencies: TaskDependency[] = []
): {
  urgent: number;
  important: number;
  schedule: number;
  delegate: number;
  eliminate: number;
} => {
  const prioritized = prioritizeAllTasks(todos, userContext, dependencies);
  
  const distribution = {
    urgent: 0,
    important: 0,
    schedule: 0,
    delegate: 0,
    eliminate: 0
  };
  
  prioritized.forEach(({ priority }) => {
    distribution[priority.recommendation]++;
  });
  
  return distribution;
};

// ==================== EXPORTS ====================

export const smartPriorityService = {
  calculateSmartPriority,
  prioritizeAllTasks,
  getTopPriorityTasks,
  analyzePriorityDistribution
};
