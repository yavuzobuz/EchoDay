import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabaseClient';

export type UserRole = 'user' | 'admin' | 'super_admin';

interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  checkAdminAccess: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

function AdminAuthProviderContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminAccess = async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {

      // 1) Öncelik: profiles.role alanını kontrol et
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[AdminAuthContext] Profile fetch error:', profileError);
      }

      const role: UserRole | undefined = (profile as any)?.role;
      const hasAdminRole = role === 'admin' || role === 'super_admin';

      // 2) Opsiyonel geri dönüş: role yoksa email allowlist (env veya sabit)
      let allowlistMatch = false;
      if (!hasAdminRole && user.email) {
        // VITE_ADMIN_EMAILS=admin@echoday.com,yavuz@echoday.com
        const envAllow = (import.meta as any).env?.VITE_ADMIN_EMAILS as string | undefined;
        const adminEmails = envAllow
          ? envAllow.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
          : ['admin@echoday.com', 'yavuz@echoday.com'];
        allowlistMatch = adminEmails.includes(user.email.toLowerCase());
      }

      const isUserAdmin = hasAdminRole || allowlistMatch;

      if (isUserAdmin) {
        setAdminUser({
          id: user.id,
          email: user.email || '',
          role: hasAdminRole ? (role as UserRole) : 'admin',
          full_name: (profile as any)?.display_name,
          avatar_url: (profile as any)?.avatar_url,
        });
        return true;
      }

      setAdminUser(null);
      return false;
    } catch (error) {
      console.error('[AdminAuthContext] Admin access check error:', error);
      setAdminUser(null);
      return false;
    }
  };

  useEffect(() => {
    const initAdminAuth = async () => {
      setLoading(true);
      if (user) {
        await checkAdminAccess();
      } else {
        setAdminUser(null);
      }
      setLoading(false);
    };

    initAdminAuth();
  }, [user]);

  const isAdmin = adminUser?.role === 'admin' || adminUser?.role === 'super_admin';
  const isSuperAdmin = adminUser?.role === 'super_admin';

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isAdmin,
        isSuperAdmin,
        loading,
        checkAdminAccess,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProviderContent>
      {children}
    </AdminAuthProviderContent>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
