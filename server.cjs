const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// CORS'u etkinleştir
app.use(cors());
app.use(express.json());

// Zapier webhook proxy endpoint'i
app.post('/api/zapier-webhook', async (req, res) => {
  try {
    const { webhookUrl, data } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Webhook URL gerekli!' 
      });
    }

    console.log('🚀 Zapier webhook\'a istek gönderiliyor:', webhookUrl);
    console.log('📤 Gönderilen data:', data);

    // Zapier'a gerçek istek gönder
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    const responseText = await response.text();
    
    if (response.ok) {
      console.log('✅ Zapier webhook başarılı!');
      res.json({
        success: true,
        status: response.status,
        data: responseText,
        message: 'Zapier webhook başarıyla çalıştırıldı!'
      });
    } else {
      console.log('❌ Zapier webhook hatası:', response.status);
      res.status(response.status).json({
        success: false,
        status: response.status,
        error: responseText,
        message: 'Zapier webhook hatası!'
      });
    }

  } catch (error) {
    console.error('❌ Proxy server hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Proxy server hatası!'
    });
  }
});

// Mail webhook endpoint - Zapier'dan gelen mailleri yakalar
let webhookEmails = []; // Basit bellek içi depolama

app.post('/api/mail/webhook', (req, res) => {
  try {
    const emailData = req.body;
    
    console.log('📧 Yeni mail webhook alındı:', {
      from: emailData.from || emailData.sender,
      subject: emailData.subject || emailData.title,
      timestamp: new Date().toISOString()
    });

    // Mail verisini standart formata çevir
    const standardEmail = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      from: emailData.from || emailData.sender || emailData.email,
      to: emailData.to || emailData.recipient,
      subject: emailData.subject || emailData.title || 'Konu Yok',
      body: emailData.body || emailData.content || emailData.message || '',
      date: emailData.date || new Date().toISOString(),
      source: 'webhook',
      raw: emailData // Orijinal veriyi de sakla
    };

    // Mail'i listeye ekle (son 100 mail'i sakla)
    webhookEmails.unshift(standardEmail);
    if (webhookEmails.length > 100) {
      webhookEmails = webhookEmails.slice(0, 100);
    }

    console.log('✅ Mail başarıyla kaydedildi. Toplam mail sayısı:', webhookEmails.length);

    res.json({
      success: true,
      message: 'Mail başarıyla alındı ve kaydedildi!',
      emailId: standardEmail.id,
      totalEmails: webhookEmails.length
    });

  } catch (error) {
    console.error('❌ Mail webhook hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Mail webhook işleme hatası!'
    });
  }
});

// Mail listesi endpoint - Webhook'la gelen mailleri listeler
app.get('/api/mail/list', (req, res) => {
  try {
    const { limit = 20, source = 'all' } = req.query;
    
    let filteredEmails = webhookEmails;
    
    // Kaynak filtresi
    if (source !== 'all') {
      filteredEmails = webhookEmails.filter(email => email.source === source);
    }
    
    // Limit uygula
    const limitedEmails = filteredEmails.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      emails: limitedEmails,
      total: filteredEmails.length,
      source: source
    });

  } catch (error) {
    console.error('❌ Mail listesi hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Mail listesi alınamadı!'
    });
  }
});

// Suggestions endpoint
app.get('/api/suggestions/next', (req, res) => {
  try {
    // Basit öneri sistemi - gerçek AI entegrasyonu için genişletilebilir
    const suggestions = [
      {
        id: 1,
        type: 'task',
        title: 'Gmail\'den gelen önemli mailleri kontrol et',
        description: 'Bugün gelen önemli mailleri gözden geçir ve gerekli aksiyonları al.',
        priority: 'high',
        category: 'email'
      },
      {
        id: 2,
        type: 'workflow',
        title: 'Zapier workflow\'unu test et',
        description: 'Yeni kurduğun Zapier entegrasyonunu test ederek düzgün çalıştığından emin ol.',
        priority: 'medium',
        category: 'automation'
      },
      {
        id: 3,
        type: 'reminder',
        title: 'Günlük hedeflerini gözden geçir',
        description: 'Bugün için belirlediğin hedefleri kontrol et ve ilerlemeyi değerlendir.',
        priority: 'medium',
        category: 'planning'
      }
    ];

    // Rastgele bir öneri seç
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    
    console.log('💡 Öneri gönderiliyor:', randomSuggestion.title);
    
    res.json({
      success: true,
      suggestion: randomSuggestion,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Suggestions endpoint hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Öneri sistemi hatası!'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'EchoDay Proxy Server çalışıyor!',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 EchoDay Proxy Server çalışıyor: http://localhost:${PORT}`);
  console.log(`📡 Zapier webhook endpoint: http://localhost:${PORT}/api/zapier-webhook`);
});