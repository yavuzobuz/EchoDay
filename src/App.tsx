import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useLocalStorage from './hooks/useLocalStorage';
import { useSettingsStorage } from './hooks/useSettingsStorage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { I18nProvider } from './contexts/I18nContext';
import ErrorBoundary from './components/ErrorBoundary';
import Welcome from './pages/Welcome';
import Main from './Main';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Messages from './pages/Messages';
import Email from './pages/Email';
import GmailCallback from './components/auth/GmailCallback';
import Pricing from './pages/Pricing';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboardRealtime from './pages/admin/AdminDashboardRealtime';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';
import AdminContent from './pages/admin/AdminContent';
import AdminEmails from './pages/admin/AdminEmails';
import AdminNotifications from './pages/admin/AdminNotifications';

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

// Admin Protected Route Component
function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();

  console.log('[AdminProtectedRoute] authLoading:', authLoading, 'adminLoading:', adminLoading);
  console.log('[AdminProtectedRoute] user:', user?.id);
  console.log('[AdminProtectedRoute] isAdmin:', isAdmin);

  if (authLoading || adminLoading) {
    console.log('[AdminProtectedRoute] Loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('[AdminProtectedRoute] No user, redirecting to login');
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    console.log('[AdminProtectedRoute] User is not admin, access denied');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md p-8 bg-red-900/20 border border-red-500 rounded-xl">
          <h2 className="text-2xl font-bold text-white mb-4">Erişim Reddedildi</h2>
          <p className="text-red-300 mb-6">
            Bu alana erişim yetkiniz yok. Sadece admin kullanıcıları erişebilir.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  console.log('[AdminProtectedRoute] Access granted! Rendering children...');
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
              onGetStarted={() => navigate(user ? '/app' : '/login')}
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
                onNavigateToHome={() => navigate('/welcome')}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={user ? '/app' : '/welcome'} replace />}
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
        <Route
          path="/email"
          element={
            <ProtectedRoute>
              <Email />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auth/gmail/callback"
          element={<GmailCallback />}
        />
        <Route
          path="/pricing"
          element={<Pricing />}
        />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboardRealtime />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminProtectedRoute>
              <AdminUsers />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminProtectedRoute>
              <AdminAnalytics />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminProtectedRoute>
              <AdminSettings />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/content"
          element={
            <AdminProtectedRoute>
              <AdminContent />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/emails"
          element={
            <AdminProtectedRoute>
              <AdminEmails />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <AdminProtectedRoute>
              <AdminNotifications />
            </AdminProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

const App: React.FC = () => {
  const isElectron = typeof (window as any).electronAPI !== 'undefined' || typeof (window as any).isElectron !== 'undefined';
  const Router: React.ComponentType<React.PropsWithChildren<{}>> = isElectron ? (HashRouter as any) : (BrowserRouter as any);
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AdminAuthProvider>
            <I18nProvider>
              <AppContent />
            </I18nProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
