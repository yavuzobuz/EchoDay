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
  tags?: string[];
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
  location?: string | null; // Extracted location information (e.g. "Bostancı final okulları", "Kadıköy", "Memorial Hospital")
  isConflict?: boolean;
  // Extracted reminder information from user input
  reminderMinutesBefore?: number | null; // If user says "bir gün önce" = 1440, "1 saat önce" = 60
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

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // 1 = her gün/hafta/ay
  byWeekday?: number[]; // weekly için: 0-6 (Pazar=0)
  ends?: { type: 'never' | 'on' | 'count'; onDate?: string; count?: number };
  occurrencesDone?: number; // iç sayaç
}

// PDF Kaynak Metadata
export interface PdfSourceMetadata {
  fileName: string;
  uploadedAt: string;
  documentType?: string; // court_document, invoice, report, contract, etc.
  pageReference?: number;
  extractedData?: Record<string, any>; // Özel alanlar (mahkeme adı, dosya no, vb.)
}

// Saved location for reuse in geo reminders
export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  createdAt: string;
  usageCount: number;
  lastUsedAt?: string;
  category?: 'home' | 'work' | 'shopping' | 'education' | 'healthcare' | 'entertainment' | 'other';
}

export interface GeoReminder {
  lat: number;
  lng: number;
  radius: number; // metres
  trigger: 'enter' | 'exit' | 'near';
  address?: string;
  enabled: boolean;
  lastTriggeredAt?: string;
}

export interface Todo {
  id: string;
  text: string;
  priority: Priority;
  datetime: string | null;
  completed: boolean;
  createdAt: string;
  isDeleted?: boolean; // Soft delete flag - geçici silme için
  isArchived?: boolean; // Archive flag - arşivlendiğini takip etmek için
  aiMetadata?: AIMetadata;
  reminders?: ReminderConfig[];
  recurrence?: RecurrenceRule; // yinelenen görev
  parentId?: string; // ilk görevin id'si
  userId?: string; // Kullanıcıya özel veri için
  pdfSource?: PdfSourceMetadata; // PDF'den oluşturulan görevler için
  // Konum tabanlı hatırlatıcı (opsiyonel)
  locationReminder?: GeoReminder | null;
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
  userId?: string; // Kullanıcıya özel veri için
  pdfSource?: PdfSourceMetadata; // PDF'den oluşturulan notlar için
  isDeleted?: boolean; // Soft delete flag - geçici silme için
  isArchived?: boolean; // Archive flag - arşivlendiğini takip etmek için
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

// ==================== EMAIL ANALYSIS ====================

export interface EmailSummary {
  summary: string; // Kısa özet
  keyPoints: string[]; // Önemli noktalar
  actionItems: string[]; // Aksiyon gerektiren konular
  entities: {
    dates?: string[]; // Tespit edilen tarihler
    people?: string[]; // Kişi isimleri
    organizations?: string[]; // Kurum/şirket isimleri
    locations?: string[]; // Konum bilgileri
    amounts?: string[]; // Fiyat/tutar bilgileri
    contacts?: { // İletişim bilgileri
      phones?: string[];
      emails?: string[];
    };
  };
  suggestedTasks?: {
    text: string;
    priority: Priority;
    datetime?: string | null;
    category?: string;
    estimatedDuration?: number;
  }[];
  suggestedNotes?: {
    title: string;
    content: string;
    tags?: string[];
  }[];
  category: 'business' | 'personal' | 'invoice' | 'appointment' | 'notification' | 'marketing' | 'other';
  urgency: 'low' | 'medium' | 'high';
  confidence: number; // 0-1 arası analiz güveni
}
