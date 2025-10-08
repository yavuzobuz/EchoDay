import { useState, useEffect } from 'react';

interface FirstRunState {
  isFirstRun: boolean | null; // null = loading, true = first run, false = not first run
  isElectron: boolean;
  loading: boolean;
}

export const useFirstRun = () => {
  const [state, setState] = useState<FirstRunState>({
    isFirstRun: null,
    isElectron: false,
    loading: true,
  });

  useEffect(() => {
    const checkFirstRun = async () => {
      // Electron environment detection
      const isElectron = !!(window as any).isElectron || !!(window as any).electronAPI;
      
      console.log('[useFirstRun] Environment check - isElectron:', isElectron);
      
      if (isElectron) {
        // Electron: Use electron-store via IPC
        try {
          const electronAPI = (window as any).electronAPI;
          if (electronAPI && electronAPI.store) {
            const isFirstRun = await electronAPI.store.get('isFirstRun', true);
            console.log('[useFirstRun] Electron store value:', isFirstRun);
            
            setState({
              isFirstRun: isFirstRun,
              isElectron: true,
              loading: false,
            });
          } else {
            // Fallback if electron-store IPC not available
            console.warn('[useFirstRun] Electron store IPC not available, using localStorage fallback');
            const fallbackValue = localStorage.getItem('echoday-first-run');
            const isFirstRun = fallbackValue === null ? true : fallbackValue === 'true';
            
            setState({
              isFirstRun,
              isElectron: true,
              loading: false,
            });
          }
        } catch (error) {
          console.error('[useFirstRun] Error accessing Electron store:', error);
          // Fallback to localStorage
          const fallbackValue = localStorage.getItem('echoday-first-run');
          const isFirstRun = fallbackValue === null ? true : fallbackValue === 'true';
          
          setState({
            isFirstRun,
            isElectron: true,
            loading: false,
          });
        }
      } else {
        // Web/Mobile: Use localStorage
        try {
          const storedValue = localStorage.getItem('echoday-first-run');
          const isFirstRun = storedValue === null ? true : storedValue === 'true';
          
          console.log('[useFirstRun] Web localStorage value:', storedValue, 'isFirstRun:', isFirstRun);
          
          setState({
            isFirstRun,
            isElectron: false,
            loading: false,
          });
        } catch (error) {
          console.error('[useFirstRun] Error accessing localStorage:', error);
          // Ultimate fallback
          setState({
            isFirstRun: true,
            isElectron: false,
            loading: false,
          });
        }
      }
    };

    checkFirstRun();
  }, []);

  const markAsNotFirstRun = async () => {
    console.log('[useFirstRun] Marking as not first run');
    
    if (state.isElectron) {
      // Electron: Use electron-store via IPC
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && electronAPI.store) {
          await electronAPI.store.set('isFirstRun', false);
          console.log('[useFirstRun] Electron store updated');
        } else {
          // Fallback to localStorage
          localStorage.setItem('echoday-first-run', 'false');
          console.log('[useFirstRun] localStorage fallback used');
        }
      } catch (error) {
        console.error('[useFirstRun] Error updating Electron store:', error);
        localStorage.setItem('echoday-first-run', 'false');
      }
    } else {
      // Web/Mobile: Use localStorage
      try {
        localStorage.setItem('echoday-first-run', 'false');
        console.log('[useFirstRun] localStorage updated');
      } catch (error) {
        console.error('[useFirstRun] Error updating localStorage:', error);
      }
    }

    setState(prev => ({
      ...prev,
      isFirstRun: false,
    }));
  };

  const resetFirstRun = async () => {
    console.log('[useFirstRun] Resetting to first run state');
    
    if (state.isElectron) {
      // Electron: Use electron-store via IPC
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && electronAPI.store) {
          await electronAPI.store.set('isFirstRun', true);
        } else {
          localStorage.setItem('echoday-first-run', 'true');
        }
      } catch (error) {
        console.error('[useFirstRun] Error resetting Electron store:', error);
        localStorage.setItem('echoday-first-run', 'true');
      }
    } else {
      // Web/Mobile: Use localStorage
      try {
        localStorage.setItem('echoday-first-run', 'true');
      } catch (error) {
        console.error('[useFirstRun] Error resetting localStorage:', error);
      }
    }

    setState(prev => ({
      ...prev,
      isFirstRun: true,
    }));
  };

  return {
    isFirstRun: state.isFirstRun,
    isElectron: state.isElectron,
    loading: state.loading,
    markAsNotFirstRun,
    resetFirstRun, // For testing/debugging purposes
  };
};

export default useFirstRun;