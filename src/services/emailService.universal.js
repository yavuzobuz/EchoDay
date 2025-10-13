// Universal Email Service - Hem Local hem Vercel'de çalışır
// Otomatik olarak doğru API'yi seçer

class UniversalEmailService {
  constructor() {
    // Development'ta localhost:5123, Production'da Vercel API
    this.apiBase = this.getApiBase();
    console.log('Email Service API:', this.apiBase);
  }

  getApiBase() {
    // Eğer local development ise
    if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
      // Local mail server'ı kullan
      return import.meta.env.VITE_LOCAL_MAIL_SERVER || 'http://localhost:5123';
    }
    
    // Production'da Vercel API routes kullan
    // Eğer custom domain varsa onu kullan
    if (import.meta.env.VITE_MAIL_API_URL) {
      return import.meta.env.VITE_MAIL_API_URL;
    }
    
    // Default olarak Vercel API
    return '/api/mail';
  }

  async request(endpoint, data) {
    try {
      const url = `${this.apiBase}${endpoint}`;
      console.log('Email API Request:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Email Service Error (${endpoint}):`, error);
      throw error;
    }
  }

  // IMAP Test Connection
  async testConnection(config) {
    const endpoint = this.apiBase.includes('/api/mail') ? '/imap-test' : '/imap/test';
    return this.request(endpoint, config);
  }

  // List Emails
  async listEmails(config) {
    const endpoint = this.apiBase.includes('/api/mail') ? '/imap-list' : '/imap/list';
    const result = await this.request(endpoint, config);
    return result.data || [];
  }

  // Get Email Content
  async getEmailContent(config, uid) {
    const endpoint = this.apiBase.includes('/api/mail') ? '/imap-message' : '/imap/message';
    const result = await this.request(endpoint, { ...config, uid });
    return result.data;
  }

  // Send Email
  async sendEmail(config, emailData) {
    const endpoint = this.apiBase.includes('/api/mail') ? '/smtp-send' : '/smtp/send';
    const result = await this.request(endpoint, { ...config, ...emailData });
    return result.data;
  }

  // POP3 Test (opsiyonel)
  async testPop3Connection(config) {
    const endpoint = this.apiBase.includes('/api/mail') ? '/pop-test' : '/pop/test';
    return this.request(endpoint, config);
  }

  // POP3 List (opsiyonel)
  async listPop3Emails(config) {
    const endpoint = this.apiBase.includes('/api/mail') ? '/pop-list' : '/pop/list';
    const result = await this.request(endpoint, config);
    return result.data || [];
  }
}

// Singleton instance
const emailService = new UniversalEmailService();
export default emailService;