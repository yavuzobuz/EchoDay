import { TaskPattern, WorkingHoursProfile, TaskCompletionStats } from '../types';

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

export type { TaskPattern, WorkingHoursProfile, TaskCompletionStats };
