import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mailService } from '../../services/mailService';

const GmailCallback: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Gmail hesabı bağlanıyor...');

  const ranRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Wait for auth to load
      if (authLoading) {
        setMessage('Kullanıcı bilgileri yükleniyor...');
        return;
      }

      // Check if user is authenticated
      if (!user) {
        console.log('[GmailCallback] No user found, authLoading:', authLoading);
        setStatus('error');
        setMessage('Kullanıcı oturumu bulunamadı! Tekrar giriş yapın.');
        // setTimeout(() => {
        //   window.location.href = '/login';
        // }, 3000);
        return;
      }
      
      console.log('[GmailCallback] User authenticated:', user.email);

      try {
        // Get access token from URL hash (Implicit Flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const error = hashParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!accessToken) {
          throw new Error('Access token not found in URL');
        }

        // Get user info and save
        setMessage('Kullanıcı bilgileri alınıyor...');
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to get user info');
        }

        const userInfo = await userInfoResponse.json();

        // Save to Supabase
        setMessage('Hesap kaydediliyor...');
        const result = await mailService.saveEmailAccountDirect({
          provider: 'gmail',
          emailAddress: userInfo.email,
          displayName: userInfo.name,
          accessToken: accessToken,
          expiresIn: 3600, // Implicit flow tokens expire in 1 hour
        });

        if (result.success) {
          setStatus('success');
          setMessage('Gmail hesabı başarıyla bağlandı! \n\nEmail: ' + userInfo.email + '\n\nAna sayfaya dönmek için tıklayın.');
          
          // Redirect to home page after 2 seconds
          // setTimeout(() => {
          //   window.location.href = '/';
          // }, 2000);
        } else {
          throw new Error(result.error || 'Failed to connect Gmail account');
        }
      } catch (error) {
        console.error('Gmail callback error:', error);
        setStatus('error');
        setMessage((error instanceof Error ? error.message : 'Bir hata oluştu') + '\n\nConsole\'u kontrol edin (F12)');
        
        // Redirect to home page after 3 seconds
        // setTimeout(() => {
        //   window.location.href = '/';
        // }, 3000);
      }
    };

    if (ranRef.current) return; // Prevent double-run in React StrictMode
    ranRef.current = true;
    handleCallback();
  }, [user, authLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Gmail Bağlanıyor
              </h2>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
                Başarılı!
              </h2>
              <button
                onClick={() => (window.location.href = '/')}
                className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                Ana sayfaya dön
              </button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
                Hata!
              </h2>
            </>
          )}
          
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default GmailCallback;
