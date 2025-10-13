import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccentColor } from '../App';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { archiveService } from '../services/archiveService';
import { DayStat } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { getUserProfile, updateUserProfile, createDefaultProfile } from '../services/profileService';
import { UserProfile, DEFAULT_AVATARS } from '../types/profile';
import MailConnectModal from '../components/MailConnectModal';
import { mailService } from '../services/mailService';
import { EmailAccount } from '../types/mail';

interface ProfileProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  assistantName: string;
  setAssistantName: (name: string) => void;
  onNavigateBack: () => void;
  followSystemTheme: boolean;
  setFollowSystemTheme: (v: boolean) => void;
}

const accentColors: { name: AccentColor, className: string }[] = [
    { name: 'blue', className: 'bg-blue-500' },
    { name: 'green', className: 'bg-green-500' },
    { name: 'red', className: 'bg-red-500' },
];


const Profile: React.FC<ProfileProps> = ({ 
  theme, setTheme, accentColor, setAccentColor, 
  apiKey, setApiKey,
  assistantName, setAssistantName,
  onNavigateBack,
  followSystemTheme,
  setFollowSystemTheme
}) => {
  const { user, signOut } = useAuth();
  const { t, lang, setLang, isAutoDetected, browserLanguageInfo, enableAutoDetection } = useI18n();
  const navigate = useNavigate();
  const userId = user?.id || 'guest';
  
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [isEditingApiKey, setIsEditingApiKey] = useState(!apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [localAssistantName, setLocalAssistantName] = useState(assistantName);
  const [notification, setNotification] = useState<string | null>(null);
  const tts = useTextToSpeech();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [localName, setLocalName] = useState('');
  const [localBio, setLocalBio] = useState('');
  const [localAvatar, setLocalAvatar] = useState('😊');
  const [profileLoading, setProfileLoading] = useState(true);
  
  // Mail state
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [openMailGuide, setOpenMailGuide] = useState(false);
  // Email accounts state (connected + local custom)
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

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
    if (provider === 'gmail') {
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M5,5 L7,6.5 L12,10 L17,6.5 L19,5 L12,0 Z" />
          <path fill="#FBBC05" d="M0,8 L5,5 L5,17 L0,20 Z" />
          <path fill="#34A853" d="M24,8 L19,5 L19,17 L24,20 Z" />
        </svg>
      );
    }
    if (provider === 'outlook') {
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <rect width="24" height="24" fill="#0078D4" />
          <rect x="6" y="6" width="5" height="5" fill="#FFF" />
          <rect x="13" y="6" width="5" height="5" fill="#FFF" />
          <rect x="6" y="13" width="5" height="5" fill="#FFF" />
          <rect x="13" y="13" width="5" height="5" fill="#FFF" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#6B7280" />
      </svg>
    );
  };

  useEffect(() => {
    loadEmailAccounts();
  }, []);

  const handleSignOut = async () => {
    if (confirm(t('profile.confirmSignOut'))) {
      await signOut();
      navigate('/login');
    }
  };

  // Follow system theme toggle (stored in localStorage)
  const [followSystem, setFollowSystem] = useState<boolean>(followSystemTheme);

  // Collapsible states
  const [isTtsOpen, setIsTtsOpen] = useState<boolean>(false);

  // Usage stats
  const [stats, setStats] = useState({
    todayTotal: 0,
    todayCompleted: 0,
    weekTotal: 0,
    weekCompleted: 0,
  });
  const [topCategories, setTopCategories] = useState<string[]>([]);
  const [last7Days, setLast7Days] = useState<DayStat[]>([]);

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    setProfileLoading(true);
    try {
      const profileData = await getUserProfile(userId);
      const finalProfile = profileData || createDefaultProfile(userId);
      
      setProfile(finalProfile);
      setLocalName(finalProfile.name);
      setLocalBio(finalProfile.bio);
      setLocalAvatar(finalProfile.avatar);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
    if (profile) {
      setLocalName(profile.name);
      setLocalBio(profile.bio);
      setLocalAvatar(profile.avatar);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim()) {
      setNotification(t('profile.nameRequired'));
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const success = await updateUserProfile(userId, {
      name: localName.trim(),
      bio: localBio.trim(),
      avatar: localAvatar,
    });

    if (success) {
      await loadProfileData();
      setIsEditingProfile(false);
      setNotification(t('profile.profileUpdateSuccess'));
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification(t('profile.profileUpdateFailed'));
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSelectAvatar = (avatar: string) => {
    setLocalAvatar(avatar);
    setShowAvatarPicker(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = lang === 'en' ? 'en-US' : 'tr-TR';
    return date.toLocaleDateString(locale, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Use user-specific localStorage key
        const currentTodos = JSON.parse(localStorage.getItem(`todos_${userId}`) || '[]');
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // Today's stats - only count tasks created today
        const todaysCurrent = currentTodos.filter((t: any) => {
          const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
          return taskDate === dateStr && !t.isDeleted;
        });
        const { todos: archivedToday } = await archiveService.getArchivedItemsForDate(dateStr, userId);
        const allToday = [...todaysCurrent, ...archivedToday];
        const todayTotal = allToday.length;
        const todayCompleted = allToday.filter((t: any) => t.completed).length;

        // Weekly stats - includes current + archived todos
        const weekly = await archiveService.getPeriodicReport('week', currentTodos, userId);
        const dashboard = await archiveService.getDashboardStats(currentTodos, userId);
        
        setStats({
          todayTotal,
          todayCompleted,
          weekTotal: weekly.totalTasks,
          weekCompleted: weekly.completedTasks,
        });
        setTopCategories(weekly.topCategories?.slice(0, 5) || []);
        setLast7Days(dashboard.last7Days || []);
      } catch (e) {
        console.error('Failed to load stats', e);
      }
    };
    loadStats();
  }, [userId]);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (localApiKey.trim()) {
        setApiKey(localApiKey.trim());
        setIsEditingApiKey(false);
        setNotification(t('profile.apiKeySaved'));
        setTimeout(() => setNotification(null), 3000);
    }
  };
  
  const handleEditApiKey = () => {
    setLocalApiKey(apiKey); // Reset to current key in case user cancels
    setIsEditingApiKey(true);
  };

  const handleDeleteApiKey = () => {
    setApiKey('');
    setLocalApiKey('');
    setIsEditingApiKey(true);
  };
  
  const handleSaveAssistantName = (e: React.FormEvent) => {
    e.preventDefault();
    if (localAssistantName.trim()) {
        setAssistantName(localAssistantName.trim());
        setNotification(t('profile.assistantNameSaved'));
        setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:text-gray-100 transition-colors duration-300 dark:bg-gradient-to-br dark:from-[hsl(var(--gradient-from))] dark:via-[hsl(var(--gradient-via))] dark:to-[hsl(var(--gradient-to))]">
      <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-4 sticky top-0 z-40 flex items-center border-b border-gray-200 dark:border-gray-800">
        <button 
          onClick={onNavigateBack} 
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label={t('profile.backButton')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold ml-4">{t('profile.title')}</h1>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-2xl">
        <div className="space-y-8">
            {/* User Profile Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">{t('profile.userProfile')}</h2>
                
                {profileLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-color-500)]"></div>
                    </div>
                ) : isEditingProfile ? (
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        {/* Avatar Picker */}
                        <div>
                            <label className="font-semibold text-lg block mb-2">{t('profile.avatar')}</label>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                    className="text-6xl hover:scale-110 transition-transform"
                                >
                                    {localAvatar}
                                </button>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('profile.avatarHint')}</span>
                            </div>
                            {showAvatarPicker && (
                                <div className="mt-3 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-x-auto">
                                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                                        {DEFAULT_AVATARS.map((avatar) => (
                                            <button
                                                key={avatar}
                                                type="button"
                                                onClick={() => handleSelectAvatar(avatar)}
                                                className={`text-3xl p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                                                    localAvatar === avatar ? 'ring-2 ring-[var(--accent-color-500)] bg-gray-200 dark:bg-gray-600' : ''
                                                }`}
                                            >
                                                {avatar}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name Input */}
                        <div>
                            <label htmlFor="profileName" className="font-semibold text-lg block mb-2">{t('profile.name')}</label>
                            <input
                                id="profileName"
                                type="text"
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                                placeholder={t('profile.namePlaceholder')}
                                required
                            />
                        </div>

                        {/* Bio Input */}
                        <div>
                            <label htmlFor="profileBio" className="font-semibold text-lg block mb-2">{t('profile.bio')}</label>
                            <textarea
                                id="profileBio"
                                value={localBio}
                                onChange={(e) => setLocalBio(e.target.value)}
                                rows={3}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none resize-none"
                                placeholder={t('profile.bioPlaceholder')}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">{t('common.save')}</button>
                            <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('common.cancel')}</button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="text-6xl">{profile?.avatar || '😊'}</div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile?.name || t('profile.user')}</h3>
                                {profile?.bio && (
                                    <p className="text-gray-600 dark:text-gray-400 mt-2 break-words">{profile.bio}</p>
                                )}
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                    {t('profile.memberSince')} {profile?.createdAt ? formatDate(profile.createdAt) : '-'}
                                </p>
                            </div>
                            <button 
                                onClick={handleEditProfile}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                                {t('profile.edit')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* User Info & Sign Out */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600 mb-4">{t('profile.accountInfo')}</h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.loggedInAccount')}</p>
                        <p className="font-semibold text-lg text-gray-800 dark:text-gray-200 break-all">{user?.email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('profile.userId')} {user?.id.substring(0, 8)}...</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/70 font-medium"
                    >
                        {t('profile.signOut')}
                    </button>
                </div>
            </div>

            {/* General Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">{t('profile.generalSettings')}</h2>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <label className="font-semibold text-lg">{t('profile.appearance')}</label>
                    <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <button onClick={() => { setFollowSystem(false); setFollowSystemTheme(false); setTheme('light'); }} className={`px-3 py-1 rounded-full text-sm ${!followSystem && theme === 'light' ? 'bg-white shadow' : ''}`}>{t('profile.light')}</button>
                      <button onClick={() => { setFollowSystem(false); setFollowSystemTheme(false); setTheme('dark'); }} className={`px-3 py-1 rounded-full text-sm ${!followSystem && theme === 'dark' ? 'bg-gray-800 text-white shadow' : ''}`}>{t('profile.dark')}</button>
                      <button onClick={() => { setFollowSystem(true); setFollowSystemTheme(true); const media = window.matchMedia('(prefers-color-scheme: dark)'); setTheme(media.matches ? 'dark' : 'light'); }} className={`px-3 py-1 rounded-full text-sm ${followSystem ? 'bg-[var(--accent-color-600)] text-white shadow' : ''}`}>{t('profile.system')}</button>
                    </div>
                </div>

                {/* Language Settings */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <label className="font-semibold text-lg">{t('profile.language', 'Language')}</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {isAutoDetected ? 
                                `${t('profile.autoDetected', 'Auto-detected from browser')}: ${browserLanguageInfo.language}` : 
                                t('profile.manuallySet', 'Manually set')
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <button 
                            onClick={() => setLang('tr')} 
                            className={`px-3 py-1 rounded-full text-sm ${
                                lang === 'tr' && !isAutoDetected ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            🇹🇷 Türkçe
                        </button>
                        <button 
                            onClick={() => setLang('en')} 
                            className={`px-3 py-1 rounded-full text-sm ${
                                lang === 'en' && !isAutoDetected ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            🇺🇸 English
                        </button>
                        <button 
                            onClick={enableAutoDetection} 
                            className={`px-3 py-1 rounded-full text-sm ${
                                isAutoDetected ? 'bg-[var(--accent-color-600)] text-white shadow' : 'text-gray-600 dark:text-gray-300'
                            }`}
                            title={t('profile.autoDetectTooltip', 'Automatically detect language from browser settings')}
                        >
                            🌐 {t('profile.auto', 'Auto')}
                        </button>
                    </div>
                </div>

                {/* Daily summary time */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <label className="font-semibold text-lg">{t('profile.dailySummaryTime')}</label>
                    <input
                        type="time"
                        defaultValue={localStorage.getItem(`daily-summary-time_${user?.id}`) || '08:00'}
                        onChange={(e) => localStorage.setItem(`daily-summary-time_${user?.id}`, e.target.value || '08:00')}
                        className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <label className="font-semibold text-lg">{t('profile.accentColor')}</label>
                    <div className="flex items-center gap-3">
                    {accentColors.map(color => (
                        <button key={color.name} onClick={() => setAccentColor(color.name)} className={`w-8 h-8 rounded-full ${color.className} transition-transform transform hover:scale-110 ${accentColor === color.name ? 'ring-2 ring-offset-2 ring-white dark:ring-offset-gray-800' : ''}`} aria-label={t('profile.accentColorAria', `Set accent color to ${color.name}`).replace('{color}', color.name)} />
                    ))}
                    </div>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t dark:border-gray-700">
                    <div>
                        <label className="font-semibold text-lg block">{t('profile.notifications')}</label>
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
                        {'Notification' in window && Notification.permission === 'granted' ? t('profile.notificationsGranted') : t('profile.notificationsGrant')}
                    </button>
                </div>
            </div>

            {/* API Key Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">{t('profile.apiKey')}</h2>
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
                            <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute inset-y-0 right-0 px-3 text-gray-500">
                                {showApiKey ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.27 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M2.042 10C3.316 14.057 7.11 17 11.558 17a9.962 9.962 0 004.16-1.015l-1.424-1.424A8.013 8.013 0 0111.558 15c-3.454 0-6.49-2.288-7.64-5.59C4.195 8.91 4.73 8.13 5.41 7.456l-2.008-2.008A10.034 10.034 0 002.042 10z" /></svg>
                                )}
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('profile.apiKeyDescription').split('{link}').map((part, i) => 
                                i === 0 ? part : [
                                    <a key={i} href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-color-500)] hover:underline">{t('profile.apiKeyLinkText')}</a>,
                                    part
                                ]
                            )}
                        </p>
                        <div className="flex gap-2">
                           <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">{t('common.save')}</button>
                           {apiKey && <button type="button" onClick={() => setIsEditingApiKey(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('common.cancel')}</button>}
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                        <div>
                            <p className="font-semibold text-lg text-green-600 dark:text-green-400">{t('profile.apiKeyConfigured')}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{apiKey.substring(0, 4)}...{apiKey.substring(apiKey.length - 4)}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleEditApiKey} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('profile.apiKeyChange')}</button>
                            <button onClick={handleDeleteApiKey} className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/80">{t('profile.apiKeyDelete')}</button>
                        </div>
                    </div>
                )}
            </div>


            {/* Data Backup & Import */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">{t('profile.dataBackup')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.dataBackupDesc')}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={async () => {
                            try {
                                const json = await archiveService.exportArchive();
                                const blob = new Blob([json], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `echoday-archive-${new Date().toISOString().slice(0,10)}.json`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                                setNotification(t('profile.archiveDownloaded'));
                                setTimeout(() => setNotification(null), 3000);
                            } catch (e) {
                                setNotification(t('profile.archiveExportFailed'));
                                setTimeout(() => setNotification(null), 3000);
                            }
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        {t('profile.exportArchive')}
                    </button>
                    <button
                        onClick={() => {
                            try {
                                const userId = user?.id || 'guest';
                                const payload = {
                                    exportedAt: new Date().toISOString(),
                                    theme,
                                    accentColor,
                                    assistantName,
                                    todos: JSON.parse(localStorage.getItem(`todos_${userId}`) || '[]'),
                                    notes: JSON.parse(localStorage.getItem(`notes_${userId}`) || '[]'),
                                    chatHistory: JSON.parse(localStorage.getItem(`chatHistory_${userId}`) || '[]'),
                                };
                                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `echoday-backup-${new Date().toISOString().slice(0,10)}.json`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                                setNotification(t('profile.jsonDownloaded'));
                                setTimeout(() => setNotification(null), 3000);
                            } catch (e) {
                                setNotification(t('profile.exportFailed'));
                                setTimeout(() => setNotification(null), 3000);
                            }
                        }}
                        className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]"
                    >
                        {t('profile.exportJson')}
                    </button>
                    <label className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 cursor-pointer inline-flex items-center justify-center">
                        {t('profile.importJson')}
                        <input
                            type="file"
                            accept="application/json"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                    try {
                                        const userId = user?.id || 'guest';
                                        const data = JSON.parse(reader.result as string);
                                        if (Array.isArray(data.todos)) localStorage.setItem(`todos_${userId}`, JSON.stringify(data.todos));
                                        if (Array.isArray(data.notes)) localStorage.setItem(`notes_${userId}`, JSON.stringify(data.notes));
                                        if (Array.isArray(data.chatHistory)) localStorage.setItem(`chatHistory_${userId}`, JSON.stringify(data.chatHistory));
                                        setNotification(t('profile.dataImported'));
                                        setTimeout(() => setNotification(null), 3000);
                                    } catch {
                                        setNotification(t('profile.invalidJson'));
                                        setTimeout(() => setNotification(null), 3000);
                                    }
                                };
                                reader.readAsText(file);
                            }}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={() => {
                            if (confirm(t('profile.confirmClearData'))) {
                                const userId = user?.id || 'guest';
                                localStorage.removeItem(`todos_${userId}`);
                                localStorage.removeItem(`notes_${userId}`);
                                localStorage.removeItem(`chatHistory_${userId}`);
                                setNotification(t('profile.dataCleared'));
                                setTimeout(() => setNotification(null), 3000);
                            }
                        }}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/70"
                    >
                        {t('profile.clearAllData')}
                    </button>
                </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">{t('profile.usageStats')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                        <div className="text-gray-500 dark:text-gray-400">{t('profile.today')}</div>
                        <div className="mt-1 font-semibold text-lg">{stats.todayCompleted}/{stats.todayTotal} {t('profile.completed')}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('profile.ratio')} {stats.todayTotal ? Math.round((stats.todayCompleted / stats.todayTotal) * 100) : 0}%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                        <div className="text-gray-500 dark:text-gray-400">{t('profile.last7Days')}</div>
                        <div className="mt-1 font-semibold text-lg">{stats.weekCompleted}/{stats.weekTotal} {t('profile.completed')}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('profile.ratio')} {stats.weekTotal ? Math.round((stats.weekCompleted / stats.weekTotal) * 100) : 0}%</div>
                    </div>
                </div>

                {/* Top Categories & 7-day sparkline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-semibold mb-2">{t('profile.topCategories')}</div>
                        {topCategories.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {topCategories.map((cat) => (
                                    <span key={cat} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-[var(--accent-color-100)] text-[var(--accent-color-700)] dark:bg-gray-700 dark:text-gray-200 border border-[var(--accent-color-300)]/50">
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('profile.noData')}</div>
                        )}
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-semibold mb-2">{t('profile.activityChart')}</div>
                        {last7Days.length > 0 ? (
                          <div className="h-24 flex items-end gap-1">
                            {(() => {
                              const max = Math.max(1, ...last7Days.map(d => d.count));
                              const locale = lang === 'en' ? 'en-US' : 'tr-TR';
                              return last7Days.map((d) => (
                                <div key={d.date} className="flex-1 flex flex-col items-center">
                                  <div className="w-full bg-[var(--accent-color-600)]/70 dark:bg-[var(--accent-color-600)]/80 rounded-t-md" style={{ height: `${(d.count / max) * 88}%` }}></div>
                                  <span className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{new Date(d.date).toLocaleDateString(locale, { day: '2-digit' })}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t('profile.noData')}</div>
                        )}
                    </div>
                </div>
            </div>


            {/* Email Accounts */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">{t('profile.emailAccounts')}</h2>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.emailDesc')}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setIsMailModalOpen(true)} className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">{t('profile.addAccount')}</button>
                        <button onClick={() => navigate('/email')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">{t('profile.viewEmails')}</button>
                        <button onClick={() => { setOpenMailGuide(true); setIsMailModalOpen(true); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('profile.emailGuide')}</button>
                    </div>
                </div>

                {/* Accounts list */}
                {loadingAccounts ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : emailAccounts.length === 0 ? (
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 text-sm">
                    {t('profile.noAccounts')}
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {emailAccounts.map((acc) => (
                      <li key={acc.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-700">
                            {getProviderIcon(acc.provider)}
                          </span>
                          <div>
                            <div className="font-medium">{acc.emailAddress || (acc as any).displayName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{acc.provider}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate('/email')} className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">{t('profile.viewAccount')}</button>
                          <button onClick={() => handleRemoveAccount(acc)} className="px-3 py-1.5 text-sm rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/70">{t('profile.removeAccount')}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {accountError && <div className="text-sm text-red-500">{accountError}</div>}
            </div>

            {/* Assistant Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">{t('profile.assistantSettings')}</h2>
                <form onSubmit={handleSaveAssistantName} className="space-y-3">
                    <label htmlFor="assistantName" className="font-semibold text-lg">{t('profile.assistantName')}</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            id="assistantName"
                            type="text"
                            value={localAssistantName}
                            onChange={(e) => setLocalAssistantName(e.target.value)}
                            className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                            placeholder={t('profile.assistantNamePlaceholder')}
                        />
                        <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">{t('common.save')}</button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.assistantNameDesc')}</p>
                </form>
            </div>

            {/* TTS Settings (Collapsible) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b dark:border-gray-600">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('profile.ttsSettings')}</h2>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${tts.settings.enabled ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                            {tts.settings.enabled ? t('profile.ttsActive') : t('profile.ttsInactive')}
                        </span>
                        <button
                            onClick={() => setIsTtsOpen(v => !v)}
                            className="px-3 py-1.5 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                            aria-expanded={isTtsOpen}
                            aria-controls="tts-panel"
                        >
                            {isTtsOpen ? t('profile.ttsClose') : t('profile.ttsOpen')}
                        </button>
                        <button
                            onClick={() => {
                                tts.updateSettings({ enabled: !tts.settings.enabled });
                                setNotification(tts.settings.enabled ? t('profile.ttsDisabled') : t('profile.ttsEnabled'));
                                setTimeout(() => setNotification(null), 3000);
                            }}
                            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                                tts.settings.enabled
                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                        >
                            {tts.settings.enabled ? t('profile.ttsClose') : t('profile.ttsOpen')}
                        </button>
                    </div>
                </div>

                {/* Body */}
                {isTtsOpen && (
                  <div id="tts-panel" className="p-6 space-y-6">
                    {/* Reminder sound selection */}
                    <div>
                        <h3 className="font-semibold mb-2">{t('profile.reminderSound')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <label className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-700">
                                <input
                                    type="radio"
                                    name="reminderSound"
                                    defaultChecked={(localStorage.getItem(`reminderSound_${user?.id}`) || 'tts') === 'tts'}
                                    onChange={() => localStorage.setItem(`reminderSound_${user?.id}`, 'tts')}
                                />
                                <span>{t('profile.reminderTts')}</span>
                            </label>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-700">
                                <label className="flex items-center gap-2 flex-1">
                                    <input type="radio" name="reminderSound" defaultChecked={localStorage.getItem(`reminderSound_${user?.id}`) === 'alarm1'} onChange={() => localStorage.setItem(`reminderSound_${user?.id}`, 'alarm1')} />
                                    <span>{t('profile.reminderAlarm').replace('{number}', '1')}</span>
                                </label>
                                <button type="button" onClick={() => import('../utils/reminderSounds').then(m => m.playReminderSound('alarm1'))} className="px-2 py-1 text-xs rounded bg-[var(--accent-color-600)] text-white">{t('profile.reminderListen')}</button>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-700">
                                <label className="flex items-center gap-2 flex-1">
                                    <input type="radio" name="reminderSound" defaultChecked={localStorage.getItem(`reminderSound_${user?.id}`) === 'alarm2'} onChange={() => localStorage.setItem(`reminderSound_${user?.id}`, 'alarm2')} />
                                    <span>{t('profile.reminderAlarm').replace('{number}', '2')}</span>
                                </label>
                                <button type="button" onClick={() => import('../utils/reminderSounds').then(m => m.playReminderSound('alarm2'))} className="px-2 py-1 text-xs rounded bg-[var(--accent-color-600)] text-white">{t('profile.reminderListen')}</button>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-700">
                                <label className="flex items-center gap-2 flex-1">
                                    <input type="radio" name="reminderSound" defaultChecked={localStorage.getItem(`reminderSound_${user?.id}`) === 'alarm3'} onChange={() => localStorage.setItem(`reminderSound_${user?.id}`, 'alarm3')} />
                                    <span>{t('profile.reminderAlarm').replace('{number}', '3')}</span>
                                </label>
                                <button type="button" onClick={() => import('../utils/reminderSounds').then(m => m.playReminderSound('alarm3'))} className="px-2 py-1 text-xs rounded bg-[var(--accent-color-600)] text-white">{t('profile.reminderListen')}</button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 md:col-span-2">{t('profile.reminderNote')}</p>
                        </div>
                    </div>

                    {tts.hasSupport ? (
                        <div className="space-y-5">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('profile.ttsDescription')}
                            </p>

                            {/* Speech Rate */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="font-semibold text-sm">{t('profile.ttsSpeed')}</label>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{tts.settings.rate.toFixed(1)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={tts.settings.rate}
                                    onChange={(e) => tts.updateSettings({ rate: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color-500)]"
                                    disabled={!tts.settings.enabled}
                                />
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>{t('profile.ttsSlow')}</span>
                                    <span>{t('profile.ttsNormal')}</span>
                                    <span>{t('profile.ttsFast')}</span>
                                </div>
                            </div>

                            {/* Speech Pitch */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="font-semibold text-sm">{t('profile.ttsPitch')}</label>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{tts.settings.pitch.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={tts.settings.pitch}
                                    onChange={(e) => tts.updateSettings({ pitch: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color-500)]"
                                    disabled={!tts.settings.enabled}
                                />
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>{t('profile.ttsLow')}</span>
                                    <span>{t('profile.ttsNormal')}</span>
                                    <span>{t('profile.ttsHigh')}</span>
                                </div>
                            </div>

                            {/* Volume */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="font-semibold text-sm">{t('profile.ttsVolume')}</label>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(tts.settings.volume * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={tts.settings.volume}
                                    onChange={(e) => tts.updateSettings({ volume: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color-500)]"
                                    disabled={!tts.settings.enabled}
                                />
                            </div>

                            {/* Voice Selection */}
                            {tts.availableVoices.length > 0 && (
                                <div className="space-y-2">
                                    <label className="font-semibold text-sm block">{t('profile.ttsVoice')}</label>
                                    <select
                                        value={tts.settings.voice || ''}
                                        onChange={(e) => tts.updateSettings({ voice: e.target.value || undefined })}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none text-sm"
                                        disabled={!tts.settings.enabled}
                                    >
                                        <option value="">{t('profile.ttsDefaultVoice')}</option>
                                        {tts.availableVoices.map(voice => (
                                            <option key={voice.name} value={voice.name}>
                                                {voice.name} ({voice.lang})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Test Button */}
                            <div className="pt-3 border-t dark:border-gray-700">
                                <button
                                    onClick={() => tts.speak(t('profile.ttsTestMessage', 'Hello! I am your AI assistant. Voice responses are now active.'))}
                                    disabled={!tts.settings.enabled || tts.isSpeaking}
                                    className="w-full px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    {tts.isSpeaking ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('profile.ttsSpeaking', 'Speaking...')}
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                                            </svg>
                                            {t('profile.ttsTest', 'Test Voice')}
                                        </>
                                    )}
                                </button>
                                {tts.isSpeaking && (
                                    <button
                                        onClick={tts.cancel}
                                        className="w-full mt-2 px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/80 text-sm font-medium"
                                    >
                                        {t('profile.ttsStop', 'Stop')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                {t('profile.ttsNotSupported')}
                            </p>
                        </div>
                    )}
                  </div>
                )}
            </div>
            
            {/* Mail Modals */}
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
            
            {/* Notification */}
            {notification && (
                <div className="fixed bottom-5 right-5 z-50 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-l-4 border-green-500 p-4 rounded-lg shadow-lg">
                    {notification}
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default Profile;