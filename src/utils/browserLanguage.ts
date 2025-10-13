import type { Lang } from '../contexts/I18nContext';

/**
 * Supported languages in the application
 */
export const SUPPORTED_LANGUAGES: Lang[] = ['tr', 'en'];

/**
 * Detects the user's preferred language from browser settings
 * @returns The detected language code (tr or en)
 */
export function detectBrowserLanguage(): Lang {
  try {
    // Get browser languages in order of preference
    const browserLanguages = navigator.languages || [navigator.language];
    
    console.log('[BrowserLanguage] Available languages:', browserLanguages);
    
    // Check each browser language against our supported languages
    for (const browserLang of browserLanguages) {
      const langCode = browserLang.toLowerCase();
      
      // Direct match (e.g., 'tr', 'en')
      if (SUPPORTED_LANGUAGES.includes(langCode as Lang)) {
        console.log('[BrowserLanguage] Direct match found:', langCode);
        return langCode as Lang;
      }
      
      // Language code with region (e.g., 'tr-TR', 'en-US')
      const primaryLang = langCode.split('-')[0];
      if (SUPPORTED_LANGUAGES.includes(primaryLang as Lang)) {
        console.log('[BrowserLanguage] Primary language match found:', primaryLang);
        return primaryLang as Lang;
      }
      
      // Special cases for common language variants
      if (langCode.startsWith('tr') || langCode.includes('turkish')) {
        console.log('[BrowserLanguage] Turkish variant detected:', langCode);
        return 'tr';
      }
      
      if (langCode.startsWith('en') || langCode.includes('english')) {
        console.log('[BrowserLanguage] English variant detected:', langCode);
        return 'en';
      }
    }
    
    // Fallback: If no match found, default to Turkish for existing users
    console.log('[BrowserLanguage] No match found, defaulting to Turkish');
    return 'tr';
    
  } catch (error) {
    console.warn('[BrowserLanguage] Error detecting browser language:', error);
    return 'tr';
  }
}

/**
 * Gets the current browser language for debugging purposes
 */
export function getBrowserLanguageInfo() {
  return {
    language: navigator.language,
    languages: navigator.languages,
    detected: detectBrowserLanguage()
  };
}

/**
 * Checks if automatic language detection should be used
 * @param savedLanguage The language saved in localStorage
 * @returns Whether to use browser detection or saved preference
 */
export function shouldUseBrowserDetection(savedLanguage: string | null): boolean {
  // If user hasn't explicitly set a language preference, use browser detection
  return !savedLanguage || savedLanguage === 'auto';
}