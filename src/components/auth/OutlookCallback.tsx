import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { mailService } from '../../services/mailService';

const OutlookCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'connecting' | 'success' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        setError(`OAuth error: ${errorParam}`);
        setTimeout(() => navigate('/app'), 3000);
        return;
      }

      if (code) {
        try {
          const result = await mailService.handleOAuthCallback('outlook', code);
          if (result.success) {
            setStatus('success');
            setTimeout(() => navigate('/email'), 2000);
          } else {
            setStatus('error');
            setError(result.error || 'Failed to connect Outlook account');
            setTimeout(() => navigate('/app'), 3000);
          }
        } catch (err) {
          console.error('Outlook callback error:', err);
          setStatus('error');
          setError('An unexpected error occurred');
          setTimeout(() => navigate('/app'), 3000);
        }
      } else {
        setStatus('error');
        setError('No authorization code received');
        setTimeout(() => navigate('/app'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="text-center">
          {status === 'connecting' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Outlook Hesabı Bağlanıyor
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Lütfen bekleyin...
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                Başarılı!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Outlook hesabınız başarıyla bağlandı. E-posta sayfasına yönlendiriliyorsunuz...
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-2">
                Bağlantı Hatası
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error || 'Outlook hesabı bağlanırken bir hata oluştu.'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ana sayfaya yönlendiriliyorsunuz...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutlookCallback;