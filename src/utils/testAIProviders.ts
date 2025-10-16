/**
 * Test utility for AI providers
 * Run this in browser console to test different providers
 */

import { AIProvider } from '../types/ai';
import { createAIService } from '../services/aiService';

export async function testProvider(provider: AIProvider, apiKey: string) {
  console.log(`\n🧪 Testing ${provider.toUpperCase()}...`);
  
  try {
    const service = createAIService(provider, apiKey);
    
    // Test 1: Simple generation
    console.log('📝 Test 1: Simple text generation...');
    const result1 = await service.generate('Merhaba! Sen kimsin?', {
      temperature: 0.7,
      maxTokens: 100
    });
    console.log('✅ Response:', result1.text);
    console.log('📊 Usage:', result1.usage);
    
    // Test 2: Chat with history
    console.log('\n💬 Test 2: Chat with history...');
    const result2 = await service.generateWithHistory([
      { role: 'system', content: 'Sen yardımcı bir AI asistanısın.' },
      { role: 'user', content: 'Merhaba!' },
      { role: 'assistant', content: 'Merhaba! Size nasıl yardımcı olabilirim?' },
      { role: 'user', content: 'Bugün hava nasıl?' }
    ], {
      temperature: 0.7,
      maxTokens: 100
    });
    console.log('✅ Response:', result2.text);
    console.log('📊 Usage:', result2.usage);
    
    console.log(`\n✅ ${provider.toUpperCase()} tests completed successfully!`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${provider.toUpperCase()} test failed:`, error);
    return false;
  }
}

export async function testAllProviders() {
  console.log('🚀 Testing all AI providers...\n');
  
  const geminiKey = localStorage.getItem('gemini-api-key');
  const openaiKey = localStorage.getItem('openai-api-key');
  const anthropicKey = localStorage.getItem('anthropic-api-key');
  
  const results = {
    gemini: false,
    openai: false,
    anthropic: false
  };
  
  if (geminiKey) {
    results.gemini = await testProvider(AIProvider.GEMINI, geminiKey);
  } else {
    console.log('⚠️  Gemini API key not found');
  }
  
  if (openaiKey) {
    results.openai = await testProvider(AIProvider.OPENAI, openaiKey);
  } else {
    console.log('⚠️  OpenAI API key not found');
  }
  
  if (anthropicKey) {
    results.anthropic = await testProvider(AIProvider.ANTHROPIC, anthropicKey);
  } else {
    console.log('⚠️  Anthropic API key not found');
  }
  
  console.log('\n📊 Test Results:');
  console.log('Gemini:', results.gemini ? '✅' : '❌');
  console.log('OpenAI:', results.openai ? '✅' : '❌');
  console.log('Anthropic:', results.anthropic ? '✅' : '❌');
  
  return results;
}

// Make it available in window for console testing
if (typeof window !== 'undefined') {
  (window as any).testAIProviders = {
    testProvider,
    testAllProviders,
    AIProvider
  };
  
  console.log('💡 AI Provider test utilities loaded!');
  console.log('Run: testAIProviders.testAllProviders()');
}
