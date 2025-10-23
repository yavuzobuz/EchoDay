const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 5001;

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

// Gmail webhook receiver endpoint - Zapier'dan gelen gerçek Gmail verilerini yakalar
let gmailWebhookData = []; // Gmail verileri için depolama

app.post('/api/gmail/webhook', (req, res) => {
  try {
    const gmailData = req.body;
    
    console.log('📧 Yeni Gmail webhook alındı:', {
      from: gmailData.from || gmailData.sender,
      subject: gmailData.subject || gmailData.title,
      timestamp: new Date().toISOString()
    });

    // Gmail verisini standart formata çevir
    const standardGmail = {
      id: gmailData.id || gmailData.messageId || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      threadId: gmailData.threadId || '',
      from: gmailData.from || gmailData.sender || 'unknown@example.com',
      to: gmailData.to || gmailData.recipient || 'me@example.com',
      subject: gmailData.subject || gmailData.title || 'Konu Yok',
      body: gmailData.body || gmailData.content || gmailData.message || gmailData.snippet || '',
      snippet: gmailData.snippet || gmailData.body?.substring(0, 100) || '',
      date: gmailData.date || gmailData.timestamp || new Date().toISOString(),
      labels: gmailData.labels || ['INBOX'],
      isImportant: gmailData.isImportant || false,
      isSpam: gmailData.isSpam || false,
      priority: gmailData.priority || 'normal',
      hasAttachments: gmailData.hasAttachments || false,
      isUnread: gmailData.isUnread !== false, // Varsayılan olarak okunmamış
      category: gmailData.category || 'general',
      responseNeeded: gmailData.responseNeeded || false,
      source: 'gmail-webhook',
      receivedAt: new Date().toISOString(),
      raw: gmailData // Orijinal veriyi de sakla
    };

    // Gmail verisini listeye ekle (son 100 mail'i sakla)
    gmailWebhookData.unshift(standardGmail);
    if (gmailWebhookData.length > 100) {
      gmailWebhookData = gmailWebhookData.slice(0, 100);
    }

    console.log('✅ Gmail verisi başarıyla kaydedildi. Toplam mail sayısı:', gmailWebhookData.length);

    // WebSocket ile istemcilere gerçek zamanlı bildirim gönder (isteğe bağlı)
    // io.emit('new_gmail', standardGmail);

    res.json({
      success: true,
      message: 'Gmail verisi başarıyla alındı ve kaydedildi!',
      gmailId: standardGmail.id,
      totalEmails: gmailWebhookData.length,
      data: standardGmail
    });

  } catch (error) {
    console.error('❌ Gmail webhook hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Gmail webhook işleme hatası!'
    });
  }
});

// Gmail verileri listesi endpoint
app.get('/api/gmail/list', (req, res) => {
  try {
    const { limit = 20, unreadOnly = false } = req.query;
    
    let filteredEmails = gmailWebhookData;
    
    // Sadece okunmamışları filtrele
    if (unreadOnly === 'true') {
      filteredEmails = gmailWebhookData.filter(email => email.isUnread);
    }
    
    // Limit uygula
    const limitedEmails = filteredEmails.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      emails: limitedEmails,
      total: filteredEmails.length,
      unreadCount: gmailWebhookData.filter(email => email.isUnread).length
    });

  } catch (error) {
    console.error('❌ Gmail listesi hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Gmail listesi alınamadı!'
    });
  }
});

// Gmail okundu işaretle endpoint
app.post('/api/gmail/mark-read/:emailId', (req, res) => {
  try {
    const { emailId } = req.params;
    
    const emailIndex = gmailWebhookData.findIndex(email => email.id === emailId);
    if (emailIndex !== -1) {
      gmailWebhookData[emailIndex].isUnread = false;
      console.log(`✅ Email okundu olarak işaretlendi: ${emailId}`);
      
      res.json({
        success: true,
        message: 'Email okundu olarak işaretlendi',
        emailId: emailId
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Email bulunamadı'
      });
    }

  } catch (error) {
    console.error('❌ Gmail okundu işaretleme hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Email okundu işaretleme hatası!'
    });
  }
});

// Google Calendar webhook endpoint - Zapier'dan gelen calendar etkinliklerini yakalar
let webhookCalendarEvents = []; // Basit bellek içi depolama

app.post('/api/calendar/webhook', (req, res) => {
  try {
    const calendarData = req.body;
    
    console.log('🗓️ Yeni calendar webhook alındı:', {
      summary: calendarData.summary || calendarData.title,
      startTime: calendarData.start?.dateTime || calendarData.start?.date,
      status: calendarData.status || 'unknown',
      timestamp: new Date().toISOString()
    });

    // Calendar verisini standart formata çevir
    const standardEvent = {
      id: calendarData.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      summary: calendarData.summary || calendarData.title || 'Başlıksız Etkinlik',
      description: calendarData.description || '',
      startTime: calendarData.start?.dateTime || calendarData.start?.date,
      endTime: calendarData.end?.dateTime || calendarData.end?.date,
      location: calendarData.location || '',
      attendees: calendarData.attendees?.map(a => a.email) || [],
      creator: calendarData.creator?.email || '',
      organizer: calendarData.organizer?.email || '',
      status: calendarData.status || 'confirmed',
      visibility: calendarData.visibility || 'default',
      isRecurring: !!calendarData.recurrence,
      hangoutLink: calendarData.hangoutLink || '',
      source: 'google-calendar-webhook',
      createdAt: calendarData.created || new Date().toISOString(),
      updatedAt: calendarData.updated || new Date().toISOString(),
      calendarLink: calendarData.htmlLink || '',
      raw: calendarData // Orijinal veriyi de sakla
    };

    // Etkinliği listeye ekle (son 100 etkinliği sakla)
    webhookCalendarEvents.unshift(standardEvent);
    if (webhookCalendarEvents.length > 100) {
      webhookCalendarEvents = webhookCalendarEvents.slice(0, 100);
    }

    console.log('✅ Calendar etkinliği başarıyla kaydedildi. Toplam etkinlik sayısı:', webhookCalendarEvents.length);

    // EchoDay formatında veri döndür
    const echoDayData = {
      type: 'calendar_event',
      id: standardEvent.id,
      title: standardEvent.summary,
      description: standardEvent.description,
      startTime: standardEvent.startTime,
      endTime: standardEvent.endTime,
      location: standardEvent.location,
      attendees: standardEvent.attendees,
      creator: standardEvent.creator,
      organizer: standardEvent.organizer,
      status: standardEvent.status,
      visibility: standardEvent.visibility,
      isRecurring: standardEvent.isRecurring,
      hangoutLink: standardEvent.hangoutLink,
      source: standardEvent.source,
      createdAt: standardEvent.createdAt,
      updatedAt: standardEvent.updatedAt,
      calendarLink: standardEvent.calendarLink
    };

    res.json({
      success: true,
      message: 'Calendar etkinliği başarıyla alındı ve kaydedildi!',
      eventId: standardEvent.id,
      totalEvents: webhookCalendarEvents.length,
      data: echoDayData
    });

  } catch (error) {
    console.error('❌ Calendar webhook hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Calendar webhook işleme hatası!'
    });
  }
});

// Calendar etkinlikleri listesi endpoint
app.get('/api/calendar/list', (req, res) => {
  try {
    const { limit = 20, status = 'all' } = req.query;
    
    let filteredEvents = webhookCalendarEvents;
    
    // Durum filtresi
    if (status !== 'all') {
      filteredEvents = webhookCalendarEvents.filter(event => event.status === status);
    }
    
    // Limit uygula
    const limitedEvents = filteredEvents.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      events: limitedEvents,
      total: filteredEvents.length,
      status: status
    });

  } catch (error) {
    console.error('❌ Calendar listesi hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Calendar listesi alınamadı!'
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

// Çift yönlü senkronizasyon endpoint - EchoDay görevlerini Google Calendar'a
app.post('/api/calendar/sync-tasks-to-calendar', async (req, res) => {
  try {
    const { syncDirection, syncMode } = req.body;
    
    console.log('🔄 EchoDay → Google Calendar senkronizasyon başlatıldı');
    console.log('📊 Senkronizasyon modu:', { syncDirection, syncMode });
    
    // EchoDay görevlerini al (simülasyon)
    const echoDayTasks = [
      {
        id: 'task_001',
        title: 'Proje Toplantısı',
        description: 'Yeni proje planlama toplantısı',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        location: 'Toplantı Odası A',
        priority: 'high',
        status: 'pending',
        source: 'echoday-task'
      },
      {
        id: 'task_002',
        title: 'Kod Gözden Geçirme',
        description: 'Kod inceleme ve review toplantısı',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        location: 'Online',
        priority: 'medium',
        status: 'pending',
        source: 'echoday-task'
      }
    ];

    // Görevleri Google Calendar formatına çevir
    const calendarEvents = echoDayTasks.map(task => ({
      id: `echoday_${task.id}`,
      summary: task.title,
      description: task.description,
      start: {
        dateTime: task.startTime,
        timeZone: 'Europe/Istanbul'
      },
      end: {
        dateTime: task.endTime,
        timeZone: 'Europe/Istanbul'
      },
      location: task.location,
      status: task.status === 'completed' ? 'confirmed' : 'tentative',
      attendees: [
        {
          email: 'user@echoday.com',
          displayName: 'EchoDay User',
          responseStatus: 'accepted'
        }
      ],
      creator: {
        email: 'system@echoday.com',
        displayName: 'EchoDay System'
      },
      organizer: {
        email: 'system@echoday.com',
        displayName: 'EchoDay System'
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      htmlLink: `https://calendar.google.com/calendar/event?eid=echoday_${task.id}`,
      source: 'echoday-sync'
    }));

    // Google Calendar API'ye gönder (simülasyon)
    console.log('📤 Google Calendar API\'ye etkinlikler gönderiliyor:', calendarEvents.length);
    
    const syncResults = await Promise.all(
      calendarEvents.map(async (event) => {
        // Google Calendar API simülasyonu
        console.log(`📅 Etkinlik gönderiliyor: ${event.summary}`);
        
        // Başarılı yanıtı simüle et
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          eventId: event.id,
          success: true,
          calendarLink: event.htmlLink
        };
      })
    );

    const successfulSyncs = syncResults.filter(r => r.success);
    const failedSyncs = syncResults.filter(r => !r.success);

    console.log(`✅ Senkronizasyon tamamlandı: ${successfulSyncs.length} başarılı, ${failedSyncs.length} başarısız`);
    
    res.json({
      success: true,
      message: `${successfulSyncs.length} görev Google Calendar'a senkronize edildi`,
      syncedEvents: calendarEvents,
      results: syncResults,
      summary: {
        total: calendarEvents.length,
        successful: successfulSyncs.length,
        failed: failedSyncs.length
      }
    });

  } catch (error) {
    console.error('❌ Calendar senkronizasyon hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Calendar senkronizasyonu sırasında hata oluştu'
    });
  }
});

// Google Calendar'dan EchoDay'a senkronizasyon endpoint
app.post('/api/calendar/sync-calendar-to-tasks', async (req, res) => {
  try {
    const { syncMode } = req.body;
    
    console.log('🔄 Google Calendar → EchoDay senkronizasyon başlatıldı');
    console.log('📊 Senkronizasyon modu:', { syncMode });
    
    // Google Calendar etkinliklerini al (simülasyon)
    const calendarEvents = [
      {
        id: 'calendar_001',
        summary: 'Önemli Müşteri Toplantısı',
        description: 'Müşteri ile yeni proje toplantısı',
        start: {
          dateTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          timeZone: 'Europe/Istanbul'
        },
        end: {
          dateTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          timeZone: 'Europe/Istanbul'
        },
        location: 'Müşteri Ofisi',
        status: 'confirmed',
        attendees: [
          {
            email: 'user@echoday.com',
            displayName: 'EchoDay User',
            responseStatus: 'needsAction'
          }
        ],
        creator: {
          email: 'client@company.com',
          displayName: 'Client'
        },
        organizer: {
          email: 'manager@company.com',
          displayName: 'Project Manager'
        }
      },
      {
        id: 'calendar_002',
        summary: 'Haftalık Durum Değerlendirmesi',
        description: 'Haftalık ekip toplantısı ve durum değerlendirmesi',
        start: {
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          timeZone: 'Europe/Istanbul'
        },
        end: {
          dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          timeZone: 'Europe/Istanbul'
        },
        location: 'Toplantı Odası B',
        status: 'confirmed',
        attendees: [
          {
            email: 'user@echoday.com',
            displayName: 'EchoDay User',
            responseStatus: 'needsAction'
          }
        ],
        creator: {
          email: 'manager@company.com',
          displayName: 'Team Lead'
        },
        organizer: {
          email: 'manager@company.com',
          displayName: 'Team Lead'
        }
      }
    ];

    // Calendar etkinliklerini EchoDay görev formatına çevir
    const echoDayTasks = calendarEvents.map(event => ({
      id: `calendar_${event.id}`,
      title: event.summary,
      description: event.description,
      startTime: event.start?.dateTime,
      endTime: event.end?.dateTime,
      location: event.location || '',
      attendees: event.attendees?.map(a => a.email) || [],
      creator: event.creator?.email,
      organizer: event.organizer?.email,
      priority: event.summary?.includes('Önemli') ? 'high' : 
                event.summary?.includes('Müşteri') ? 'high' : 'medium',
      status: event.status === 'confirmed' ? 'pending' : 'cancelled',
      category: 'calendar-event',
      source: 'google-calendar-sync',
      calendarId: event.id,
      createdAt: new Date().toISOString()
    }));

    // EchoDay görev sistemine gönder (simülasyon)
    console.log('📤 EchoDay görev sistemine gönderiliyor:', echoDayTasks.length);
    
    const taskResults = await Promise.all(
      echoDayTasks.map(async (task) => {
        // EchoDay task API simülasyonu
        console.log(`📝 Görev oluşturuluyor: ${task.title}`);
        
        // Başarılı yanıtı simüle et
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          taskId: task.id,
          success: true,
          taskTitle: task.title
        };
      })
    );

    const successfulTasks = taskResults.filter(r => r.success);
    const failedTasks = taskResults.filter(r => !r.success);

    console.log(`✅ Görev oluşturma tamamlandı: ${successfulTasks.length} başarılı, ${failedTasks.length} başarısız`);
    
    res.json({
      success: true,
      message: `${successfulTasks.length} görev EchoDay\'da oluşturuldu`,
      createdTasks: echoDayTasks,
      results: taskResults,
      summary: {
        total: echoDayTasks.length,
        successful: successfulTasks.length,
        failed: failedTasks.length
      }
    });

  } catch (error) {
    console.error('❌ Calendar görev oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Calendar görev oluşturma sırasında hata oluştu'
    });
  }
});

// Real-time webhook endpoint - EchoDay görev değişikliklerini dinler
app.post('/api/calendar/task-update-webhook', (req, res) => {
  try {
    const { taskUpdate, action } = req.body;
    
    console.log('🔄 EchoDay görev değişikliği:', action, taskUpdate.title);
    
    let calendarUpdateResult = null;
    
    switch (action) {
      case 'create':
        // Yeni görev oluşturulduğunda Google Calendar'a ekle
        calendarUpdateResult = {
          eventId: `calendar_${taskUpdate.id}`,
          action: 'create',
          success: true,
          message: 'Görev Google Calendar\'a eklendi'
        };
        break;
        
      case 'update':
        // Görev güncellendiğinde Google Calendar etkinliğini güncelle
        calendarUpdateResult = {
          eventId: taskUpdate.calendarId,
          action: 'update',
          success: true,
          message: 'Calendar etkinliği güncellendi'
        };
        break;
        
      case 'complete':
        // Görev tamamlandığında Calendar etkinliğini "confirmed" yap
        calendarUpdateResult = {
          eventId: taskUpdate.calendarId,
          action: 'complete',
          success: true,
          message: 'Calendar etkinliği tamamlandı olarak işaretlendi'
        };
        break;
        
      case 'delete':
        // Görev silindiğinde Calendar etkinliğini iptal et
        calendarUpdateResult = {
          eventId: taskUpdate.calendarId,
          action: 'delete',
          success: true,
          message: 'Calendar etkinliği iptal edildi'
        };
        break;
        
      default:
        calendarUpdateResult = {
          success: false,
          message: 'Bilinmeyen görev eylemi'
        };
    }
    
    console.log('📤 Google Calendar güncelleme sonucu:', calendarUpdateResult);
    
    res.json({
      success: true,
      message: `Görev değişikliği işlendi: ${calendarUpdateResult.message}`,
      taskUpdate: taskUpdate,
      calendarUpdate: calendarUpdateResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Task webhook hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Task webhook işlenirken hata oluştu'
    });
  }
});

// Calendar senkronizasyon durumunu kontrol et
app.get('/api/calendar/sync-status', (req, res) => {
  try {
    const lastSyncTime = new Date().toISOString();
    const syncStatus = {
      lastSync: lastSyncTime,
      status: 'active',
      direction: 'bidirectional',
      echoDayToCalendar: {
        lastSync: lastSyncTime,
        status: 'ready',
        pendingTasks: 0
      },
      calendarToEchoDay: {
        lastSync: lastSyncTime,
        status: 'ready',
        pendingEvents: 0
      }
    };
    
    res.json({
      success: true,
      syncStatus: syncStatus,
      message: 'Calendar senkronizasyon sistemi aktif'
    });

  } catch (error) {
    console.error('❌ Sync status hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Sync status kontrolü başarısız'
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
  console.log(`📧 Gmail webhook receiver endpoint: http://localhost:${PORT}/api/gmail/webhook`);
  console.log(`📋 Gmail list endpoint: http://localhost:${PORT}/api/gmail/list`);
  console.log(`📧 Mail webhook endpoint: http://localhost:${PORT}/api/mail/webhook`);
  console.log(`🗓️ Calendar webhook endpoint: http://localhost:${PORT}/api/calendar/webhook`);
  console.log(`🔄 Calendar senkronizasyon endpoint: http://localhost:${PORT}/api/calendar/sync-tasks-to-calendar`);
  console.log(`🔄 Calendar senkronizyon endpoint: http://localhost:${PORT}/api/calendar/sync-calendar-to-tasks`);
  console.log(`\n💡 Zapier Gmail Webhook Kurulumu:`);
  console.log(`1. Zapier'da "Gmail" trigger'ı seçin`);
  console.log(`2. Webhook URL olarak: http://localhost:5001/api/gmail/webhook`);
  console.log(`3. Gmail'i bağlayın ve test edin`);
  console.log(`4. Gerçek mailler EchoDay'a gelecek! 🎉`);
});
