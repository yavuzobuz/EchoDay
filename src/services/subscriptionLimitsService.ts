import { supabase } from './supabaseClient';
import { getSubscription as getDemoSubscription } from './paymentService';

// Plan limitleri tanımı
export interface PlanLimits {
  max_tasks: number; // -1 = sınırsız
  max_notes: number;
  ai_requests_per_day: number;
  email_integration: boolean;
  analytics: boolean;
  priority_support: boolean;
  custom_integration: boolean;
}

// Varsayılan plan limitleri
const DEFAULT_LIMITS: Record<string, PlanLimits> = {
  free: {
    max_tasks: 50,
    max_notes: 20,
    ai_requests_per_day: 5,
    email_integration: false,
    analytics: false,
    priority_support: false,
    custom_integration: false,
  },
  basic: {
    max_tasks: 500,
    max_notes: 200,
    ai_requests_per_day: 50,
    email_integration: true,
    analytics: false,
    priority_support: false,
    custom_integration: false,
  },
  pro: {
    max_tasks: -1,
    max_notes: -1,
    ai_requests_per_day: 500,
    email_integration: true,
    analytics: true,
    priority_support: true,
    custom_integration: false,
  },
  enterprise: {
    max_tasks: -1,
    max_notes: -1,
    ai_requests_per_day: -1,
    email_integration: true,
    analytics: true,
    priority_support: true,
    custom_integration: true,
  },
};

// Kullanıcı kullanım istatistikleri
export interface UsageStats {
  tasks_count: number;
  notes_count: number;
  ai_requests_today: number;
}

/**
 * Kullanıcının mevcut abonelik planını getir
 */
export async function getUserSubscription(userId: string) {
  try {
    // Supabase configured değilse veya erişilemiyorsa demo aboneliğe düş
    if (!supabase) {
      const demo = getDemoSubscription(userId);
      if (demo) {
        return {
          user_id: userId,
          plan_type: demo.planId?.includes('pro-plus') ? 'enterprise' : demo.planId?.includes('pro') ? 'pro' : 'free',
          status: demo.status || 'active',
          subscription_plans: null,
        } as any;
      }
      return null;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : (data as any);
    if (row) return row;

    // Aktif kayıt yoksa demo aboneliğe düş
    const demo = getDemoSubscription(userId);
    if (demo) {
      return {
        user_id: userId,
        plan_type: demo.planId?.includes('pro-plus') ? 'enterprise' : demo.planId?.includes('pro') ? 'pro' : 'free',
        status: demo.status || 'active',
        subscription_plans: null,
      } as any;
    }

    return null;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    // Hata durumunda demo aboneliğe düş
    const demo = getDemoSubscription(userId);
    if (demo) {
      return {
        user_id: userId,
        plan_type: demo.planId?.includes('pro-plus') ? 'enterprise' : demo.planId?.includes('pro') ? 'pro' : 'free',
        status: demo.status || 'active',
        subscription_plans: null,
      } as any;
    }
    return null;
  }
}

/**
 * Kullanıcının plan limitlerini getir
 */
export async function getUserLimits(userId: string): Promise<PlanLimits> {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      return DEFAULT_LIMITS.free;
    }

    const planType = subscription.plan_type || 'free';
    const limits = subscription.subscription_plans?.limits || DEFAULT_LIMITS[planType];
    
    return limits as PlanLimits;
  } catch (error) {
    console.error('Error fetching user limits:', error);
    return DEFAULT_LIMITS.free;
  }
}

/**
 * Kullanıcının mevcut kullanımını getir
 */
export async function getUserUsage(userId: string): Promise<UsageStats> {
  try {
    let tasksCount = 0;
    let notesCount = 0;
    let aiRequestsCount = 0;

    // 1) Supabase'den okumayı dene (varsa)
    try {
      if (supabase) {
        const { count: sTasks } = await supabase
          .from('todos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        tasksCount = sTasks || 0;

        try {
          const { count, error: notesError } = await supabase
            .from('daily_notes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          if (!notesError) notesCount = count || 0;
        } catch (e) {
          // Tablo yoksa sessizce devam et
          console.warn('daily_notes table not found, using 0');
        }

        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const { count, error: chatError } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', today.toISOString());
          if (!chatError) aiRequestsCount = count || 0;
        } catch (e) {
          console.warn('chat_messages table not found, using 0');
        }
      }
    } catch (e) {
      console.warn('[Usage] Supabase counts failed, will use local fallbacks:', e);
    }

    // 2) LocalStorage fallback (guest veya Supabase yoksa)
    try {
      const todosRaw = localStorage.getItem(`todos_${userId}`);
      if (todosRaw) {
        const todos = JSON.parse(todosRaw);
        const localTasks = Array.isArray(todos) ? todos.filter((t: any) => !t.isDeleted).length : 0;
        // Supabase dönerse bile yerel sayım daha yüksekse onu kullan
        tasksCount = Math.max(tasksCount, localTasks);
      }
    } catch {}

    try {
      const notesRaw = localStorage.getItem(`notes_${userId}`);
      if (notesRaw) {
        const arr = JSON.parse(notesRaw);
        const localNotes = Array.isArray(arr) ? arr.filter((n: any) => !n.isDeleted).length : 0;
        notesCount = Math.max(notesCount, localNotes);
      }
    } catch {}

    try {
      const todayKey = `ai_usage_${userId}_${new Date().toDateString()}`;
      const localAi = parseInt(localStorage.getItem(todayKey) || '0', 10);
      if (!Number.isNaN(localAi)) aiRequestsCount = Math.max(aiRequestsCount, localAi);
    } catch {}

    return {
      tasks_count: tasksCount,
      notes_count: notesCount,
      ai_requests_today: aiRequestsCount,
    };
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    // Tamamen hata olursa en azından local fallback döndür
    try {
      const todos = JSON.parse(localStorage.getItem(`todos_${userId}`) || '[]');
      const notes = JSON.parse(localStorage.getItem(`notes_${userId}`) || '[]');
      const ai = parseInt(localStorage.getItem(`ai_usage_${userId}_${new Date().toDateString()}`) || '0', 10) || 0;
      return {
        tasks_count: (Array.isArray(todos) ? todos.filter((t: any)=>!t.isDeleted).length : 0),
        notes_count: (Array.isArray(notes) ? notes.filter((n: any)=>!n.isDeleted).length : 0),
        ai_requests_today: ai,
      };
    } catch {
      return { tasks_count: 0, notes_count: 0, ai_requests_today: 0 };
    }
  }
}

/**
 * Kullanıcı bir özelliği kullanabilir mi kontrol et
 */
export async function checkFeatureAccess(
  userId: string,
  feature: keyof PlanLimits
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const limits = await getUserLimits(userId);
    const featureValue = limits[feature];

    // Boolean özellikler
    if (typeof featureValue === 'boolean') {
      return {
        allowed: featureValue,
        reason: featureValue ? undefined : `Bu özellik planınızda bulunmuyor`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking feature access:', error);
    return { allowed: false, reason: 'Kontrol sırasında hata oluştu' };
  }
}

/**
 * Kullanıcı limit içinde mi kontrol et
 */
export async function checkLimit(
  userId: string,
  limitType: 'max_tasks' | 'max_notes' | 'ai_requests_per_day'
): Promise<{ allowed: boolean; current: number; limit: number; reason?: string }> {
  try {
    const limits = await getUserLimits(userId);
    const usage = await getUserUsage(userId);

    const limit = limits[limitType];
    let current = 0;

    switch (limitType) {
      case 'max_tasks':
        current = usage.tasks_count;
        break;
      case 'max_notes':
        current = usage.notes_count;
        break;
      case 'ai_requests_per_day':
        current = usage.ai_requests_today;
        break;
    }

    // -1 = sınırsız
    if (limit === -1) {
      return { allowed: true, current, limit };
    }

    const allowed = current < limit;
    const reason = allowed ? undefined : `Limit aşıldı (${current}/${limit})`;

    return { allowed, current, limit, reason };
  } catch (error) {
    console.error('Error checking limit:', error);
    return {
      allowed: false,
      current: 0,
      limit: 0,
      reason: 'Kontrol sırasında hata oluştu',
    };
  }
}

/**
 * Kullanım istatistiklerini artır (AI isteği için)
 */
export async function incrementAIUsage(userId: string): Promise<void> {
  try {
    // Bu localStorage'da tutulabilir veya ayrı bir tablo oluşturulabilir
    const key = `ai_usage_${userId}_${new Date().toDateString()}`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, (current + 1).toString());
  } catch (error) {
    console.error('Error incrementing AI usage:', error);
  }
}

/**
 * Kullanıcının upgrade yapması gerektiğini göster
 */
export function shouldShowUpgradePrompt(
  limitCheck: { allowed: boolean; current: number; limit: number }
): boolean {
  if (limitCheck.limit === -1) return false; // Sınırsız
  if (!limitCheck.allowed) return true; // Limit aşıldı
  
  // %80'e ulaşmışsa uyarı göster
  const percentage = (limitCheck.current / limitCheck.limit) * 100;
  return percentage >= 80;
}

/**
 * Plan yükseltme mesajı oluştur
 */
export function getUpgradeMessage(limitType: string, current: number, limit: number): string {
  const messages: Record<string, string> = {
    max_tasks: `Görev limitine ulaştınız (${current}/${limit}). Daha fazla görev eklemek için planınızı yükseltin.`,
    max_notes: `Not limitine ulaştınız (${current}/${limit}). Daha fazla not eklemek için planınızı yükseltin.`,
    ai_requests_per_day: `Günlük AI istek limitine ulaştınız (${current}/${limit}). Daha fazla AI özelliği kullanmak için planınızı yükseltin.`,
  };
  
  return messages[limitType] || 'Limit aşıldı. Planınızı yükseltmeyi düşünün.';
}
