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
});


const archiveItems = async (todos: Todo[], notes: Note[]): Promise<void> => {
  try {
    await db.transaction('rw', db.todos, db.notes, async () => {
      if (todos.length > 0) {
        await db.todos.bulkAdd(todos);
      }
      if (notes.length > 0) {
        await db.notes.bulkAdd(notes);
      }
    });
    console.log(`${todos.length} todos and ${notes.length} notes archived.`);
  } catch (error) {
    console.error("Failed to archive items:", error);
  }
};

const getArchivedItemsForDate = async (date: string): Promise<{ todos: Todo[], notes: Note[] }> => {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const todos = await db.todos
        .where('createdAt')
        .between(startDate.toISOString(), endDate.toISOString())
        .toArray();
        
    const notes = await db.notes
        .where('createdAt')
        .between(startDate.toISOString(), endDate.toISOString())
        .toArray();
        
    return { todos, notes };
};

const searchArchive = async (query: string): Promise<{ todos: Todo[], notes: Note[] }> => {
    if (!query.trim()) return { todos: [], notes: [] };

    const lowerCaseQuery = query.toLowerCase();
    const [todos, notes] = await Promise.all([
        db.todos.where('text').startsWithIgnoreCase(lowerCaseQuery).toArray(),
        db.notes.where('text').startsWithIgnoreCase(lowerCaseQuery).toArray()
    ]);

    return { todos, notes };
};

const getDashboardStats = async (currentTodos: Todo[]): Promise<DashboardStats> => {
  try {
    const archivedTodos = await db.todos.toArray();
    const allTodos = [...currentTodos, ...archivedTodos];
    const completedTasks = allTodos.filter(t => t.completed);

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

export const archiveService = {
  archiveItems,
  getArchivedItemsForDate,
  searchArchive,
  getDashboardStats,
};
