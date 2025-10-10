# 🔔 İnteraktif Hatırlatma Ekleme Özelliği

## 📋 Genel Bakış

Bu özellik, görev eklenirken AI asistanın kullanıcıya hatırlatma eklemek isteyip istemediğini sormasını ve kullanıcıdan onay aldıktan sonra hatırlatma zamanını sorarak interaktif bir şekilde hatırlatma eklemesini sağlar.

## ✨ Özellikler

- **Otomatik Soru**: Tarihi olan görevler eklendiğinde AI otomatik olarak hatırlatma eklemek isteyip istemediğini sorar
- **İnteraktif Diyalog**: Kullanıcı "Evet" derse, AI hatırlatma zamanını sorar
- **Esnek Zaman Girişi**: Kullanıcı "1 gün önce", "2 saat önce" gibi doğal dilde zaman belirtebilir
- **Akıllı Parse**: Gemini AI kullanıcının girdiği zamanı otomatik olarak dakikaya çevirir
- **Görsel Geri Bildirim**: Her adımda kullanıcıya açık mesajlar gösterilir

## 🎯 Kullanım Senaryosu

### Adım 1: Görev Ekleme
Kullanıcı sesli veya yazılı komutla görev ekler:
```
"Yarın saat 15:00 doktora git"
```

### Adım 2: AI Sorusu
AI otomatik olarak chat açar ve sorar:
```
Görev başarıyla eklendi! "Doktora git" görevi için hatırlatma eklemek ister misiniz? (Evet/Hayır)
```

### Adım 3a: Kullanıcı Evet Derse
```
Kullanıcı: "Evet"
```

AI hatırlatma zamanını sorar:
```
AI: Anlaşıldı! "Doktora git" görevi için hatırlatmayı ne kadar önce almak istersiniz?

Örnekler:
- "1 gün önce"
- "2 saat önce"
- "30 dakika önce"
- "1 hafta önce"
```

### Adım 4: Kullanıcı Zaman Belirtir
```
Kullanıcı: "1 gün önce"
```

AI hatırlatmayı ekler ve onaylar:
```
AI: Mükemmel! "Doktora git" görevi için 1 gün önce hatırlatma eklendi. Başka bir şey yapabilir miyim?
```

### Adım 3b: Kullanıcı Hayır Derse
```
Kullanıcı: "Hayır"
```

AI kabul eder:
```
AI: Anlaşıldı, hatırlatma eklenmedi. Başka bir şey yapabilir miyim?
```

## 🔧 Teknik Detaylar

### 1. State Yönetimi (Main.tsx)

```typescript
// Son eklenen görevin ID'sini takip et
const [lastAddedTaskId, setLastAddedTaskId] = useState<string | null>(null);
```

### 2. Görev Ekleme Sonrası Kontrol

```typescript
if (datetime && !reminders) {
    // Görevde tarih var ama hatırlatma yok
    setLastAddedTaskId(newTodo.id);
    
    const aiQuestion: ChatMessage = {
        role: 'model',
        text: `Görev başarıyla eklendi! "${text}" görevi için hatırlatma eklemek ister misiniz? (Evet/Hayır)`
    };
    setChatHistory(prev => [...prev, aiQuestion]);
    setIsChatOpen(true);
}
```

### 3. Intent Classification (geminiService.ts)

Yeni intentler eklendi:
```typescript
enum: ['add_task', 'add_note', 'get_summary', 'add_reminder_yes', 'add_reminder_no', 'chat']
```

- `add_reminder_yes`: Kullanıcı "evet", "ekle", "istiyorum" dediğinde
- `add_reminder_no`: Kullanıcı "hayır", "istemiyorum", "geç" dediğinde

### 4. Intent Handling (Main.tsx)

#### a) Evet İntenti
```typescript
if (intentResult?.intent === 'add_reminder_yes') {
    const task = todos.find(t => t.id === lastAddedTaskId);
    const modelMessage: ChatMessage = { 
        role: 'model', 
        text: `Anlaşıldı! "${task.text}" görevi için hatırlatmayı ne kadar önce almak istersiniz?\n\nÖrnekler:\n- "1 gün önce"\n- "2 saat önce"\n- "30 dakika önce"\n- "1 hafta önce"` 
    };
    setChatHistory(prev => [...prev, modelMessage]);
}
```

#### b) Hayır İntenti
```typescript
if (intentResult?.intent === 'add_reminder_no') {
    setLastAddedTaskId(null);
    const modelMessage: ChatMessage = { 
        role: 'model', 
        text: 'Anlaşıldı, hatırlatma eklenmedi. Başka bir şey yapabilir miyim?' 
    };
    setChatHistory(prev => [...prev, modelMessage]);
}
```

#### c) Zaman Girişi Handling
```typescript
if (lastAddedTaskId) {
    const task = todos.find(t => t.id === lastAddedTaskId);
    
    // AI ile zamanı parse et
    const reminderTimeResult = await geminiService.analyzeTask(apiKey, `hatırlatma ${message}`);
    
    if (reminderTimeResult?.reminderMinutesBefore) {
        // Hatırlatma ekle
        const newReminder: ReminderConfig = {
            id: uuidv4(),
            type: 'relative',
            minutesBefore: reminderTimeResult.reminderMinutesBefore,
            triggered: false,
        };
        
        const updatedTask = {
            ...task,
            reminders: [...(task.reminders || []), newReminder]
        };
        
        setTodos(prev => prev.map(t => t.id === lastAddedTaskId ? updatedTask : t));
        setLastAddedTaskId(null);
        
        // Başarı mesajı
        const modelMessage: ChatMessage = { 
            role: 'model', 
            text: `Mükemmel! "${task.text}" görevi için ${timeStr} hatırlatma eklendi.` 
        };
        setChatHistory(prev => [...prev, modelMessage]);
    }
}
```

## 🎨 Kullanıcı Deneyimi

### Chat Akışı Örneği

```
👤 Kullanıcı: "Yarın saat 15:00 doktora git"

[Görev ekleniyor...]
✅ Bildirim: "Yeni görev eklendi!"

🤖 AI: Görev başarıyla eklendi! "Doktora git" görevi için hatırlatma eklemek ister misiniz? (Evet/Hayır)

👤 Kullanıcı: "Evet"

🤖 AI: Anlaşıldı! "Doktora git" görevi için hatırlatmayı ne kadar önce almak istersiniz?

Örnekler:
- "1 gün önce"
- "2 saat önce"
- "30 dakika önce"
- "1 hafta önce"

👤 Kullanıcı: "1 gün önce"

🤖 AI: Mükemmel! "Doktora git" görevi için 1 gün önce hatırlatma eklendi. Başka bir şey yapabilir miyim?
```

## 📝 Desteklenen Yanıtlar

### Evet İçin:
- "evet"
- "evet ekle"
- "ekle"
- "istiyorum"
- "tamam"
- "olur"

### Hayır İçin:
- "hayır"
- "istemiyorum"
- "geç"
- "şimdi değil"
- "yok"

### Zaman İfadeleri:
- "15 dakika önce"
- "30 dakika önce", "yarım saat önce"
- "1 saat önce", "bir saat önce"
- "2 saat önce", "iki saat önce"
- "1 gün önce", "bir gün önce"
- "2 gün önce", "iki gün önce"
- "1 hafta önce", "bir hafta önce"

## ⚠️ Önemli Notlar

1. **Tarih Gereksinimi**: Hatırlatma sorusu sadece tarih/saat bilgisi olan görevler için sorulur

2. **Bağlam Takibi**: `lastAddedTaskId` ile son eklenen görev takip edilir

3. **Otomatik Temizlik**: Hatırlatma başarıyla eklendikten veya kullanıcı "hayır" dedikten sonra `lastAddedTaskId` temizlenir

4. **Hata Kontrolü**: Görev bulunamazsa veya beklenmeyen bir durum olursa kullanıcıya bilgi verilir

5. **Chat Otomasyonu**: Görev eklendikten sonra chat otomatik olarak açılır

## 🔄 Önceki Özellikle Karşılaştırma

### Önceki Özellik (Otomatik)
```
👤: "Yarın saat 15:00 doktora git, bir gün önce hatırlat"
✅: Görev ve hatırlatma otomatik eklenir
```

**Avantajlar**: Hızlı, tek komut
**Dezavantajlar**: Kullanıcı hatırlatma isteyip istemediğine dair kontrol yok

### Yeni Özellik (İnteraktif)
```
👤: "Yarın saat 15:00 doktora git"
🤖: "Hatırlatma eklemek ister misiniz?"
👤: "Evet"
🤖: "Ne kadar önce?"
👤: "1 gün önce"
✅: Görev ve hatırlatma eklenir
```

**Avantajlar**: 
- Kullanıcı kontrolü
- Daha esnek
- İsteğe bağlı
- Eğitici (kullanıcıya örnekler gösterir)

**Dezavantajlar**: Daha fazla adım gerektirir

## 🔮 Gelecek Geliştirmeler

- [ ] Çoklu hatırlatma desteği ("1 gün ve 2 saat önce")
- [ ] Özel hatırlatma mesajları
- [ ] Varsayılan hatırlatma tercihleri (kullanıcı her zaman 1 gün önce isterse)
- [ ] Hatırlatma düzenleme (mevcut hatırlatmayı değiştirme)
- [ ] Sesli hatırlatma zamanı girişi

## 🐛 Bilinen Sorunlar

Şu anda bilinen bir sorun bulunmamaktadır.

## 📚 İlgili Dosyalar

- `src/Main.tsx` - Ana uygulama mantığı ve intent handling
- `src/services/geminiService.ts` - Intent classification ve schema
- `src/types.ts` - Tip tanımlamaları
- `REMINDER_EXTRACTION_FEATURE.md` - Otomatik hatırlatma çıkarma özelliği

## 👨‍💻 Geliştirici

Bu özellik, kullanıcı talebi üzerine geliştirilmiştir ve kullanıcı deneyimini iyileştirmek için interaktif bir yaklaşım sunar.

---

**Son Güncelleme**: 2025-10-10
**Versiyon**: 2.0.0
