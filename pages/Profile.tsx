import React, { useState } from 'react';
import { AccentColor } from '../App';

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
  onNavigateBack 
}) => {
  
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [isEditingApiKey, setIsEditingApiKey] = useState(!apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [localAssistantName, setLocalAssistantName] = useState(assistantName);
  const [notification, setNotification] = useState<string | null>(null);

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
            {/* General Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">Genel Ayarlar</h2>
                <div className="flex items-center justify-between">
                    <label className="font-semibold text-lg">Görünüm</label>
                    <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <button onClick={() => setTheme('light')} className={`px-3 py-1 rounded-full text-sm ${theme === 'light' ? 'bg-white shadow' : ''}`}>Açık</button>
                    <button onClick={() => setTheme('dark')} className={`px-3 py-1 rounded-full text-sm ${theme === 'dark' ? 'bg-gray-800 text-white shadow' : ''}`}>Koyu</button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <label className="font-semibold text-lg">Vurgu Rengi</label>
                    <div className="flex items-center gap-3">
                    {accentColors.map(color => (
                        <button key={color.name} onClick={() => setAccentColor(color.name)} className={`w-8 h-8 rounded-full ${color.className} transition-transform transform hover:scale-110 ${accentColor === color.name ? 'ring-2 ring-offset-2 ring-white dark:ring-offset-gray-800' : ''}`} aria-label={`Vurgu rengini ${color.name} yap`} />
                    ))}
                    </div>
                </div>
            </div>

            {/* API Key Settings */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 border-b pb-2 dark:border-gray-600">API Anahtarı</h2>
                {isEditingApiKey ? (
                    <form onSubmit={handleSaveApiKey} className="space-y-3">
                        <label htmlFor="apiKey" className="font-semibold text-lg">Google Gemini API Anahtarı</label>
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