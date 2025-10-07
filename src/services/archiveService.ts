import Dexie, { Table } from 'dexie';
import { Todo, Note, DashboardStats, DayStat, CategoryStats, TimeAnalysis, PeriodicReport } from '../types';
import { supabase, archiveUpsertNotes, archiveUpsertTodos, archiveFetchByDate, archiveSearch } from './supabaseClient';

export const db = new Dexie('SmartTodoArchive') as Dexie & {
  todos: Table<Todo, string>;
  notes: Table<Note, string>;
};

// Schema version 1
db.version(1).stores({
  todos: 'id, createdAt, text',
  notes: 'id, createdAt, text',
});

// Schema version 2: Added 'completed' index for performance in stats queries.
db.version(2).stores({
  todos: 'id, createdAt, text, completed',
  notes: 'id, createdAt, text',
}).upgrade(async trans => {
  // Migration: Re-index existing data for version 2
  const todos = await trans.table('todos').toArray();
  console.log('[Archive Migration] Migrating', todos.length, 'todos to version 2');
  // Data is automatically re-indexed by Dexie
});

// Schema version 3: Added 'userId' for user-specific data
db.version(3).stores({
  todos: 'id, createdAt, text, completed, userId',
  notes: 'id, createdAt, text, userId',
}).upgrade(async _trans => {
  // Migration: Add userId to existing data
  console.log('[Archive Migration] Migrating to version 3 - adding userId field');
  // Existing data will be kept, userId field will be undefined until set
});

// Ensure database is open before any operation
const ensureDbOpen = async (): Promise<boolean> => {
  try {
    // Check if IndexedDB is available
    if (!('indexedDB' in window)) {
      console.error('[Archive] IndexedDB not available in this environment');
      return false;
    }
    
    // Check if database is already open
    if (db.isOpen()) {
      return true;
    }
    
    // Try to open the database
    await db.open();
    console.log('[Archive] ✅ Database opened successfully');
    return true;
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to open database:', error);
    console.error('[Archive] Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    return false;
  }
};

// Test database initialization
const initDB = async (): Promise<boolean> => {
  try {
    // Check if IndexedDB is available
    if (!('indexedDB' in window)) {
      throw new Error('IndexedDB not available');
    }
    
    // Try to open the database
    await db.open();
    console.log('[Archive] ✅ Dexie database initialized successfully');
    console.log('[Archive] Platform:', navigator.userAgent);
    console.log('[Archive] Database name:', db.name);
    console.log('[Archive] Version:', db.verno);
    return true;
  } catch (error: any) {
    console.error('[Archive] ❌ Failed to initialize Dexie:', error);
    console.error('[Archive] Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    return false;
  }
};

// Initialize on load with retry
const initializeDatabase = async () => {
  console.log('[Archive] Starting database initialization...');
  const success = await initDB();
  if (!success) {
    console.warn('[Archive] ⚠️ Database initialization failed. Archive features will be limited.');
  }
};

// Skip Dexie init if Supabase archive is on (especially for Electron)
// isSupabaseOn defined below; use runtime check against 'supabase' directly to avoid hoisting issues
if (!supabase) {
  initializeDatabase();
}

// Helper: Get current user ID from AuthContext or localStorage
const getCurrentUserId = (): string => {
  // Try to get from Supabase session first
  try {
    const supabaseUser = localStorage.getItem('sb-sdtntnqcdyjhzlhgbofp-auth-token');
    if (supabaseUser) {
      const userData = JSON.parse(supabaseUser);
      if (userData?.user?.id) return userData.user.id;
    }
  } catch (e) {
    console.warn('[Archive] Could not parse Supabase auth token');
  }
  
  // Fallback to 'guest'
  return 'guest';
};

const isSupabaseOn = () => !!supabase;

const archiveItems = async (todos: Todo[], notes: Note[], userId?: string): Promise<void> => {
  try {
    const currentUserId = userId || getCurrentUserId();
    console.log(`[Archive] Starting archive for user ${currentUserId}: ${todos.length} todos, ${notes.length} notes`);

    if (isSupabaseOn() && currentUserId !== 'guest') {
      try {
        // Prefer Supabase-based archive
        await Promise.all([
          archiveUpsertTodos(currentUserId, todos),
          archiveUpsertNotes(currentUserId, notes),
        ]);
        console.log('[Archive] Archived to Supabase successfully');
        return;
      } catch (e) {
        console.warn('[Archive] Supabase archive failed, falling back to IndexedDB:', e);
        // continue to fallback
      }
    }

    // Fallback: IndexedDB (Dexie)
    const isOpen = await ensureDbOpen();
    if (!isOpen) throw new Error('Database could not be opened');

    await db.transaction('rw', db.todos, db.notes, async () => {
      if (todos.length > 0) {
        const todosWithUserId = todos.map(t => ({ ...t, userId: currentUserId }));
        await db.todos.bulkPut(todosWithUserId);
      }
      if (notes.length > 0) {
        const notesWithUserId = notes.map(n => ({ ...n, userId: currentUserId }));
        await db.notes.bulkPut(notesWithUserId);
      }
    });
  } catch (error: any) {
    console.error('[Archive] Failed to archive items:', error);
    if (error?.name === 'QuotaExceededError') {
      throw new Error('Depolama alanı doldu. Lütfen eski arşivleri temizleyin.');
    } else if (error?.name === 'ConstraintError') {
      throw new Error('Veri kaydedilirken bir kısıtlama hatası oluştu.');
    } else {
      throw new Error(`Arşivleme başarısız: ${error?.message || 'Bilinmeyen hata'}`);
    }
  }
};

const getArchivedItemsForDate = async (date: string, userId?: string): Promise<{ todos: Todo[], notes: Note[] }> => {
    const currentUserId = userId || getCurrentUserId();

    // Prefer Supabase if available
    if (isSupabaseOn() && currentUserId !== 'guest') {
      try {
        return await archiveFetchByDate(currentUserId, date);
      } catch (e) {
        console.warn('[Archive] Supabase fetch by date failed, fallback to IndexedDB:', e);
      }
    }

    // Fallback: IndexedDB (Dexie)
    const isOpen = await ensureDbOpen();
    if (!isOpen) { console.error('[Archive] Database not available for date query'); return { todos: [], notes: [] }; }
    // ✅ Use local timezone for date range to match how items are archived
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    
    console.log(`[Archive] Searching for date range: ${startISO} to ${endISO} for user ${currentUserId}`);

    const todos = await db.todos
        .where('createdAt')
        .between(startISO, endISO, true, true)
        .filter(t => t.userId === currentUserId)
        .toArray();
        
    const notes = await db.notes
        .where('createdAt')
        .between(startISO, endISO, true, true)
        .filter(n => n.userId === currentUserId)
        .toArray();
    
    console.log(`[Archive] Found ${todos.length} todos and ${notes.length} notes for date ${date}`);
    
    // Debug: Log first few items to verify dates
    if (notes.length > 0) {
        console.log('[Archive] Sample note dates:', notes.slice(0, 3).map(n => ({ id: n.id, createdAt: n.createdAt })));
    }
    if (todos.length > 0) {
        console.log('[Archive] Sample todo dates:', todos.slice(0, 3).map(t => ({ id: t.id, createdAt: t.createdAt })));
    }
    
    return { todos, notes };
};

const searchArchive = async (query: string, userId?: string): Promise<{ todos: Todo[], notes: Note[] }> => {
    if (!query.trim()) return { todos: [], notes: [] };
    const currentUserId = userId || getCurrentUserId();

    // Prefer Supabase if available
    if (isSupabaseOn() && currentUserId !== 'guest') {
      try {
        return await archiveSearch(currentUserId, query);
      } catch (e) {
        console.warn('[Archive] Supabase search failed, fallback to IndexedDB:', e);
      }
    }

    // Fallback: IndexedDB (Dexie)
    const isOpen = await ensureDbOpen();
    if (!isOpen) { console.error('[Archive] Database not available for search'); return { todos: [], notes: [] }; }
    const lowerCaseQuery = query.toLowerCase();
    
    // ✅ Improved search: Full-text search instead of just prefix match
    const [allTodos, allNotes] = await Promise.all([
        db.todos.where('userId').equals(currentUserId).toArray(),
        db.notes.where('userId').equals(currentUserId).toArray()
    ]);

    const todos = allTodos.filter(t => 
        t.text.toLowerCase().includes(lowerCaseQuery)
    );
    
    const notes = allNotes.filter(n => 
        n.text && n.text.toLowerCase().includes(lowerCaseQuery)
    );
    
    console.log(`[Archive] Search for "${query}" found ${todos.length} todos and ${notes.length} notes`);
    return { todos, notes };
};

const removeNotes = async (ids: string[]): Promise<void> => {
  try {
    if (!ids.length) return;

    if (isSupabaseOn() && supabase && getCurrentUserId() !== 'guest') {
      await supabase.from('archived_notes').delete().in('id', ids);
      console.log(`[Archive] (Supabase) Removed ${ids.length} notes from archive`);
      return;
    }
    
    // Ensure database is open
    const isOpen = await ensureDbOpen();
    if (!isOpen) {
      throw new Error('Database not available');
    }
    
    await db.notes.where('id').anyOf(ids).delete();
    console.log(`[Archive] Removed ${ids.length} notes from archive`);
  } catch (error) {
    console.error('[Archive] Failed to remove notes from archive:', error);
    throw error;
  }
};

const removeTodos = async (ids: string[]): Promise<void> => {
  try {
    if (!ids.length) return;

    if (isSupabaseOn() && supabase && getCurrentUserId() !== 'guest') {
      await supabase.from('archived_todos').delete().in('id', ids);
      console.log(`[Archive] (Supabase) Removed ${ids.length} todos from archive`);
      return;
    }
    
    // Ensure database is open
    const isOpen = await ensureDbOpen();
    if (!isOpen) {
      throw new Error('Database not available');
    }
    
    await db.todos.where('id').anyOf(ids).delete();
    console.log(`[Archive] Removed ${ids.length} todos from archive`);
  } catch (error) {
    console.error('[Archive] Failed to remove todos from archive:', error);
    throw error;
  }
};

const deleteArchivedItems = async (todoIds: string[], noteIds: string[]): Promise<{ todosDeleted: number; notesDeleted: number }> => {
  try {
    if (isSupabaseOn() && supabase && getCurrentUserId() !== 'guest') {
      await Promise.all([
        todoIds.length ? supabase.from('archived_todos').delete().in('id', todoIds) : Promise.resolve(null),
        noteIds.length ? supabase.from('archived_notes').delete().in('id', noteIds) : Promise.resolve(null),
      ]);
      console.log(`[Archive] (Supabase) Delete completed: ${todoIds.length} todos and ${noteIds.length} notes deleted`);
      return { todosDeleted: todoIds.length, notesDeleted: noteIds.length };
    }

    // Ensure database is open
    const isOpen = await ensureDbOpen();
    if (!isOpen) {
      throw new Error('Database not available');
    }
    
    console.log(`[Archive] Deleting ${todoIds.length} todos and ${noteIds.length} notes from archive`);
    
    let todosDeleted = 0;
    let notesDeleted = 0;
    
    await db.transaction('rw', db.todos, db.notes, async () => {
      if (todoIds.length > 0) {
        todosDeleted = await db.todos.where('id').anyOf(todoIds).delete();
        console.log(`[Archive] Deleted ${todosDeleted} todos`);
      }
      if (noteIds.length > 0) {
        notesDeleted = await db.notes.where('id').anyOf(noteIds).delete();
        console.log(`[Archive] Deleted ${notesDeleted} notes`);
      }
    });
    
    console.log(`[Archive] Delete completed: ${todosDeleted} todos and ${notesDeleted} notes deleted`);
    
    return { todosDeleted, notesDeleted };
  } catch (error: any) {
    console.error('[Archive] Failed to delete items:', error);
    throw new Error(`Arşivden silme başarısız: ${error?.message || 'Bilinmeyen hata'}`);
  }
};

const getDashboardStats = async (currentTodos: Todo[], userId?: string): Promise<DashboardStats> => {
  try {
    const currentUserId = userId || getCurrentUserId();

    let archivedCompletedDates: string[] = [];
    if (isSupabaseOn() && supabase && currentUserId !== 'guest') {
      const tRes = await supabase
        .from('archived_todos')
        .select('id, created_at')
        .eq('user_id', currentUserId);
      archivedCompletedDates = (tRes.data || []).map((r: any) => (r.created_at || new Date().toISOString()));
    } else {
      // Dexie fallback
      const isOpen = await ensureDbOpen();
      if (!isOpen) {
        console.error('[Archive] Database not available for dashboard stats');
        return { totalCompleted: 0, currentStreak: 0, last7Days: [] };
      }
      const completedArchived = await db.todos
        .where('completed')
        .equals(1)
        .filter(t => t.userId === currentUserId)
        .toArray();
      archivedCompletedDates = completedArchived.map(t => t.createdAt);
    }

    const currentCompleted = currentTodos.filter(t => t.completed);
    const completedTasksDates = [
      ...currentCompleted.map(t => t.createdAt),
      ...archivedCompletedDates,
    ];

// Calculate total completed
    const totalCompleted = completedTasksDates.length;

    // Calculate streak
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

// Calculate last 7 days activity
    const last7Days: DayStat[] = [];
    const dateCounts = new Map<string, number>();

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dateCounts.set(dateStr, 0);
    }
    
    completedTasksDates.forEach(dateStrRaw => {
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

  } catch (error) {
    console.error("Failed to calculate dashboard stats:", error);
    return { totalCompleted: 0, currentStreak: 0, last7Days: [] };
  }
};

const getAllArchivedItems = async (userId?: string): Promise<{ todos: Todo[], notes: Note[] }> => {
  try {
    const currentUserId = userId || getCurrentUserId();

    if (isSupabaseOn() && supabase && currentUserId !== 'guest') {
      const [tRes, nRes] = await Promise.all([
        supabase.from('archived_todos').select('*').eq('user_id', currentUserId),
        supabase.from('archived_notes').select('*').eq('user_id', currentUserId),
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
      console.log(`[Archive] (Supabase) Total archived items: ${todos.length} todos, ${notes.length} notes`);
      return { todos, notes };
    }

    // Dexie fallback
    const isOpen = await ensureDbOpen();
    if (!isOpen) {
      console.error('[Archive] Database not available');
      return { todos: [], notes: [] };
    }
    
    const [todos, notes] = await Promise.all([
      db.todos.where('userId').equals(currentUserId).toArray(),
      db.notes.where('userId').equals(currentUserId).toArray()
    ]);
    
    console.log(`[Archive] Total archived items: ${todos.length} todos, ${notes.length} notes`);
    
    return { todos, notes };
  } catch (error) {
    console.error('[Archive] Failed to get all archived items:', error);
    return { todos: [], notes: [] };
  }
};

const clearOldArchives = async (daysToKeep: number = 90): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();
    
    console.log(`[Archive] Clearing archives older than ${cutoffDate.toLocaleDateString('tr-TR')}`);

    if (isSupabaseOn() && supabase && getCurrentUserId() !== 'guest') {
      await Promise.all([
        supabase.from('archived_todos').delete().lt('archived_at', cutoffISO),
        supabase.from('archived_notes').delete().lt('archived_at', cutoffISO),
      ]);
      console.log('[Archive] (Supabase) Cleared old archived items');
      return 0;
    }

    // Dexie fallback
    const isOpen = await ensureDbOpen();
    if (!isOpen) {
      throw new Error('Database not available');
    }
    
    const deletedTodos = await db.todos
      .where('createdAt')
      .below(cutoffISO)
      .delete();
      
    const deletedNotes = await db.notes
      .where('createdAt')
      .below(cutoffISO)
      .delete();
    
    const totalDeleted = deletedTodos + deletedNotes;
    console.log(`[Archive] Cleared ${totalDeleted} old items (${deletedTodos} todos, ${deletedNotes} notes)`);
    return totalDeleted;
  } catch (error) {
    console.error('[Archive] Failed to clear old archives:', error);
    throw error;
  }
};

const checkDatabaseHealth = async (): Promise<{
  isHealthy: boolean;
  todoCount: number;
  noteCount: number;
  totalItems: number;
  estimatedSizeMB: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let todoCount = 0;
  let noteCount = 0;
  
  try {
    if (isSupabaseOn() && supabase && getCurrentUserId() !== 'guest') {
      const [tRes, nRes] = await Promise.all([
        supabase.from('archived_todos').select('*', { count: 'exact', head: true }),
        supabase.from('archived_notes').select('*', { count: 'exact', head: true }),
      ]);
      todoCount = tRes.count || 0;
      noteCount = nRes.count || 0;
      const totalItems = todoCount + noteCount;
      const estimatedSizeMB = (totalItems * 1024) / (1024 * 1024);
      return { isHealthy: true, todoCount, noteCount, totalItems, estimatedSizeMB, errors };
    }

    // Dexie fallback
    const isOpen = await ensureDbOpen();
    if (!isOpen) {
      errors.push('Database could not be opened');
      return {
        isHealthy: false,
        todoCount: 0,
        noteCount: 0,
        totalItems: 0,
        estimatedSizeMB: 0,
        errors
      };
    }
    
    [todoCount, noteCount] = await Promise.all([
      db.todos.count(),
      db.notes.count()
    ]);
    
    const totalItems = todoCount + noteCount;
    // Estimate size: ~1KB per item (conservative estimate)
    const estimatedSizeMB = (totalItems * 1024) / (1024 * 1024);
    
    console.log(`[Archive Health] Database health check completed`);
    console.log(`  - Todos: ${todoCount}`);
    console.log(`  - Notes: ${noteCount}`);
    console.log(`  - Total items: ${totalItems}`);
    console.log(`  - Estimated size: ${estimatedSizeMB.toFixed(2)} MB`);
    
    return {
      isHealthy: true,
      todoCount,
      noteCount,
      totalItems,
      estimatedSizeMB,
      errors
    };
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
  try {
    console.log('[Archive] Starting export...');

    if (isSupabaseOn() && supabase && getCurrentUserId() !== 'guest') {
      const [tRes, nRes] = await Promise.all([
        supabase.from('archived_todos').select('*'),
        supabase.from('archived_notes').select('*'),
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
      console.log(`[Archive] (Supabase) Export completed: ${todos.length} todos, ${notes.length} notes`);
      return jsonString;
    }

    // Dexie fallback
    const isOpen = await ensureDbOpen();
    if (!isOpen) {
      throw new Error('Database not available');
    }
    
    const [todos, notes] = await Promise.all([
      db.todos.toArray(),
      db.notes.toArray()
    ]);
    
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
    console.log(`[Archive] Export completed: ${todos.length} todos, ${notes.length} notes`);
    console.log(`[Archive] Export size: ${(jsonString.length / 1024).toFixed(2)} KB`);
    
    return jsonString;
  } catch (error) {
    console.error('[Archive] Export failed:', error);
    throw new Error(`Arşiv dışa aktarılamadı: ${error}`);
  }
};

const importArchive = async (jsonData: string): Promise<{ todosImported: number; notesImported: number }> => {
  try {
    console.log('[Archive] Starting import...');
    
    const data = JSON.parse(jsonData);
    
    // Validate data structure
    if (!data.version || !Array.isArray(data.todos) || !Array.isArray(data.notes)) {
      throw new Error('Geçersiz arşiv formatı. Lütfen geçerli bir arşiv dosyası seçin.');
    }
    
    console.log(`[Archive] Importing ${data.todos.length} todos and ${data.notes.length} notes...`);

    if (isSupabaseOn() && supabase && getCurrentUserId() !== 'guest') {
      const currentUserId = getCurrentUserId();
      await Promise.all([
        archiveUpsertTodos(currentUserId, data.todos || []),
        archiveUpsertNotes(currentUserId, data.notes || []),
      ]);
      console.log('[Archive] (Supabase) Import completed successfully');
      return { todosImported: data.todos.length, notesImported: data.notes.length };
    }

    // Dexie fallback
    const isOpen = await ensureDbOpen();
    if (!isOpen) {
      throw new Error('Database not available');
    }
    
    await db.transaction('rw', db.todos, db.notes, async () => {
      if (data.todos.length > 0) {
        await db.todos.bulkPut(data.todos);
      }
      if (data.notes.length > 0) {
        await db.notes.bulkPut(data.notes);
      }
    });
    
    console.log(`[Archive] Import completed successfully`);
    
    return {
      todosImported: data.todos.length,
      notesImported: data.notes.length
    };
  } catch (error: any) {
    console.error('[Archive] Import failed:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Geçersiz JSON formatı. Dosya bozulmuş olabilir.');
    }
    throw new Error(`Arşiv içe aktarılamadı: ${error.message || error}`);
  }
};

// ==================== GELİŞMİŞ ANALİTİK METODLARI ====================

/**
 * Kategori bazlı istatistikleri hesaplar
 */
const getCategoryStats = async (currentTodos: Todo[], userId?: string): Promise<CategoryStats[]> => {
  try {
    const currentUserId = userId || getCurrentUserId();
    console.log(`[Archive] Calculating category stats for user ${currentUserId}...`);

    let archivedTodos: Todo[] = [];
    if (isSupabaseOn() && supabase && currentUserId !== 'guest') {
      // Archived todos in Supabase don't carry ai metadata; will default categories
      const tRes = await supabase.from('archived_todos').select('*').eq('user_id', currentUserId);
      archivedTodos = (tRes.data || []).map((row: any) => ({
        id: row.id,
        text: row.text || '',
        priority: 'medium' as any,
        datetime: row.datetime || null,
        completed: true,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } else {
      // Dexie fallback
      const isOpen = await ensureDbOpen();
      if (!isOpen) {
        console.error('[Archive] Database not available for category stats');
        return [];
      }
      archivedTodos = await db.todos.where('userId').equals(currentUserId).toArray();
    }

    const allTodos = [...currentTodos, ...archivedTodos];
    
    // Kategorilere göre grupla
    const categoryMap = new Map<string, {
      todos: Todo[];
      completed: Todo[];
    }>();
    
    allTodos.forEach(todo => {
      const category = todo.aiMetadata?.category || 'Kategorizsyız';
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { todos: [], completed: [] });
      }
      
      const catData = categoryMap.get(category)!;
      catData.todos.push(todo);
      if (todo.completed) {
        catData.completed.push(todo);
      }
    });
    
    // Her kategori için istatistikleri hesapla
    const stats: CategoryStats[] = [];
    
    categoryMap.forEach((data, category) => {
      const totalTasks = data.todos.length;
      const completedTasks = data.completed.length;
      const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
      
      // Tamamlanma sürelerini hesapla
      let totalTimeSpent = 0;
      let taskCount = 0;
      
      data.completed.forEach(todo => {
        if (todo.datetime && todo.createdAt) {
          const created = new Date(todo.createdAt);
          const scheduled = new Date(todo.datetime);
          const timeDiff = Math.abs(scheduled.getTime() - created.getTime()) / (1000 * 60); // Dakika
          
          // Makul bir süre aralığında ise hesaba kat (0-7 gün)
          if (timeDiff <= 10080) {
            totalTimeSpent += timeDiff;
            taskCount++;
          }
        }
      });
      
      const averageCompletionTime = taskCount > 0 ? totalTimeSpent / taskCount : 0;
      
      // Son görev tarihi
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
    
    // Toplam görev sayısına göre sırala
    stats.sort((a, b) => b.totalTasks - a.totalTasks);
    
    console.log('[Archive] Category stats calculated:', stats.length, 'categories');
    return stats;
  } catch (error) {
    console.error('[Archive] Failed to calculate category stats:', error);
    return [];
  }
};

/**
 * Zaman analizi yapar
 */
const getTimeAnalysis = async (currentTodos: Todo[], userId?: string): Promise<TimeAnalysis> => {
  try {
    const currentUserId = userId || getCurrentUserId();
    console.log(`[Archive] Analyzing time data for user ${currentUserId}...`);

    let archivedTodos: Todo[] = [];
    if (isSupabaseOn() && supabase && currentUserId !== 'guest') {
      const tRes = await supabase.from('archived_todos').select('*').eq('user_id', currentUserId);
      archivedTodos = (tRes.data || []).map((row: any) => ({
        id: row.id,
        text: row.text || '',
        priority: 'medium' as any,
        datetime: row.datetime || null,
        completed: true,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } else {
      // Dexie fallback
      const isOpen = await ensureDbOpen();
      if (!isOpen) {
        console.error('[Archive] Database not available for time analysis');
        return {
          averageCompletionTime: 0,
          fastestTask: null,
          slowestTask: null,
          categoryAverages: {},
          timeDistribution: {
            under15min: 0,
            between15and60min: 0,
            between1and3hours: 0,
            over3hours: 0
          }
        };
      }
      archivedTodos = await db.todos.where('userId').equals(currentUserId).toArray();
    }
    const allCompletedTodos = [...currentTodos, ...archivedTodos].filter(t => t.completed);
    
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
        
        // Makul aralıkta ise hesaba kat (0-7 gün)
        if (timeDiff <= 10080) {
          completionTimes.push({ todo, time: timeDiff });
          
          // Kategori ortalaması
          const category = todo.aiMetadata?.category || 'Kategorizsyz';
          if (!categoryTimes.has(category)) {
            categoryTimes.set(category, []);
          }
          categoryTimes.get(category)!.push(timeDiff);
          
          // Zaman dağılımı
          if (timeDiff < 15) under15min++;
          else if (timeDiff < 60) between15and60min++;
          else if (timeDiff < 180) between1and3hours++;
          else over3hours++;
        }
      }
    });
    
    // Ortalama tamamlanma süresi
    const averageCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum, ct) => sum + ct.time, 0) / completionTimes.length
      : 0;
    
    // En hızlı ve en yavaş görevler
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
    
    // Kategori ortalamaları
    const categoryAverages: { [category: string]: number } = {};
    categoryTimes.forEach((times, category) => {
      categoryAverages[category] = times.reduce((sum, t) => sum + t, 0) / times.length;
    });
    
    console.log('[Archive] Time analysis completed');
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
  } catch (error) {
    console.error('[Archive] Failed to analyze time:', error);
    return {
      averageCompletionTime: 0,
      fastestTask: null,
      slowestTask: null,
      categoryAverages: {},
      timeDistribution: {
        under15min: 0,
        between15and60min: 0,
        between1and3hours: 0,
        over3hours: 0
      }
    };
  }
};

/**
 * Periyodik rapor oluşturur (haftalık veya aylık)
 */
const getPeriodicReport = async (period: 'week' | 'month', currentTodos: Todo[], userId?: string): Promise<PeriodicReport> => {
  try {
    const currentUserId = userId || getCurrentUserId();
    console.log(`[Archive] Generating ${period} report for user ${currentUserId}...`);
    
    // Tarih aralığını belirle
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === 'week') {
      startDate.setDate(endDate.getDate() - 7);
    } else {
      startDate.setMonth(endDate.getMonth() - 1);
    }
    
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    
    // Belirtilen periyot içindeki todoları al (kullanıcıya özel)
    let archivedTodos: Todo[] = [];
    if (isSupabaseOn() && supabase && currentUserId !== 'guest') {
      const tRes = await supabase
        .from('archived_todos')
        .select('*')
        .eq('user_id', currentUserId)
        .gte('archived_at', startISO)
        .lte('archived_at', endISO);
      archivedTodos = (tRes.data || []).map((row: any) => ({
        id: row.id,
        text: row.text || '',
        priority: 'medium' as any,
        datetime: row.datetime || null,
        completed: true,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } else {
      // Dexie fallback
      const isOpen = await ensureDbOpen();
      if (!isOpen) {
        console.error('[Archive] Database not available for periodic report');
        return {
          period,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          totalTasks: 0,
          completedTasks: 0,
          completionRate: 0,
          categoryBreakdown: [],
          timeAnalysis: {
            averageCompletionTime: 0,
            fastestTask: null,
            slowestTask: null,
            categoryAverages: {},
            timeDistribution: {
              under15min: 0,
              between15and60min: 0,
              between1and3hours: 0,
              over3hours: 0
            }
          },
          topCategories: [],
          productivityScore: 0,
          insights: []
        };
      }
      archivedTodos = await db.todos
        .where('createdAt')
        .between(startISO, endISO, true, true)
        .filter(t => t.userId === currentUserId)
        .toArray();
    }
    
    const periodTodos = [
      ...currentTodos.filter(t => t.createdAt >= startISO && t.createdAt <= endISO),
      ...archivedTodos
    ];
    
    const totalTasks = periodTodos.length;
    const completedTasks = periodTodos.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    
    // Kategori analizi
    const categoryBreakdown = await getCategoryStats(periodTodos, currentUserId);
    
    // Zaman analizi
    const timeAnalysis = await getTimeAnalysis(periodTodos, currentUserId);
    
    // En çok kullanılan kategoriler
    const topCategories = categoryBreakdown
      .sort((a, b) => b.totalTasks - a.totalTasks)
      .slice(0, 5)
      .map(c => c.category);
    
    // Verimlilik skoru (0-100)
    const productivityScore = Math.round(
      completionRate * 40 + // Tamamlanma oranı %40
      Math.min((completedTasks / (period === 'week' ? 7 : 30)) * 20, 20) + // Günlük ortalama %20
      Math.min((categoryBreakdown.length / 5) * 20, 20) + // Kategori çeşitliliği %20
      (timeAnalysis.averageCompletionTime > 0 && timeAnalysis.averageCompletionTime < 1440 ? 20 : 10) // Zaman yönetimi %20
    );
    
    // AI öngörüleri
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
    
    console.log('[Archive] Periodic report generated');
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
  } catch (error) {
    console.error('[Archive] Failed to generate periodic report:', error);
    // Varsayılan boş rapor
    return {
      period,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      categoryBreakdown: [],
      timeAnalysis: {
        averageCompletionTime: 0,
        fastestTask: null,
        slowestTask: null,
        categoryAverages: {},
        timeDistribution: {
          under15min: 0,
          between15and60min: 0,
          between1and3hours: 0,
          over3hours: 0
        }
      },
      topCategories: [],
      productivityScore: 0,
      insights: []
    };
  }
};

// Database repair: delete and recreate IndexedDB (will remove all archived items)
const resetArchiveDatabase = async (): Promise<boolean> => {
  try {
    console.warn('[Archive] ⚠️ Resetting archive database. All archived items will be deleted.');
    if (db.isOpen()) {
      db.close();
    }
    await Dexie.delete(db.name);
    // Re-open to recreate schema
    await db.open();
    console.log('[Archive] ✅ Archive database reset and reopened successfully');
    return true;
  } catch (error) {
    console.error('[Archive] ❌ Failed to reset archive database:', error);
    return false;
  }
};

export const archiveService = {
  archiveItems,
  getArchivedItemsForDate,
  getAllArchivedItems,
  searchArchive,
  getDashboardStats,
  removeNotes,
  removeTodos,
  deleteArchivedItems,
  clearOldArchives,
  checkDatabaseHealth,
  exportArchive,
  importArchive,
  // Yeni analitik metodlar
  getCategoryStats,
  getTimeAnalysis,
  getPeriodicReport,
  // Maintenance
  resetArchiveDatabase,
};
