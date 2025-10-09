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
  destination?: string;
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

export interface Todo {
  id: string;
  text: string;
  priority: Priority;
  datetime: string | null;
  completed: boolean;
  createdAt: string;
  aiMetadata?: AIMetadata;
}

export interface Note {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: string;
  isVoiceInput?: boolean;
}

export interface VoiceModeSettings {
  enabled: boolean;
  autoStartListening: boolean;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  preferredVoiceId?: string;
  language: string;
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

export interface DailyBriefing {
    summary: string;
    focus: string[];
    conflicts: string;
}