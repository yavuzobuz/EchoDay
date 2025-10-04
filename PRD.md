# Product Requirements Document (PRD)
## Sesli Günlük Planlayıcı

---

## 🎯 Ürün Özeti

**Sesli Günlük Planlayıcı**, kullanıcıların sesli komutlarla görev ekleyebilecekleri, günlük notlar alabilecekleri ve AI destekli özellikler ile günlük planlamalarını daha verimli yapabilecekleri modern bir yapılacaklar listesi ve not alma uygulamasıdır.

### Temel Değer Önerisi
- **Sesli Komut Desteği**: "ATO" (veya özelleştirilebilir) uyandırma kelimesi ile eller serbest görev ekleme
- **AI Destekli Planlama**: Google Gemini API entegrasyonu ile akıllı görev analizi ve günlük özetler
- **Çok Platformlu**: Web, iOS ve Android desteği (Capacitor ile)
- **Türkçe Dil Desteği**: Tamamen Türkçe arayüz ve ses tanıma

---

## 📋 Fonksiyonel Gereksinimler

### 1. Görev Yönetimi

#### 1.1 Görev Ekleme
- **Sesli Ekleme**: Uyandırma kelimesi sonrası sesli komutla görev ekleme
- **Manuel Ekleme**: Modal pencere üzerinden klavye ile görev ekleme
- **Görsel Ekleme**: Resim yükleyerek görsel tabanlı görev oluşturma
- **AI Analizi**: Eklenen görevler otomatik olarak analiz edilerek:
  - Öncelik seviyesi belirleme (Yüksek/Orta)
  - Tarih ve saat çıkarımı
  - Kategori belirleme
  - Tahmini süre hesaplama
  - Konum gerektiren görevleri tespit etme

#### 1.2 Görev Görüntüleme
- **Liste Görünümü**: Kronolojik sıralı görev listesi
- **Zaman Çizelgesi Görünümü**: Zamanlanmış görevlerin timeline'da gösterimi
- **Durum Göstergeleri**: Tamamlanmış/Bekleyen görev ayrımı
- **Öncelik Renklendirmesi**: Yüksek öncelikli görevler kırmızı, orta öncelikli görevler sarı

#### 1.3 Görev İşlemleri
- **Tamamlama/Geri Alma**: Tek tıkla görev durumu değiştirme
- **Düzenleme**: Inline düzenleme desteği
- **Silme**: Onaylı silme işlemi
- **Paylaşma**: Görev detaylarını panoya kopyalama
- **Yol Tarifi**: Konum gerektiren görevler için yol tarifi alma

### 2. Not Defteri

#### 2.1 Not Ekleme
- **Metin Notları**: Klavye ile yazılı not ekleme
- **Sesli Notlar**: Mikrofon ile sesli not ekleme
- **Görsel Notlar**: Resim ekleme veya yapıştırma (clipboard desteği)

#### 2.2 Not Yönetimi
- **Düzenleme**: Inline not düzenleme
- **Silme**: Tek tıkla not silme
- **AI Analizi**: 
  - Seçili notları AI ile işleme
  - Resimdeki metni çıkarma (OCR)
  - Özel promptlarla not analizi

### 3. AI Asistan Özellikleri

#### 3.1 Sohbet Modu
- **Doğal Dil İşleme**: Kullanıcı mesajlarını anlama ve yanıtlama
- **Görev Oluşturma**: Sohbet içinden görev ekleme
- **Not Oluşturma**: Sohbet içinden not ekleme
- **Günlük Özet**: İstek üzerine günlük özet hazırlama

#### 3.2 Günlük Brifing
- **Özet Rapor**: Günün görevlerinin AI tarafından özetlenmesi
- **Odak Noktaları**: En önemli 2-3 görevin vurgulanması
- **Çakışma Analizi**: Zaman çakışmalarının tespiti ve uyarı

#### 3.3 Akıllı Hatırlatmalar
- **15 Dakika Öncesi Uyarı**: Zamanlanmış görevler için otomatik hatırlatma
- **Popup Bildirimler**: Görsel ve sesli uyarılar

### 4. Arşiv Sistemi

#### 4.1 Otomatik Arşivleme
- **Gece Yarısı Arşivi**: Tamamlanan görevler ve notlar otomatik arşivlenir
- **IndexedDB Depolama**: Dexie.js ile yerel veritabanı kullanımı

#### 4.2 Arşiv Görüntüleme
- **Tarih Bazlı Arama**: Takvimden tarih seçerek arşiv görüntüleme
- **Metin Arama**: Arşivlenen içerikte kelime bazlı arama
- **İstatistikler**: 
  - Toplam tamamlanan görev sayısı
  - Güncel seri (streak)
  - Son 7 günlük aktivite grafiği

### 5. Kişiselleştirme

#### 5.1 Tema Seçenekleri
- **Açık/Koyu Tema**: Sistem tercihi veya manuel seçim
- **Renk Temaları**: Mavi, Yeşil, Kırmızı vurgu renkleri
- **Font Değişimi**: Tema bazlı özel fontlar

#### 5.2 Asistan Ayarları
- **İsim Değiştirme**: Varsayılan "ATO" yerine özel isim
- **API Anahtarı**: Kullanıcı kendi Gemini API anahtarını girebilir

---

## 💻 Teknik Gereksinimler

### Frontend Teknolojileri
- **React 18.2**: UI framework
- **TypeScript**: Type-safe geliştirme
- **Vite**: Build tool ve dev server
- **Tailwind CSS**: Utility-first CSS framework

### Capacitor Entegrasyonu
- **@capacitor/core**: Çekirdek platform köprüsü
- **@capacitor-community/speech-recognition**: Sesli komut desteği
- **@capacitor/geolocation**: Konum servisleri
- **@capacitor/clipboard**: Pano işlemleri

### Veri Depolama
- **LocalStorage**: Ayarlar ve geçici veriler
- **IndexedDB (Dexie.js)**: Arşiv veritabanı

### AI Entegrasyonu
- **Google Gemini API**: 
  - Model: gemini-2.0-flash-exp
  - JSON Schema desteği ile yapılandırılmış yanıtlar
  - Görsel analiz desteği

### Ses Tanıma
- **Türkçe (tr-TR)**: Ana dil desteği
- **Sürekli Dinleme**: Wake word algılama
- **Kısmi Sonuçlar**: Gerçek zamanlı transkript

---

## 🎨 UI/UX Gereksinimleri

### Responsive Tasarım
- **Mobil Öncelikli**: 320px - 768px arası optimize
- **Tablet Desteği**: 768px - 1024px arası düzen
- **Desktop Görünüm**: 1024px+ için iki sütunlu layout

### Erişilebilirlik
- **ARIA Etiketleri**: Screen reader desteği
- **Klavye Navigasyonu**: Tab ve Enter tuşları ile tam kontrol
- **Renk Kontrastı**: WCAG AA standartlarına uyum

### Animasyonlar
- **Smooth Transitions**: 200-300ms geçiş animasyonları
- **Hover Efektleri**: Etkileşimli elementlerde görsel geri bildirim
- **Loading States**: Yükleme durumları için animasyonlu göstergeler

---

## 🚀 Gelecek Özellikler

1. **Bulut Senkronizasyonu**: Cihazlar arası veri senkronizasyonu
2. **Takım Çalışması**: Görev paylaşımı ve atama
3. **Gelişmiş Hatırlatıcılar**: Konum bazlı ve tekrarlayan hatırlatmalar
4. **Entegrasyonlar**: Takvim uygulamaları ile senkronizasyon
5. **Sesli Yanıtlar**: Text-to-Speech ile asistan yanıtları
6. **Offline Mod**: İnternet bağlantısı olmadan temel özellikler

---

## 📊 Başarı Metrikleri

- **Kullanıcı Tutma Oranı**: 7 günlük ve 30 günlük aktif kullanıcı oranları
- **Görev Tamamlama Oranı**: Eklenen görevlerin tamamlanma yüzdesi
- **Sesli Komut Kullanım Oranı**: Toplam görev ekleme içinde sesli komut payı
- **AI Özellik Kullanımı**: Günlük brifing ve sohbet özelliklerinin kullanım sıklığı
- **Ortalama Oturum Süresi**: Kullanıcıların uygulamada geçirdiği süre

---

## 🔒 Güvenlik ve Gizlilik

- **Yerel Veri Depolama**: Tüm veriler kullanıcının cihazında saklanır
- **API Anahtarı Güvenliği**: Gemini API anahtarı sadece localStorage'da tutulur
- **HTTPS**: Web versiyonu için zorunlu güvenli bağlantı
- **Veri İzolasyonu**: Kullanıcı verileri hiçbir zaman sunucuya gönderilmez

---

## 📱 Platform Gereksinimleri

### Web
- Modern tarayıcılar (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- WebRTC desteği (ses tanıma için)

### Android
- Minimum API Level 21 (Android 5.0)
- Target API Level 33 (Android 13)

### iOS
- Minimum iOS 13.0
- Ses tanıma için mikrofon izni

---

## 🏗️ Proje Yapısı

```
sesli-günlük-planlayıcı/
├── src/
│   ├── components/        # React bileşenleri
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Sayfa bileşenleri
│   ├── services/         # API ve servis katmanı
│   ├── App.tsx           # Ana uygulama bileşeni
│   ├── Main.tsx          # Ana içerik bileşeni
│   └── types.ts          # TypeScript tip tanımlamaları
├── android/              # Android platform dosyaları
├── ios/                  # iOS platform dosyaları
├── capacitor.config.ts   # Capacitor konfigürasyonu
├── package.json          # Proje bağımlılıkları
├── tsconfig.json         # TypeScript konfigürasyonu
└── vite.config.ts        # Vite build konfigürasyonu
```

---

## 📞 İletişim ve Destek

Bu PRD, Sesli Günlük Planlayıcı projesinin mevcut durumunu ve gelecek planlarını özetlemektedir. Proje hakkında sorularınız veya önerileriniz için lütfen proje sahipleri ile iletişime geçin.

**Son Güncelleme**: Ocak 2025