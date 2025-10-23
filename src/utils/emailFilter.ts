// 🎯 Akıllı Email Filtreleme Sistemi
// Gmail webhook'larından gelen email'leri analiz eder ve önemli olanları filtreler

export interface EmailData {
  from: string;
  subject: string;
  body: string;
  date: string;
  labels?: string[];
  snippet?: string;
}

export interface FilterResult {
  isImportant: boolean;
  isSpam: boolean;
  score: number;
  reasons: string[];
}

export interface FilterSettings {
  autoForward: boolean;
  minImportanceScore: number;
  blockSpam: boolean;
  importantSenders: string[];
  spamKeywords: string[];
  importantKeywords: string[];
}

export class EmailFilter {
  private settings: FilterSettings;

  constructor(settings: FilterSettings) {
    this.settings = settings;
  }

  // 🧠 Ana filtreleme fonksiyonu
  analyzeEmail(email: EmailData): FilterResult {
    const result: FilterResult = {
      isImportant: false,
      isSpam: false,
      score: 0,
      reasons: []
    };

    // 1. Spam kontrolü
    const spamCheck = this.checkSpam(email);
    result.isSpam = spamCheck.isSpam;
    if (spamCheck.isSpam) {
      result.reasons.push(...spamCheck.reasons);
      return result; // Spam ise direkt döndür
    }

    // 2. Önem skoru hesapla
    const importanceScore = this.calculateImportanceScore(email);
    result.score = importanceScore.score;
    result.reasons.push(...importanceScore.reasons);

    // 3. Önemli mi karar ver
    result.isImportant = result.score >= this.settings.minImportanceScore;

    return result;
  }

  // 🚫 Spam/Promosyon Tespiti
  private checkSpam(email: EmailData): { isSpam: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let spamScore = 0;

    // Gmail labels kontrolü
    if (email.labels) {
      const spamLabels = ['SPAM', 'PROMOTIONS', 'CATEGORY_PROMOTIONS'];
      for (const label of spamLabels) {
        if (email.labels.includes(label)) {
          spamScore += 50;
          reasons.push(`Gmail ${label} kategorisinde`);
        }
      }
    }

    // Spam anahtar kelimeleri
    const spamKeywords = [
      ...this.settings.spamKeywords,
      'unsubscribe', 'click here', 'limited time', 'act now',
      'free', 'winner', 'congratulations', 'urgent',
      'discount', 'sale', 'offer', 'deal', 'promotion',
      'marketing', 'newsletter', 'campaign'
    ];

    const text = `${email.subject} ${email.body}`.toLowerCase();
    let keywordMatches = 0;

    for (const keyword of spamKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }

    if (keywordMatches >= 3) {
      spamScore += 30;
      reasons.push(`${keywordMatches} spam anahtar kelime tespit edildi`);
    }

    // Şüpheli gönderen kontrolleri
    const suspiciousSenders = [
      'noreply', 'no-reply', 'donotreply', 'marketing',
      'newsletter', 'promo', 'deals', 'offers'
    ];

    for (const suspicious of suspiciousSenders) {
      if (email.from.toLowerCase().includes(suspicious)) {
        spamScore += 20;
        reasons.push(`Şüpheli gönderen: ${suspicious}`);
        break;
      }
    }

    // Aşırı emoji/büyük harf kullanımı
    const emojiCount = (email.subject.match(/[\u2600-\u26FF]|[\u2700-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g) || []).length;
    const upperCaseRatio = (email.subject.match(/[A-Z]/g) || []).length / email.subject.length;

    if (emojiCount > 3) {
      spamScore += 15;
      reasons.push('Aşırı emoji kullanımı');
    }

    if (upperCaseRatio > 0.5 && email.subject.length > 10) {
      spamScore += 15;
      reasons.push('Aşırı büyük harf kullanımı');
    }

    return {
      isSpam: spamScore >= 50,
      reasons
    };
  }

  // ⭐ Önem Skoru Hesaplama
  private calculateImportanceScore(email: EmailData): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // 1. Gönderen analizi
    const senderScore = this.analyzeSender(email.from);
    score += senderScore.score;
    reasons.push(...senderScore.reasons);

    // 2. Konu analizi
    const subjectScore = this.analyzeSubject(email.subject);
    score += subjectScore.score;
    reasons.push(...subjectScore.reasons);

    // 3. İçerik analizi
    const contentScore = this.analyzeContent(email.body);
    score += contentScore.score;
    reasons.push(...contentScore.reasons);

    // 4. Zaman analizi
    const timeScore = this.analyzeTime(email.date);
    score += timeScore.score;
    reasons.push(...timeScore.reasons);

    // 5. Gmail labels analizi
    if (email.labels) {
      const labelScore = this.analyzeLabels(email.labels);
      score += labelScore.score;
      reasons.push(...labelScore.reasons);
    }

    return { score, reasons };
  }

  // 👤 Gönderen Analizi
  private analyzeSender(from: string): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Önemli gönderenler listesi
    for (const importantSender of this.settings.importantSenders) {
      if (from.toLowerCase().includes(importantSender.toLowerCase())) {
        score += 40;
        reasons.push(`Önemli gönderen: ${importantSender}`);
        break;
      }
    }

    // İş email'i tespiti
    const businessDomains = ['.com', '.org', '.net', '.gov', '.edu'];
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    
    const domain = from.split('@')[1]?.toLowerCase();
    if (domain) {
      if (personalDomains.includes(domain)) {
        score += 5;
        reasons.push('Kişisel email');
      } else if (businessDomains.some(bd => domain.endsWith(bd))) {
        score += 15;
        reasons.push('İş email\'i');
      }
    }

    return { score, reasons };
  }

  // 📝 Konu Analizi
  private analyzeSubject(subject: string): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Önemli anahtar kelimeler
    const importantKeywords = [
      ...this.settings.importantKeywords,
      'urgent', 'acil', 'önemli', 'important', 'asap',
      'meeting', 'toplantı', 'project', 'proje',
      'deadline', 'son tarih', 'review', 'inceleme',
      'approval', 'onay', 'decision', 'karar',
      'contract', 'sözleşme', 'invoice', 'fatura'
    ];

    const subjectLower = subject.toLowerCase();
    let keywordMatches = 0;

    for (const keyword of importantKeywords) {
      if (subjectLower.includes(keyword.toLowerCase())) {
        keywordMatches++;
        score += 10;
      }
    }

    if (keywordMatches > 0) {
      reasons.push(`${keywordMatches} önemli anahtar kelime`);
    }

    // Aciliyet göstergeleri
    const urgencyIndicators = ['!', 'urgent', 'asap', 'acil', 'hemen'];
    for (const indicator of urgencyIndicators) {
      if (subjectLower.includes(indicator)) {
        score += 15;
        reasons.push('Aciliyet göstergesi');
        break;
      }
    }

    // Re: veya Fwd: (devam eden konuşma)
    if (subject.startsWith('Re:') || subject.startsWith('Fwd:')) {
      score += 10;
      reasons.push('Devam eden konuşma');
    }

    return { score, reasons };
  }

  // 📄 İçerik Analizi
  private analyzeContent(body: string): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const bodyLower = body.toLowerCase();

    // İş terimleri
    const businessTerms = [
      'meeting', 'toplantı', 'conference', 'call',
      'project', 'proje', 'task', 'görev',
      'deadline', 'schedule', 'plan', 'budget',
      'client', 'müşteri', 'customer', 'team'
    ];

    let businessTermCount = 0;
    for (const term of businessTerms) {
      if (bodyLower.includes(term)) {
        businessTermCount++;
      }
    }

    if (businessTermCount >= 2) {
      score += 20;
      reasons.push(`${businessTermCount} iş terimi`);
    }

    // Kısa email'ler genelde daha önemli
    if (body.length < 500) {
      score += 5;
      reasons.push('Kısa ve öz mesaj');
    }

    return { score, reasons };
  }

  // ⏰ Zaman Analizi
  private analyzeTime(dateStr: string): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const date = new Date(dateStr);
    const hour = date.getHours();
    const day = date.getDay();

    // Mesai saatleri (9-18)
    if (hour >= 9 && hour <= 18) {
      score += 10;
      reasons.push('Mesai saatleri');
    }

    // Hafta içi
    if (day >= 1 && day <= 5) {
      score += 5;
      reasons.push('Hafta içi');
    }

    // Son 24 saat içinde
    const now = new Date();
    const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (hoursDiff <= 24) {
      score += 15;
      reasons.push('Son 24 saat');
    }

    return { score, reasons };
  }

  // 🏷️ Gmail Labels Analizi
  private analyzeLabels(labels: string[]): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Önemli kategoriler
    const importantLabels = [
      'IMPORTANT', 'CATEGORY_PERSONAL', 'INBOX',
      'STARRED', 'CATEGORY_UPDATES'
    ];

    for (const label of labels) {
      if (importantLabels.includes(label)) {
        score += 15;
        reasons.push(`Gmail ${label} etiketi`);
      }
    }

    return { score, reasons };
  }

  // ⚙️ Ayarları güncelle
  updateSettings(newSettings: Partial<FilterSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  // 📧 Email listesini filtrele
  async filterEmails(emails: any[]): Promise<any[]> {
    const filteredEmails = [];
    
    for (const email of emails) {
      // Email'i EmailData formatına dönüştür
      const emailData: EmailData = {
        from: email.from?.address || email.from?.name || email.from || '',
        subject: email.subject || '',
        body: email.bodyText || email.snippet || '',
        date: email.date || new Date().toISOString(),
        labels: email.labels || [],
        snippet: email.snippet || ''
      };

      // Email'i analiz et
      const filterResult = this.analyzeEmail(emailData);
      
      // Spam değilse listeye ekle
      if (!filterResult.isSpam || !this.settings.blockSpam) {
        // Filter result'ı email objesine ekle
        const emailWithFilter = {
          ...email,
          filterResult: {
            ...filterResult,
            importance: filterResult.isImportant ? 
              (filterResult.score >= 50 ? 'high' : 'medium') : 'low'
          }
        };
        
        filteredEmails.push(emailWithFilter);
      }
    }
    
    // Önemli email'leri önce sırala
    return filteredEmails.sort((a, b) => {
      const aScore = a.filterResult?.score || 0;
      const bScore = b.filterResult?.score || 0;
      return bScore - aScore;
    });
  }

  // 📊 Varsayılan ayarlar
  static getDefaultSettings(): FilterSettings {
    return {
      autoForward: true,
      minImportanceScore: 30,
      blockSpam: true,
      importantSenders: [],
      spamKeywords: [],
      importantKeywords: []
    };
  }
}