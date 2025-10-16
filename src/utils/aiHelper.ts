import { AIProvider } from '../types/ai';
import { createAIService } from '../services/aiService';

/**
 * Get the current AI service based on user settings
 */
export function getCurrentAIService() {
  const provider = (localStorage.getItem('ai-provider') as AIProvider) || AIProvider.GEMINI;
  const apiKey = localStorage.getItem(`${provider}-api-key`) || '';
  
  if (!apiKey) {
    // Fallback to Gemini for backward compatibility
    const geminiKey = localStorage.getItem('gemini-api-key') || '';
    if (geminiKey) {
      return createAIService(AIProvider.GEMINI, geminiKey);
    }
    throw new Error('No API key configured. Please set up your AI provider in settings.');
  }
  
  return createAIService(provider, apiKey);
}

/**
 * Get API key for a specific provider
 */
export function getProviderApiKey(provider: AIProvider): string | null {
  return localStorage.getItem(`${provider}-api-key`);
}

/**
 * Get current provider
 */
export function getCurrentProvider(): AIProvider {
  return (localStorage.getItem('ai-provider') as AIProvider) || AIProvider.GEMINI;
}
