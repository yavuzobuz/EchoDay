import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { ShieldCheckIcon, ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== ADMIN LOGIN START ===');
    console.log('Email:', email);
    setLoading(true);
    setError('');

    try {
      // Giriş yap
      console.log('Step 1: Attempting Supabase auth...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      console.log('Step 2: Auth successful, user:', authData.user?.id);

      if (authData.user) {
        // Kullanıcı rolünü kontrol et
        console.log('Step 3: Checking profile for user:', authData.user.id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();

        console.log('Profile data:', profileData);
        console.log('Profile error:', profileError);

        if (profileError) {
          console.error('Profile check error:', profileError);
          setError('Kullanıcı profili doğrulanamadı.');
          await supabase.auth.signOut();
          return;
        }

        if (!profileData) {
          console.error('Profile not found for user:', authData.user.id);
          setError('Kullanıcı profili bulunamadı. Lütfen yöneticiyle iletişime geçin.');
          await supabase.auth.signOut();
          return;
        }

        const userRole = profileData?.role;
        console.log('User role:', userRole);

        if (userRole !== 'admin' && userRole !== 'super_admin') {
          console.error('Access denied. User role:', userRole);
          setError('Bu alana erişim yetkiniz yok. Sadece admin kullanıcıları giriş yapabilir.');
          await supabase.auth.signOut();
          return;
        }

        // Admin olarak doğrulandı, dashboard'a yönlendir
        console.log('Step 4: Access granted! Navigating to dashboard...');
        console.log('=== ADMIN LOGIN SUCCESS ===');
        // Kısa bir gecikme ile navigate - session'un kaydedilmesini bekle
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 100);
      } else {
        console.error('No user data returned from auth');
        setError('Giriş başarısız. Lütfen tekrar deneyin.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Giriş yapılırken bir hata oluştu.');
    } finally {
      setLoading(false);
      console.log('=== ADMIN LOGIN END ===');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 py-12">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
              <ShieldCheckIcon className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-white">
            Admin Panel
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Yönetim paneline hoş geldiniz
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3 animate-shake">
                <ExclamationCircleIcon className="w-6 h-6 text-red-300 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                E-posta Adresi
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-white/20 placeholder-gray-400 text-white bg-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Şifre
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 border border-white/20 placeholder-gray-400 text-white bg-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white/10"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Beni hatırla
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Şifremi unuttum?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Giriş yapılıyor...</span>
                </div>
              ) : (
                <span className="flex items-center space-x-2">
                  <ShieldCheckIcon className="w-5 h-5" />
                  <span>Giriş Yap</span>
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              ← Ana sayfaya dön
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400">
          <p>© 2025 EchoDay Admin Panel. Tüm hakları saklıdır.</p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
}
