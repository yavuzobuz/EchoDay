import { UserProfile, UserStats } from '../types/profile';

// Electron API'sinin varlığını kontrol et
const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electronAPI;
};

/**
 * Kullanıcı profilini getir
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (isElectron()) {
    try {
      const profile = await (window as any).electronAPI.getProfile(userId);
      return profile;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  } else {
    // Fallback: localStorage kullan
    const key = `user_profile_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }
}

/**
 * Kullanıcı profilini güncelle
 */
export async function updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<boolean> {
  if (isElectron()) {
    try {
      await (window as any).electronAPI.updateProfile(userId, profile);
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  } else {
    // Fallback: localStorage kullan
    const key = `user_profile_${userId}`;
    const existing = localStorage.getItem(key);
    const current = existing ? JSON.parse(existing) : createDefaultProfile(userId);
    const updated = { ...current, ...profile, updatedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(updated));
    return true;
  }
}

/**
 * Kullanıcı istatistiklerini getir
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
  if (isElectron()) {
    try {
      const stats = await (window as any).electronAPI.getStats(userId);
      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  } else {
    // Fallback: localStorage kullan
    const key = `user_stats_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : createDefaultStats();
  }
}

/**
 * Kullanıcı istatistiklerini güncelle
 */
export async function updateUserStats(userId: string, stats: Partial<UserStats>): Promise<boolean> {
  if (isElectron()) {
    try {
      await (window as any).electronAPI.updateStats(userId, stats);
      return true;
    } catch (error) {
      console.error('Error updating stats:', error);
      return false;
    }
  } else {
    // Fallback: localStorage kullan
    const key = `user_stats_${userId}`;
    const existing = localStorage.getItem(key);
    const current = existing ? JSON.parse(existing) : createDefaultStats();
    const updated = { ...current, ...stats };
    localStorage.setItem(key, JSON.stringify(updated));
    return true;
  }
}

/**
 * Varsayılan profil oluştur
 */
export function createDefaultProfile(userId: string): UserProfile {
  return {
    id: userId,
    name: 'Kullanıcı',
    avatar: '😊',
    bio: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Varsayılan istatistikler oluştur
 */
export function createDefaultStats(): UserStats {
  return {
    totalTodos: 0,
    completedTodos: 0,
    totalNotes: 0,
    daysActive: 0,
    lastActiveDate: new Date().toISOString(),
  };
}

/**
 * İstatistikleri artır (todo tamamlandığında, not eklendiğinde vb.)
 */
export async function incrementStats(
  userId: string,
  type: 'todo' | 'completedTodo' | 'note'
): Promise<void> {
  const stats = await getUserStats(userId);
  if (!stats) return;

  const updates: Partial<UserStats> = {
    lastActiveDate: new Date().toISOString(),
  };

  switch (type) {
    case 'todo':
      updates.totalTodos = (stats.totalTodos || 0) + 1;
      break;
    case 'completedTodo':
      updates.completedTodos = (stats.completedTodos || 0) + 1;
      break;
    case 'note':
      updates.totalNotes = (stats.totalNotes || 0) + 1;
      break;
  }

  await updateUserStats(userId, updates);
}

/**
 * Aktif gün sayısını güncelle
 */
export async function updateDaysActive(userId: string): Promise<void> {
  const stats = await getUserStats(userId);
  if (!stats) return;

  const lastActive = new Date(stats.lastActiveDate);
  const today = new Date();
  
  // Eğer son aktif gün bugün değilse, gün sayısını artır
  if (lastActive.toDateString() !== today.toDateString()) {
    await updateUserStats(userId, {
      daysActive: (stats.daysActive || 0) + 1,
      lastActiveDate: today.toISOString(),
    });
  }
}
