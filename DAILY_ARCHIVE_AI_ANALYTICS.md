# Günlük Arşivleme ve AI Analiz Sistemi

## 📚 Genel Bakış

EchoDay artık her gün saat 00:00'da otomatik olarak görevlerinizi arşivler ve yapay zeka ile görev alışkanlıklarınızı analiz eder. Bu sistem, tekrar eden görevleri tespit eder, verimli saatlerinizi belirler ve görev yönetimi için kişiselleştirilmiş öneriler sunar.

## 🚀 Özellikler

### 1. Otomatik Günlük Arşivleme
- **Zamanlama**: Her gün saat 00:00'da otomatik çalışır
- **Akıllı Filtreleme**: Sadece tamamlanmış görevleri arşivler (yapılandırılabilir)
- **Bildirimler**: Arşivleme başarılı olduğunda bildirim gönderir
- **Manuel Tetikleme**: İhtiyaç halinde manuel olarak da tetiklenebilir

### 2. AI Tabanlı Görev Analizi
- **Tekrar Eden Görevler**: Düzenli olarak tekrarlanan görevleri tespit eder
- **Zaman Desenleri**: Hangi saatlerde daha aktif olduğunuzu belirler
- **Kategori Analizi**: Hangi kategorilerde yoğunlaştığınızı gösterir
- **Öncelik Tercihleri**: Önceliklendirme tarzınızı öğrenir

### 3. Kullanıcı Alışkanlıkları Öğrenimi
- **Tamamlama Süreleri**: Görevleri ne kadar sürede tamamladığınızı analiz eder
- **Aktif Saatler**: En verimli çalıştığınız saatleri belirler
- **Kategori Tercihleri**: Hangi konulara daha çok odaklandığınızı öğrenir
- **Çalışma Tarzı**: Önceliklendirme ve planlama tarzınızı tanır

## 📁 Dosya Yapısı

```
src/services/
├── dailyArchiveScheduler.ts    # Otomatik arşivleme zamanlayıcısı
├── taskAnalyticsService.ts     # AI analiz motoru
└── archiveService.ts            # Mevcut arşiv servisi (güncellenmiş)

database/migrations/
└── create_analytics_tables.sql  # Yeni veritabanı tabloları
```

## 🔧 Kurulum ve Kullanım

### 1. Veritabanı Tablolarını Oluşturun

Supabase Dashboard'ınızda SQL editörünü açın ve şu dosyayı çalıştırın:
```sql
-- database/migrations/create_analytics_tables.sql dosyasındaki SQL'i çalıştırın
```

Bu, şu tabloları oluşturur:
- `user_task_patterns`: Tespit edilen görev desenleri
- `user_habits`: Öğrenilen kullanıcı alışkanlıkları
- `analytics_metadata`: Analiz meta verileri

### 2. Zamanlayıcıyı Başlatın

`Main.tsx` dosyasına şu kodu ekleyin:

```typescript
import { dailyArchiveScheduler } from './services/dailyArchiveScheduler';

// Component mount olduğunda
useEffect(() => {
  // Zamanlayıcıyı başlat
  dailyArchiveScheduler.start();
  
  // Component unmount olduğunda durdur
  return () => {
    dailyArchiveScheduler.stop();
  };
}, []);
```

### 3. Ayarları Yapılandırın

Scheduler ayarlarını özelleştirmek için:

```typescript
import { dailyArchiveScheduler } from './services/dailyArchiveScheduler';

// Ayarları güncelle
dailyArchiveScheduler.updateConfig({
  enabled: true,                    // Otomatik arşivleme aktif mi?
  archiveTime: '00:00',            // Arşivleme saati (HH:MM)
  archiveCompletedOnly: true,      // Sadece tamamlananları arşivle
  enableAIAnalysis: true           // AI analizi aktif mi?
});

// Mevcut ayarları görüntüle
const config = dailyArchiveScheduler.getConfig();
console.log('Scheduler Config:', config);
```

## 📊 AI Analiz Özellikleri

### Tespit Edilen Desenler

#### 1. Tekrar Eden Görevler
```typescript
{
  patternType: 'recurring',
  description: '"Sabah sporu" görevi düzenli olarak tekrarlanıyor',
  frequency: 15,
  confidence: 0.85,
  metadata: {
    taskText: 'sabah sporu',
    avgIntervalDays: 7,
    lastOccurrence: '2025-10-10T08:00:00Z'
  }
}
```

**Kullanım**: Bu görev için otomatik tekrarlayan hatırlatıcı oluşturulabilir.

#### 2. Zaman Bazlı Desenler
```typescript
{
  patternType: 'time_based',
  description: 'Saat 9:00 civarında görev oluşturma eğilimi',
  frequency: 42,
  confidence: 0.75,
  metadata: {
    hour: 9,
    categoryDistribution: { 'İş': 25, 'Kişisel': 17 }
  }
}
```

**Kullanım**: Bu saatte önemli görevleri planlamak daha verimli olabilir.

#### 3. Kategori Bazlı Desenler
```typescript
{
  patternType: 'category_based',
  description: '"İş" kategorisinde yoğun görev akışı',
  frequency: 89,
  confidence: 0.92,
  metadata: {
    category: 'İş',
    completionRate: 0.87,
    avgPriority: 'high'
  }
}
```

**Kullanım**: Bu kategoride başarılı bir tamamlama oranı var.

### Öğrenilen Alışkanlıklar

#### 1. Tamamlama Süreleri
```typescript
{
  habitType: 'completion_time',
  habitData: {
    avgCompletionTimeDays: 2.3,
    completionRate: 0.82,
    totalCompleted: 156,
    totalTasks: 190
  },
  strength: 0.78
}
```

#### 2. Aktif Saatler
```typescript
{
  habitType: 'active_hours',
  habitData: {
    peakHours: ['9:00-10:00', '14:00-15:00', '20:00-21:00'],
    hourDistribution: [...]
  },
  strength: 0.85
}
```

#### 3. Kategori Tercihleri
```typescript
{
  habitType: 'category_preference',
  habitData: {
    distribution: { 
      'İş': 0.45, 
      'Kişisel': 0.30, 
      'Alışveriş': 0.15, 
      'Diğer': 0.10 
    },
    topCategories: [
      { category: 'İş', count: 89, percentage: 45 },
      { category: 'Kişisel', count: 59, percentage: 30 }
    ]
  },
  strength: 0.80
}
```

## 💡 İçgörüler ve Öneriler

AI sistemi şu tür içgörüler üretir:

### Öneri Türleri

#### 1. **Suggestion** (Öneri)
```
Tekrar Eden Görevler Tespit Edildi
3 görev düzenli olarak tekrarlanıyor. 
Bunlar için otomatik hatırlatıcı oluşturmak ister misiniz?
```

#### 2. **Pattern** (Desen)
```
Verimli Saatleriniz Belirlendi
En verimli olduğunuz saatler: 9:00-10:00, 14:00-15:00. 
Önemli görevleri bu saatlere planlayın.
```

#### 3. **Warning** (Uyarı)
```
Kategori Dengesizliği
Görevlerinizin %65'i "İş" kategorisinde. 
Diğer alanlara da odaklanmayı deneyin.
```

#### 4. **Achievement** (Başarı)
```
Harika İş Çıkarıyorsunuz! 🎉
Görev tamamlama oranınız %87! Mükemmel devam edin.
```

## 🔍 API Kullanımı

### Desenler ve Alışkanlıkları Analiz Et

```typescript
import { taskAnalyticsService } from './services/taskAnalyticsService';

// Görev desenlerini analiz et
const patterns = await taskAnalyticsService.analyzeTaskPatterns(todos, userId);
console.log('Detected Patterns:', patterns);

// Kullanıcı alışkanlıklarını güncelle
const habits = await taskAnalyticsService.updateUserHabits(todos, userId);
console.log('User Habits:', habits);

// İçgörüler oluştur
const insights = await taskAnalyticsService.generateInsights(userId);
console.log('Insights:', insights);
```

### Manuel Arşivleme Tetikleme

```typescript
import { dailyArchiveScheduler } from './services/dailyArchiveScheduler';

// Manuel arşivleme başlat
await dailyArchiveScheduler.triggerManualArchive();
```

### Zamanlayıcı Kontrolü

```typescript
// Başlat
dailyArchiveScheduler.start();

// Durdur
dailyArchiveScheduler.stop();

// Ayarları görüntüle
const config = dailyArchiveScheduler.getConfig();

// Ayarları güncelle
dailyArchiveScheduler.updateConfig({
  archiveTime: '01:00',  // Saat 01:00'da arşivle
  enableAIAnalysis: false // AI analizini kapat
});
```

## 🎨 UI Entegrasyonu

### Arşiv Ayarları Paneli (Öneri)

```tsx
import { useState, useEffect } from 'react';
import { dailyArchiveScheduler } from '../services/dailyArchiveScheduler';

function ArchiveSettingsPanel() {
  const [config, setConfig] = useState(dailyArchiveScheduler.getConfig());
  
  const handleToggle = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    dailyArchiveScheduler.updateConfig({ [field]: value });
  };
  
  return (
    <div className="archive-settings">
      <h3>Otomatik Arşivleme Ayarları</h3>
      
      <label>
        <input 
          type="checkbox" 
          checked={config.enabled}
          onChange={(e) => handleToggle('enabled', e.target.checked)}
        />
        Otomatik arşivlemeyi etkinleştir
      </label>
      
      <label>
        Arşivleme Saati:
        <input 
          type="time" 
          value={config.archiveTime}
          onChange={(e) => handleToggle('archiveTime', e.target.value)}
        />
      </label>
      
      <label>
        <input 
          type="checkbox" 
          checked={config.archiveCompletedOnly}
          onChange={(e) => handleToggle('archiveCompletedOnly', e.target.checked)}
        />
        Sadece tamamlanmış görevleri arşivle
      </label>
      
      <label>
        <input 
          type="checkbox" 
          checked={config.enableAIAnalysis}
          onChange={(e) => handleToggle('enableAIAnalysis', e.target.checked)}
        />
        AI analizi etkinleştir
      </label>
    </div>
  );
}
```

### İçgörüler Dashboard'u (Öneri)

```tsx
import { useEffect, useState } from 'react';
import { taskAnalyticsService, TaskInsight } from '../services/taskAnalyticsService';
import { useAuth } from '../contexts/AuthContext';

function InsightsDashboard() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<TaskInsight[]>([]);
  
  useEffect(() => {
    if (user) {
      taskAnalyticsService.generateInsights(user.id)
        .then(setInsights);
    }
  }, [user]);
  
  return (
    <div className="insights-dashboard">
      <h2>AI İçgörüleri</h2>
      {insights.map((insight, index) => (
        <div key={index} className={`insight insight-${insight.type}`}>
          <h4>{insight.title}</h4>
          <p>{insight.description}</p>
          {insight.actionable && (
            <button>Harekete Geç</button>
          )}
        </div>
      ))}
    </div>
  );
}
```

## 🔒 Güvenlik ve Gizlilik

- **RLS (Row Level Security)**: Tüm tablolar RLS ile korunur
- **Kullanıcı İzolasyonu**: Her kullanıcı sadece kendi verilerini görebilir
- **Yerel Depolama**: Hassas ayarlar localStorage'da güvenli şekilde saklanır
- **Guest Mode Koruması**: Misafir kullanıcılar arşiv özelliklerini kullanamaz

## ⚙️ Performans Optimizasyonu

### Hafif Zamanlayıcı
- Sadece dakikada bir kontrol yapar
- Aynı gün içinde birden fazla arşivleme yapmaz
- Zaman kontrolü hafif ve verimli

### Akıllı Arşivleme
- Sadece değişen görevler arşivlenir
- Toplu işlemler kullanılır (bulkPut)
- Gereksiz veri yüklemeleri önlenir

### AI Analizi
- Arka planda asenkron çalışır
- Arşivleme başarısını etkilemez
- Hata durumunda sessizce devam eder

## 🐛 Hata Ayıklama

### Konsol Logları

Tüm işlemler detaylı loglanır:

```
[DailyArchiveScheduler] Initialized with config: {...}
[DailyArchiveScheduler] Starting scheduler - Archive time: 00:00
[DailyArchiveScheduler] Archive time reached, starting daily archive...
[DailyArchiveScheduler] Archiving 23 todos and 5 notes
[DailyArchiveScheduler] Starting AI analysis...
[TaskAnalytics] Analyzing patterns for 156 tasks
[TaskAnalytics] ✅ Detected 12 patterns
[TaskAnalytics] ✅ Updated 4 habits
[DailyArchiveScheduler] ✅ Daily archive completed successfully
```

### Hata Mesajları

Hata durumunda kullanıcı dostu mesajlar gösterilir:

```
❌ Günlük arşivleme başarısız: Supabase bağlantı hatası
⚠️ AI analizi başarısız oldu ancak arşivleme tamamlandı
```

## 📈 Gelecek Geliştirmeler

- [ ] Haftalık ve aylık raporlar
- [ ] Görev tahmin modeli (hangi görevi ne zaman tamamlayacaksınız)
- [ ] Akıllı görev önceliklendirme
- [ ] Sosyal karşılaştırmalar (anonim)
- [ ] Gamification (rozetler, başarılar)
- [ ] Email/SMS özet raporları
- [ ] Özel arşiv saklama süreleri
- [ ] Veri ihracı ve içe aktarımı

## 🆘 Sık Sorulan Sorular

### S: Otomatik arşivlemeyi devre dışı bırakabilir miyim?
**C**: Evet, ayarlardan `enabled: false` yaparak devre dışı bırakabilirsiniz.

### S: Arşivlenen görevleri geri getirebilir miyim?
**C**: Evet, mevcut ArchiveModal üzerinden arşivlenmiş görevleri görüntüleyip geri getirebilirsiniz.

### S: AI analizi ne sıklıkla çalışır?
**C**: Her günlük arşivleme sırasında otomatik olarak çalışır. Manuel olarak da tetiklenebilir.

### S: Verilerim güvende mi?
**C**: Evet, tüm veriler Supabase RLS ile korunur ve sadece sizin erişiminize açıktır.

### S: Guest modunda arşivleme çalışır mı?
**C**: Hayır, arşivleme ve AI analizi için giriş yapmış olmanız gerekir.

## 📞 Destek

Sorun veya öneri için:
- GitHub Issues'da bildirin
- WARP.md dosyasına ekleyin
- Developer'a doğrudan ulaşın

---

**Not**: Bu sistem sürekli geliştirilmektedir. Geri bildirimleriniz bizim için çok değerlidir! 🚀
