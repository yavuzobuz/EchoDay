import { ChatMessage } from '../types';
import { AIService } from './aiService';
import { AIProvider } from '../types/ai';
import { loadUserContext } from './contextMemoryService';

export interface SmartChatOptions {
  useContext?: boolean;
  personalizedResponse?: boolean;
  proactiveMode?: boolean;
  responseStyle?: 'concise' | 'detailed' | 'conversational';
}

export interface ChatContext {
  recentTopics: string[];
  userMood: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  sessionGoal?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export class SmartChatService {
  private aiService: AIService;
  private chatHistory: ChatMessage[] = [];
  private currentContext: ChatContext;

  constructor(provider: AIProvider = AIProvider.GEMINI, apiKey: string) {
    this.aiService = new AIService(provider, apiKey);
    this.currentContext = this.initializeContext();
  }

  /**
   * Akıllı yanıt üret - bağlam ve kişiselleştirme ile
   */
  async generateSmartResponse(
    userMessage: string, 
    options: SmartChatOptions = {}
  ): Promise<string> {
    // Kullanıcı mesajını analiz et
    await this.analyzeUserMessage(userMessage);
    
    // Sistem promptunu oluştur
    const systemPrompt = this.buildSmartSystemPrompt(options);
    
    // Mesaj geçmişini hazırla
    const messages = this.prepareMessageHistory(userMessage, systemPrompt);
    
    try {
      const result = await this.aiService.generateWithHistory(messages, {
        temperature: 0.7,
        maxTokens: options.responseStyle === 'concise' ? 150 : 
                   options.responseStyle === 'detailed' ? 500 : 300,
        systemPrompt
      });

      // Yanıtı kaydet ve analiz et
      const aiResponse = result.text;
      this.addToHistory('user', userMessage);
      this.addToHistory('model', aiResponse);
      
      // Proaktif öneriler ekle
      if (options.proactiveMode) {
        const proactiveAddition = await this.generateProactiveSuggestion();
        if (proactiveAddition) {
          return aiResponse + '\n\n' + proactiveAddition;
        }
      }

      return aiResponse;
    } catch (error) {
      console.error('Smart chat error:', error);
      return 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen tekrar deneyin.';
    }
  }

  /**
   * Kullanıcı mesajını analiz et ve bağlamı güncelle
   */
  private async analyzeUserMessage(message: string): Promise<void> {
    const lowerMessage = message.toLowerCase();
    
    // Kullanıcı ruh halini tespit et
    if (lowerMessage.includes('acil') || lowerMessage.includes('hızlı') || lowerMessage.includes('çabuk')) {
      this.currentContext.userMood = 'urgent';
    } else if (lowerMessage.includes('problem') || lowerMessage.includes('hata') || lowerMessage.includes('çalışmıyor')) {
      this.currentContext.userMood = 'frustrated';
    } else if (lowerMessage.includes('teşekkür') || lowerMessage.includes('harika') || lowerMessage.includes('mükemmel')) {
      this.currentContext.userMood = 'positive';
    } else {
      this.currentContext.userMood = 'neutral';
    }

    // Konuları çıkar
    const topics = this.extractTopics(message);
    this.currentContext.recentTopics = [...new Set([...topics, ...this.currentContext.recentTopics])].slice(0, 5);

    // Oturum hedefini tespit et
    if (lowerMessage.includes('yardım') && !this.currentContext.sessionGoal) {
      this.currentContext.sessionGoal = 'help_seeking';
    } else if (lowerMessage.includes('öğren') || lowerMessage.includes('nasıl')) {
      this.currentContext.sessionGoal = 'learning';
    } else if (lowerMessage.includes('görev') || lowerMessage.includes('yapılacak')) {
      this.currentContext.sessionGoal = 'task_management';
    }
  }

  /**
   * Akıllı sistem promptu oluştur
   */
  private buildSmartSystemPrompt(options: SmartChatOptions): string {
    const userContext = loadUserContext();
    const timeOfDay = this.getTimeOfDay();
    
    let prompt = `Sen EchoDay uygulamasının akıllı AI asistanısın. Kullanıcıya kişiselleştirilmiş ve bağlam-farkında yanıtlar ver.

MEVCUT BAĞLAM:
- Zaman: ${timeOfDay}
- Kullanıcı Ruh Hali: ${this.currentContext.userMood}
- Son Konular: ${this.currentContext.recentTopics.join(', ')}
- Oturum Hedefi: ${this.currentContext.sessionGoal || 'Genel sohbet'}

YANIT STİLİ: ${options.responseStyle || 'conversational'}`;

    if (userContext && options.personalizedResponse) {
      prompt += `

KİŞİSEL BİLGİLER:
- En Verimli Saatler: ${userContext.workingHours.mostProductiveHours.join(', ')}
- Çalışma Saatleri: ${userContext.workingHours.weekdayStart} - ${userContext.workingHours.weekdayEnd}
- Görev Tamamlama Oranı: %${Math.round((userContext.completionStats.totalTasksCompleted / Math.max(userContext.completionStats.totalTasksCreated, 1)) * 100)}`;

      if (userContext.patterns.length > 0) {
        prompt += `
- Yaygın Görev Kalıpları: ${userContext.patterns.map(p => p.pattern).join(', ')}`;
      }
    }

    // Ruh haline göre ton ayarla
    switch (this.currentContext.userMood) {
      case 'urgent':
        prompt += `\n\nTON: Hızlı ve direkt yanıtlar ver. Gereksiz detaylara girme.`;
        break;
      case 'frustrated':
        prompt += `\n\nTON: Anlayışlı ve sabırlı ol. Adım adım çözüm sun.`;
        break;
      case 'positive':
        prompt += `\n\nTON: Enerjik ve destekleyici ol. Pozitif momentum koru.`;
        break;
      default:
        prompt += `\n\nTON: Dostane ve yardımsever ol.`;
    }

    prompt += `

KURALLAR:
1. Türkçe yanıt ver
2. Kısa ve öz ol (${options.responseStyle === 'concise' ? '1-2 cümle' : options.responseStyle === 'detailed' ? '3-4 paragraf' : '2-3 cümle'})
3. Önceki konuşmaları referans al
4. Kullanıcının zamanını ve durumunu dikkate al
5. Pratik öneriler sun`;

    return prompt;
  }

  /**
   * Proaktif öneri üret
   */
  private async generateProactiveSuggestion(): Promise<string | null> {
    const userContext = loadUserContext();
    if (!userContext) return null;

    const currentHour = new Date().getHours();
    const isProductiveTime = userContext.workingHours.mostProductiveHours.includes(currentHour);
    
    // Verimli saatlerde görev önerisi
    if (isProductiveTime && this.currentContext.recentTopics.includes('görev')) {
      return '💡 **Öneri**: Şu anda en verimli saatlerindesiniz. Önemli görevlerinizi şimdi halletmek ister misiniz?';
    }

    // Düşük tamamlama oranında motivasyon
    const completionRate = userContext.completionStats.totalTasksCompleted / Math.max(userContext.completionStats.totalTasksCreated, 1);
    if (completionRate < 0.7) {
      return '🎯 **Öneri**: Görev tamamlama oranınızı artırmak için küçük görevlerle başlayabilirsiniz. Yardım ister misiniz?';
    }

    // Akşam saatlerinde günlük özet
    if (currentHour >= 18 && currentHour <= 20) {
      return '📊 **Öneri**: Günün sonuna yaklaşıyoruz. Bugünkü başarılarınızı gözden geçirmek ister misiniz?';
    }

    return null;
  }

  /**
   * Konuları çıkar
   */
  private extractTopics(message: string): string[] {
    const topics: string[] = [];
    const lowerMessage = message.toLowerCase();

    const topicMap = {
      'görev': ['görev', 'task', 'yapılacak', 'todo'],
      'zaman': ['zaman', 'saat', 'tarih', 'program'],
      'hatırlatıcı': ['hatırlat', 'reminder', 'alarm'],
      'email': ['email', 'mail', 'mesaj'],
      'not': ['not', 'note', 'kayıt'],
      'analiz': ['analiz', 'rapor', 'istatistik'],
      'ayar': ['ayar', 'setting', 'konfigürasyon'],
      'yardım': ['yardım', 'help', 'nasıl']
    };

    Object.entries(topicMap).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics;
  }

  /**
   * Mesaj geçmişini hazırla
   */
  private prepareMessageHistory(userMessage: string, systemPrompt: string): any[] {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Son 10 mesajı ekle (bağlam için)
    const recentHistory = this.chatHistory.slice(-10);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      });
    });

    // Mevcut kullanıcı mesajını ekle
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * Geçmişe mesaj ekle
   */
  private addToHistory(role: 'user' | 'model', text: string): void {
    this.chatHistory.push({
      role,
      text
    });

    // Son 50 mesajı tut
    if (this.chatHistory.length > 50) {
      this.chatHistory = this.chatHistory.slice(-50);
    }
  }

  /**
   * Bağlamı başlat
   */
  private initializeContext(): ChatContext {
    return {
      recentTopics: [],
      userMood: 'neutral',
      timeOfDay: this.getTimeOfDay()
    };
  }

  /**
   * Günün zamanını belirle
   */
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Sohbet geçmişini temizle
   */
  clearHistory(): void {
    this.chatHistory = [];
    this.currentContext = this.initializeContext();
  }

  /**
   * Mevcut bağlamı getir
   */
  getCurrentContext(): ChatContext {
    return { ...this.currentContext };
  }
}

export default SmartChatService;
