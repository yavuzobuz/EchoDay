export enum Priority {
  High = 'high',
  Medium = 'medium',
}

export interface AIMetadata {
  category?: string;
  estimatedDuration?: number;
  suggestedTime?: string;
  preparationTasks?: string[];
  relatedKeywords?: string[];
  requiresRouting?: boolean;
  destination?: string | null;
  routingOrigin?: string;
  routingInfo?: string;
  isConflict?: boolean;
}

// FIX: Define a specific type for the data returned by the task analysis AI call.
// This separates the core task properties from the extended metadata and resolves type errors.
export interface AnalyzedTaskData {
  text: string;
  priority: Priority;
  datetime?: string | null;
  category?: string;
  estimatedDuration?: number;
  requiresRouting?: boolean;
  destination?: string | null;
  isConflict?: boolean;
}

// ==================== REMINDER SYSTEM ====================

export type ReminderType = 'relative' | 'absolute';

export interface ReminderConfig {
  id: string;
  type: ReminderType;
  // For relative: minutes before the task datetime
  minutesBefore?: number;
  // For absolute: specific datetime for the reminder
  absoluteTime?: string;
  // Track if this reminder was triggered
  triggered: boolean;
  // Track snooze information
  snoozedUntil?: string;
  snoozedCount?: number;
}

export interface Todo {
  id: string;
  text: string;
  priority: Priority;
  datetime: string | null;
  completed: boolean;
  createdAt: string;
  aiMetadata?: AIMetadata;
  reminders?: ReminderConfig[];
}

export interface Note {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  // New optional fields for richer note features
  pinned?: boolean;
  favorite?: boolean;
  tags?: string[];
  color?: 'yellow' | 'blue' | 'green' | 'red' | 'purple' | 'gray';
  updatedAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface DayStat {
    date: string;
    count: number;
}

export interface DashboardStats {
  totalCompleted: number;
  currentStreak: number;
  last7Days: DayStat[];
}

// ==================== ADVANCED ANALYTICS ====================

// Kategori bazlı performans
export interface CategoryStats {
  category: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number; // 0-1
  averageCompletionTime: number; // Dakika
  totalTimeSpent: number; // Dakika
  lastTaskDate: string;
}

// Zaman analizi
export interface TimeAnalysis {
  averageCompletionTime: number; // Ortalama tamamlanma süresi (dakika)
  fastestTask: {
    id: string;
    text: string;
    completionTime: number; // Dakika
    category?: string;
  } | null;
  slowestTask: {
    id: string;
    text: string;
    completionTime: number; // Dakika
    category?: string;
  } | null;
  categoryAverages: { [category: string]: number }; // Kategori başına ortalama süre
  timeDistribution: {
    under15min: number;
    between15and60min: number;
    between1and3hours: number;
    over3hours: number;
  };
}

// Periyodik rapor
export interface PeriodicReport {
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  categoryBreakdown: CategoryStats[];
  timeAnalysis: TimeAnalysis;
  topCategories: string[]; // En çok kullanılan kategoriler
  productivityScore: number; // 0-100
  insights: string[]; // AI destekli öngörüler
  comparisonToPrevious?: {
    tasksChange: number; // Yüzde değişim
    completionRateChange: number;
    productivityChange: number;
  };
}

export interface DailyBriefing {
    summary: string;
    focus: string[];
    conflicts: string;
}

// ==================== CONTEXTUAL MEMORY SYSTEM ====================

// Kullanıcı davranış kalıpları
export interface TaskPattern {
  id: string;
  pattern: string; // Örn: "Her pazartesi spor salonu"
  frequency: number; // Kaç kez tekrarlandı
  dayOfWeek?: number; // 0-6 (Pazar-Cumartesi)
  timeOfDay?: string; // "09:00", "14:30" vb.
  category?: string;
  lastOccurrence: string; // ISO date
  confidence: number; // 0-1 arası güven skoru
}

// Kullanıcı çalışma saatleri analizi
export interface WorkingHoursProfile {
  weekdayStart: string; // "09:00"
  weekdayEnd: string; // "18:00"
  weekendStart?: string;
  weekendEnd?: string;
  mostProductiveHours: number[]; // Saat dizisi [9, 10, 14, 15]
  breakTimes: { start: string; end: string }[]; // Mola saatleri
}

// Görev tamamlama istatistikleri
export interface TaskCompletionStats {
  totalTasksCreated: number;
  totalTasksCompleted: number;
  completionRate: number; // 0-1
  averageCompletionTime: number; // Dakika cinsinden
  categoryPerformance: { [category: string]: { completed: number; total: number; rate: number } };
  timeAccuracy: number; // Tahmin edilen süre vs gerçek süre doğruluğu
}

// Kullanıcı bağlamı (hafıza sistemi)
export interface UserContext {
  userId: string;
  patterns: TaskPattern[];
  workingHours: WorkingHoursProfile;
  completionStats: TaskCompletionStats;
  preferences: {
    favoriteCategories: string[];
    averageTasksPerDay: number;
    preferredReminderTime: number; // Dakika cinsinden
  };
  lastUpdated: string;
}

// ==================== TASK DEPENDENCIES ====================

// Görev bağımlılığı
export interface TaskDependency {
  taskId: string;
  dependsOn: string[]; // Bağımlı olduğu görev ID'leri
  dependencyType: 'before' | 'after' | 'parallel'; // Önce, sonra veya paralel
  description?: string; // "X görevinden önce yapılmalı"
}

// Karmaşık komut analizi sonucu
export interface ComplexCommandResult {
  tasks: AnalyzedTaskData[];
  dependencies: TaskDependency[];
  suggestedOrder: string[]; // Önerilen görev sırası
}

// ==================== SMART PRIORITIZATION ====================

// Dinamik öncelik hesaplama faktörleri
export interface PriorityFactors {
  deadlineUrgency: number; // 0-1 (ne kadar yakın deadline)
  userImportance: number; // 0-1 (kullanıcının belirlediği önem)
  dependencyImpact: number; // 0-1 (başka görevleri etkileme derecesi)
  historicalPattern: number; // 0-1 (geçmiş davranışlara göre)
  estimatedEffort: number; // 0-1 (tahmini efor)
  contextRelevance: number; // 0-1 (şu anki bağlama uygunluk)
}

export interface SmartPriority {
  score: number; // 0-100 arası genel skor
  factors: PriorityFactors;
  recommendation: 'urgent' | 'important' | 'schedule' | 'delegate' | 'eliminate'; // Eisenhower matrisi
  suggestedTime?: string; // Önerilen yapılma zamanı
  reasoning: string; // Önceliklendirme nedeni
}

// ==================== PROACTIVE SUGGESTIONS ====================

export interface ProactiveSuggestion {
  id: string;
  type: 'task' | 'reminder' | 'optimization' | 'warning' | 'insight';
  title: string;
  description: string;
  actionable: boolean; // Kullanıcı aksiyon alabilir mi
  action?: {
    type: 'add_task' | 'reschedule' | 'break_task' | 'group_tasks';
    data: any;
  };
  priority: 'low' | 'medium' | 'high';
  expiresAt?: string; // Önerinin geçerlilik süresi
  createdAt: string;
}

// ==================== TASK TEMPLATES ====================

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  baseTask: string; // Şablon görev metni
  category: string;
  estimatedDuration: number;
  defaultPriority: Priority;
  preparationTasks?: string[]; // Ön hazırlık görevleri
  followUpTasks?: string[]; // Takip görevleri
  requiresRouting?: boolean;
  defaultReminder?: number; // Dakika cinsinden
  tags: string[];
  usageCount: number; // Kaç kez kullanıldı
  lastUsed?: string;
  learnedFrom: 'user_pattern' | 'manual'; // Nasıl oluşturuldu
}

// ==================== MULTIMODAL ENHANCEMENTS ====================

export interface ImageAnalysisResult {
  type: 'calendar' | 'invoice' | 'handwriting' | 'screenshot' | 'document' | 'other';
  extractedText?: string;
  detectedTasks?: AnalyzedTaskData[];
  detectedDates?: string[];
  detectedNumbers?: { value: number; context: string }[]; // Fatura tutarları vb.
  confidence: number;
  metadata?: {
    language?: string;
    orientation?: number;
    quality?: 'low' | 'medium' | 'high';
  };
}
