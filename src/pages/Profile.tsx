import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccentColor } from '../App';
import { archiveService } from '../services/archiveService';
import { DayStat } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { getUserProfile, updateUserProfile, createDefaultProfile } from '../services/profileService';
import { UserProfile, DEFAULT_AVATARS } from '../types/profile';
import UsageLimitWidget from '../components/UsageLimitWidget';

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
  
  const [notification, setNotification] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [localName, setLocalName] = useState('');
  const [localBio, setLocalBio] = useState('');
  const [localAvatar, setLocalAvatar] = useState('😊');
  const [profileLoading, setProfileLoading] = useState(true);
  


  const handleSignOut = async () => {
    if (confirm(t('profile.confirmSignOut'))) {
      await signOut();
      navigate('/login');
    }
  };



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

            {/* Subscription & Usage Limits */}
            {user && (
                <UsageLimitWidget userId={user.id} />
            )}

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600 mb-4">{t('profile.quickActions', 'Hızlı İşlemler')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={() => navigate('/settings')}
                        className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="text-left">
                            <p className="font-semibold">{t('settings.title', 'Ayarlar')}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.subtitle', 'Tema, dil, API key')}</p>
                        </div>
                    </button>
                    
                    <button
                        onClick={() => navigate('/pricing')}
                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <div className="text-left">
                            <p className="font-semibold">{t('pricing.title', 'Planlar')}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('pricing.upgrade', 'Planını yükselt')}</p>
                        </div>
                    </button>
                </div>
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