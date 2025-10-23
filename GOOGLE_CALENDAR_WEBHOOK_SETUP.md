# Google Calendar Webhook Kurulum Rehberi

## 🎯 Hedef
Google Calendar'daki etkinlikleri Zapier aracılığıyla EchoDay sistemine otomatik olarak göndermek ve görev/hatırlatıcı oluşturmak.

## 📋 Gereksinimler
- ✅ Google Calendar hesabı
- ✅ Zapier hesabı (ücretsiz plan yeterli)
- ✅ Çalışan EchoDay sistemi
- ✅ Node.js server (port 5001)

## 🚀 Adım Adım Kurulum

### 1. EchoDay Server'ı Başlatın

```bash
# Terminal'i açın ve server'ı başlatın
node server.cjs

# Başarılı başlatma mesajı:
# 🚀 EchoDay Proxy Server çalışıyor: http://localhost:5001
# 🗓️ Calendar webhook endpoint: http://localhost:5001/api/calendar/webhook
```

### 2. Zapier'da Yeni Zap Oluşturun

1. [Zapier](https://zapier.com/) sitesine gidin
2. "Create Zap" butonuna tıklayın
3. **Trigger (Tetikleyici) Seçimi:**
   - Arama kutusuna "Google Calendar" yazın
   - "Google Calendar" seçeneğini seçin
   - "New Event" trigger'ını seçin
   - "Continue" butonuna tıklayın

4. **Google Calendar Bağlantısı:**
   - Google hesabınızla bağlantı kurun
   - Takvim seçin (genellikle "Primary")
   - "Continue" butonuna tıklayın

5. **Trigger Test:**
   - "Test trigger" butonuna tıklayın
   - Google Calendar'dan örnek bir etkinlik almalısınız
   - "Continue with selected record" butonuna tıklayın

### 3. Action (Eylem) Olarak Webhook Ekleyin

1. **Action Seçimi:**
   - Arama kutusuna "Webhooks" yazın
   - "Webhooks by Zapier" seçeneğini seçin
   - "POST" action'ını seçin
   - "Continue" butonuna tıklayın

2. **Webhook URL'i Yapılandırın:**
   - **URL:** `http://localhost:5001/api/calendar/webhook`
   - **Method:** POST
   - **Data Format:** JSON
   - **Pass-Through:** Hayır

3. **Veri Alanlarını Gönderin:**
   Aşağıdaki alanları "Custom" olarak ekleyin:

   | Alan Adı | Google Calendar Alanı | Açıklama |
   |----------|---------------------|----------|
   | `id` | ID | Etkinlik ID'si |
   | `summary` | Summary | Etkinlik başlığı |
   | `description` | Description | Etkinlik açıklaması |
   | `start.dateTime` | Start Time (Date/Time) | Başlangıç zamanı |
   | `end.dateTime` | End Time (Date/Time) | Bitiş zamanı |
   | `location` | Location | Konum |
   | `creator.email` | Creator Email | Oluşturan kişi |
   | `organizer.email` | Organizer Email | Organizatör |
   | `status` | Status | Durum |
   | `visibility` | Visibility | Görünürlük |
   | `hangoutLink` | Hangout Link | Google Meet linki |
   | `created` | Created | Oluşturulma zamanı |
   | `updated` | Updated | Güncelleme zamanı |
   | `htmlLink` | HTML Link | Calendar linki |

4. **Attendees (Katılımcılar) için:**
   - Eğer katılımcı varsa, "Custom" olarak ekleyin:
   - **Alan Adı:** `attendees`
   - **Değer:** `{ "email": "{{12345678__attendee__email}}", "displayName": "{{12345678__attendee__name}}", "responseStatus": "{{12345678__attendee__responseStatus}}" }`

### 4. Test Edin

1. **Test Webhook:**
   - "Test & Continue" butonuna tıklayın
   - Başarılı olursa şöyle bir mesaj almalısınız:
   ```json
   {
     "success": true,
     "message": "Calendar etkinliği başarıyla alındı ve kaydedildi!",
     "eventId": "evt_123456789",
     "totalEvents": 1,
     "data": {
       "type": "calendar_event",
       "title": "Test Etkinliği",
       "startTime": "2025-01-15T14:00:00+03:00",
       "endTime": "2025-01-15T15:00:00+03:00"
     }
   }
   ```

2. **Publish Zap:**
   - "Publish Zap" butonuna tıklayın
   - Zap'inize bir isim verin (örn: "Google Calendar to EchoDay")
   - "Turn on Zap" butonuna tıklayın

## 🧪 Test Etmek

### Manuel Test
1. Google Calendar'da yeni bir etkinlik oluşturun
2. 1-2 dakika bekleyin
3. EchoDay server konsolunda şu mesajı görmelisiniz:
   ```
   🗓️ Yeni calendar webhook alındı: {
     summary: "Test Etkinliği",
     startTime: "2025-01-15T14:00:00+03:00",
     status: "confirmed"
   }
   ✅ Calendar etkinliği başarıyla kaydedildi.
   ```

### CalendarCanvas Test
1. EchoDay uygulamasında CalendarCanvas component'ini açın
2. "Calendar Trigger" node'una çift tıklayın
3. Zapier webhook URL'ini girin (isteğe bağlı, test için)
4. "▶️ Çalıştır" butonuna tıklayın
5. Sonuçları panelde gözlemleyin

## 🔧 Sorun Giderme

### ❌ "Webhook URL gerekli" hatası
- **Çözüm:** Zapier'de webhook URL'sini doğru girdiğinizden emin olun

### ❌ "CORS hatası" 
- **Çözüm:** Server'ın çalıştığından emin olun (`http://localhost:5001`)

### ❌ "Calendar webhook hatası"
- **Nedenler:**
  - Google Calendar alan adları yanlış
  - Veri formatı uyumsuz
  - Server çalışmıyor
- **Çözüm:** Zapier alanlarını kontrol edin

### ❌ Zapier tetiklenmiyor
- **Çözüm:**
  1. Google Calendar bağlantısını kontrol edin
  2. Doğru takvimi seçtiğinizden emin olun
  3. Zap'in açık olduğundan emin olun

## 📊 Veri Akışı Diyagramı

```
Google Calendar Event
        ↓
    Zapier Trigger
        ↓
   [Veri Dönüşümü]
        ↓
  EchoDay Server
  (localhost:5001)
        ↓
   CalendarCanvas
        ↓
   Görev/Hatırlatıcı
```

## 🔌 API Endpoint'leri

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/calendar/webhook` | POST | Zapier'dan gelen etkinlikleri alır |
| `/api/calendar/list` | GET | Kaydedilen etkinlikleri listeler |
| `/api/health` | GET | Server durumunu kontrol eder |

## 🎉 Başarılı Kurulum Sonrası

✅ Google Calendar'da yeni etkinlik oluşturduğunuzda  
✅ Otomatik olarak EchoDay sistemine gelir  
✅ CalendarCanvas'ta görünür  
✅ Görev ve hatırlatıcı olarak kaydedilebilir  

## 📱 Mobil Kullanım

Google Calendar mobil uygulamasından oluşturulan etkinlikler de otomatik olarak işlenecektir.

## 🔔 Bildirimler

- Yeni etkinlik geldiğinde browser bildirimi alabilirsiniz
- EchoDay ana panelinde "Yeni Takvim Etkinliği" bildirimi görüntülenir

---

**İpucu:** Gelişmiş filtreleme için CalendarCanvas'taki "🎯 Akıllı İşle" özelliğini kullanın. Bu özellik sadece önemli etkinlikleri işleyecek şekilde ayarlanabilir.
