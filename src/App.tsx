import React from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useLocalStorage from './hooks/useLocalStorage';
import { useSettingsStorage } from './hooks/useSettingsStorage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Welcome from './pages/Welcome';
import Main from './Main';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';

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
  const { user } = useAuth();
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
                onNavigateToProfile={() => navigate('/profile')}
                onShowWelcome={() => navigate('/welcome')}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to="/welcome" replace />}
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