# Otomatik Arşivleme ve AI Analizi - Uygulama Rehberi

## ⚡ Hızlı Başlangıç

### 1. Veritabanı Kurulumu (5 dakika)

Supabase Dashboard'a gidin ve SQL Editor'ı açın:

```bash
# Supabase Dashboard > SQL Editor > New Query
```

Şu dosyayı çalıştırın:
- `database/migrations/create_analytics_tables.sql`

Bu işlem 3 tablo oluşturacak:
- ✅ `user_task_patterns`
- ✅ `user_habits`  
- ✅ `analytics_metadata`

### 2. Servislerin Entegrasyonu (10 dakika)

#### Main.tsx'e ekle:

```typescript
// İmportları ekle
import { dailyArchiveScheduler } from './services/dailyArchiveScheduler';

// Component içinde (diğer useEffect'lerden sonra):
useEffect(() => {
  // Zamanlayıcıyı başlat
  console.log('[Main] Starting daily archive scheduler...');
  dailyArchiveScheduler.start();
  
  // Cleanup
  return () => {
    console.log('[Main] Stopping daily archive scheduler...');
    dailyArchiveScheduler.stop();
  };
}, []);
```

**Hepsi bu kadar!** 🎉

Sistem artık:
- Her gün saat 00:00'da otomatik arşivleme yapacak
- AI ile görev desenlerini analiz edecek
- Kullanıcı alışkanlıklarını öğrenecek

## 🔍 Test ve Doğrulama

### Manuel Arşivlemeyi Test Et

Browser console'da:

```javascript
// Zamanlayıcıyı test et
await window.dailyArchiveScheduler.triggerManualArchive();

// Ayarları görüntüle
console.log(window.dailyArchiveScheduler.getConfig());
```

### Konsol Loglarını İzle

Başarılı arşivleme:
```
[DailyArchiveScheduler] Initialized with config: {enabled: true, ...}
[DailyArchiveScheduler] Starting scheduler - Archive time: 00:00
[DailyArchiveScheduler] Archiving 15 todos and 3 notes
[TaskAnalytics] ✅ Detected 5 patterns
[TaskAnalytics] ✅ Updated 3 habits
[DailyArchiveScheduler] ✅ Daily archive completed successfully
```

## 🎛️ Ayarları Özelleştirme

### Arşivleme Saatini Değiştir

```typescript
dailyArchiveScheduler.updateConfig({
  archiveTime: '02:00', // Gece saat 02:00
});
```

### AI Analizini Kapat

```typescript
dailyArchiveScheduler.updateConfig({
  enableAIAnalysis: false,
});
```

### Tüm Görevleri Arşivle (tamamlanmamış dahil)

```typescript
dailyArchiveScheduler.updateConfig({
  archiveCompletedOnly: false,
});
```

## 📊 AI Analytics Kullanımı

### Görev Desenlerini Görüntüle

```typescript
import { taskAnalyticsService } from './services/taskAnalyticsService';

// Mevcut görevleri analiz et
const patterns = await taskAnalyticsService.analyzeTaskPatterns(todos, userId);

patterns.forEach(pattern => {
  console.log(`Pattern: ${pattern.description}`);
  console.log(`Confidence: ${(pattern.confidence * 100).toFixed(0)}%`);
  console.log(`Frequency: ${pattern.frequency}`);
});
```

### Kullanıcı Alışkanlıklarını Öğren

```typescript
// Alışkanlıkları güncelle
const habits = await taskAnalyticsService.updateUserHabits(todos, userId);

habits.forEach(habit => {
  console.log(`Habit: ${habit.habitType}`);
  console.log(`Strength: ${(habit.strength * 100).toFixed(0)}%`);
  console.log(`Data:`, habit.habitData);
});
```

### İçgörüler Oluştur

```typescript
// AI önerileri al
const insights = await taskAnalyticsService.generateInsights(userId);

insights.forEach(insight => {
  console.log(`[${insight.type}] ${insight.title}`);
  console.log(insight.description);
});
```

## 🎨 UI Bileşenleri (İsteğe Bağlı)

### Profil Sayfasına Ayarlar Paneli Ekle

`src/pages/Profile.tsx` dosyasına:

```typescript
import { dailyArchiveScheduler } from '../services/dailyArchiveScheduler';

// State ekle
const [schedulerConfig, setSchedulerConfig] = useState(
  dailyArchiveScheduler.getConfig()
);

// JSX'e ekle
<div className="settings-section">
  <h3>⏰ Otomatik Arşivleme</h3>
  
  <label className="flex items-center gap-2">
    <input 
      type="checkbox" 
      checked={schedulerConfig.enabled}
      onChange={(e) => {
        const enabled = e.target.checked;
        setSchedulerConfig(prev => ({ ...prev, enabled }));
        dailyArchiveScheduler.updateConfig({ enabled });
      }}
    />
    <span>Otomatik arşivlemeyi etkinleştir</span>
  </label>
  
  <label className="flex items-center gap-2">
    <span>Arşivleme saati:</span>
    <input 
      type="time" 
      value={schedulerConfig.archiveTime}
      onChange={(e) => {
        const archiveTime = e.target.value;
        setSchedulerConfig(prev => ({ ...prev, archiveTime }));
        dailyArchiveScheduler.updateConfig({ archiveTime });
      }}
      className="input"
    />
  </label>
  
  <label className="flex items-center gap-2">
    <input 
      type="checkbox" 
      checked={schedulerConfig.enableAIAnalysis}
      onChange={(e) => {
        const enableAIAnalysis = e.target.checked;
        setSchedulerConfig(prev => ({ ...prev, enableAIAnalysis }));
        dailyArchiveScheduler.updateConfig({ enableAIAnalysis });
      }}
    />
    <span>AI analizi etkinleştir</span>
  </label>
</div>
```

### Dashboard'a AI İçgörüleri Kartı Ekle

```typescript
import { taskAnalyticsService } from '../services/taskAnalyticsService';
import { useAuth } from '../contexts/AuthContext';

function AIInsightsCard() {
  const { user } = useAuth();
  const [insights, setInsights] = useState([]);
  
  useEffect(() => {
    if (user) {
      taskAnalyticsService.generateInsights(user.id)
        .then(setInsights);
    }
  }, [user]);
  
  if (insights.length === 0) return null;
  
  return (
    <div className="card">
      <h3>🤖 AI İçgörüleri</h3>
      {insights.map((insight, i) => (
        <div key={i} className={`insight-${insight.type}`}>
          <strong>{insight.title}</strong>
          <p>{insight.description}</p>
        </div>
      ))}
    </div>
  );
}
```

## 🔧 Troubleshooting

### Sorun: Zamanlayıcı çalışmıyor

**Çözüm:**
```typescript
// Browser console'da kontrol et
window.dailyArchiveScheduler.getConfig();
// enabled: true olmalı

// Manuel başlat
window.dailyArchiveScheduler.start();
```

### Sorun: Guest modda hata veriyor

**Çözüm:** Bu normal. Arşivleme sadece giriş yapmış kullanıcılar için çalışır.

```typescript
// Console'da şunu görürsünüz:
// [DailyArchiveScheduler] Cannot archive in guest mode
```

### Sorun: Supabase tabloları bulunamıyor

**Çözüm:** SQL migration'ı tekrar çalıştırın:
```sql
-- Supabase Dashboard > SQL Editor'dan
-- create_analytics_tables.sql dosyasını çalıştırın
```

### Sorun: AI analizi hata veriyor ama arşivleme çalışıyor

**Çözüm:** Bu normal. AI analizi opsiyoneldir ve hata verirse arşivleme devam eder.
```
⚠️ AI analizi başarısız oldu ancak arşivleme tamamlandı
```

## 📝 Önemli Notlar

1. **Guest Mode**: Misafir kullanıcılar için arşivleme çalışmaz (Supabase gerekli)
2. **Performans**: Zamanlayıcı hafif, dakikada bir kontrol eder
3. **Veri Güvenliği**: RLS ile korunur, her kullanıcı sadece kendi verisini görür
4. **Bildirimler**: Web Notification API kullanır (izin gerekir)

## 🚀 Production Checklist

Uygulamayı yayına almadan önce:

- [ ] Supabase tablolarını oluştur
- [ ] Main.tsx'de scheduler başlatma kodunu ekle
- [ ] Konsol loglarını test et
- [ ] Manuel arşivlemeyi test et
- [ ] Guest mode kontrolünü test et
- [ ] Bildirim izinlerini test et
- [ ] Ayarlar sayfasını kullanıcılara sun
- [ ] Dokümantasyonu oku (DAILY_ARCHIVE_AI_ANALYTICS.md)

## 🎓 İleri Seviye

### Custom Analytics Dashboard

```typescript
// Özel analitik paneli oluşturun
import { taskAnalyticsService } from './services/taskAnalyticsService';

async function buildDashboard(userId: string) {
  const patterns = await taskAnalyticsService.loadPatternsFromDatabase(userId);
  const habits = await taskAnalyticsService.loadHabitsFromDatabase(userId);
  
  return {
    recurringTasks: patterns.filter(p => p.patternType === 'recurring'),
    peakHours: habits.find(h => h.habitType === 'active_hours')?.habitData.peakHours,
    topCategories: habits.find(h => h.habitType === 'category_preference')?.habitData.topCategories,
    completionRate: habits.find(h => h.habitType === 'completion_time')?.habitData.completionRate,
  };
}
```

### Scheduled Reports

```typescript
// Haftalık/aylık raporlar oluştur
import { archiveService } from './services/archiveService';

async function generateWeeklyReport(userId: string) {
  const report = await archiveService.getPeriodicReport('week', currentTodos, userId);
  
  console.log(`📊 Haftalık Rapor:`);
  console.log(`Toplam Görev: ${report.totalTasks}`);
  console.log(`Tamamlanan: ${report.completedTasks}`);
  console.log(`Tamamlanma Oranı: ${(report.completionRate * 100).toFixed(0)}%`);
  console.log(`Verimlilik Skoru: ${report.productivityScore}/100`);
  console.log(`En Aktif Kategori: ${report.topCategories[0]}`);
  
  return report;
}
```

## 📞 Yardım

Sorularınız için:
- Dokümantasyon: `DAILY_ARCHIVE_AI_ANALYTICS.md`
- Kod örnekleri: Bu dosya
- Console logları: Her işlem detaylı loglanır

---

**Mutlu Kodlamalar! 🚀**
