// Backup taken before restoring UI from origin/master
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useLocalStorage from './hooks/useLocalStorage';
import { useSettingsStorage } from './hooks/useSettingsStorage';
import { useFirstRun } from './hooks/useFirstRun';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Welcome from './pages/Welcome';
import Main from '../Main';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Messages from './pages/Messages';

export type AccentColor = 'blue' | 'green' | 'red';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isFirstRun, loading: firstRunLoading, markAsNotFirstRun } = useFirstRun();
  const userId = user?.id || 'guest';
  
  // User-specific settings
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(`theme_${userId}`, 'dark');
  const [accentColor, setAccentColor] = useLocalStorage<AccentColor>(`accent-color_${userId}`, 'blue');
  // Use Electron-compatible storage for API key
  const [apiKey, setApiKey] = useSettingsStorage<string>(`gemini-api-key_${userId}`, '');
  const [assistantName, setAssistantName] = useLocalStorage<string>(`assistant-name_${userId}`, 'ATO');
  const [followSystemTheme, setFollowSystemTheme] = useLocalStorage<boolean>(`theme-follow-system_${userId}`, false);


  // Apply theme class to HTML
  React.useEffect(() => {
    console.log('[App] Theme changed to:', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (theme === 'dark') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    console.log('[App] HTML classes:', document.documentElement.classList.toString());
  }, [theme]);

  // Follow system theme when enabled
  React.useEffect(() => {
    if (!followSystemTheme) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setTheme(media.matches ? 'dark' : 'light');
    apply();
    const listener = () => apply();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
    } else {
      // Safari
      // @ts-ignore
      media.addListener(listener);
    }
    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', listener);
      } else {
        // @ts-ignore
        media.removeListener(listener);
      }
    };
  }, [followSystemTheme, setTheme]);

  React.useEffect(() => {
    const root = document.documentElement;
    const currentTheme = accentColor;
    // Set font based on theme
    document.body.classList.remove('font-theme-blue', 'font-theme-green', 'font-theme-red');
    document.body.classList.add(`font-theme-${currentTheme}`);

    // Set accent colors
    root.style.setProperty('--accent-color-100', `var(--${currentTheme}-100)`);
    root.style.setProperty('--accent-color-300', `var(--${currentTheme}-300)`);
    root.style.setProperty('--accent-color-500', `var(--${currentTheme}-500)`);
    root.style.setProperty('--accent-color-600', `var(--${currentTheme}-600)`);
    root.style.setProperty('--accent-color-700', `var(--${currentTheme}-700)`);
    root.style.setProperty('--accent-color-900', `var(--${currentTheme}-900)`);
  }, [accentColor]);

  // Loading state - hem auth hem first-run yüklenene kadar bekle
  if (authLoading || firstRunLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            {authLoading ? 'Kullanıcı bilgileri kontrol ediliyor...' : 'İlk açılış kontrolü yapılıyor...'}
          </p>
        </div>
      </div>
    );
  }

  // First-run onboarding handler
  const handleFinishOnboarding = async () => {
    console.log('[App] Finishing onboarding, marking as not first run');
    await markAsNotFirstRun();
    // Auth durumuna göre yönlendirme
    if (user) {
      navigate('/app');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/welcome"
          element={
            <Welcome
              onGetStarted={() => navigate('/app')}
              onNavigateToAuth={() => navigate('/login')}
              isFirstRun={isFirstRun === true}
              onFinishOnboarding={handleFinishOnboarding}
            />
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Main
                theme={theme}
                setTheme={setTheme}
                accentColor={accentColor}
                setAccentColor={setAccentColor}
                apiKey={apiKey}
                assistantName={assistantName}
                userId={userId}
                onNavigateToProfile={() => navigate('/profile')}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            // İlk açılış ise welcome sayfasına yönlendir
            isFirstRun === true 
              ? <Navigate to="/welcome" replace /> 
              : user 
                ? <Navigate to="/app" replace /> 
                : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile
                theme={theme}
                setTheme={setTheme}
                accentColor={accentColor}
                setAccentColor={setAccentColor}
                apiKey={apiKey}
                setApiKey={setApiKey}
                assistantName={assistantName}
                setAssistantName={setAssistantName}
                followSystemTheme={followSystemTheme}
                setFollowSystemTheme={setFollowSystemTheme}
                onNavigateBack={() => navigate('/app')}
                onShowWelcome={() => navigate('/welcome')}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
