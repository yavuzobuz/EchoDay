export enum AIProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic'
}

export interface AIConfig {
  provider: AIProvider;
  apiKeys: {
    [AIProvider.GEMINI]?: string;
    [AIProvider.OPENAI]?: string;
    [AIProvider.ANTHROPIC]?: string;
  };
}

export interface AIProviderInfo {
  id: AIProvider;
  name: string;
  description: string;
  models: string[];
  websiteUrl: string;
  pricingInfo: string;
}

export const AI_PROVIDERS: Record<AIProvider, AIProviderInfo> = {
  [AIProvider.GEMINI]: {
    id: AIProvider.GEMINI,
    name: 'Google Gemini',
    description: 'Google\'ın gelişmiş AI modeli. Ücretsiz tier ile günde 1500 istek hakkı.',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    websiteUrl: 'https://ai.google.dev/',
    pricingInfo: 'Ücretsiz: 1500 istek/gün • Pro: Sınırsız'
  },
  [AIProvider.OPENAI]: {
    id: AIProvider.OPENAI,
    name: 'OpenAI',
    description: 'ChatGPT\'yi geliştiren şirketin API\'si. GPT-4o ve GPT-4o-mini modelleri.',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    websiteUrl: 'https://platform.openai.com/',
    pricingInfo: 'Kullandıkça öde • $0.15/1M token (4o-mini)'
  },
  [AIProvider.ANTHROPIC]: {
    id: AIProvider.ANTHROPIC,
    name: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet - Hızlı, güçlü ve güvenilir AI modeli.',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    websiteUrl: 'https://www.anthropic.com/',
    pricingInfo: 'Kullandıkça öde • $3/1M token (Sonnet)'
  }
};
