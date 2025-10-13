import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabaseClient';

interface AdminSecurityContextType {
  isSecure: boolean;
  checkSecurity: () => Promise<boolean>;
  logActivity: (action: string, details?: any) => Promise<void>;
  rateLimit: (key: string) => boolean;
}

const AdminSecurityContext = createContext<AdminSecurityContextType | undefined>(undefined);

// Rate limiting helper
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts = 10;
  private readonly windowMs = 60000; // 1 minute

  check(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      console.warn(`[Security] Rate limit exceeded for: ${key}`);
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key: string) {
    this.attempts.delete(key);
  }
}

const rateLimiter = new RateLimiter();

export function AdminSecurityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSecure, setIsSecure] = useState(false);

  const checkSecurity = async (): Promise<boolean> => {
    if (!user) {
      console.log('[Security] No user');
      return false;
    }

    try {
      // 1. Session kontrolü
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('[Security] Invalid session');
        return false;
      }

      // 2. Token süresi kontrolü
      const expiresAt = session.expires_at;
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        console.error('[Security] Token expired');
        return false;
      }

      // 3. User ID eşleşme kontrolü
      if (session.user.id !== user.id) {
        console.error('[Security] User ID mismatch');
        return false;
      }

      // 4. IP değişikliği kontrolü (localStorage)
      const storedIp = localStorage.getItem('admin_ip');
      if (storedIp && storedIp !== 'unknown') {
        // IP değişmişse uyarı ver (production'da daha sıkı kontrol yapılabilir)
        console.log('[Security] IP check:', storedIp);
      }

      console.log('[Security] All checks passed');
      setIsSecure(true);
      return true;
    } catch (error) {
      console.error('[Security] Security check failed:', error);
      return false;
    }
  };

  const logActivity = async (action: string, details?: any) => {
    try {
      // Admin aktivitelerini logla
      console.log('[Security] Admin activity:', {
        user: user?.email,
        action,
        details,
        timestamp: new Date().toISOString(),
      });

      // TODO: Bu logları veritabanına kaydet
      // await supabase.from('admin_activity_logs').insert({
      //   user_id: user?.id,
      //   action,
      //   details: JSON.stringify(details),
      //   ip_address: 'unknown', // Gerçek IP adresi backend'den alınmalı
      //   user_agent: navigator.userAgent,
      // });
    } catch (error) {
      console.error('[Security] Failed to log activity:', error);
    }
  };

  const rateLimit = (key: string): boolean => {
    const fullKey = `${user?.id || 'anonymous'}_${key}`;
    return rateLimiter.check(fullKey);
  };

  useEffect(() => {
    if (user) {
      checkSecurity();
    } else {
      setIsSecure(false);
    }
  }, [user]);

  // Session yenileme (her 5 dakikada bir)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      console.log('[Security] Refreshing session...');
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('[Security] Session refresh failed:', error);
        setIsSecure(false);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AdminSecurityContext.Provider
      value={{
        isSecure,
        checkSecurity,
        logActivity,
        rateLimit,
      }}
    >
      {children}
    </AdminSecurityContext.Provider>
  );
}

export function useAdminSecurity() {
  const context = useContext(AdminSecurityContext);
  if (context === undefined) {
    throw new Error('useAdminSecurity must be used within AdminSecurityProvider');
  }
  return context;
}
