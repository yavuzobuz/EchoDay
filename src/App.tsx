import React from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import Welcome from './pages/Welcome';
import Main from './Main';
import Profile from './pages/Profile';
import Auth from './pages/Auth';

export type AccentColor = 'blue' | 'green' | 'red';
type View = 'welcome' | 'main' | 'profile' | 'auth';

const App: React.FC = () => {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'dark');
  const [accentColor, setAccentColor] = useLocalStorage<AccentColor>('accent-color', 'blue');
  const [view, setView] = useLocalStorage<View>('view', 'welcome');
  const [apiKey, setApiKey] = useLocalStorage<string>('gemini-api-key', '');
  const [assistantName, setAssistantName] = useLocalStorage<string>('assistant-name', 'ATO');
  const [followSystemTheme, setFollowSystemTheme] = useLocalStorage<boolean>('theme-follow-system', false);


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
  
  const handleGetStarted = () => {
    setView('main');
  };

  const renderView = () => {
    switch(view) {
      case 'welcome':
        return <Welcome onGetStarted={handleGetStarted} onNavigateToAuth={() => setView('auth')} />;
      case 'profile':
        return (
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
            onNavigateBack={() => setView('main')}
            onShowWelcome={() => setView('welcome')}
          />
        );
      case 'auth':
        return (
          <Auth onNavigateBack={() => setView('welcome')} onAuthSuccess={() => setView('main')} />
        );
      case 'main':
      default:
        return (
          <Main
            theme={theme}
            setTheme={setTheme}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            apiKey={apiKey}
            assistantName={assistantName}
            onNavigateToProfile={() => setView('profile')}
            onShowWelcome={() => setView('welcome')}
          />
        );
    }
  };

  return <div className="app">{renderView()}</div>;
};

export default App;