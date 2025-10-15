import { Todo, Note, DashboardStats, DayStat, CategoryStats, TimeAnalysis, PeriodicReport } from '../types';
import { 
  supabase, 
  archiveUpsertNotes, 
  archiveUpsertTodos, 
  archiveFetchByDate, 
  archiveSearch,
  unarchiveTodos as unarchiveTodosSupabase,
  unarchiveNotes as unarchiveNotesSupabase,
  batchArchiveTodos,
  batchArchiveNotes
} from './supabaseClient';

// ==================== HELPER FUNCTIONS ====================

// Helper: Get current user ID - Should be passed from component using useAuth()
// This function is only used as fallback when userId is not provided
const getCurrentUserId = (): string => {
  console.warn('[Archive] ⚠️ getCurrentUserId called without userId parameter. This should be passed from component.');
  return 'guest';
};

// Helper: UUID kontrolü (guest modunu ve hatalı ID'leri ayıkla)
const isUuid = (value?: string | null): boolean => {
  if (!value) return false;
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return re.test(value);
};

const isSupabaseOn = () => !!supabase;

// Helper: Supabase kullanılabilir mi ve kullanıcı geçerli mi kontrol et
const canUseSupabase = (userId: string): boolean => {
  const hasSupabase = isSupabaseOn();
  const validUser = isUuid(userId);
  
  if (!hasSupabase) {
    console.warn('[Archive] Supabase not configured');
    return false;
  }
  
  if (!validUser) {
    console.warn(`[Archive] ⚠️ Guest mode detected (userId: ${userId}). Archive features require authentication.`);
    return false;
  }
  
  return true;
};

// ==================== TYPES ====================

export interface ArchiveFilters {
  categories?: string[];
  priorities?: string[];
  dateRange?: { start: Date; end: Date };
  completed?: boolean;
  hasAIMetadata?: boolean;
  olderThan?: number; // days
  searchText?: string;
  limit?: number;
}

export interface BatchArchiveOptions {
  batchSize?: number;
  filters?: ArchiveFilters;
  progressCallback?: (current: number, total: number) => void;
}

// ==================== FILTER HELPERS ====================

const applyFiltersToTodos = (todos: Todo[], filters: ArchiveFilters): Todo[] => {
  let filtered = [...todos];
  
  // Kategori filtresi
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(todo => {
      const category = todo.aiMetadata?.category || 'Kategorizsiz';
      return filters.categories!.includes(category);
    });
  }
  
  // Öncelik filtresi
  if (filters.priorities && filters.priorities.length > 0) {
    filtered = filtered.filter(todo => filters.priorities!.includes(todo.priority));
  }
  
  // Tarih aralığı filtresi
  if (filters.dateRange) {
    filtered = filtered.filter(todo => {
      const createdDate = new Date(todo.createdAt);
      return createdDate >= filters.dateRange!.start && createdDate <= filters.dateRange!.end;
    });
  }
  
  // Tamamlanma durumu filtresi
  if (filters.completed !== undefined) {
    filtered = filtered.filter(todo => todo.completed === filters.completed);
  }
  
  // AI metadata filtresi
  if (filters.hasAIMetadata !== undefined) {
    filtered = filtered.filter(todo => {
      const hasAI = todo.aiMetadata && Object.keys(todo.aiMetadata).length > 0;
      return hasAI === filters.hasAIMetadata;
    });
  }
  
  // Yaş filtresi (gün olarak)
  if (filters.olderThan !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.olderThan);
    filtered = filtered.filter(todo => new Date(todo.createdAt) < cutoffDate);
  }
  
  // Metin araması
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    filtered = filtered.filter(todo => 
      todo.text.toLowerCase().includes(searchLower) ||
      (todo.aiMetadata?.category || '').toLowerCase().includes(searchLower)
    );
  }
  
  // Limit
  if (filters.limit && filters.limit > 0) {
    filtered = filtered.slice(0, filters.limit);
  }
  
  return filtered;
};

const applyFiltersToNotes = (notes: Note[], filters: ArchiveFilters): Note[] => {
  let filtered = [...notes];
  
  // Tarih aralığı filtresi
  if (filters.dateRange) {
    filtered = filtered.filter(note => {
      const createdDate = new Date(note.createdAt);
      return createdDate >= filters.dateRange!.start && createdDate <= filters.dateRange!.end;
    });
  }
  
  // Yaş filtresi
  if (filters.olderThan !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.olderThan);
    filtered = filtered.filter(note => new Date(note.createdAt) < cutoffDate);
  }
  
  // Metin araması
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    filtered = filtered.filter(note => note.text.toLowerCase().includes(searchLower));
  }
  
  // Limit
  if (filters.limit && filters.limit > 0) {
    filtered = filtered.slice(0, filters.limit);
  }
  
  return filtered;
};

// ==================== AUTO-ARCHIVE OPERATIONS ====================

const autoArchiveCompletedTasks = async (currentTodos: Todo[], userId?: string): Promise<number> => {
  const currentUserId = userId || getCurrentUserId();
  console.log(`[Archive] Auto-archiving completed tasks for user ${currentUserId}`);
  
  if (!canUseSupabase(currentUserId)) {
    console.warn('[Archive] Cannot auto-archive in guest mode');
    return 0;
  }

  try {
    // Find completed tasks that are not yet archived
    const completedTodos = currentTodos.filter(t => t.completed && !t.isArchived);
    
    if (completedTodos.length === 0) {
      console.log('[Archive] No completed tasks to auto-archive');
      return 0;
    }
    
    console.log(`[Archive] Auto-archiving ${completedTodos.length} completed tasks`);
    
    // Archive the completed tasks
    await archiveUpsertTodos(currentUserId, completedTodos);
    
    // Mark tasks as archived to prevent re-archiving
    // This is a client-side flag, you might want to add an archived flag to your DB schema
    completedTodos.forEach(todo => {
      todo.isArchived = true;
    });
    
    console.log(`[Archive] ✅ Successfully auto-archived ${completedTodos.length} completed tasks`);
    return completedTodos.length;
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to auto-archive completed tasks:', error);
    return 0;
  }
};

// ==================== ARCHIVE OPERATIONS ====================

const archiveItems = async (todos: Todo[], notes: Note[], userId?: string, options?: BatchArchiveOptions): Promise<void> => {
  const currentUserId = userId || getCurrentUserId();
  console.log(`[Archive] Starting archive for user ${currentUserId}: ${todos.length} todos, ${notes.length} notes`);

  if (!canUseSupabase(currentUserId)) {
    throw new Error('⚠️ Arşivleme için giriş yapmanız gerekiyor. Lütfen hesabınıza giriş yapın.');
  }

  try {
    // Filtreleri uygula
    let filteredTodos = todos;
    let filteredNotes = notes;
    
    if (options?.filters) {
      filteredTodos = applyFiltersToTodos(todos, options.filters);
      filteredNotes = applyFiltersToNotes(notes, options.filters);
    }
    
    // Batch işlem kullan
    const batchSize = options?.batchSize || 100;
    
    if (filteredTodos.length > batchSize || filteredNotes.length > batchSize) {
      console.log(`[Archive] Using batch processing (batch size: ${batchSize})`);
      
      await Promise.all([
        batchArchiveTodos(currentUserId, filteredTodos, batchSize),
        batchArchiveNotes(currentUserId, filteredNotes, batchSize),
      ]);
      
      // Progress callback
      if (options?.progressCallback) {
        options.progressCallback(filteredTodos.length + filteredNotes.length, todos.length + notes.length);
      }
    } else {
      // Normal arşivleme (küçük veri setleri için)
      await Promise.all([
        archiveUpsertTodos(currentUserId, filteredTodos),
        archiveUpsertNotes(currentUserId, filteredNotes),
      ]);
    }
    
    console.log(`[Archive] ✅ Successfully archived ${filteredTodos.length} todos and ${filteredNotes.length} notes for user ${currentUserId}`);
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to archive items:', error);
    throw new Error(`Arşivleme başarısız: ${error?.message || 'Bilinmeyen hata'}`);
  }
};

const getArchivedItemsForDate = async (date: string, userId?: string): Promise<{ todos: Todo[], notes: Note[] }> => {
  const currentUserId = userId || getCurrentUserId();
  console.log(`[Archive] Fetching archived items for date ${date}, user ${currentUserId}`);

  if (!canUseSupabase(currentUserId)) {
    console.warn('[Archive] Cannot fetch archive in guest mode');
    return { todos: [], notes: [] };
  }

  try {
    const result = await archiveFetchByDate(currentUserId, date);
    console.log(`[Archive] ✅ Fetched ${result.todos.length} todos, ${result.notes.length} notes for date ${date}`);
    return result;
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to fetch archived items:', error);
    return { todos: [], notes: [] };
  }
};

const searchArchive = async (query: string, userId?: string): Promise<{ todos: Todo[], notes: Note[] }> => {
  if (!query.trim()) return { todos: [], notes: [] };
  const currentUserId = userId || getCurrentUserId();
  console.log(`[Archive] Searching archive with query "${query}" for user ${currentUserId}`);

  if (!canUseSupabase(currentUserId)) {
    console.warn('[Archive] Cannot search archive in guest mode');
    return { todos: [], notes: [] };
  }

  try {
    const result = await archiveSearch(currentUserId, query);
    console.log(`[Archive] ✅ Search found ${result.todos.length} todos, ${result.notes.length} notes`);
    return result;
  } catch (error: any) {
    console.error('[Archive] ❌ Search failed:', error);
    return { todos: [], notes: [] };
  }
};

const removeNotes = async (ids: string[], userId: string): Promise<void> => {
  if (!ids.length) return;
  
  if (!canUseSupabase(userId)) {
    throw new Error('⚠️ Not silme için giriş yapmanız gerekiyor.');
  }

  try {
    await supabase!.from('archived_notes').delete().eq('user_id', userId).in('id', ids);
    console.log(`[Archive] ✅ Removed ${ids.length} notes from archive`);
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to remove notes:', error);
    throw error;
  }
};

const removeTodos = async (ids: string[], userId: string): Promise<void> => {
  if (!ids.length) return;
  
  if (!canUseSupabase(userId)) {
    throw new Error('⚠️ Todo silme için giriş yapmanız gerekiyor.');
  }

  try {
    await supabase!.from('archived_todos').delete().eq('user_id', userId).in('id', ids);
    console.log(`[Archive] ✅ Removed ${ids.length} todos from archive`);
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to remove todos:', error);
    throw error;
  }
};

const deleteArchivedItems = async (todoIds: string[], noteIds: string[], userId: string): Promise<{ todosDeleted: number; notesDeleted: number }> => {
  if (!canUseSupabase(userId)) {
    throw new Error('⚠️ Arşivden silme için giriş yapmanız gerekiyor.');
  }

  try {
    await Promise.all([
      todoIds.length ? supabase!.from('archived_todos').delete().eq('user_id', userId).in('id', todoIds) : Promise.resolve(null),
      noteIds.length ? supabase!.from('archived_notes').delete().eq('user_id', userId).in('id', noteIds) : Promise.resolve(null),
    ]);
    console.log(`[Archive] ✅ Deleted ${todoIds.length} todos and ${noteIds.length} notes from archive`);
    return { todosDeleted: todoIds.length, notesDeleted: noteIds.length };
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to delete items:', error);
    throw new Error(`Arşivden silme başarısız: ${error?.message || 'Bilinmeyen hata'}`);
  }
};

const getAllArchivedItems = async (userId?: string): Promise<{ todos: Todo[], notes: Note[] }> => {
  const currentUserId = userId || getCurrentUserId();
  console.log(`[Archive] Fetching all archived items for user ${currentUserId}`);

  if (!canUseSupabase(currentUserId)) {
    console.warn('[Archive] Cannot fetch all archives in guest mode');
    return { todos: [], notes: [] };
  }

  try {
    const [tRes, nRes] = await Promise.all([
      supabase!.from('archived_todos').select('*').eq('user_id', currentUserId),
      supabase!.from('archived_notes').select('*').eq('user_id', currentUserId),
    ]);
    
    const todos = (tRes.data || []).map((row: any) => ({
      ...row,
      createdAt: row.created_at ?? row.createdAt,
      archivedAt: row.archived_at ?? row.archivedAt,
      userId: row.user_id ?? row.userId,
      completed: true,
    }));
    
    const notes = (nRes.data || []).map((row: any) => ({
      ...row,
      createdAt: row.created_at ?? row.createdAt,
      archivedAt: row.archived_at ?? row.archivedAt,
      userId: row.user_id ?? row.userId,
      imageUrl: row.image_url ?? row.imageUrl,
    }));
    
    console.log(`[Archive] ✅ Fetched ${todos.length} todos, ${notes.length} notes`);
    return { todos, notes };
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to fetch all archived items:', error);
    return { todos: [], notes: [] };
  }
};

const clearOldArchives = async (daysToKeep: number = 90, userId?: string): Promise<number> => {
  const currentUserId = userId || getCurrentUserId();
  if (!canUseSupabase(currentUserId)) {
    throw new Error('⚠️ Eski arşivleri temizlemek için giriş yapmanız gerekiyor.');
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();
    
    console.log(`[Archive] Clearing archives older than ${cutoffDate.toLocaleDateString('tr-TR')}`);

    await Promise.all([
      supabase!.from('archived_todos').delete().lt('archived_at', cutoffISO),
      supabase!.from('archived_notes').delete().lt('archived_at', cutoffISO),
    ]);
    
    console.log('[Archive] ✅ Old archived items cleared');
    return 0; // Supabase doesn't return count
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to clear old archives:', error);
    throw error;
  }
};

// ==================== STATISTICS & ANALYTICS ====================

const getDashboardStats = async (currentTodos: Todo[], userId?: string): Promise<DashboardStats> => {
  const currentUserId = userId || getCurrentUserId();

  let archivedTodos: { created_at: string; completed: boolean }[] = [];
  
  if (canUseSupabase(currentUserId)) {
    try {
      const tRes = await supabase!
        .from('archived_todos')
        .select('id, created_at')
        .eq('user_id', currentUserId);
      archivedTodos = (tRes.data || []).map((r: any) => ({
        created_at: r.created_at || new Date().toISOString(),
        completed: true
      }));
    } catch (error) {
      console.warn('[Archive] Failed to fetch archived todos for stats:', error);
    }
  }

  // Exclude locally deleted tasks from current stats
  const currentActive = currentTodos.filter(t => !t.isDeleted);
  const currentCompleted = currentActive.filter(t => t.completed);
  
  const completedTasksDates = [
    ...currentCompleted.map(t => t.createdAt),
    ...archivedTodos.filter(t => t.completed).map(t => t.created_at),
  ];

  // Calculate total completed
  const totalCompleted = completedTasksDates.length;

  // Calculate streak based on completed tasks
  const completionDates = new Set(
    completedTasksDates.map(d => new Date(d).toISOString().split('T')[0])
  );
  
  let currentStreak = 0;
  const today = new Date();
  if (completionDates.has(today.toISOString().split('T')[0])) {
    currentStreak = 1;
    let previousDay = new Date(today);
    previousDay.setDate(today.getDate() - 1);
    while (completionDates.has(previousDay.toISOString().split('T')[0])) {
      currentStreak++;
      previousDay.setDate(previousDay.getDate() - 1);
    }
  }

  // Calculate last 7 days activity - count ALL created tasks (completed or not)
  const last7Days: DayStat[] = [];
  const dateCounts = new Map<string, number>();

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dateCounts.set(dateStr, 0);
  }
  
  // Count all tasks created in last 7 days (not just completed)
  const allTasksDates = [
    ...currentActive.map(t => t.createdAt),
    ...archivedTodos.map(t => t.created_at),
  ];
  
  allTasksDates.forEach(dateStrRaw => {
    const taskDateStr = new Date(dateStrRaw).toISOString().split('T')[0];
    if (dateCounts.has(taskDateStr)) {
      dateCounts.set(taskDateStr, (dateCounts.get(taskDateStr) || 0) + 1);
    }
  });
  
  for (const [date, count] of dateCounts.entries()) {
    last7Days.push({ date, count });
  }
  last7Days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { totalCompleted, currentStreak, last7Days };
};

const checkDatabaseHealth = async (userId?: string): Promise<{
  isHealthy: boolean;
  todoCount: number;
  noteCount: number;
  totalItems: number;
  estimatedSizeMB: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  const currentUserId = userId || getCurrentUserId();

  if (!canUseSupabase(currentUserId)) {
    errors.push('Guest mode - Supabase unavailable');
    return {
      isHealthy: false,
      todoCount: 0,
      noteCount: 0,
      totalItems: 0,
      estimatedSizeMB: 0,
      errors
    };
  }

  try {
    const [tRes, nRes] = await Promise.all([
      supabase!.from('archived_todos').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId),
      supabase!.from('archived_notes').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId),
    ]);
    
    const todoCount = tRes.count || 0;
    const noteCount = nRes.count || 0;
    const totalItems = todoCount + noteCount;
    const estimatedSizeMB = (totalItems * 1024) / (1024 * 1024);
    
    console.log(`[Archive Health] Todos: ${todoCount}, Notes: ${noteCount}, Size: ${estimatedSizeMB.toFixed(2)} MB`);
    
    return { isHealthy: true, todoCount, noteCount, totalItems, estimatedSizeMB, errors };
  } catch (error: any) {
    console.error('[Archive Health] Health check failed:', error);
    errors.push(error.message || 'Unknown error');
    return {
      isHealthy: false,
      todoCount: 0,
      noteCount: 0,
      totalItems: 0,
      estimatedSizeMB: 0,
      errors
    };
  }
};

const exportArchive = async (): Promise<string> => {
  const currentUserId = getCurrentUserId();
  if (!canUseSupabase(currentUserId)) {
    throw new Error('⚠️ Arşivi dışa aktarmak için giriş yapmanız gerekiyor.');
  }

  try {
    console.log('[Archive] Starting export...');
    
    const [tRes, nRes] = await Promise.all([
      supabase!.from('archived_todos').select('*'),
      supabase!.from('archived_notes').select('*'),
    ]);
    
    const todos = (tRes.data || []).map((row: any) => ({
      ...row,
      createdAt: row.created_at ?? row.createdAt,
      archivedAt: row.archived_at ?? row.archivedAt,
      userId: row.user_id ?? row.userId,
    }));
    
    const notes = (nRes.data || []).map((row: any) => ({
      ...row,
      createdAt: row.created_at ?? row.createdAt,
      archivedAt: row.archived_at ?? row.archivedAt,
      userId: row.user_id ?? row.userId,
      imageUrl: row.image_url ?? row.imageUrl,
    }));
    
    const exportData = {
      version: 2,
      exportDate: new Date().toISOString(),
      appName: 'EchoDay',
      todoCount: todos.length,
      noteCount: notes.length,
      todos,
      notes
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    console.log(`[Archive] ✅ Export completed: ${todos.length} todos, ${notes.length} notes`);
    return jsonString;
  } catch (error: any) {
    console.error('[Archive] ❌ Export failed:', error);
    throw new Error(`Arşiv dışa aktarılamadı: ${error?.message || error}`);
  }
};

const importArchive = async (jsonData: string): Promise<{ todosImported: number; notesImported: number }> => {
  const currentUserId = getCurrentUserId();
  if (!canUseSupabase(currentUserId)) {
    throw new Error('⚠️ Arşivi içe aktarmak için giriş yapmanız gerekiyor.');
  }

  try {
    console.log('[Archive] Starting import...');
    
    const data = JSON.parse(jsonData);
    
    // Validate data structure
    if (!data.version || !Array.isArray(data.todos) || !Array.isArray(data.notes)) {
      throw new Error('Geçersiz arşiv formatı. Lütfen geçerli bir arşiv dosyası seçin.');
    }
    
    console.log(`[Archive] Importing ${data.todos.length} todos and ${data.notes.length} notes...`);

    await Promise.all([
      archiveUpsertTodos(currentUserId, data.todos || []),
      archiveUpsertNotes(currentUserId, data.notes || []),
    ]);
    
    console.log('[Archive] ✅ Import completed successfully');
    return { todosImported: data.todos.length, notesImported: data.notes.length };
  } catch (error: any) {
    console.error('[Archive] ❌ Import failed:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Geçersiz JSON formatı. Dosya bozulmuş olabilir.');
    }
    throw new Error(`Arşiv içe aktarılamadı: ${error.message || error}`);
  }
};

// ==================== ADVANCED ANALYTICS ====================

const getCategoryStats = async (currentTodos: Todo[], userId?: string): Promise<CategoryStats[]> => {
  const currentUserId = userId || getCurrentUserId();
  console.log(`[Archive] Calculating category stats for user ${currentUserId}...`);

  let archivedTodos: Todo[] = [];
  
  if (canUseSupabase(currentUserId)) {
    try {
      const tRes = await supabase!.from('archived_todos').select('*').eq('user_id', currentUserId);
      archivedTodos = (tRes.data || []).map((row: any) => ({
        id: row.id,
        text: row.text || '',
        priority: 'medium' as any,
        datetime: row.datetime || null,
        completed: true,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (error) {
      console.warn('[Archive] Failed to fetch archived todos for category stats:', error);
    }
  }

  // Exclude locally deleted tasks from current list; keep archived history
  const allTodos = [...currentTodos.filter(t => !t.isDeleted), ...archivedTodos];
  
  // Group by category
  const categoryMap = new Map<string, { todos: Todo[]; completed: Todo[] }>();
  
  allTodos.forEach(todo => {
    const category = 'Kategorizsiz'; // aiMetadata artık kullanılmıyor
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { todos: [], completed: [] });
    }
    
    const catData = categoryMap.get(category)!;
    catData.todos.push(todo);
    if (todo.completed) {
      catData.completed.push(todo);
    }
  });
  
  // Calculate stats for each category
  const stats: CategoryStats[] = [];
  
  categoryMap.forEach((data, category) => {
    const totalTasks = data.todos.length;
    const completedTasks = data.completed.length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    
    // Calculate completion times
    let totalTimeSpent = 0;
    let taskCount = 0;
    
    data.completed.forEach(todo => {
      if (todo.datetime && todo.createdAt) {
        const created = new Date(todo.createdAt);
        const scheduled = new Date(todo.datetime);
        const timeDiff = Math.abs(scheduled.getTime() - created.getTime()) / (1000 * 60); // Minutes
        
        // Only count reasonable time ranges (0-7 days)
        if (timeDiff <= 10080) {
          totalTimeSpent += timeDiff;
          taskCount++;
        }
      }
    });
    
    const averageCompletionTime = taskCount > 0 ? totalTimeSpent / taskCount : 0;
    
    // Last task date
    const lastTaskDate = data.todos.length > 0
      ? data.todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
      : new Date().toISOString();
    
    stats.push({
      category,
      totalTasks,
      completedTasks,
      completionRate,
      averageCompletionTime,
      totalTimeSpent,
      lastTaskDate
    });
  });
  
  // Sort by total tasks
  stats.sort((a, b) => b.totalTasks - a.totalTasks);
  
  console.log('[Archive] ✅ Category stats calculated:', stats.length, 'categories');
  return stats;
};

const getTimeAnalysis = async (currentTodos: Todo[], userId?: string): Promise<TimeAnalysis> => {
  const currentUserId = userId || getCurrentUserId();
  console.log(`[Archive] Analyzing time data for user ${currentUserId}...`);

  let archivedTodos: Todo[] = [];
  
  if (canUseSupabase(currentUserId)) {
    try {
      const tRes = await supabase!.from('archived_todos').select('*').eq('user_id', currentUserId);
      archivedTodos = (tRes.data || []).map((row: any) => ({
        id: row.id,
        text: row.text || '',
        priority: 'medium' as any,
        datetime: row.datetime || null,
        completed: true,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (error) {
      console.warn('[Archive] Failed to fetch archived todos for time analysis:', error);
    }
  }

  // Exclude locally deleted tasks from current; keep archived history
  const allCompletedTodos = [...currentTodos.filter(t => !t.isDeleted), ...archivedTodos].filter(t => t.completed);
  
  const completionTimes: { todo: Todo; time: number }[] = [];
  const categoryTimes = new Map<string, number[]>();
  
  let under15min = 0;
  let between15and60min = 0;
  let between1and3hours = 0;
  let over3hours = 0;
  
  allCompletedTodos.forEach(todo => {
    if (todo.datetime && todo.createdAt) {
      const created = new Date(todo.createdAt);
      const scheduled = new Date(todo.datetime);
      const timeDiff = Math.abs(scheduled.getTime() - created.getTime()) / (1000 * 60);
      
      // Only count reasonable ranges (0-7 days)
      if (timeDiff <= 10080) {
        completionTimes.push({ todo, time: timeDiff });
        
        // Category average
        const category = 'Kategorizsiz'; // aiMetadata artık kullanılmıyor
        if (!categoryTimes.has(category)) {
          categoryTimes.set(category, []);
        }
        categoryTimes.get(category)!.push(timeDiff);
        
        // Time distribution
        if (timeDiff < 15) under15min++;
        else if (timeDiff < 60) between15and60min++;
        else if (timeDiff < 180) between1and3hours++;
        else over3hours++;
      }
    }
  });
  
  // Average completion time
  const averageCompletionTime = completionTimes.length > 0
    ? completionTimes.reduce((sum, ct) => sum + ct.time, 0) / completionTimes.length
    : 0;
  
  // Fastest and slowest tasks
  const sorted = [...completionTimes].sort((a, b) => a.time - b.time);
  const fastestTask = sorted.length > 0
    ? {
        id: sorted[0].todo.id,
        text: sorted[0].todo.text,
        completionTime: sorted[0].time,
        category: sorted[0].todo.aiMetadata?.category
      }
    : null;
  
  const slowestTask = sorted.length > 0
    ? {
        id: sorted[sorted.length - 1].todo.id,
        text: sorted[sorted.length - 1].todo.text,
        completionTime: sorted[sorted.length - 1].time,
        category: sorted[sorted.length - 1].todo.aiMetadata?.category
      }
    : null;
  
  // Category averages
  const categoryAverages: { [category: string]: number } = {};
  categoryTimes.forEach((times, category) => {
    categoryAverages[category] = times.reduce((sum, t) => sum + t, 0) / times.length;
  });
  
  console.log('[Archive] ✅ Time analysis completed');
  return {
    averageCompletionTime,
    fastestTask,
    slowestTask,
    categoryAverages,
    timeDistribution: {
      under15min,
      between15and60min,
      between1and3hours,
      over3hours
    }
  };
};

const getPeriodicReport = async (period: 'week' | 'month', currentTodos: Todo[], userId?: string): Promise<PeriodicReport> => {
  const currentUserId = userId || getCurrentUserId();
  console.log(`[Archive] Generating ${period} report for user ${currentUserId}...`);
  
  // Determine date range
  const endDate = new Date();
  const startDate = new Date();
  
  if (period === 'week') {
    startDate.setDate(endDate.getDate() - 7);
  } else {
    startDate.setMonth(endDate.getMonth() - 1);
  }
  
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  
  // Get todos for the specified period (user-specific) - filter by created_at, not archived_at
  let archivedTodos: Todo[] = [];
  
  if (canUseSupabase(currentUserId)) {
    try {
      const tRes = await supabase!
        .from('archived_todos')
        .select('*')
        .eq('user_id', currentUserId)
        .gte('created_at', startISO)
        .lte('created_at', endISO);
      archivedTodos = (tRes.data || []).map((row: any) => ({
        id: row.id,
        text: row.text || '',
        priority: row.priority || 'medium' as any,
        datetime: row.datetime || null,
        completed: row.completed ?? true,
        createdAt: row.created_at || new Date().toISOString(),
        aiMetadata: row.ai_metadata || row.aiMetadata,
      }));
    } catch (error) {
      console.warn('[Archive] Failed to fetch archived todos for periodic report:', error);
    }
  }
  
  const periodTodos = [
    // Exclude locally deleted tasks; keep archived history for the period
    ...currentTodos.filter(t => !t.isDeleted && t.createdAt >= startISO && t.createdAt <= endISO),
    ...archivedTodos
  ];
  
  const totalTasks = periodTodos.length;
  const completedTasks = periodTodos.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  
  // Category analysis
  const categoryBreakdown = await getCategoryStats(periodTodos, currentUserId);
  
  // Time analysis
  const timeAnalysis = await getTimeAnalysis(periodTodos, currentUserId);
  
  // Top categories
  const topCategories = categoryBreakdown
    .sort((a, b) => b.totalTasks - a.totalTasks)
    .slice(0, 5)
    .map(c => c.category);
  
  // Productivity score (0-100)
  const productivityScore = Math.round(
    completionRate * 40 + // Completion rate 40%
    Math.min((completedTasks / (period === 'week' ? 7 : 30)) * 20, 20) + // Daily average 20%
    Math.min((categoryBreakdown.length / 5) * 20, 20) + // Category diversity 20%
    (timeAnalysis.averageCompletionTime > 0 && timeAnalysis.averageCompletionTime < 1440 ? 20 : 10) // Time management 20%
  );
  
  // AI insights
  const insights: string[] = [];
  
  if (completionRate > 0.8) {
    insights.push('🎉 Mükemmel tamamlanma oranı! Çok başarılısınız.');
  } else if (completionRate < 0.5) {
    insights.push('⚠️ Tamamlanma oranınız düşük. Daha küçük hedefler belirlemeyi deneyin.');
  }
  
  if (timeAnalysis.averageCompletionTime < 60) {
    insights.push('⏱️ Görevlerinizi hızlı tamamlıyorsunuz. Harika zaman yönetimi!');
  }
  
  if (categoryBreakdown.length > 5) {
    insights.push('🎯 Gününüzü çeşitli alanlarda dengeli geçiriyorsunuz.');
  }
  
  if (topCategories.length > 0) {
    insights.push(`🔥 En aktif kategoriniz: ${topCategories[0]}`);
  }
  
  console.log('[Archive] ✅ Periodic report generated');
  return {
    period,
    startDate: startISO,
    endDate: endISO,
    totalTasks,
    completedTasks,
    completionRate,
    categoryBreakdown,
    timeAnalysis,
    topCategories,
    productivityScore,
    insights
  };
};

// ==================== UNARCHIVE OPERATIONS ====================

const unarchiveTodos = async (todoIds: string[], userId?: string): Promise<void> => {
  const currentUserId = userId || getCurrentUserId();
  console.log(`[Unarchive] Starting unarchive for ${todoIds.length} todos`);
  
  if (!canUseSupabase(currentUserId)) {
    throw new Error('⚠️ Arşivden geri yükleme için giriş yapmanız gerekiyor.');
  }
  
  try {
    await unarchiveTodosSupabase(currentUserId, todoIds);
    console.log(`[Unarchive] ✅ Successfully unarchived ${todoIds.length} todos`);
  } catch (error: any) {
    console.error('[Unarchive] ❌ Failed to unarchive todos:', error);
    throw new Error(`Arşivden geri yükleme başarısız: ${error?.message || 'Bilinmeyen hata'}`);
  }
};

const unarchiveNotes = async (noteIds: string[], userId?: string): Promise<void> => {
  const currentUserId = userId || getCurrentUserId();
  console.log(`[Unarchive] Starting unarchive for ${noteIds.length} notes`);
  
  if (!canUseSupabase(currentUserId)) {
    throw new Error('⚠️ Arşivden geri yükleme için giriş yapmanız gerekiyor.');
  }
  
  try {
    await unarchiveNotesSupabase(currentUserId, noteIds);
    console.log(`[Unarchive] ✅ Successfully unarchived ${noteIds.length} notes`);
  } catch (error: any) {
    console.error('[Unarchive] ❌ Failed to unarchive notes:', error);
    throw new Error(`Arşivden geri yükleme başarısız: ${error?.message || 'Bilinmeyen hata'}`);
  }
};

const getFilteredArchive = async (
  filters: ArchiveFilters, 
  userId?: string
): Promise<{ todos: Todo[], notes: Note[] }> => {
  const currentUserId = userId || getCurrentUserId();
  console.log('[Archive] Fetching filtered archive items...');
  
  if (!canUseSupabase(currentUserId)) {
    console.warn('[Archive] Cannot fetch filtered archive in guest mode');
    return { todos: [], notes: [] };
  }
  
  try {
    // Önce tüm arşivi al
    const allItems = await getAllArchivedItems(currentUserId);
    
    // Filtreleri uygula
    const filteredTodos = applyFiltersToTodos(allItems.todos, filters);
    const filteredNotes = applyFiltersToNotes(allItems.notes, filters);
    
    console.log(`[Archive] ✅ Filtered results: ${filteredTodos.length} todos, ${filteredNotes.length} notes`);
    return { todos: filteredTodos, notes: filteredNotes };
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to get filtered archive:', error);
    return { todos: [], notes: [] };
  }
};

// ==================== EXPORT ====================

const resetArchiveDatabase = async (): Promise<boolean> => {
  // Placeholder function - implement if needed
  console.warn('[Archive] resetArchiveDatabase not implemented yet');
  return false;
};

export const archiveService = {
  // Archive operations
  archiveItems,
  getArchivedItemsForDate,
  getAllArchivedItems,
  searchArchive,
  getFilteredArchive,
  autoArchiveCompletedTasks,
  
  // Unarchive operations
  unarchiveTodos,
  unarchiveNotes,
  
  // Delete operations
  removeNotes,
  removeTodos,
  deleteArchivedItems,
  clearOldArchives,
  
  // Stats & Analytics
  getDashboardStats,
  checkDatabaseHealth,
  getCategoryStats,
  getTimeAnalysis,
  getPeriodicReport,
  
  // Import/Export
  exportArchive,
  importArchive,
  resetArchiveDatabase,
};
