import { useState, useEffect } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      setSetting: (key: string, value: any) => Promise<boolean>;
      getSetting: (key: string) => Promise<any>;
      getAllSettings: () => Promise<Record<string, any>>;
      deleteSetting: (key: string) => Promise<boolean>;
    };
  }
}

/**
 * A hook that persists settings using Electron IPC when available,
 * otherwise falls back to localStorage for browser compatibility
 */
export function useSettingsStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.setSetting;

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (isElectron) {
      // We'll load async, so return initial for now
      return initialValue;
    } else {
      // Browser: use localStorage
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        console.error(`Error loading ${key} from localStorage:`, error);
        return initialValue;
      }
    }
  });

  // Load from Electron settings on mount OR reload when key changes
  useEffect(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.getSetting(key).then((value) => {
        if (value !== null && value !== undefined) {
          setStoredValue(value);
        }
      }).catch((error) => {
        console.error(`[useSettingsStorage] Error loading setting:`, error);
      });
    } else {
      // Browser: when the key changes (e.g., userId becomes available after auth), reload from localStorage
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValue);
      } catch (error) {
        console.error(`Error reloading from localStorage:`, error);
      }
    }
  }, [key, isElectron]);

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      
      if (isElectron && window.electronAPI) {
        // Save to Electron settings
        window.electronAPI.setSetting(key, value).catch((error) => {
          console.error(`[useSettingsStorage] Error saving setting:`, error);
        });
      } else {
        // Save to localStorage for browser
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`[useSettingsStorage] Error setting value:`, error);
    }
  };

  return [storedValue, setValue];
}
