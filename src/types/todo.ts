import { Priority, AIMetadata, ReminderConfig, RecurrenceRule, GeoReminder, PdfSourceMetadata } from '../types';

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

export type { Priority, AIMetadata, ReminderConfig, RecurrenceRule, GeoReminder, PdfSourceMetadata };
