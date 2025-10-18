import { AIProvider } from '../types/ai';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
  systemPrompt?: string;
}

export interface AIGenerateResult {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Unified AI Service
 * Supports multiple AI providers: Gemini, OpenAI, and Anthropic
 */
export class AIService {
  private provider: AIProvider;
  private apiKey: string;

  constructor(provider: AIProvider, apiKey: string) {
    this.provider = provider;
    this.apiKey = apiKey;
  }

  /**
   * Generate text response from AI
   */
  async generate(
    prompt: string,
    options: AIGenerateOptions = {}
  ): Promise<AIGenerateResult> {
    switch (this.provider) {
      case AIProvider.GEMINI:
        return this.generateGemini(prompt, options);
      case AIProvider.OPENAI:
        return this.generateOpenAI(prompt, options);
      case AIProvider.ANTHROPIC:
        return this.generateAnthropic(prompt, options);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Generate with chat history
   */
  async generateWithHistory(
    messages: AIMessage[],
    options: AIGenerateOptions = {}
  ): Promise<AIGenerateResult> {
    switch (this.provider) {
      case AIProvider.GEMINI:
        return this.generateGeminiWithHistory(messages, options);
      case AIProvider.OPENAI:
        return this.generateOpenAIWithHistory(messages, options);
      case AIProvider.ANTHROPIC:
        return this.generateAnthropicWithHistory(messages, options);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  // --- Gemini Implementation ---
  private async generateGemini(
    prompt: string,
    options: AIGenerateOptions
  ): Promise<AIGenerateResult> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.apiKey);
    
    const modelConfig: any = {
      temperature: options.temperature ?? 0.7,
    };

    if (options.maxTokens) {
      modelConfig.maxOutputTokens = options.maxTokens;
    }

    if (options.responseFormat === 'json') {
      modelConfig.responseMimeType = 'application/json';
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: modelConfig,
      systemInstruction: options.systemPrompt,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    
    return {
      text: response.text(),
      usage: response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        completionTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount,
      } : undefined
    };
  }

  private async generateGeminiWithHistory(
    messages: AIMessage[],
    options: AIGenerateOptions
  ): Promise<AIGenerateResult> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.apiKey);
    
    const modelConfig: any = {
      temperature: options.temperature ?? 0.7,
    };

    if (options.maxTokens) {
      modelConfig.maxOutputTokens = options.maxTokens;
    }

    // Extract system prompt from messages if present
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: modelConfig,
      systemInstruction: systemMessage?.content || options.systemPrompt,
    });

    // Gemini requires chat history to start with 'user' role
    const historyMessages = chatMessages.slice(0, -1);
    let filteredHistory = historyMessages;
    
    // If first message is assistant/model, skip it to ensure we start with 'user'
    if (historyMessages.length > 0 && historyMessages[0].role === 'assistant') {
      filteredHistory = historyMessages.slice(1);
    }
    
    // If we still don't have messages or first message is still not 'user', use empty history
    if (filteredHistory.length === 0 || filteredHistory[0].role !== 'user') {
      filteredHistory = [];
    }

    const chat = model.startChat({
      history: filteredHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    });

    const lastMessage = chatMessages[chatMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    
    return {
      text: response.text(),
      usage: response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        completionTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount,
      } : undefined
    };
  }

  // --- OpenAI Implementation ---
  private async generateOpenAI(
    prompt: string,
    options: AIGenerateOptions
  ): Promise<AIGenerateResult> {
    const messages: any[] = [];
    
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const requestBody: any = {
      model: 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.7,
    };

    if (options.maxTokens) {
      requestBody.max_tokens = options.maxTokens;
    }

    if (options.responseFormat === 'json') {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      text: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      }
    };
  }

  private async generateOpenAIWithHistory(
    messages: AIMessage[],
    options: AIGenerateOptions
  ): Promise<AIGenerateResult> {
    const openAIMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const requestBody: any = {
      model: 'gpt-4o-mini',
      messages: openAIMessages,
      temperature: options.temperature ?? 0.7,
    };

    if (options.maxTokens) {
      requestBody.max_tokens = options.maxTokens;
    }

    if (options.responseFormat === 'json') {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      text: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      }
    };
  }

  // --- Anthropic Implementation ---
  private async generateAnthropic(
    prompt: string,
    options: AIGenerateOptions
  ): Promise<AIGenerateResult> {
    const messages: any[] = [{ role: 'user', content: prompt }];

    const requestBody: any = {
      model: 'claude-3-5-sonnet-20241022',
      messages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    };

    if (options.systemPrompt) {
      requestBody.system = options.systemPrompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      text: data.content[0].text,
      usage: {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      }
    };
  }

  private async generateAnthropicWithHistory(
    messages: AIMessage[],
    options: AIGenerateOptions
  ): Promise<AIGenerateResult> {
    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const anthropicMessages = chatMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const requestBody: any = {
      model: 'claude-3-5-sonnet-20241022',
      messages: anthropicMessages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    };

    if (systemMessage?.content || options.systemPrompt) {
      requestBody.system = systemMessage?.content || options.systemPrompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      text: data.content[0].text,
      usage: {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      }
    };
  }
}

/**
 * Factory function to create AI service instance
 */
export function createAIService(provider: AIProvider, apiKey: string): AIService {
  if (!apiKey) {
    throw new Error(`API key is required for ${provider}`);
  }
  return new AIService(provider, apiKey);
}
