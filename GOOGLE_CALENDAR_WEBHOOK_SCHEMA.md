# Google Calendar Webhook Şema Analizi

## 📋 Mevcut Gmail Webhook Yapısı

Mevcut `GmailCanvas.tsx` dosyasında kullanılan webhook yapısı:

```typescript
// Gmail webhook verisi (mevcut)
{
  from: string,
  to: string,
  subject: string,
  body: string,
  date: string,
  source: 'gmail-webhook',
  messageId: string,
  labels: string[],
  threadId: string
}
```

## 🗓️ Google Calendar Webhook Beklenen Formatı

Zapier üzerinden Google Calendar webhook'u için beklenen veri yapısı:

```typescript
// Google Calendar webhook verisi (beklenen)
{
  id: string,                    // Event ID
  summary: string,               // Event title
  description?: string,          // Event description
  start: {
    dateTime?: string,           // ISO datetime
    date?: string,               // All-day event (YYYY-MM-DD)
    timeZone?: string
  },
  end: {
    dateTime?: string,           // ISO datetime  
    date?: string,               // All-day event
    timeZone?: string
  },
  location?: string,             // Event location
  attendees?: Array<{
    email: string,
    displayName?: string,
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }>,
  creator: {
    email: string,
    displayName?: string
  },
  organizer: {
    email: string,
    displayName?: string
  },
  status: 'confirmed' | 'tentative' | 'cancelled',
  transparency?: 'opaque' | 'transparent',
  visibility?: 'default' | 'public' | 'private' | 'confidential',
  recurrence?: string[],         // RRULE format
  recurringEventId?: string,     // For recurring events
  iCalUID: string,              // iCalendar UID
  sequence: number,             // Event version
  hangoutLink?: string,         // Google Meet link
  conferenceData?: {
    conferenceSolution: {
      name: string,
      iconUri: string
    },
    conferenceId: string,
    entryPoints: Array<{
      entryPointType: string,
      uri: string,
      label?: string
    }>
  },
  reminders: {
    useDefault: boolean,
    overrides?: Array<{
      method: 'email' | 'popup',
      minutes: number
    }]
  },
  extendedProperties?: {
    private?: Record<string, string>,
    shared?: Record<string, string>
  },
  eventType: 'default' | 'outOfOffice' | 'focusTime',
  // Zapier ek alanları
  created: string,              // Event creation time
  updated: string,              // Last update time
  htmlLink: string              // Google Calendar link
}
```

## 🔄 Veri Maping Şeması

Gmail → Google Calendar dönüşüm tablosu:

| Gmail Alanı | Calendar Alanı | Açıklama |
|-------------|---------------|----------|
| `subject` | `summary` | Etkinlik başlığı |
| `body` | `description` | Etkinlik açıklaması |
| `date` | `start.dateTime` | Başlangıç zamanı |
| `date` + 1 saat | `end.dateTime` | Bitiş zamanı |
| `from` | `creator.email` | Oluşturan kişi |
| `to` | `attendees[0].email` | Katılımcı |
| `messageId` | `id` | Benzersiz ID |
| `source` | `eventType` | Event türü |

## 🚨 Uyuşmazlık Problemleri

### 1. Zaman Formatı Farklılığı
- **Gmail:** `date: string` (genel format)
- **Calendar:** `start.dateTime` ve `end.dateTime` (ISO 8601)

### 2. Katılımcı Yapısı
- **Gmail:** Tek `to` alanı
- **Calendar:** `attendees` array'i

### 3. Event Durumu
- **Gmail:** Durum bilgisi yok
- **Calendar:** `status`, `visibility`, `transparency`

### 4. Tekrarlayan Eventler
- **Gmail:** Tekrarlama desteği yok
- **Calendar:** `recurrence`, `recurringEventId`

## 🛠️ Çözüm Önerileri

### 1. Veri Dönüştürücü Fonksiyon

```typescript
function gmailToCalendarEvent(gmailData: any): CalendarEvent {
  const startDate = new Date(gmailData.date);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 saat
  
  return {
    id: gmailData.messageId,
    summary: gmailData.subject || 'Mail Etkinliği',
    description: gmailData.body || gmailData.snippet,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    creator: {
      email: gmailData.from
    },
    attendees: gmailData.to ? [{
      email: gmailData.to,
      responseStatus: 'needsAction'
    }] : [],
    status: 'confirmed',
    visibility: 'default',
    created: startDate.toISOString(),
    updated: new Date().toISOString(),
    htmlLink: `https://calendar.google.com/calendar/event?eid=${gmailData.messageId}`
  };
}
```

### 2. Webhook Endpoint'i Güncelleme

```typescript
// Mevcut Gmail webhook endpoint'ini Calendar'a uyarlama
app.post('/api/calendar/webhook', (req, res) => {
  try {
    const calendarData = req.body;
    
    // Calendar verisini EchoDay formatına çevir
    const echoDayData = {
      type: 'calendar_event',
      id: calendarData.id,
      title: calendarData.summary,
      description: calendarData.description,
      startTime: calendarData.start?.dateTime || calendarData.start?.date,
      endTime: calendarData.end?.dateTime || calendarData.end?.date,
      location: calendarData.location,
      attendees: calendarData.attendees?.map(a => a.email) || [],
      creator: calendarData.creator?.email,
      status: calendarData.status,
      source: 'google-calendar-webhook',
      createdAt: calendarData.created,
      updatedAt: calendarData.updated
    };
    
    // EchoDay sistemine işle
    // ... işlem kodları
    
    res.json({ success: true, data: echoDayData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Zapier Ayarları

Zapier'de Google Calendar webhook'u için:

1. **Trigger:** Google Calendar - "New Event"
2. **Action:** Webhooks - "POST"
3. **URL:** `https://your-echoday-domain.com/api/calendar/webhook`
4. **Data Format:** JSON
5. **Fields:** Tüm calendar alanlarını gönder

## 📊 Görsel Akış Şeması

```
Google Calendar Event
        ↓
    Zapier Webhook
        ↓
  [Data Transformation]
   Gmail → Calendar
        ↓
   EchoDay System
        ↓
   Task/Reminder
```

## 🎯 Test Verisi

```json
{
  "id": "evt_123456789",
  "summary": "Toplantı: Proje Değerlendirme",
  "description": "Proje ilerlemesinin değerlendirileceği toplantı",
  "start": {
    "dateTime": "2025-01-15T14:00:00+03:00",
    "timeZone": "Europe/Istanbul"
  },
  "end": {
    "dateTime": "2025-01-15T15:00:00+03:00", 
    "timeZone": "Europe/Istanbul"
  },
  "location": "Toplantı Odası A",
  "attendees": [
    {
      "email": "user@example.com",
      "displayName": "Test User",
      "responseStatus": "accepted"
    }
  ],
  "creator": {
    "email": "organizer@example.com",
    "displayName": "Organizer"
  },
  "status": "confirmed",
  "created": "2025-01-10T10:00:00Z",
  "updated": "2025-01-14T16:30:00Z",
  "htmlLink": "https://calendar.google.com/calendar/event?eid=evt_123456789"
}
