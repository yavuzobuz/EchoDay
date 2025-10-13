import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useI18n();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    
    if (signInError) {
      console.error('Login error:', signInError);
      // Daha anlaşılır hata mesajları
      if (signInError.message.includes('Invalid login credentials')) {
        setError(t('login.error.invalid','E-posta veya şifre hatalı. Henüz kayıt olmadıysanız, önce "Kayıt Ol" butonuna tıklayın.'));
      } else if (signInError.message.includes('Email not confirmed')) {
        setError(t('login.error.confirm','E-posta adresinizi doğrulamanız gerekiyor. Lütfen e-posta kutunuzu kontrol edin.'));
      } else {
        setError(signInError.message || t('login.error.generic','Giriş yapılamadı'));
      }
      setLoading(false);
    } else {
      navigate('/');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-[hsl(var(--gradient-from))] dark:via-[hsl(var(--gradient-via))] dark:to-[hsl(var(--gradient-to))] px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('login.title','Hoş Geldiniz')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('login.subtitle','Hesabınıza giriş yapın')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('login.email','E-posta')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('login.password','Şifre')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('login.loading','Giriş yapılıyor...') : t('login.submit','Giriş Yap')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('login.noAccount','Hesabınız yok mu?')}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
              {t('login.register','Kayıt Ol')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
