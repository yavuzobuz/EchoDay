import React from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import WelcomeCyberpunk from './pages/Welcome-cyberpunk';
import MainCyberpunk from './Main-cyberpunk';
import ProfileCyberpunk from './pages/Profile-cyberpunk';

export type AccentColor = 'blue' | 'green' | 'red';
type View = 'welcome' | 'main' | 'profile';

const AppCyberpunk: React.FC = () => {
  const [accentColor, setAccentColor] = useLocalStorage<AccentColor>('accent-color-cyber', 'blue');
  const [view, setView] = useLocalStorage<View>('view-cyber', 'welcome');
  const [apiKey, setApiKey] = useLocalStorage<string>('gemini-api-key-cyber', '');
  const [assistantName, setAssistantName] = useLocalStorage<string>('assistant-name-cyber', 'NEON-BOT');

  // Always keep dark mode for cyberpunk theme
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleGetStarted = () => {
    setView('main');
  };

  const renderView = () => {
    switch(view) {
      case 'welcome':
        return <WelcomeCyberpunk onGetStarted={handleGetStarted} />;
      case 'profile':
        return (
          <ProfileCyberpunk
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            apiKey={apiKey}
            setApiKey={setApiKey}
            assistantName={assistantName}
            setAssistantName={setAssistantName}
            onNavigateBack={() => setView('main')}
            onShowWelcome={() => setView('welcome')}
          />
        );
      case 'main':
      default:
        return (
          <MainCyberpunk
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

  return <div className="app cyber-app">{renderView()}</div>;
};

export default AppCyberpunk;
