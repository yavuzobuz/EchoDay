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
  
  // Debug logging
  console.log(`[useSettingsStorage] Key: ${key}`);
  console.log(`[useSettingsStorage] isElectron:`, isElectron);
  console.log(`[useSettingsStorage] electronAPI available:`, !!(window as any).electronAPI);

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
      console.log(`[useSettingsStorage] Loading ${key} from Electron...`);
      window.electronAPI.getSetting(key).then((value) => {
        console.log(`[useSettingsStorage] Loaded ${key}:`, value ? '✅ Found' : '❌ Not found');
        if (value !== null && value !== undefined) {
          setStoredValue(value);
        }
      }).catch((error) => {
        console.error(`[useSettingsStorage] Error loading ${key} from Electron settings:`, error);
      });
    } else {
      // Browser: when the key changes (e.g., userId becomes available after auth), reload from localStorage
      try {
        console.log(`[useSettingsStorage] Reloading ${key} from localStorage (web)...`);
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValue);
      } catch (error) {
        console.error(`Error reloading ${key} from localStorage:`, error);
      }
    }
  }, [key, isElectron]);

  const setValue = (value: T) => {
    try {
      console.log(`[useSettingsStorage] Setting ${key}:`, value);
      setStoredValue(value);
      
      if (isElectron && window.electronAPI) {
        console.log(`[useSettingsStorage] Saving ${key} to Electron...`);
        // Save to Electron settings
        window.electronAPI.setSetting(key, value).then((success) => {
          console.log(`[useSettingsStorage] Saved ${key} to Electron:`, success ? '✅ Success' : '❌ Failed');
        }).catch((error) => {
          console.error(`[useSettingsStorage] Error saving ${key} to Electron settings:`, error);
        });
      } else {
        console.log(`[useSettingsStorage] Saving ${key} to localStorage...`);
        // Save to localStorage for browser
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`[useSettingsStorage] Error setting ${key}:`, error);
    }
  };

  return [storedValue, setValue];
}
