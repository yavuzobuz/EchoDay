import { PluginListenerHandle } from '@capacitor/core';

export interface OfflineSpeechPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  
  startListening(options: {
    preferOffline?: boolean;
    language?: string;
  }): Promise<{ success: boolean }>;
  
  stopListening(): Promise<{ success: boolean }>;
  
  cancel(): Promise<{ success: boolean }>;
  
  isListening(): Promise<{ listening: boolean }>;
  
  addListener(
    eventName: 'speechResults',
    listenerFunc: (data: { results: string[]; isFinal: boolean }) => void
  ): Promise<PluginListenerHandle>;
  
  addListener(
    eventName: 'speechPartialResults', 
    listenerFunc: (data: { text: string; isFinal: boolean }) => void
  ): Promise<PluginListenerHandle>;
  
  addListener(
    eventName: 'speechError',
    listenerFunc: (data: {
      error: string;
      errorCode: number;
      isNoMatch?: boolean;
      isTimeout?: boolean;
      isServerError?: boolean;
      isNetworkError?: boolean;
      shouldShowError: boolean;
      suggestOffline?: boolean;
    }) => void
  ): Promise<PluginListenerHandle>;
  
  addListener(
    eventName: 'speechStateChange',
    listenerFunc: (data: { status: 'ready' | 'speaking' | 'ended' }) => void
  ): Promise<PluginListenerHandle>;
  
  removeAllListeners(): Promise<void>;
}

export interface OfflineSpeechOptions {
  preferOffline?: boolean;
  language?: string;
  fallbackToOnline?: boolean;
  accuracyThreshold?: number;
}

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  isOffline: boolean;
  source: 'offline' | 'online' | 'hybrid';
}

export interface SpeechRecognitionError {
  code: number;
  message: string;
  recoverable: boolean;
  suggestedAction?: 'retry' | 'fallback-online' | 'fallback-text' | 'check-permissions';
}