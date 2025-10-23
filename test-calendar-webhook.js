#!/usr/bin/env node

/**
 * Google Calendar Webhook Test Script
 * "The specified time range is empty" hatası için çözüm
 */

const http = require('http');

// Test verisi - gelecekteki etkinlik
const testCalendarEvent = {
  id: `evt_test_${Date.now()}`,
  summary: "Test Calendar Event - EchoDay Solution",
  description: "Bu test etkinliği 'The specified time range is empty' hatasını çözmek için oluşturulmuştur",
  start: {
    dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 saat sonra
    timeZone: "Europe/Istanbul"
  },
  end: {
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 saat sonra
    timeZone: "Europe/Istanbul"
  },
  location: "EchoDay Test Office",
  attendees: [
    {
      email: "test@echoday.com",
      displayName: "Test User",
      responseStatus: "accepted"
    }
  ],
  creator: {
    email: "echoday@example.com",
    displayName: "EchoDay System"
  },
  organizer: {
    email: "echoday@example.com", 
    displayName: "EchoDay System"
  },
  status: "confirmed",
  visibility: "default",
  hangoutLink: "https://meet.google.com/test-meeting-echoday",
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  htmlLink: "https://calendar.google.com/calendar/event?eid=test"
};

// Webhook gönderme fonksiyonu
function sendWebhook(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/calendar/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseBody);
          resolve({ status: res.statusCode, response });
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Ana test fonksiyonu
async function runTest() {
  console.log('🚀 Google Calendar Webhook Test Başlatılıyor...\n');
  
  console.log('📋 Test Etkinliği Bilgileri:');
  console.log(`   ID: ${testCalendarEvent.id}`);
  console.log(`   Başlık: ${testCalendarEvent.summary}`);
  console.log(`   Başlangıç: ${testCalendarEvent.start.dateTime}`);
  console.log(`   Bitiş: ${testCalendarEvent.end.dateTime}`);
  console.log(`   Durum: ${testCalendarEvent.status}`);
  console.log(`   Konum: ${testCalendarEvent.location}\n`);

  try {
    console.log('📡 Webhook gönderiliyor...');
    const result = await sendWebhook(testCalendarEvent);
    
    console.log(`✅ Webhook başarılı! Status: ${result.status}`);
    console.log('📄 Yanıt:', JSON.stringify(result.response, null, 2));
    
    if (result.response.success) {
      console.log('\n🎉 Test başarılı! EchoDay Calendar webhook çalışıyor.');
      console.log('\n📝 Sonraki adımlar:');
      console.log('1. Zapier trigger ayarlarını kontrol edin');
      console.log('2. Google Calendar\'da test etkinliği oluşturun');
      console.log('3. CalendarCanvas component\'inde test edin');
    } else {
      console.log('\n❌ Webhook başarısız. Server loglarını kontrol edin.');
    }
    
  } catch (error) {
    console.error('\n❌ Test hatası:', error.message);
    console.log('\n🔧 Çözüm önerileri:');
    console.log('1. Server çalışıyor mu? (node server.cjs)');
    console.log('2. Port 5001 açık mı?');
    console.log('3. CORS ayarları doğru mu?');
  }
}

// Zapier için ek test verileri
const zapierTestEvents = [
  {
    name: "Yakın Etkinlik",
    data: {
      ...testCalendarEvent,
      summary: "Yakın Toplantı - 30 dakika içinde",
      start: {
        dateTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        timeZone: "Europe/Istanbul"
      }
    }
  },
  {
    name: "Önemli Etkinlik", 
    data: {
      ...testCalendarEvent,
      summary: "🚨 ACİL: Proje Deadline",
      description: "Önemli proje teslim tarihi",
      start: {
        dateTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        timeZone: "Europe/Istanbul"
      }
    }
  },
  {
    name: "Tekrarlayan Etkinlik",
    data: {
      ...testCalendarEvent,
      summary: "Haftalık Takım Toplantısı",
      recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO"],
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timeZone: "Europe/Istanbul"
      }
    }
  }
];

// Komut satırı argümanları
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🗓️ Google Calendar Webhook Test Script

Kullanım:
  node test-calendar-webhook.js [seçenekler]

Seçenekler:
  --help, -h           Bu yardımı göster
  --zapier-tests       Zapier için ek testler
  --multiple           Birden fazla test etkinliği gönder
  --verbose            Detaylı log göster

Örnekler:
  node test-calendar-webhook.js
  node test-calendar-webhook.js --zapier-tests
  node test-calendar-webhook.js --multiple --verbose
`);
  process.exit(0);
}

if (args.includes('--zapier-tests')) {
  console.log('🔄 Zapier için test etkinlikleri gönderiliyor...\n');
  
  Promise.all(
    zapierTestEvents.map(async (test, index) => {
      try {
        console.log(`${index + 1}. ${test.name}`);
        const result = await sendWebhook(test.data);
        console.log(`   ✅ Status: ${result.status}`);
        return result;
      } catch (error) {
        console.log(`   ❌ Hata: ${error.message}`);
        return null;
      }
    })
  ).then(results => {
    const successful = results.filter(r => r !== null).length;
    console.log(`\n📊 Sonuç: ${successful}/${results.length} test başarılı`);
  });
  
} else if (args.includes('--multiple')) {
  console.log('🔄 Birden fazla test etkinliği gönderiliyor...\n');
  
  const multipleEvents = Array.from({ length: 3 }, (_, i) => ({
    ...testCalendarEvent,
    id: `evt_multi_${Date.now()}_${i}`,
    summary: `Çoklu Test Etkinliği ${i + 1}`,
    start: {
      dateTime: new Date(Date.now() + (i + 1) * 60 * 60 * 1000).toISOString(),
      timeZone: "Europe/Istanbul"
    }
  }));
  
  Promise.all(
    multipleEvents.map(async (event, index) => {
      try {
        console.log(`${index + 1}. Etkinlik gönderiliyor...`);
        const result = await sendWebhook(event);
        console.log(`   ✅ Status: ${result.status}`);
        return result;
      } catch (error) {
        console.log(`   ❌ Hata: ${error.message}`);
        return null;
      }
    })
  ).then(results => {
    const successful = results.filter(r => r !== null).length;
    console.log(`\n📊 Sonuç: ${successful}/${results.length} etkinlik başarılı`);
  });
  
} else {
  // Normal test
  runTest();
}

if (args.includes('--verbose')) {
  console.log('\n🔍 Detaylı mod aktif - tüm loglar gösteriliyor');
}
