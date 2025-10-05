// Task Templates Service - AI öğrenen görev şablonları sistemi
import { v4 as uuidv4 } from 'uuid';
import { TaskTemplate, Todo, Priority, UserContext } from '../types';

const STORAGE_KEY = 'task_templates';
const MIN_USAGE_FOR_TEMPLATE = 3; // Şablon oluşturmak için minimum kullanım sayısı

// ==================== STORAGE ====================

/**
 * Şablonları localStorage'dan yükle
 */
export const loadTemplates = (): TaskTemplate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as TaskTemplate[];
  } catch (error) {
    console.error('Error loading templates:', error);
    return [];
  }
};

/**
 * Şablonları localStorage'a kaydet
 */
export const saveTemplates = (templates: TaskTemplate[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving templates:', error);
  }
};

// ==================== TEMPLATE CREATION ====================

/**
 * Pattern'lerden otomatik şablon oluştur
 */
export const createTemplateFromPattern = (
  pattern: UserContext['patterns'][0],
  existingTodos: Todo[]
): TaskTemplate => {
  // Pattern'e uyan görevleri bul
  const matchingTasks = existingTodos.filter(todo => 
    todo.text.toLowerCase().includes(pattern.pattern.toLowerCase())
  );
  
  // En sık kullanılan kategorileri ve özellikleri çıkar
  const categories = matchingTasks.map(t => t.aiMetadata?.category).filter(Boolean);
  const mostCommonCategory = categories.length > 0 
    ? categories.sort((a, b) => 
        categories.filter(c => c === a).length - categories.filter(c => c === b).length
      )[0] as string
    : 'Genel';
  
  // Ortalama süre
  const durations = matchingTasks
    .map(t => t.aiMetadata?.estimatedDuration)
    .filter(d => d !== undefined) as number[];
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 30;
  
  // Yol tarifi gerektiriyor mu?
  const requiresRouting = matchingTasks.some(t => t.aiMetadata?.requiresRouting);
  
  // Varsayılan öncelik
  const priorities = matchingTasks.map(t => t.priority);
  const defaultPriority = priorities.filter(p => p === Priority.High).length > priorities.length / 2
    ? Priority.High
    : Priority.Medium;
  
  return {
    id: uuidv4(),
    name: pattern.pattern,
    description: `${pattern.frequency} kez tekrarlanan görev şablonu`,
    baseTask: pattern.pattern,
    category: mostCommonCategory,
    estimatedDuration: avgDuration,
    defaultPriority,
    requiresRouting,
    defaultReminder: 15, // 15 dakika önceden
    tags: [mostCommonCategory, 'otomat'],
    usageCount: pattern.frequency,
    lastUsed: pattern.lastOccurrence,
    learnedFrom: 'user_pattern'
  };
};

/**
 * Kullanıcı bağlamından şablonlar oluştur
 */
export const generateTemplatesFromContext = (
  userContext: UserContext,
  existingTodos: Todo[]
): TaskTemplate[] => {
  const templates: TaskTemplate[] = [];
  
  // Yeterli güvenilirliğe sahip pattern'lerden şablon oluştur
  userContext.patterns.forEach(pattern => {
    if (pattern.confidence >= 0.7 && pattern.frequency >= MIN_USAGE_FOR_TEMPLATE) {
      templates.push(createTemplateFromPattern(pattern, existingTodos));
    }
  });
  
  return templates;
};

// ==================== TEMPLATE MANAGEMENT ====================

/**
 * Yeni şablon ekle veya mevcut olanı güncelle
 */
export const addOrUpdateTemplate = (template: TaskTemplate): TaskTemplate[] => {
  const templates = loadTemplates();
  
  // Aynı isimde şablon var mı?
  const existingIndex = templates.findIndex(t => 
    t.name.toLowerCase() === template.name.toLowerCase()
  );
  
  if (existingIndex >= 0) {
    // Güncelle
    templates[existingIndex] = {
      ...templates[existingIndex],
      ...template,
      usageCount: templates[existingIndex].usageCount + 1,
      lastUsed: new Date().toISOString()
    };
  } else {
    // Yeni ekle
    templates.push(template);
  }
  
  saveTemplates(templates);
  return templates;
};

/**
 * Şablon sil
 */
export const deleteTemplate = (templateId: string): TaskTemplate[] => {
  const templates = loadTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  saveTemplates(filtered);
  return filtered;
};

/**
 * Şablon kullanımını güncelle
 */
export const incrementTemplateUsage = (templateId: string): void => {
  const templates = loadTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (template) {
    template.usageCount++;
    template.lastUsed = new Date().toISOString();
    saveTemplates(templates);
  }
};

// ==================== TEMPLATE APPLICATION ====================

/**
 * Şablonu göreve uygula
 */
export const applyTemplateToTask = (
  template: TaskTemplate,
  customText?: string
): Partial<Todo> => {
  return {
    text: customText || template.baseTask,
    priority: template.defaultPriority,
    aiMetadata: {
      category: template.category,
      estimatedDuration: template.estimatedDuration,
      requiresRouting: template.requiresRouting
    }
  };
};

/**
 * Şablondan tam görev oluştur
 */
export const createTaskFromTemplate = (
  template: TaskTemplate,
  customText?: string,
  scheduledTime?: string
): Omit<Todo, 'id' | 'createdAt'> => {
  return {
    text: customText || template.baseTask,
    priority: template.defaultPriority,
    datetime: scheduledTime || null,
    completed: false,
    aiMetadata: {
      category: template.category,
      estimatedDuration: template.estimatedDuration,
      requiresRouting: template.requiresRouting
    }
  };
};

// ==================== TEMPLATE SEARCH ====================

/**
 * Görev metnine göre uygun şablon bul
 */
export const findMatchingTemplate = (taskText: string): TaskTemplate | null => {
  const templates = loadTemplates();
  const lowerText = taskText.toLowerCase();
  
  // Tam eşleşme
  const exactMatch = templates.find(t => 
    t.name.toLowerCase() === lowerText || t.baseTask.toLowerCase() === lowerText
  );
  if (exactMatch) return exactMatch;
  
  // Kısmi eşleşme
  const partialMatch = templates.find(t => 
    lowerText.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(lowerText)
  );
  
  return partialMatch || null;
};

/**
 * Kategoriye göre şablonları getir
 */
export const getTemplatesByCategory = (category: string): TaskTemplate[] => {
  const templates = loadTemplates();
  return templates.filter(t => t.category === category);
};

/**
 * En çok kullanılan şablonları getir
 */
export const getTopUsedTemplates = (limit: number = 5): TaskTemplate[] => {
  const templates = loadTemplates();
  return templates
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
};

/**
 * Son kullanılan şablonları getir
 */
export const getRecentTemplates = (limit: number = 5): TaskTemplate[] => {
  const templates = loadTemplates();
  return templates
    .filter(t => t.lastUsed)
    .sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())
    .slice(0, limit);
};

// ==================== SMART SUGGESTIONS ====================

/**
 * Görev metnine göre şablon önerisi
 */
export const suggestTemplateForTask = (taskText: string): {
  template: TaskTemplate;
  confidence: number;
  reason: string;
} | null => {
  const template = findMatchingTemplate(taskText);
  if (!template) return null;
  
  // Güven skoru hesapla
  const lowerText = taskText.toLowerCase();
  const lowerTemplate = template.name.toLowerCase();
  
  let confidence = 0;
  if (lowerText === lowerTemplate) {
    confidence = 1.0; // Tam eşleşme
  } else if (lowerText.includes(lowerTemplate) || lowerTemplate.includes(lowerText)) {
    confidence = 0.7; // Kısmi eşleşme
  } else {
    confidence = 0.5; // Zayıf eşleşme
  }
  
  // Kullanım sıklığına göre güveni artır
  if (template.usageCount > 10) confidence += 0.1;
  if (template.usageCount > 20) confidence += 0.1;
  
  const reason = template.usageCount > 5
    ? `Bu görevi ${template.usageCount} kez yaptınız. Şablon kullanarak hızlıca ekleyebilirsiniz.`
    : 'Bu görev için kayıtlı bir şablonunuz var.';
  
  return {
    template,
    confidence: Math.min(confidence, 1.0),
    reason
  };
};

/**
 * Bağlama göre şablon önerisi
 */
export const suggestTemplatesForContext = (
  userContext: UserContext,
  currentHour: number,
  currentDay: number
): TaskTemplate[] => {
  const templates = loadTemplates();
  
  return templates.filter(template => {
    // Pattern bazlı şablonlar için
    const matchingPattern = userContext.patterns.find(p => 
      p.pattern.toLowerCase() === template.name.toLowerCase()
    );
    
    if (matchingPattern) {
      // Gün uyuyor mu?
      if (matchingPattern.dayOfWeek !== undefined && matchingPattern.dayOfWeek !== currentDay) {
        return false;
      }
      
      // Saat uyuyor mu? (±2 saat)
      if (matchingPattern.timeOfDay) {
        const patternHour = parseInt(matchingPattern.timeOfDay.split(':')[0]);
        const hourDiff = Math.abs(currentHour - patternHour);
        if (hourDiff > 2) return false;
      }
      
      return true;
    }
    
    return false;
  });
};

// ==================== TEMPLATE ANALYTICS ====================

/**
 * Şablon kullanım istatistikleri
 */
export const getTemplateStats = (): {
  totalTemplates: number;
  totalUsage: number;
  averageUsage: number;
  mostUsed: TaskTemplate | null;
  leastUsed: TaskTemplate | null;
  byCategory: { [key: string]: number };
} => {
  const templates = loadTemplates();
  
  const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);
  const averageUsage = templates.length > 0 ? totalUsage / templates.length : 0;
  
  const mostUsed = templates.length > 0
    ? templates.reduce((a, b) => a.usageCount > b.usageCount ? a : b)
    : null;
  
  const leastUsed = templates.length > 0
    ? templates.reduce((a, b) => a.usageCount < b.usageCount ? a : b)
    : null;
  
  const byCategory: { [key: string]: number } = {};
  templates.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });
  
  return {
    totalTemplates: templates.length,
    totalUsage,
    averageUsage,
    mostUsed,
    leastUsed,
    byCategory
  };
};

// ==================== EXPORTS ====================

export const taskTemplatesService = {
  loadTemplates,
  saveTemplates,
  createTemplateFromPattern,
  generateTemplatesFromContext,
  addOrUpdateTemplate,
  deleteTemplate,
  incrementTemplateUsage,
  applyTemplateToTask,
  createTaskFromTemplate,
  findMatchingTemplate,
  getTemplatesByCategory,
  getTopUsedTemplates,
  getRecentTemplates,
  suggestTemplateForTask,
  suggestTemplatesForContext,
  getTemplateStats
};
