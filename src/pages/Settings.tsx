import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccentColor } from '../App';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { mailService } from '../services/mailService';
import { EmailAccount } from '../types/mail';
import MailConnectModal from '../components/MailConnectModal';

interface SettingsProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  assistantName: string;
  setAssistantName: (name: string) => void;
  followSystemTheme: boolean;
  setFollowSystemTheme: (v: boolean) => void;
}

const accentColors: { name: AccentColor, className: string }[] = [
  { name: 'blue', className: 'bg-blue-500' },
  { name: 'green', className: 'bg-green-500' },
  { name: 'red', className: 'bg-red-500' },
];

const Settings: React.FC<SettingsProps> = ({
  theme,
  setTheme,
  accentColor,
  setAccentColor,
  apiKey,
  setApiKey,
  assistantName,
  setAssistantName,
  followSystemTheme,
  setFollowSystemTheme
}) => {
  const navigate = useNavigate();
  const { t, lang, setLang, isAutoDetected, browserLanguageInfo, enableAutoDetection } = useI18n();
  const { user } = useAuth();

  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [isEditingApiKey, setIsEditingApiKey] = useState(!apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [localAssistantName, setLocalAssistantName] = useState(assistantName);
  const [notification, setNotification] = useState<string | null>(null);
  const [followSystem, setFollowSystem] = useState<boolean>(followSystemTheme);
  
  // TTS
  const tts = useTextToSpeech();
  const [isTtsOpen, setIsTtsOpen] = useState<boolean>(false);
  
  // Email
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [openMailGuide, setOpenMailGuide] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(localApiKey);
    setIsEditingApiKey(false);
    setNotification(t('profile.apiKeySaved'));
    setTimeout(() => setNotification(null), 3000);
  };

  const handleEditApiKey = () => {
    setIsEditingApiKey(true);
    setLocalApiKey(apiKey);
  };

  const handleDeleteApiKey = () => {
    if (confirm(t('profile.confirmDeleteApiKey'))) {
      setApiKey('');
      setLocalApiKey('');
      setIsEditingApiKey(true);
      setNotification(t('profile.apiKeyDeleted'));
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSaveAssistantName = (e: React.FormEvent) => {
    e.preventDefault();
    setAssistantName(localAssistantName);
    setNotification(t('profile.assistantNameSaved'));
    setTimeout(() => setNotification(null), 3000);
  };

  const loadEmailAccounts = async () => {
    setLoadingAccounts(true);
    setAccountError(null);
    try {
      const response = await mailService.getEmailAccounts();
      const remote = response.success && response.data ? response.data : [];
      const custom = JSON.parse(localStorage.getItem('customMailAccounts') || '[]').map((c: any) => ({ id: c.id, provider: 'custom', emailAddress: c.user, displayName: c.user, customConfig: c }));
      const merged = [...custom, ...remote];
      setEmailAccounts(merged as any);
      if (!response.success && response.error) setAccountError(response.error);
    } catch (e) {
      setAccountError(t('profile.accountsLoadFailed'));
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleRemoveAccount = async (acc: EmailAccount) => {
    try {
      if (acc.provider === 'custom') {
        const list = JSON.parse(localStorage.getItem('customMailAccounts') || '[]');
        const filtered = list.filter((x: any) => x.id !== acc.id);
        localStorage.setItem('customMailAccounts', JSON.stringify(filtered));
        await loadEmailAccounts();
        setNotification(t('profile.accountRemoved'));
        setTimeout(() => setNotification(null), 2500);
        return;
      }
      const res = await mailService.deleteEmailAccount(acc.id);
      if (!res.success) {
        setNotification(res.error || t('profile.accountRemoveFailed'));
        setTimeout(() => setNotification(null), 3000);
      } else {
        await loadEmailAccounts();
        setNotification(t('profile.accountRemoved'));
        setTimeout(() => setNotification(null), 2500);
      }
    } catch {
      setNotification(t('profile.accountRemoveFailed'));
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const getProviderIcon = (provider: string) => {
    if (provider === 'gmail') return (
      <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M5,5 L7,6.5 L12,10 L17,6.5 L19,5 L12,0 Z" /><path fill="#FBBC05" d="M0,8 L5,5 L5,17 L0,20 Z" /><path fill="#34A853" d="M24,8 L19,5 L19,17 L24,20 Z" /></svg>
    );
    if (provider === 'outlook') return (
      <svg className="w-4 h-4" viewBox="0 0 24 24"><rect width="24" height="24" fill="#0078D4" /><rect x="6" y="6" width="5" height="5" fill="#FFF" /><rect x="13" y="6" width="5" height="5" fill="#FFF" /><rect x="6" y="13" width="5" height="5" fill="#FFF" /><rect x="13" y="13" width="5" height="5" fill="#FFF" /></svg>
    );
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#6B7280" /></svg>
    );
  };

  useEffect(() => {
    loadEmailAccounts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:text-gray-100 transition-colors duration-300 dark:bg-gradient-to-br dark:from-[hsl(var(--gradient-from))] dark:via-[hsl(var(--gradient-via))] dark:to-[hsl(var(--gradient-to))]">
      <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-4 sticky top-0 z-40 flex items-center border-b border-gray-200 dark:border-gray-800">
        <button 
          onClick={() => navigate('/profile')} 
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label={t('profile.backButton')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold ml-4">{t('settings.title', 'Ayarlar')}</h1>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-2xl">
        <div className="space-y-8">

        {/* Notification */}
        {notification && (
          <div className="bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
            {notification}
          </div>
        )}

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">
            {t('profile.appearance')}
          </h2>
          
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="font-semibold text-lg">{t('settings.theme', 'Tema')}</label>
            <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
              <button
                onClick={() => {
                  setFollowSystem(false);
                  setFollowSystemTheme(false);
                  setTheme('light');
                }}
                className={`px-3 py-1 rounded-full text-sm ${!followSystem && theme === 'light' ? 'bg-white shadow' : ''}`}
              >
                {t('profile.light')}
              </button>
              <button
                onClick={() => {
                  setFollowSystem(false);
                  setFollowSystemTheme(false);
                  setTheme('dark');
                }}
                className={`px-3 py-1 rounded-full text-sm ${!followSystem && theme === 'dark' ? 'bg-gray-800 text-white shadow' : ''}`}
              >
                {t('profile.dark')}
              </button>
              <button
                onClick={() => {
                  setFollowSystem(true);
                  setFollowSystemTheme(true);
                  const media = window.matchMedia('(prefers-color-scheme: dark)');
                  setTheme(media.matches ? 'dark' : 'light');
                }}
                className={`px-3 py-1 rounded-full text-sm ${followSystem ? 'bg-[var(--accent-color-600)] text-white shadow' : ''}`}
              >
                {t('profile.system')}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="font-semibold text-lg">{t('profile.accentColor')}</label>
            <div className="flex items-center gap-3">
              {accentColors.map(color => (
                <button
                  key={color.name}
                  onClick={() => setAccentColor(color.name)}
                  className={`w-8 h-8 rounded-full ${color.className} transition-transform transform hover:scale-110 ${accentColor === color.name ? 'ring-2 ring-offset-2 ring-white dark:ring-offset-gray-800' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">
            {t('profile.language', 'Dil')}
          </h2>
          
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <label className="font-semibold text-lg">{t('settings.languageSelect', 'Dil Seçimi')}</label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isAutoDetected
                  ? `${t('profile.autoDetected', 'Tarayıcıdan otomatik')}: ${browserLanguageInfo.language}`
                  : t('profile.manuallySet', 'Manuel ayarlandı')}
              </p>
            </div>
            <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
              <button
                onClick={() => setLang('tr')}
                className={`px-3 py-1 rounded-full text-sm ${lang === 'tr' && !isAutoDetected ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                🇹🇷 Türkçe
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full text-sm ${lang === 'en' && !isAutoDetected ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                🇺🇸 English
              </button>
              <button
                onClick={enableAutoDetection}
                className={`px-3 py-1 rounded-full text-sm ${isAutoDetected ? 'bg-[var(--accent-color-600)] text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
              >
                🌐 {t('profile.auto', 'Otomatik')}
              </button>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">
            {t('profile.apiKey')}
          </h2>
          
          {isEditingApiKey ? (
            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <label htmlFor="apiKey" className="font-semibold text-lg">{t('profile.apiKeyLabel')}</label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                  placeholder={t('profile.apiKeyPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500"
                >
                  {showApiKey ? '👁️' : '🙈'}
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('profile.apiKeyDescription').split('{link}')[0]}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-color-500)] hover:underline">
                  {t('profile.apiKeyLinkText')}
                </a>
              </p>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">
                  {t('common.save')}
                </button>
                {apiKey && (
                  <button type="button" onClick={() => setIsEditingApiKey(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                    {t('common.cancel')}
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-lg text-green-600 dark:text-green-400">{t('profile.apiKeyConfigured')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {apiKey.substring(0, 4)}...{apiKey.substring(apiKey.length - 4)}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleEditApiKey} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                  {t('profile.apiKeyChange')}
                </button>
                <button onClick={handleDeleteApiKey} className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/80">
                  {t('profile.apiKeyDelete')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Assistant Name */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">
            {t('profile.assistantName')}
          </h2>
          
          <form onSubmit={handleSaveAssistantName} className="space-y-3">
            <label htmlFor="assistantName" className="font-semibold text-lg">{t('profile.voiceActivationName')}</label>
            <input
              id="assistantName"
              type="text"
              value={localAssistantName}
              onChange={(e) => setLocalAssistantName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="ATO"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.assistantNameDesc')}</p>
            <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">
              {t('common.save')}
            </button>
          </form>
        </div>

        {/* Email Accounts */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">
            {t('profile.emailAccounts')}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.emailDesc')}</p>
            <div className="flex gap-2">
              <button onClick={() => setIsMailModalOpen(true)} className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">
                {t('profile.addAccount')}
              </button>
              <button onClick={() => navigate('/email')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                {t('profile.viewEmails')}
              </button>
            </div>
          </div>
          {loadingAccounts ? (
            <div className="flex items-center justify-center py-6"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : emailAccounts.length === 0 ? (
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 text-sm">{t('profile.noAccounts')}</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {emailAccounts.map((acc) => (
                <li key={acc.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-700">{getProviderIcon(acc.provider)}</span>
                    <div>
                      <div className="font-medium">{acc.emailAddress || (acc as any).displayName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{acc.provider}</div>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveAccount(acc)} className="px-3 py-1.5 text-sm rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/70">
                    {t('profile.removeAccount')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {accountError && <div className="text-sm text-red-500">{accountError}</div>}
        </div>

        {/* TTS Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="px-4 py-3 flex items-center justify-between border-b dark:border-gray-600">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('profile.ttsSettings')}</h2>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${tts.settings.enabled ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                {tts.settings.enabled ? t('profile.ttsActive') : t('profile.ttsInactive')}
              </span>
              <button
                onClick={() => {
                  tts.updateSettings({ enabled: !tts.settings.enabled });
                  setNotification(tts.settings.enabled ? t('profile.ttsDisabled') : t('profile.ttsEnabled'));
                  setTimeout(() => setNotification(null), 3000);
                }}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${tts.settings.enabled ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'}`}
              >
                {tts.settings.enabled ? t('profile.ttsDisable', 'Kapat') : t('profile.ttsEnable', 'Aç')}
              </button>
              <button onClick={() => setIsTtsOpen(v => !v)} className="px-3 py-1.5 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                {isTtsOpen ? t('profile.ttsClose', 'Gizle') : t('profile.ttsOpen', 'Ayarlar')}
              </button>
            </div>
          </div>
          {isTtsOpen && tts.hasSupport && (
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center"><label className="font-semibold text-sm">{t('profile.ttsSpeed')}</label><span className="text-sm text-gray-500 dark:text-gray-400">{tts.settings.rate.toFixed(1)}x</span></div>
                <input type="range" min="0.5" max="2.0" step="0.1" value={tts.settings.rate} onChange={(e) => tts.updateSettings({ rate: parseFloat(e.target.value) })} className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color-500)]" disabled={!tts.settings.enabled} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><label className="font-semibold text-sm">{t('profile.ttsPitch')}</label><span className="text-sm text-gray-500 dark:text-gray-400">{tts.settings.pitch.toFixed(1)}</span></div>
                <input type="range" min="0.5" max="2.0" step="0.1" value={tts.settings.pitch} onChange={(e) => tts.updateSettings({ pitch: parseFloat(e.target.value) })} className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color-500)]" disabled={!tts.settings.enabled} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><label className="font-semibold text-sm">{t('profile.ttsVolume')}</label><span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(tts.settings.volume * 100)}%</span></div>
                <input type="range" min="0" max="1" step="0.1" value={tts.settings.volume} onChange={(e) => tts.updateSettings({ volume: parseFloat(e.target.value) })} className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color-500)]" disabled={!tts.settings.enabled} />
              </div>
              {tts.availableVoices.length > 0 && (
                <div className="space-y-2">
                  <label className="font-semibold text-sm block">{t('profile.ttsVoice')}</label>
                  <select value={tts.settings.voice || ''} onChange={(e) => tts.updateSettings({ voice: e.target.value || undefined })} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none text-sm" disabled={!tts.settings.enabled}>
                    <option value="">{t('profile.ttsDefaultVoice')}</option>
                    {tts.availableVoices.map(voice => <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>)}
                  </select>
                </div>
              )}
              <div className="pt-3 border-t dark:border-gray-700">
                <button onClick={() => tts.speak(t('profile.ttsTestMessage', 'Merhaba! Sesli yanıt sistemi aktif.'))} disabled={!tts.settings.enabled || tts.isSpeaking} className="w-full px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
                  {tts.isSpeaking ? t('profile.ttsSpeaking', 'Konuşuyor...') : t('profile.ttsTest', 'Test Et')}
                </button>
              </div>
            </div>
          )}
          {isTtsOpen && !tts.hasSupport && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg m-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">{t('profile.ttsNotSupported')}</p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">
            {t('profile.notifications')}
          </h2>
          
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <label className="font-semibold text-lg block">{t('settings.notificationPermission', 'Bildirim İzni')}</label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('profile.notificationsDesc')}</p>
            </div>
            <button
              onClick={() => {
                if ('Notification' in window) {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      setNotification(t('profile.notificationGranted'));
                    } else {
                      setNotification(t('profile.notificationDenied'));
                    }
                    setTimeout(() => setNotification(null), 3000);
                  });
                } else {
                  setNotification(t('profile.notificationNotSupported'));
                  setTimeout(() => setNotification(null), 3000);
                }
              }}
              className={`px-4 py-2 rounded-md text-sm ${
                'Notification' in window && Notification.permission === 'granted'
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {'Notification' in window && Notification.permission === 'granted'
                ? t('profile.notificationsGranted')
                : t('profile.notificationsGrant')}
            </button>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t dark:border-gray-700">
            <label className="font-semibold text-lg">{t('profile.dailySummaryTime')}</label>
            <input
              type="time"
              defaultValue={localStorage.getItem(`daily-summary-time_${user?.id}`) || '08:00'}
              onChange={(e) => localStorage.setItem(`daily-summary-time_${user?.id}`, e.target.value || '08:00')}
              className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Mail Connect Modal */}
        <MailConnectModal
          isOpen={isMailModalOpen}
          defaultShowHelp={openMailGuide}
          onClose={() => { setIsMailModalOpen(false); setOpenMailGuide(false); }}
          onSuccess={async () => {
            setIsMailModalOpen(false);
            setOpenMailGuide(false);
            await loadEmailAccounts();
            setNotification(t('profile.mailConnectSuccess'));
            setTimeout(() => setNotification(null), 3000);
          }}
        />
        </div>
      </main>
    </div>
  );
};

export default Settings;
