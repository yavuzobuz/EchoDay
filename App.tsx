import React from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import Welcome from './pages/Welcome';
import Main from './Main';
import Profile from './pages/Profile';

export type AccentColor = 'blue' | 'green' | 'red';
type View = 'welcome' | 'main' | 'profile';

const App: React.FC = () => {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'dark');
  const [accentColor, setAccentColor] = useLocalStorage<AccentColor>('accent-color', 'blue');
  const [view, setView] = useLocalStorage<View>('view', 'welcome');
  const [apiKey, setApiKey] = useLocalStorage<string>('gemini-api-key', '');
  const [assistantName, setAssistantName] = useLocalStorage<string>('assistant-name', 'ATO');


  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (theme === 'dark') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

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
        return <Welcome onGetStarted={handleGetStarted} />;
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
            onNavigateBack={() => setView('main')}
          />
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
          />
        );
    }
  };

  return <div className="app">{renderView()}</div>;
};

export default App;