import { Todo, Note } from '../types';
import { archiveService } from './archiveService';
import { taskAnalyticsService } from './taskAnalyticsService';

/**
 * Daily Archive Scheduler Service
 * 
 * Otomatik arşivleme ve analiz servisi
 * Her gün saat 00:00'da aktif görevleri arşivler ve AI ile analiz eder
 */

interface SchedulerConfig {
  enabled: boolean;
  archiveTime: string; // HH:MM formatında (örn: "00:00")
  archiveCompletedOnly: boolean; // Sadece tamamlananları mı arşivle
  enableAIAnalysis: boolean; // AI analizi aktif mi
}

class DailyArchiveScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private lastCheckTime: string = '';
  private config: SchedulerConfig;
  
  constructor() {
    // Varsayılan ayarları localStorage'dan yükle
    const savedConfig = this.loadConfig();
    this.config = {
      enabled: savedConfig?.enabled ?? true,
      archiveTime: savedConfig?.archiveTime ?? '00:00',
      archiveCompletedOnly: savedConfig?.archiveCompletedOnly ?? true,
      enableAIAnalysis: savedConfig?.enableAIAnalysis ?? true,
    };
    
    console.log('[DailyArchiveScheduler] Initialized with config:', this.config);
  }
  
  /**
   * Zamanlayıcıyı başlat
   */
  start() {
    if (this.intervalId) {
      console.warn('[DailyArchiveScheduler] Scheduler already running');
      return;
    }
    
    if (!this.config.enabled) {
      console.log('[DailyArchiveScheduler] Scheduler disabled in config');
      return;
    }
    
    console.log(`[DailyArchiveScheduler] Starting scheduler - Archive time: ${this.config.archiveTime}`);
    
    // Her dakika kontrol et (hafif yük)
    this.intervalId = setInterval(() => {
      this.checkAndArchive();
    }, 60000); // 60 saniye
    
    // İlk kontrolü hemen yap
    this.checkAndArchive();
  }
  
  /**
   * Zamanlayıcıyı durdur
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[DailyArchiveScheduler] Scheduler stopped');
    }
  }
  
  /**
   * Ayarları güncelle
   */
  updateConfig(newConfig: Partial<SchedulerConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    console.log('[DailyArchiveScheduler] Config updated:', this.config);
    
    // Eğer enabled değiştirilirse zamanlayıcıyı yeniden başlat
    if ('enabled' in newConfig) {
      this.stop();
      if (newConfig.enabled) {
        this.start();
      }
    }
  }
  
  /**
   * Mevcut ayarları getir
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }
  
  /**
   * Zamanı kontrol et ve gerekirse arşivle
   */
  private async checkAndArchive() {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDate = now.toISOString().split('T')[0];
      
      // Aynı gün içinde birden fazla arşivleme yapma
      if (this.lastCheckTime === currentDate) {
        return;
      }
      
      // Belirlenen saat geldi mi kontrol et
      if (currentTime === this.config.archiveTime) {
        console.log('[DailyArchiveScheduler] Archive time reached, starting daily archive...');
        await this.performDailyArchive();
        this.lastCheckTime = currentDate;
      }
    } catch (error) {
      console.error('[DailyArchiveScheduler] Error in checkAndArchive:', error);
    }
  }
  
  /**
   * Günlük arşivleme işlemini gerçekleştir
   */
  private async performDailyArchive() {
    try {
      // Kullanıcı ID'sini al
      const userId = this.getCurrentUserId();
      if (!userId || userId === 'guest') {
        console.warn('[DailyArchiveScheduler] Cannot archive in guest mode');
        return;
      }
      
      // Görevleri ve notları localStorage'dan yükle
      const todos = this.loadTodos(userId);
      const notes = this.loadNotes(userId);
      
      if (!todos || !notes) {
        console.warn('[DailyArchiveScheduler] No data found to archive');
        return;
      }
      
      // Arşivlenecek öğeleri filtrele
      let todosToArchive = todos.filter(t => !t.isDeleted);
      if (this.config.archiveCompletedOnly) {
        todosToArchive = todosToArchive.filter(t => t.completed);
      }
      
      const notesToArchive = notes.filter(n => !n.isDeleted);
      
      if (todosToArchive.length === 0 && notesToArchive.length === 0) {
        console.log('[DailyArchiveScheduler] No items to archive today');
        return;
      }
      
      console.log(`[DailyArchiveScheduler] Archiving ${todosToArchive.length} todos and ${notesToArchive.length} notes`);
      
      // Arşivleme tarihini ekle
      const archivedAt = new Date().toISOString();
      const todosWithArchiveDate = todosToArchive.map(t => ({ ...t, archivedAt }));
      const notesWithArchiveDate = notesToArchive.map(n => ({ ...n, archivedAt }));
      
      // Supabase'e arşivle
      await archiveService.archiveItems(todosWithArchiveDate, notesWithArchiveDate, userId);
      
      // AI analizi yap (eğer aktifse)
      if (this.config.enableAIAnalysis) {
        await this.performAIAnalysis(todosWithArchiveDate, userId);
      }
      
      // Arşivlenen tamamlanmış görevleri localStorage'dan temizle
      if (this.config.archiveCompletedOnly) {
        const remainingTodos = todos.filter(t => !t.completed || t.isDeleted);
        this.saveTodos(userId, remainingTodos);
        console.log(`[DailyArchiveScheduler] Removed ${todosToArchive.length} completed todos from active list`);
      }
      
      // Son arşivleme tarihini kaydet
      this.saveLastArchiveDate(userId, archivedAt);
      
      console.log('[DailyArchiveScheduler] ✅ Daily archive completed successfully');
      
      // Bildirim gönder (opsiyonel)
      this.sendArchiveNotification(todosToArchive.length, notesToArchive.length);
      
    } catch (error: any) {
      console.error('[DailyArchiveScheduler] ❌ Daily archive failed:', error);
      // Hata bildirimi gönder
      this.sendErrorNotification(error.message);
    }
  }
  
  /**
   * AI analizi gerçekleştir
   */
  private async performAIAnalysis(archivedTodos: Todo[], userId: string) {
    try {
      console.log('[DailyArchiveScheduler] Starting AI analysis...');
      
      // Tüm arşivlenmiş görevleri al
      const allArchived = await archiveService.getAllArchivedItems(userId);
      const allTodos = [...allArchived.todos, ...archivedTodos];
      
      // AI analizi yap
      await taskAnalyticsService.analyzeTaskPatterns(allTodos, userId);
      await taskAnalyticsService.updateUserHabits(allTodos, userId);
      
      console.log('[DailyArchiveScheduler] ✅ AI analysis completed');
    } catch (error) {
      console.error('[DailyArchiveScheduler] AI analysis failed:', error);
      // AI hatası arşivleme işlemini durdurmasın
    }
  }
  
  /**
   * Manuel arşivleme tetikleme (test için)
   */
  async triggerManualArchive() {
    console.log('[DailyArchiveScheduler] Manual archive triggered');
    await this.performDailyArchive();
  }
  
  // ==================== HELPER METHODS ====================
  
  private getCurrentUserId(): string | null {
    try {
      // AuthContext'ten kullanıcı ID'sini al
      const authData = localStorage.getItem('supabase-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed?.user?.id || null;
      }
      return null;
    } catch {
      return null;
    }
  }
  
  private loadTodos(userId: string): Todo[] | null {
    try {
      const key = `todos_${userId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
  
  private loadNotes(userId: string): Note[] | null {
    try {
      const key = `notes_${userId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
  
  private saveTodos(userId: string, todos: Todo[]) {
    try {
      const key = `todos_${userId}`;
      localStorage.setItem(key, JSON.stringify(todos));
    } catch (error) {
      console.error('[DailyArchiveScheduler] Failed to save todos:', error);
    }
  }
  
  private saveLastArchiveDate(userId: string, date: string) {
    try {
      const key = `lastArchiveDate_${userId}`;
      localStorage.setItem(key, date);
    } catch (error) {
      console.error('[DailyArchiveScheduler] Failed to save last archive date:', error);
    }
  }
  
  private loadConfig(): SchedulerConfig | null {
    try {
      const data = localStorage.getItem('dailyArchiveScheduler_config');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
  
  private saveConfig() {
    try {
      localStorage.setItem('dailyArchiveScheduler_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('[DailyArchiveScheduler] Failed to save config:', error);
    }
  }
  
  private sendArchiveNotification(todoCount: number, noteCount: number) {
    try {
      // Web Notification API kullan (eğer izin verilmişse)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('EchoDay - Günlük Arşivleme', {
          body: `✅ ${todoCount} görev ve ${noteCount} not arşivlendi`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        });
      }
    } catch (error) {
      console.warn('[DailyArchiveScheduler] Failed to send notification:', error);
    }
  }
  
  private sendErrorNotification(errorMessage: string) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('EchoDay - Arşivleme Hatası', {
          body: `❌ Günlük arşivleme başarısız: ${errorMessage}`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        });
      }
    } catch (error) {
      console.warn('[DailyArchiveScheduler] Failed to send error notification:', error);
    }
  }
}

// Singleton instance
export const dailyArchiveScheduler = new DailyArchiveScheduler();
