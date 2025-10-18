export interface WebhookConfig {
  id: string;
  name: string;
  type: WebhookType;
  url: string;
  isActive: boolean;
  events: WebhookEvent[];
  settings: WebhookSettings;
  createdAt: Date;
  lastTriggered?: Date;
}

export type WebhookType = 
  | 'slack'
  | 'discord' 
  | 'telegram'
  | 'teams'
  | 'zapier'
  | 'make'
  | 'notion'
  | 'trello'
  | 'asana'
  | 'n8n'
  | 'pabbly'
  | 'google-chat'
  | 'generic';

export type WebhookEvent = 
  | 'task_completed'
  | 'task_created'
  | 'task_updated'
  | 'goal_completed'
  | 'daily_summary'
  | 'weekly_report'
  | 'reminder_triggered';

export interface WebhookSettings {
  channel?: string;
  username?: string;
  customMessage?: string;
  includeDetails?: boolean;
  retryCount?: number;
  timeout?: number;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  user: {
    id: string;
    name: string;
  };
  data: any;
}

export interface WebhookResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  error?: string;
}

export interface WebhookTemplate {
  type: WebhookType;
  name: string;
  description: string;
  icon: string;
  briefing?: string; // Kısa bilgilendirme metni
  useCases?: string[]; // Kullanım senaryoları
  defaultSettings: WebhookSettings;
  setupInstructions: string[];
  exampleUrl: string;
}
