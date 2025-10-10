# 🔔 Sesli Komutla Hatırlatma Ekleme Özelliği

## 📋 Genel Bakış

Bu özellik, kullanıcıların sesli komutla görev eklerken aynı anda hatırlatma da belirleyebilmesini sağlar. Gemini AI, kullanıcının sesli komutundan hatırlatma bilgisini otomatik olarak çıkarır ve göreve ekler.

## ✨ Özellikler

- **Otomatik Hatırlatma Çıkarımı**: AI, "bir gün önce hatırlat", "1 saat önce uyar" gibi ifadelerden hatırlatma süresini otomatik olarak algılar
- **Dakika Bazlı Dönüşüm**: Tüm zaman ifadeleri dakikaya çevrilir (1 gün = 1440 dakika, 1 saat = 60 dakika)
- **Temiz Metin**: Hatırlatma ifadeleri görev metninden otomatik olarak kaldırılır
- **Görsel Geri Bildirim**: Hatırlatma eklendiğinde kullanıcıya bildirim gösterilir

## 🎯 Kullanım Örnekleri

### Sesli Komut Örnekleri:

1. **Bir gün önce hatırlatma**:
   ```
   "Yarın saat 15:00 doktora git, bir gün önce hatırlat"
   ```
   - Görev metni: "Doktora git"
   - Hatırlatma: Görev zamanından 1440 dakika (1 gün) önce

2. **Bir saat önce hatırlatma**:
   ```
   "Toplantıya katıl saat 14:00, bir saat önce uyar"
   ```
   - Görev metni: "Toplantıya katıl"
   - Hatırlatma: Görev zamanından 60 dakika (1 saat) önce

3. **30 dakika önce hatırlatma**:
   ```
   "Yemek hazırla akşam 19:00, 30 dakika önce hatırlatma ekle"
   ```
   - Görev metni: "Yemek hazırla"
   - Hatırlatma: Görev zamanından 30 dakika önce

4. **Bir hafta önce hatırlatma**:
   ```
   "Proje teslimi 15 Ocak, bir hafta önce hatırlat"
   ```
   - Görev metni: "Proje teslimi - 15 Ocak"
   - Hatırlatma: Görev zamanından 10080 dakika (1 hafta) önce

## 🔧 Teknik Detaylar

### 1. Tip Tanımlamaları (types.ts)

```typescript
export interface AnalyzedTaskData {
  text: string;
  priority: Priority;
  datetime?: string | null;
  category?: string;
  estimatedDuration?: number;
  requiresRouting?: boolean;
  destination?: string | null;
  isConflict?: boolean;
  // Yeni eklenen alan:
  reminderMinutesBefore?: number | null;
}
```

### 2. Gemini AI Schema (geminiService.ts)

```typescript
const taskSchema = {
    // ... diğer alanlar
    reminderMinutesBefore: { 
        type: SchemaType.NUMBER, 
        description: 'Kullanıcı hatırlatma belirtmişse, görev zamanından KAÇ DAKİKA ÖNCE hatırlatma yapılacağı. Örnekler: "bir gün önce"=1440, "1 saat önce"=60, "30 dakika önce"=30, "bir hafta önce"=10080. Belirtilmemişse null.', 
        nullable: true 
    },
};
```

### 3. AI Prompt Talimatları

```
HATIRLATMA ÇIKARMA:
- Kullanıcı "hatırlatma ekle", "hatırlat", "uyar" gibi kelimeler kullanıyorsa, reminderMinutesBefore alanını doldur
- Süre ifadelerini dakikaya çevir:
  * "bir gün önce" / "1 gün önce" = 1440 dakika
  * "iki gün önce" / "2 gün önce" = 2880 dakika
  * "bir hafta önce" / "1 hafta önce" = 10080 dakika
  * "bir saat önce" / "1 saat önce" = 60 dakika
  * "30 dakika önce" = 30 dakika
  * "yarım saat önce" = 30 dakika
  * "15 dakika önce" = 15 dakika
- Hatırlatma belirtilmemişse reminderMinutesBefore = null
- Hatırlatma ifadelerini text alanından ÇIKAR
```

### 4. Görev Oluşturma Mantığı (Main.tsx)

```typescript
// AI'dan gelen sonucu parse et
const { text, priority, datetime, reminderMinutesBefore, ...metadata } = aiResult;

// Eğer hatırlatma ve tarih varsa, reminder config oluştur
let reminders: ReminderConfig[] | undefined = undefined;
if (reminderMinutesBefore && datetime) {
    reminders = [{
        id: uuidv4(),
        type: 'relative' as ReminderType,
        minutesBefore: reminderMinutesBefore,
        triggered: false,
    }];
}

// Yeni görevi oluştur
const newTodo: Todo = {
    id: uuidv4(),
    text: text || description,
    priority: priority || Priority.Medium,
    datetime: datetime || null,
    completed: false,
    createdAt: new Date().toISOString(),
    aiMetadata: metadata,
    reminders: reminders, // Hatırlatmayı ekle
};
```

## 🎨 Kullanıcı Geri Bildirimi

Hatırlatma eklendiğinde kullanıcıya şu şekilde bildirim gösterilir:

```typescript
let successMsg = 'Yeni görev eklendi!';
if (reminders && reminders.length > 0) {
    const mins = reminderMinutesBefore || 0;
    if (mins >= 1440) {
        const days = Math.floor(mins / 1440);
        successMsg += ` Hatırlatma: ${days} gün önce`;
    } else if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        successMsg += ` Hatırlatma: ${hours} saat önce`;
    } else {
        successMsg += ` Hatırlatma: ${mins} dakika önce`;
    }
}
```

Örnek bildirimler:
- "Yeni görev eklendi! Hatırlatma: 1 gün önce"
- "Yeni görev eklendi! Hatırlatma: 2 saat önce"
- "Yeni görev eklendi! Hatırlatma: 30 dakika önce"

## 📝 Desteklenen Zaman İfadeleri

| Türkçe İfade | Dakika Değeri | Açıklama |
|-------------|--------------|----------|
| "15 dakika önce" | 15 | Çeyrek saat |
| "30 dakika önce", "yarım saat önce" | 30 | Yarım saat |
| "1 saat önce", "bir saat önce" | 60 | Bir saat |
| "2 saat önce", "iki saat önce" | 120 | İki saat |
| "1 gün önce", "bir gün önce" | 1440 | Bir gün (24 saat) |
| "2 gün önce", "iki gün önce" | 2880 | İki gün |
| "1 hafta önce", "bir hafta önce" | 10080 | Bir hafta (7 gün) |

## ⚠️ Önemli Notlar

1. **Tarih Gereksinimi**: Hatırlatma sadece tarih/saat bilgisi olan görevlere eklenir. Eğer görevde tarih yoksa, hatırlatma bilgisi göz ardı edilir.

2. **Relative Reminder**: Oluşturulan hatırlatmalar "relative" (göreceli) tiptedir, yani görev zamanına göre hesaplanır.

3. **Metin Temizliği**: AI, hatırlatma ifadelerini görev metninden otomatik olarak kaldırır:
   - ❌ Kötü: "Doktora git bir gün önce hatırlat"
   - ✅ İyi: "Doktora git"

4. **Çoklu Hatırlatmalar**: Şu anda tek seferlik hatırlatma desteklenir. Gelecekte çoklu hatırlatma desteği eklenebilir.

## 🔮 Gelecek Geliştirmeler

- [ ] Çoklu hatırlatma desteği ("1 gün ve 1 saat önce hatırlat")
- [ ] Absolute (mutlak) zamanlı hatırlatmalar ("15 Ocak 10:00'da hatırlat")
- [ ] Tekrarlayan hatırlatmalar
- [ ] Özel hatırlatma mesajları
- [ ] Hatırlatma sesli bildirimleri (text-to-speech)

## 🐛 Bilinen Sorunlar

Şu anda bilinen bir sorun bulunmamaktadır.

## 📚 İlgili Dosyalar

- `src/types.ts` - Tip tanımlamaları
- `src/services/geminiService.ts` - AI servis ve schema
- `src/Main.tsx` - Görev oluşturma mantığı
- `src/services/reminderService.ts` - Hatırlatma servisi

## 👨‍💻 Geliştirici

Bu özellik, kullanıcı talebi üzerine geliştirilmiştir ve sesli komut deneyimini iyileştirmek için tasarlanmıştır.

---

**Son Güncelleme**: 2025-10-10
**Versiyon**: 1.0.0
