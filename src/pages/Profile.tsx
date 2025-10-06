import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccentColor } from '../App';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { archiveService } from '../services/archiveService';
import { DayStat } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile, getUserStats, createDefaultProfile, createDefaultStats } from '../services/profileService';
import { UserProfile, UserStats, DEFAULT_AVATARS } from '../types/profile';

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
  onShowWelcome: () => void;
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
  onShowWelcome,
  followSystemTheme,
  setFollowSystemTheme
}) => {
  const { user, signOut } = useAuth();
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
  const [profileStats, setProfileStats] = useState<UserStats | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [localName, setLocalName] = useState('');
  const [localBio, setLocalBio] = useState('');
  const [localAvatar, setLocalAvatar] = useState('😊');
  const [profileLoading, setProfileLoading] = useState(true);

  const handleSignOut = async () => {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
      await signOut();
      navigate('/login');
    }
  };

  // Follow system theme toggle (stored in localStorage)
  const [followSystem, setFollowSystem] = useState<boolean>(followSystemTheme);

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
      const [profileData, statsData] = await Promise.all([
        getUserProfile(userId),
        getUserStats(userId)
      ]);
      
      const finalProfile = profileData || createDefaultProfile(userId);
      const finalStats = statsData || createDefaultStats();
      
      setProfile(finalProfile);
      setProfileStats(finalStats);
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
      setNotification('İsim boş olamaz!');
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
      setNotification('Profil başarıyla güncellendi!');
      setTimeout(() => setNotification(null), 3000);
    } else {
      setNotification('Profil güncellenirken hata oluştu!');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSelectAvatar = (avatar: string) => {
    setLocalAvatar(avatar);
    setShowAvatarPicker(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
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
        const todaysCurrent = currentTodos.filter((t: any) => new Date(t.createdAt).toISOString().startsWith(dateStr));
        const { todos: archivedToday } = await archiveService.getArchivedItemsForDate(dateStr, userId);
        const allToday = [...todaysCurrent, ...archivedToday];
        const todayTotal = allToday.length;
        const todayCompleted = allToday.filter((t: any) => t.completed).length;

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
  }, [user]);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (localApiKey.trim()) {
        setApiKey(localApiKey.trim());
        setIsEditingApiKey(false);
        setNotification('API Anahtarı başarıyla kaydedildi!');
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
        setNotification('Asistan ismi başarıyla kaydedildi!');
        setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-4 sticky top-0 z-40 flex items-center border-b border-gray-200 dark:border-gray-800">
        <button 
          onClick={onNavigateBack} 
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Geri dön"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold ml-4">Profil ve Ayarlar</h1>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-2xl">
        <div className="space-y-8">
            {/* User Profile Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">Kullanıcı Profili</h2>
                
                {profileLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-color-500)]"></div>
                    </div>
                ) : isEditingProfile ? (
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        {/* Avatar Picker */}
                        <div>
                            <label className="font-semibold text-lg block mb-2">Avatar</label>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                    className="text-6xl hover:scale-110 transition-transform"
                                >
                                    {localAvatar}
                                </button>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Avatar seçmek için tıklayın</span>
                            </div>
                            {showAvatarPicker && (
                                <div className="mt-3 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                    <div className="grid grid-cols-8 gap-2">
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
                            <label htmlFor="profileName" className="font-semibold text-lg block mb-2">İsim</label>
                            <input
                                id="profileName"
                                type="text"
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                                placeholder="İsminizi girin"
                                required
                            />
                        </div>

                        {/* Bio Input */}
                        <div>
                            <label htmlFor="profileBio" className="font-semibold text-lg block mb-2">Biyografi</label>
                            <textarea
                                id="profileBio"
                                value={localBio}
                                onChange={(e) => setLocalBio(e.target.value)}
                                rows={3}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none resize-none"
                                placeholder="Kendiniz hakkında kısa bir açıklama..."
                            />
                        </div>

                        <div className="flex gap-2">
                            <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">Kaydet</button>
                            <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">İptal</button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="text-6xl">{profile?.avatar || '😊'}</div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile?.name || 'Kullanıcı'}</h3>
                                {profile?.bio && (
                                    <p className="text-gray-600 dark:text-gray-400 mt-2">{profile.bio}</p>
                                )}
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                    Üyelik tarihi: {profile?.createdAt ? formatDate(profile.createdAt) : '-'}
                                </p>
                            </div>
                            <button 
                                onClick={handleEditProfile}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                                Düzenle
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Statistics */}
            {!profileLoading && profileStats && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">Profil İstatistikleri</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                            <div className="text-3xl font-bold text-[var(--accent-color-600)]">{profileStats?.totalTodos || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Toplam Görev</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{profileStats?.completedTodos || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tamamlanan Görev</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                            <div className="text-3xl font-bold text-[var(--accent-color-600)]">{profileStats?.totalNotes || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Toplam Not</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                            <div className="text-3xl font-bold text-[var(--accent-color-600)]">{profileStats?.daysActive || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Aktif Gün</div>
                        </div>
                    </div>
                    {profileStats && profileStats.completedTodos > 0 && profileStats.totalTodos > 0 && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold">Tamamlanma Oranı</span>
                                <span className="text-sm font-bold text-[var(--accent-color-600)]">
                                    {Math.round((profileStats.completedTodos / profileStats.totalTodos) * 100)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                <div 
                                    className="bg-[var(--accent-color-600)] h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${(profileStats.completedTodos / profileStats.totalTodos) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* User Info & Sign Out */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600 mb-4">Hesap Bilgileri</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Giriş Yapılmış Hesap</p>
                        <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{user?.email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Kullanıcı ID: {user?.id.substring(0, 8)}...</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/70 font-medium"
                    >
                        Çıkış Yap
                    </button>
                </div>
            </div>

            {/* General Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">Genel Ayarlar</h2>
                <div className="flex items-center justify-between">
                    <label className="font-semibold text-lg">Görünüm</label>
                    <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <button onClick={() => { setFollowSystem(false); setFollowSystemTheme(false); setTheme('light'); }} className={`px-3 py-1 rounded-full text-sm ${!followSystem && theme === 'light' ? 'bg-white shadow' : ''}`}>Açık</button>
                      <button onClick={() => { setFollowSystem(false); setFollowSystemTheme(false); setTheme('dark'); }} className={`px-3 py-1 rounded-full text-sm ${!followSystem && theme === 'dark' ? 'bg-gray-800 text-white shadow' : ''}`}>Koyu</button>
                      <button onClick={() => { setFollowSystem(true); setFollowSystemTheme(true); const media = window.matchMedia('(prefers-color-scheme: dark)'); setTheme(media.matches ? 'dark' : 'light'); }} className={`px-3 py-1 rounded-full text-sm ${followSystem ? 'bg-[var(--accent-color-600)] text-white shadow' : ''}`}>Sistem</button>
                    </div>
                </div>

                {/* Daily summary time */}
                <div className="flex items-center justify-between">
                    <label className="font-semibold text-lg">Gün Başı Özeti Saati</label>
                    <input
                        type="time"
                        defaultValue={localStorage.getItem(`daily-summary-time_${user?.id}`) || '08:00'}
                        onChange={(e) => localStorage.setItem(`daily-summary-time_${user?.id}`, e.target.value || '08:00')}
                        className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <label className="font-semibold text-lg">Vurgu Rengi</label>
                    <div className="flex items-center gap-3">
                    {accentColors.map(color => (
                        <button key={color.name} onClick={() => setAccentColor(color.name)} className={`w-8 h-8 rounded-full ${color.className} transition-transform transform hover:scale-110 ${accentColor === color.name ? 'ring-2 ring-offset-2 ring-white dark:ring-offset-gray-800' : ''}`} aria-label={`Vurgu rengini ${color.name} yap`} />
                    ))}
                    </div>
                </div>
                 <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
                    <label htmlFor="show-welcome" className="font-semibold text-lg">Karşılama Ekranı</label>
                    <button
                        id="show-welcome"
                        onClick={onShowWelcome}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                    >
                        Tekrar Göster
                    </button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
                    <div>
                        <label className="font-semibold text-lg block">Tarayıcı Bildirimleri</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hatırlatmalar için bildirim izni gereklidir</p>
                    </div>
                    <button
                        onClick={() => {
                            if ('Notification' in window) {
                                Notification.requestPermission().then(permission => {
                                    if (permission === 'granted') {
                                        setNotification('Bildirim izni verildi!');
                                    } else {
                                        setNotification('Bildirim izni reddedildi.');
                                    }
                                    setTimeout(() => setNotification(null), 3000);
                                });
                            } else {
                                setNotification('Tarayıcınız bildirimleri desteklemiyor.');
                                setTimeout(() => setNotification(null), 3000);
                            }
                        }}
                        className={`px-4 py-2 rounded-md text-sm ${
                            'Notification' in window && Notification.permission === 'granted'
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                    >
                        {'Notification' in window && Notification.permission === 'granted' ? '✓ Aktif' : 'İzin Ver'}
                    </button>
                </div>
            </div>

            {/* API Key Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">API Anahtarı</h2>
                {isEditingApiKey ? (
                    <form onSubmit={handleSaveApiKey} className="space-y-3">
                        <label htmlFor="apiKey" className="font-semibold text-lg">AI API Anahtarı</label>
                        <div className="relative">
                            <input
                                id="apiKey"
                                type={showApiKey ? 'text' : 'password'}
                                value={localApiKey}
                                onChange={(e) => setLocalApiKey(e.target.value)}
                                className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                                placeholder="API anahtarınızı buraya yapıştırın"
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
                            AI özelliklerini kullanmak için API anahtarı gereklidir. Anahtarınızı <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-color-500)] hover:underline">Google AI Studio</a>'dan alabilirsiniz.
                        </p>
                        <div className="flex gap-2">
                           <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">Kaydet</button>
                           {apiKey && <button type="button" onClick={() => setIsEditingApiKey(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">İptal</button>}
                        </div>
                    </form>
                ) : (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-lg text-green-600 dark:text-green-400">API Anahtarı Yapılandırıldı</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{apiKey.substring(0, 4)}...{apiKey.substring(apiKey.length - 4)}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleEditApiKey} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Değiştir</button>
                            <button onClick={handleDeleteApiKey} className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/80">Sil</button>
                        </div>
                    </div>
                )}
            </div>


            {/* Data Backup & Import */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">Veri Yedekleme ve İçe Aktarma</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Görevler, notlar ve sohbet geçmişinizi JSON olarak dışa aktarabilir veya geri yükleyebilirsiniz.</p>
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
                                setNotification('Arşiv indirildi.');
                                setTimeout(() => setNotification(null), 3000);
                            } catch (e) {
                                setNotification('Arşiv dışa aktarılamadı.');
                                setTimeout(() => setNotification(null), 3000);
                            }
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        Arşivi Dışa Aktar
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
                                setNotification('Veriler JSON olarak indirildi.');
                                setTimeout(() => setNotification(null), 3000);
                            } catch (e) {
                                setNotification('Dışa aktarma başarısız.');
                                setTimeout(() => setNotification(null), 3000);
                            }
                        }}
                        className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]"
                    >
                        JSON Dışa Aktar
                    </button>
                    <label className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 cursor-pointer inline-flex items-center justify-center">
                        JSON İçe Aktar
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
                                        setNotification('Veriler içe aktarıldı. Ana sayfada görüntüleyebilirsiniz.');
                                        setTimeout(() => setNotification(null), 3000);
                                    } catch {
                                        setNotification('Geçersiz JSON dosyası.');
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
                            if (confirm('Tüm görevleri, notları ve sohbet geçmişini temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
                                const userId = user?.id || 'guest';
                                localStorage.removeItem(`todos_${userId}`);
                                localStorage.removeItem(`notes_${userId}`);
                                localStorage.removeItem(`chatHistory_${userId}`);
                                setNotification('Veriler temizlendi.');
                                setTimeout(() => setNotification(null), 3000);
                            }
                        }}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/70"
                    >
                        Tüm Verileri Temizle
                    </button>
                </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">Kullanım İstatistikleri</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                        <div className="text-gray-500 dark:text-gray-400">Bugün</div>
                        <div className="mt-1 font-semibold text-lg">{stats.todayCompleted}/{stats.todayTotal} tamamlandı</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Oran: {stats.todayTotal ? Math.round((stats.todayCompleted / stats.todayTotal) * 100) : 0}%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                        <div className="text-gray-500 dark:text-gray-400">Son 7 Gün</div>
                        <div className="mt-1 font-semibold text-lg">{stats.weekCompleted}/{stats.weekTotal} tamamlandı</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Oran: {stats.weekTotal ? Math.round((stats.weekCompleted / stats.weekTotal) * 100) : 0}%</div>
                    </div>
                </div>

                {/* Top Categories & 7-day sparkline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-semibold mb-2">En Aktif Kategoriler</div>
                        {topCategories.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {topCategories.map((cat) => (
                                    <span key={cat} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-[var(--accent-color-100)] text-[var(--accent-color-700)] dark:bg-gray-700 dark:text-gray-200 border border-[var(--accent-color-300)]/50">
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500 dark:text-gray-400">Veri yok</div>
                        )}
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-semibold mb-2">7 Günlük Aktivite</div>
                        {last7Days.length > 0 ? (
                          <div className="h-24 flex items-end gap-1">
                            {(() => {
                              const max = Math.max(1, ...last7Days.map(d => d.count));
                              return last7Days.map((d) => (
                                <div key={d.date} className="flex-1 flex flex-col items-center">
                                  <div className="w-full bg-[var(--accent-color-600)]/70 dark:bg-[var(--accent-color-600)]/80 rounded-t-md" style={{ height: `${(d.count / max) * 88}%` }}></div>
                                  <span className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{new Date(d.date).toLocaleDateString('tr-TR', { day: '2-digit' })}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 dark:text-gray-400">Veri yok</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Assistant Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">Asistan Ayarları</h2>
                <form onSubmit={handleSaveAssistantName} className="space-y-3">
                    <label htmlFor="assistantName" className="font-semibold text-lg">Asistan İsmi</label>
                    <div className="flex gap-2">
                        <input
                            id="assistantName"
                            type="text"
                            value={localAssistantName}
                            onChange={(e) => setLocalAssistantName(e.target.value)}
                            className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                            placeholder="Örn: Jarvis"
                        />
                        <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">Kaydet</button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Bu isim, asistanı sesli olarak aktive etmek için "uyandırma kelimesi" olarak kullanılır.</p>
                </form>
            </div>

            {/* TTS Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                <div className="flex items-center justify-between border-b pb-2 dark:border-gray-600">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Sesli Yanıtlar (TTS)</h2>
                    <button
                        onClick={() => {
                            tts.updateSettings({ enabled: !tts.settings.enabled });
                            setNotification(tts.settings.enabled ? 'Sesli yanıtlar devre dışı!' : 'Sesli yanıtlar aktif!');
                            setTimeout(() => setNotification(null), 3000);
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            tts.settings.enabled
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                    >
                        {tts.settings.enabled ? '✓ Aktif' : 'Devre Dışı'}
                    </button>
                </div>

                {/* Reminder sound selection */}
                <div className="pt-4 border-t dark:border-gray-700">
                    <h3 className="font-semibold mb-2">Hatırlatma Sesi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <label className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-700">
                            <input
                                type="radio"
                                name="reminderSound"
                                defaultChecked={(localStorage.getItem(`reminderSound_${user?.id}`) || 'tts') === 'tts'}
                                onChange={() => localStorage.setItem(`reminderSound_${user?.id}`, 'tts')}
                            />
                            <span>Sesli hatırlatma (TTS)</span>
                        </label>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-700">
                            <label className="flex items-center gap-2 flex-1">
                                <input type="radio" name="reminderSound" defaultChecked={localStorage.getItem(`reminderSound_${user?.id}`) === 'alarm1'} onChange={() => localStorage.setItem(`reminderSound_${user?.id}`, 'alarm1')} />
                                <span>Alarm 1</span>
                            </label>
                            <button type="button" onClick={() => import('../utils/reminderSounds').then(m => m.playReminderSound('alarm1'))} className="px-2 py-1 text-xs rounded bg-[var(--accent-color-600)] text-white">Dinle</button>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-700">
                            <label className="flex items-center gap-2 flex-1">
                                <input type="radio" name="reminderSound" defaultChecked={localStorage.getItem(`reminderSound_${user?.id}`) === 'alarm2'} onChange={() => localStorage.setItem(`reminderSound_${user?.id}`, 'alarm2')} />
                                <span>Alarm 2</span>
                            </label>
                            <button type="button" onClick={() => import('../utils/reminderSounds').then(m => m.playReminderSound('alarm2'))} className="px-2 py-1 text-xs rounded bg-[var(--accent-color-600)] text-white">Dinle</button>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-700">
                            <label className="flex items-center gap-2 flex-1">
                                <input type="radio" name="reminderSound" defaultChecked={localStorage.getItem(`reminderSound_${user?.id}`) === 'alarm3'} onChange={() => localStorage.setItem(`reminderSound_${user?.id}`, 'alarm3')} />
                                <span>Alarm 3</span>
                            </label>
                            <button type="button" onClick={() => import('../utils/reminderSounds').then(m => m.playReminderSound('alarm3'))} className="px-2 py-1 text-xs rounded bg-[var(--accent-color-600)] text-white">Dinle</button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 md:col-span-2">Not: TTS seçeneği açık olsa da cihazınız sessizdeyse konuşma duyulmayabilir. Alarm sesleri Web Audio ile üretilir ve kısa bildirim tonlarıdır.</p>
                    </div>
                </div>

                {tts.hasSupport ? (
                    <div className="space-y-5">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            AI asistanın yanıtlarını, günlük özetleri ve hatırlatmaları sesli olarak dinleyebilirsiniz.
                        </p>

                        {/* Speech Rate */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="font-semibold text-sm">Konuşma Hızı</label>
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
                                <span>Yavaş</span>
                                <span>Normal</span>
                                <span>Hızlı</span>
                            </div>
                        </div>

                        {/* Speech Pitch */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="font-semibold text-sm">Ses Tonu</label>
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
                                <span>Pes</span>
                                <span>Normal</span>
                                <span>Tiz</span>
                            </div>
                        </div>

                        {/* Volume */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="font-semibold text-sm">Ses Seviyesi</label>
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
                                <label className="font-semibold text-sm block">Ses Seçimi</label>
                                <select
                                    value={tts.settings.voice || ''}
                                    onChange={(e) => tts.updateSettings({ voice: e.target.value || undefined })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none text-sm"
                                    disabled={!tts.settings.enabled}
                                >
                                    <option value="">Varsayılan Ses</option>
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
                                onClick={() => tts.speak('Merhaba! Ben senin yapay zeka asistanın. Sesli yanıtlar şimdi aktif.')}
                                disabled={!tts.settings.enabled || tts.isSpeaking}
                                className="w-full px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
                            >
                                {tts.isSpeaking ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Konuşuyor...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                                        </svg>
                                        Sesli Testi Yap
                                    </>
                                )}
                            </button>
                            {tts.isSpeaking && (
                                <button
                                    onClick={tts.cancel}
                                    className="w-full mt-2 px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/80 text-sm font-medium"
                                >
                                    Durdur
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Tarayıcınız sesli yanıtları desteklemiyor.
                        </p>
                    </div>
                )}
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