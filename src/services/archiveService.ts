import Dexie, { Table } from 'dexie';
import { Todo, Note, DashboardStats, DayStat } from '../types';

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

// Test database initialization
const initDB = async (): Promise<boolean> => {
  try {
    await db.open();
    console.log('[Archive] Dexie database initialized successfully');
    console.log('[Archive] Platform:', navigator.userAgent);
    console.log('[Archive] IndexedDB available:', 'indexedDB' in window);
    return true;
  } catch (error) {
    console.error('[Archive] Failed to initialize Dexie:', error);
    return false;
  }
};

// Initialize on load
initDB();


const archiveItems = async (todos: Todo[], notes: Note[]): Promise<void> => {
  try {
    console.log(`[Archive] Starting archive: ${todos.length} todos, ${notes.length} notes`);
    
    await db.transaction('rw', db.todos, db.notes, async () => {
      if (todos.length > 0) {
        console.log('[Archive] Archiving todos:', todos.map(t => t.text));
        await db.todos.bulkPut(todos); // ✅ Changed from bulkAdd to bulkPut for upsert
        console.log('[Archive] Todos archived successfully');
      }
      if (notes.length > 0) {
        console.log('[Archive] Archiving notes:', notes.map(n => n.text || '(image note)'));
        await db.notes.bulkPut(notes); // ✅ Changed from bulkAdd to bulkPut for upsert
        console.log('[Archive] Notes archived successfully');
      }
    });
    
    console.log(`[Archive] Archive completed: ${todos.length} todos and ${notes.length} notes archived.`);
  } catch (error: any) {
    console.error('[Archive] Failed to archive items:', error);
    console.error('[Archive] Error name:', error?.name);
    console.error('[Archive] Error message:', error?.message);
    console.error('[Archive] Error stack:', error?.stack);
    
    // User-friendly error messages
    if (error?.name === 'QuotaExceededError') {
      throw new Error('Depolama alanı doldu. Lütfen eski arşivleri temizleyin.');
    } else if (error?.name === 'ConstraintError') {
      throw new Error('Veri kaydedilirken bir kısıtlama hatası oluştu.');
    } else {
      throw new Error(`Arşivleme başarısız: ${error?.message || 'Bilinmeyen hata'}`);
    }
  }
};

const getArchivedItemsForDate = async (date: string): Promise<{ todos: Todo[], notes: Note[] }> => {
    // ✅ Use local timezone for date range to match how items are archived
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    
    console.log(`[Archive] Searching for date range: ${startISO} to ${endISO}`);

    const todos = await db.todos
        .where('createdAt')
        .between(startISO, endISO, true, true)
        .toArray();
        
    const notes = await db.notes
        .where('createdAt')
        .between(startISO, endISO, true, true)
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

const searchArchive = async (query: string): Promise<{ todos: Todo[], notes: Note[] }> => {
    if (!query.trim()) return { todos: [], notes: [] };

    const lowerCaseQuery = query.toLowerCase();
    
    // ✅ Improved search: Full-text search instead of just prefix match
    const [allTodos, allNotes] = await Promise.all([
        db.todos.toArray(),
        db.notes.toArray()
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
    await db.todos.where('id').anyOf(ids).delete();
    console.log(`[Archive] Removed ${ids.length} todos from archive`);
  } catch (error) {
    console.error('[Archive] Failed to remove todos from archive:', error);
    throw error;
  }
};

const deleteArchivedItems = async (todoIds: string[], noteIds: string[]): Promise<{ todosDeleted: number; notesDeleted: number }> => {
  try {
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

const getDashboardStats = async (currentTodos: Todo[]): Promise<DashboardStats> => {
  try {
    // ✅ Optimized: Only fetch completed todos from archive using index
    const completedArchived = await db.todos
      .where('completed')
      .equals(1)
      .toArray();
    
    const currentCompleted = currentTodos.filter(t => t.completed);
    const completedTasks = [...currentCompleted, ...completedArchived];

    // Calculate total completed
    const totalCompleted = completedTasks.length;

    // Calculate streak
    const completionDates = new Set(
      completedTasks.map(t => new Date(t.createdAt).toISOString().split('T')[0])
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
    
    completedTasks.forEach(task => {
        const taskDateStr = new Date(task.createdAt).toISOString().split('T')[0];
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

const getAllArchivedItems = async (): Promise<{ todos: Todo[], notes: Note[] }> => {
  try {
    const [todos, notes] = await Promise.all([
      db.todos.toArray(),
      db.notes.toArray()
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
    await db.open();
    
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
};
