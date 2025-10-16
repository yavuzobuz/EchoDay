import { useState, useEffect, useCallback } from 'react';
import { AIProvider } from '../types/ai';

interface Settings {
  'ai-provider'?: AIProvider;
  'gemini-api-key'?: string;
  'openai-api-key'?: string;
  'anthropic-api-key'?: string;
  // Add other settings as needed
  [key: string]: any;
}

const SETTINGS_STORAGE_KEY = 'echoDaySettings';

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>({});

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
  }, []);

  // Save settings to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [settings]);

  const getSetting = useCallback((key: string): string | undefined => {
    return settings[key];
  }, [settings]);

  const setSetting = useCallback((key: string, value: any) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [key]: value
    }));
  }, []);

  const removeSetting = useCallback((key: string) => {
    setSettings(prevSettings => {
      const { [key]: removed, ...rest } = prevSettings;
      return rest;
    });
  }, []);

  const clearAllSettings = useCallback(() => {
    setSettings({});
  }, []);

  return {
    settings,
    getSetting,
    setSetting,
    removeSetting,
    clearAllSettings
  };
};