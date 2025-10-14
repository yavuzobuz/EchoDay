// Mobile Environment Service for Capacitor/Android builds
// This service handles environment variables for mobile platforms where process.env is not available

export interface MobileEnvConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_GEMINI_API_KEY: string;
  [key: string]: string;
}

// Default configuration - will be overridden by injected values
export const defaultMobileEnv: MobileEnvConfig = {
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
  VITE_GEMINI_API_KEY: ''
};

// Get environment variable for mobile platforms
export function getMobileEnvVar(key: string): string | undefined {
  // For Capacitor/Android builds, check window.androidEnv first
  if (typeof window !== 'undefined' && (window as any).androidEnv) {
    return (window as any).androidEnv[key];
  }
  
  // Fallback to regular environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] as string;
  }
  
  // Fallback to process.env (Node.js environment)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  return undefined;
}

// Check if we're running in a mobile environment
export function isMobileEnvironment(): boolean {
  // Check for Capacitor
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return true;
  }
  
  // Check for Android environment variables
  if (typeof window !== 'undefined' && (window as any).androidEnv) {
    return true;
  }
  
  // Check for mobile user agent
  if (typeof navigator !== 'undefined') {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(navigator.userAgent);
  }
  
  return false;
}