// Email Service for Vercel Deployment
// Bu dosya production'da kullanılacak

const API_BASE = import.meta.env.VITE_MAIL_API_URL || '/api/mail';

class EmailServiceVercel {
  async testConnection(config) {
    try {
      const response = await fetch(`${API_BASE}/imap-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error('Email bağlantı testi hatası:', error);
      throw error;
    }
  }

  async listEmails(config) {
    try {
      const response = await fetch(`${API_BASE}/imap-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.data || [];
    } catch (error) {
      console.error('Email listesi alma hatası:', error);
      throw error;
    }
  }

  async getEmailContent(config, uid) {
    try {
      const response = await fetch(`${API_BASE}/imap-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, uid })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.data;
    } catch (error) {
      console.error('Email içeriği alma hatası:', error);
      throw error;
    }
  }

  async sendEmail(config, emailData) {
    try {
      const response = await fetch(`${API_BASE}/smtp-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, ...emailData })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.data;
    } catch (error) {
      console.error('Email gönderme hatası:', error);
      throw error;
    }
  }
}

export default new EmailServiceVercel();