import React, { useEffect, useState } from 'react';
import { getCurrentUser, signIn, signUp } from '../services/authService';

interface AuthProps {
  onNavigateBack: () => void;
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onNavigateBack, onAuthSuccess }) => {
  const [tab, setTab] = useState<'signin'|'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (user) onAuthSuccess();
    })();
  }, [onAuthSuccess]);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      setMessage('Giriş başarılı.');
      setTimeout(() => setMessage(null), 2500);
      onAuthSuccess();
    } catch (e: any) {
      setMessage(e.message || 'Giriş başarısız.');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(email, password);
      setMessage('Kayıt başarılı. Lütfen e-postanızı doğrulayın.');
      setTimeout(() => setMessage(null), 3500);
      setTab('signin');
    } catch (e: any) {
      setMessage(e.message || 'Kayıt başarısız.');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Hesabınız</h1>
          <button onClick={onNavigateBack} className="px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-sm">Geri</button>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('signin')} className={`flex-1 px-3 py-2 rounded-md text-sm ${tab==='signin' ? 'bg-[var(--accent-color-600)] text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Giriş</button>
          <button onClick={() => setTab('signup')} className={`flex-1 px-3 py-2 rounded-md text-sm ${tab==='signup' ? 'bg-[var(--accent-color-600)] text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Kayıt</button>
        </div>

        {message && <div className="mb-3 text-xs text-gray-600 dark:text-gray-300">{message}</div>}

        {tab === 'signin' ? (
          <form onSubmit={handleSignin} className="space-y-3">
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="E-posta" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Şifre" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            <button type="submit" className="w-full px-3 py-2 rounded-md bg-[var(--accent-color-600)] text-white">Giriş Yap</button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="E-posta" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Şifre (min 6)" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            <button type="submit" className="w-full px-3 py-2 rounded-md bg-[var(--accent-color-600)] text-white">Kayıt Ol</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
