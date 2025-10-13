import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import MailList from '../components/MailList';

const EmailPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [accentColor, setAccentColor] = useState<'blue' | 'green' | 'red'>('blue');

  useEffect(() => {
    // Load API key and accent color from localStorage (user-scoped)
    const uid = user?.id || 'guest';

    const parseMaybeJSON = (val: string | null) => {
      if (!val) return '';
      try {
        const parsed = JSON.parse(val);
        // If parsed is a string (because useSettingsStorage JSON.stringified it), return it
        return typeof parsed === 'string' ? parsed : val;
      } catch {
        // Not JSON, return as-is
        return val;
      }
    };

    // Primary keys (as used in App.tsx)
    let storedApiKeyRaw = localStorage.getItem(`gemini-api-key_${uid}`);
    let storedApiKey = parseMaybeJSON(storedApiKeyRaw);

    // Backward compatibility fallback
    if (!storedApiKey) {
      storedApiKey = parseMaybeJSON(localStorage.getItem(`gemini_api_key_${uid}`));
    }

    // Accent color
    let storedAccentRaw = localStorage.getItem(`accent-color_${uid}`);
    let storedAccent = parseMaybeJSON(storedAccentRaw) as any;
    if (!storedAccent) {
      storedAccent = parseMaybeJSON(localStorage.getItem('accentColor')) || 'blue';
    }

    setApiKey(storedApiKey || '');
    setAccentColor((storedAccent as 'blue' | 'green' | 'red') || 'blue');
  }, [user]);

  const handleConnectClick = () => {
    // Navigate to settings/profile to connect email account
    navigate('/app', { state: { openMailSettings: true } });
  };

  return (
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Top Header - Fixed */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/app')} 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('common.backHome','Ana sayfaya dön')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-gradient-to-br from-${accentColor}-500 to-${accentColor}-600`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('email.title','E-posta')}</h1>
          </div>
        </div>
      </div>

      {/* Mail List Content */}
      <div className="flex-1 overflow-hidden">
        <MailList 
          onConnectClick={handleConnectClick}
          apiKey={apiKey}
          accentColor={accentColor}
        />
      </div>
    </div>
  );
};

export default EmailPage;
