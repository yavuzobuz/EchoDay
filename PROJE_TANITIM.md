# EchoDay - Akıllı Sesli Günlük Planlayıcı

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="EchoDay Banner" width="800"/>
</div>

---

## 📖 Proje Hakkında

**EchoDay**, modern ve akıllı bir günlük planlayıcı uygulamasıdır. Kullanıcıların sesli komutlarla görev ekleyebileceği, günlük notlar alabileceği ve yapay zeka destekli özelliklerle verimliliğini artırabileceği kapsamlı bir kişisel asistan uygulamasıdır.

### 🎯 Temel Misyonumuz
"Her gününüzü daha verimli ve organized hale getirin - sesli komutlarla, yapay zeka ile, çok platformlu desteğe sahip olarak."

---

## 🌟 Ana Özellikler

### 🎤 Sesli Komut Desteği
- **Uyandırma Kelimesi**: "ATO" (veya özelleştirilebilir) ile sesli asistanı aktif etme
- **Türkçe Dil Desteği**: Tamamen Türkçe ses tanıma ve komut anlama
- **Elserbest Kullanım**: Mutfakta, araba kullanırken, her yerde görev ekleme
- **Gerçek Zamanlı Transkript**: Konuşurken yazıya dönüştürme

### 🤖 Yapay Zeka Asistanı
- **Google Gemini Entegrasyonu**: Gelişmiş AI analizi
- **Akıllı Görev Analizi**: 
  - Otomatik öncelik belirleme
  - Tarih ve saat çıkarımı
  - Kategori sınıflandırma
  - Tahmini süre hesaplama
- **Günlük Brifing**: Günün özetini ve önemli görevleri vurgulama
- **Sohbet Modu**: Doğal dil ile görev ve not oluşturma

### 📱 Çok Platformlu Destek
- **Web Uygulaması**: Modern tarayıcılarda tam uyumlu
- **Android Uygulaması**: Native Android deneyimi
- **iOS Uygulaması**: iPhone ve iPad desteği
- **Electron Desktop**: Masaüstü uygulaması

### 🗂️ Görev Yönetimi
- **Çoklu Giriş Yöntemleri**:
  - Sesli komutla görev ekleme
  - Manuel metin girişi
  - Görsel tabanlı görev oluşturma
- **Gelişmiş Görünümler**:
  - Liste görünümü
  - Zaman çizelgesi (Timeline)
  - Takvim görünümü
- **Akıllı Hatırlatıcılar**: 15 dakika öncesi otomatik bildirimler

### 📝 Not Defteri
- **Çoklu Format**: Metin, sesli, görsel notlar
- **OCR Desteği**: Resimlerden metin çıkarma
- **AI Analizi**: Notların akıllı işlenmesi ve özetlenmesi
- **Pano Entegrasyonu**: Hızlı resim yapıştırma

### 📊 Arşiv ve Analiz
- **Otomatik Arşivleme**: Her gün gece yarısı tamamlanan görevleri arşivleme
- **AI Destekli Analiz**:
  - Tekrar eden görev desenleri
  - En verimli saatler
  - Kategori tercihleri
  - Tamamlama süreleri
- **İstatistikler**: 
  - Toplam tamamlanan görev sayısı
  - Günlük seri (streak)
  - 7 günlük aktivite grafiği

---

## 🏗️ Teknolojik Altyapı

### Frontend Teknolojileri
```typescript
{
  "framework": "React 18.2",
  "language": "TypeScript",
  "buildTool": "Vite",
  "styling": "Tailwind CSS",
  "uiComponents": "Custom + Heroicons"
}
```

### Mobil ve Masaüstü
```typescript
{
  "mobileFramework": "Capacitor",
  "androidSupport": "API 21+",
  "iosSupport": "iOS 13+",
  "desktop": "Electron",
  "crossPlatform": true
}
```

### Yapay Zeka ve Servisler
```typescript
{
  "aiProvider": "Google Gemini API",
  "model": "gemini-2.0-flash-exp",
  "speechRecognition": "@capacitor-community/speech-recognition",
  "textToSpeech": "@capacitor-community/text-to-speech",
  "geolocation": "@capacitor/geolocation",
  "notifications": "@capacitor/local-notifications"
}
```

### Veri Depolama
```typescript
{
  "localStorage": "Ayarlar ve geçici veriler",
  "indexedDB": "Dexie.js ile arşiv veritabanı",
  "supabase": "Bulut senkronizasyonu (opsiyonel)",
  "dataSecurity": "Yerel depolama, RLS koruması"
}
```

---

## 📁 Proje Yapısı

```
EchoDay/
├── 📁 src/
│   ├── 📁 components/          # React bileşenleri
│   │   ├── ActionBar.tsx       # Üst işlem çubuğu
│   │   ├── TaskModal.tsx       # Görev ekleme/düzenleme
│   │   ├── ArchiveModal.tsx    # Arşiv görüntüleme
│   │   ├── ChatModal.tsx       # AI sohbet arayüzü
│   │   ├── DailyNotepad.tsx    # Günlük not defteri
│   │   ├── TimelineView.tsx    # Zaman çizelgesi
│   │   └── ... (20+ bileşen)
│   ├── 📁 hooks/               # Custom React hooks
│   │   ├── useSpeechRecognition.ts
│   │   ├── useTextToSpeech.ts
│   │   ├── useVoiceMode.ts
│   │   └── useLocalStorage.ts
│   ├── 📁 pages/               # Sayfa bileşenleri
│   │   ├── Welcome.tsx         # Karşılama ekranı
│   │   └── Profile.tsx         # Profil ve ayarlar
│   ├── 📁 services/            # Servis katmanı
│   │   ├── dailyArchiveScheduler.ts
│   │   ├── taskAnalyticsService.ts
│   │   └── AI entegrasyon servisleri
│   ├── App.tsx                 # Ana uygulama
│   ├── Main.tsx                # Ana içerik
│   └── types.ts                # TypeScript tipler
├── 📁 android/                 # Android platform dosyaları
├── 📁 electron/                # Masaüstü uygulaması
├── 📁 public/                  # Statik dosyalar
├── 📁 docs/                    # Dokümantasyon
├── 📁 database/                # Veritabanı migration'ları
├── 📁 assets/                  # Uygulama asset'leri
├── 📄 package.json             # Proje bağımlılıkları
├── 📄 capacitor.config.ts      # Capacitor konfigürasyonu
├── 📄 vite.config.ts           # Vite build ayarları
└── 📄 README.md                # Proje açıklaması
```

---

## 🎨 Kullanıcı Arayüzü

### Tema ve Tasarım
- **Modern ve Minimalist**: Temiz, kullanıcı dostu arayüz
- **Dark/Light Mod**: Kullanıcı tercihine göre tema seçimi
- **Renk Temaları**: Mavi, Yeşil, Kırmızı vurgu renkleri
- **Responsive Tasarım**: Mobil, tablet ve desktop uyumlu

### Erişilebilirlik
- **WCAG AA Standartları**: Renk kontrastı ve erişilebilirlik
- **Klavye Navigasyonu**: Tam klavye desteği
- **Screen Reader**: Görme engelli kullanıcılar için destek
- **Çoklu Dil**: Türkçe odaklı, İngilizce desteği

### Animasyonlar ve Geçişler
- **Smooth Transitions**: 200-300ms geçiş animasyonları
- **Micro-interactions**: Hover efektleri ve görsel geri bildirimler
- **Loading States**: Yükleme durumları için animasyonlar

---

## 🔧 Geliştirme Özellikleri

### Build ve Dağıtım
```bash
# Geliştirme ortamı
npm run dev                    # Web geliştirme sunucusu
npm run dev:mobile             # Mobil geliştirme
npm run electron:dev           # Electron geliştirme

# Build işlemleri
npm run build                  # Web build
npm run android:build          # Android APK
npm run electron:build         # Masaüstü uygulaması

# Test ve dağıtım
npm run sync                   # Capacitor senkronizasyonu
npm run android:apk            # Android APK oluşturma
```

### Geliştirici Araçları
- **TypeScript**: Type-safe geliştirme deneyimi
- **ESLint + Prettier**: Kod kalitesi ve formatlama
- **Hot Module Replacement**: Hızlı geliştirme döngüsü
- **Cross-platform**: Tek kod tabanı, çoklu platform

---

## 📊 Veri Analitiği ve İstatistikler

### Kullanıcı Davranış Analizi
- **Görev Tamamlama Oranları**: Başarı metrikleri
- **Sesli Komut Kullanımı**: Özellik adopiton oranı
- **Aktif Saatler**: Kullanıcının en verimli zamanları
- **Kategori Dağılımı**: Görev türü analizi

### AI Destekli İçgörüler
- **Desen Tespiti**: Tekrar eden görevler
- **Verimlilik Analizi**: Zaman yönetimi önerileri
- **Alışkanlık Öğrenimi**: Kişiselleştirilmiş öneriler
- **Tahminleme**: Görev tamamlama süreleri

---

## 🔒 Güvenlik ve Gizlilik

### Veri Güvenliği
- **Yerel Depolama**: Tüm veriler kullanıcının cihazında
- **Şifreli İletişim**: HTTPS ile güvenli veri aktarımı
- **API Anahtarı Güvenliği**: Kullanıcı kendi API anahtarını yönetir
- **Row Level Security**: Veri erişim kontrolleri

### Gizlilik Politikası
- **Veri İzolasyonu**: Kullanıcı verileri sunucuya gönderilmez
- **Minimal Data Collection**: Sadece gerekli bilgiler toplanır
- **GDPR Uyumlu**: Avrupa veri koruma standartları
- **Transparanlık**: Açık veri kullanım politikası

---

## 🚀 Kurulum ve Kullanım

### Hızlı Başlangıç
```bash
# 1. Depoyu klonla
git clone https://github.com/yavuzobuz/EchoDay.git

# 2. Bağımlılıkları yükle
npm install

# 3. Çevre değişkenlerini ayarla
cp .env.example .env.local
# .env.local dosyasına GEMINI_API_KEY ekle

# 4. Geliştirme sunucusunu başlat
npm run dev

# 5. Tarayıcıda aç
http://localhost:5173
```

### Mobil Kurulum
```bash
# Android build
npm run android:build

# iOS build (Mac gerekli)
npm run build
npx cap sync ios
npx cap open ios
```

### Masaüstü Kurulum
```bash
# Electron build
npm run electron:build

# Çalıştırma
npm run electron:start
```

---

## 📈 Proje İstatistikleri

### Kod Metrikleri
- **Toplam Satır**: ~8,000+ satır TypeScript/React kodu
- **Bileşen Sayısı**: 25+ React bileşeni
- **Servis Sayısı**: 10+ servis katmanı
- **Test Kapsamı**: 6 farklı test senaryosu

### Platform Desteği
- **Web**: ✅ Chrome, Firefox, Safari, Edge
- **Android**: ✅ API 21+ (Android 5.0+)
- **iOS**: ✅ iOS 13.0+
- **Desktop**: ✅ Windows, macOS, Linux

### Özellik Kapsamı
- **Sesli Komutlar**: ✅ Türkçe desteği
- **AI Entegrasyonu**: ✅ Google Gemini
- **Çoklu Platform**: ✅ Web + Mobil + Desktop
- **Arşivleme**: ✅ Otomatik ve AI destekli
- **Bildirimler**: ✅ Lokal bildirimler

---

## 🎯 Kullanım Senaryoları

### 👔 Profesyonel Kullanıcı
"Toplantı notlarını sesli olarak kaydet, görevleri otomatik analiz ettir, günlük brifing al"

### 🏠 Ev Kullanıcısı
"Alışveriş listesini sesle oluştur, ev görevlerini planla, hatırlatıcılar al"

### 🎓 Öğrenci
"Ders programını organize et, ödevleri takip et, çalışma saatlerini analiz et"

### 🏃‍♂️ Aktif Kullanıcı
"Spor aktivitelerini kaydet, hedefleri takip et, ilerleme grafikleri görüntüle"

---

## 🔮 Gelecek Planları

### Yakında Gelecek Özellikler
- [ ] **Bulut Senkronizasyonu**: Cihazlar arası veri senkronizasyonu
- [ ] **Takım Çalışması**: Görev paylaşımı ve atama
- [ ] **Konum Bazlı Hatırlatıcılar**: GPS entegrasyonu
- [ ] **Sesli Yanıtlar**: TTS ile asistan yanıtları
- [ ] **Takvim Entegrasyonu**: Google/Outlook takvim senkronizasyonu

### Uzun Vadeli Vizyon
- [ ] **Çoklu Dil Desteği**: Global pazar için dil ekleme
- [ ] **Gelişmiş Analytics**: Detaylı veri analizi paneli
- [ ] **API Desteği**: Üçüncü parti entegrasyonlar
- [ ] **Enterprise Özellikleri**: Kurumsal kullanım için eklentiler

---

## 📞 İletişim ve Destek

### Proje Bilgileri
- **GitHub**: https://github.com/yavuzobuz/EchoDay
- **Versiyon**: v1.0.0
- **Lisans**: MIT License
- **Son Güncelleme**: Ekim 2025

### Destek Kanalları
- **GitHub Issues**: Hata bildirimi ve öneriler
- **Dokümantasyon**: Detaylı kullanım kılavuzları
- **Topluluk**: Geliştirici ve kullanıcı topluluğu

---

## 🎉 Neden EchoDay?

### ✅ Benzersiz Özellikler
- **Türkçe Sesli Asistan**: Pazarda nadir bulunan özellik
- **AI Destekli Analiz**: Akıllı verimlilik önerileri
- **Çok Platformlu**: Tek kod, çoklu platform
- **Gizlilik Odaklı**: Veriler yerel saklanır

### ✅ Teknolojik Üstünlük
- **Modern Teknolojiler**: React, TypeScript, Capacitor
- **Yapay Zeka**: Google Gemini entegrasyonu
- **Performans**: Hızlı ve optimiz edilmiş
- **Ölçeklenebilir**: Genişletilebilir mimari

### ✅ Kullanıcı Deneyimi
- **İntuitif Arayüz**: Kolay kullanım
- **Kişiselleştirme**: Tema ve ayar seçenekleri
- **Erişilebilirlik**: Herkes için uygun
- **Sürekli Gelişim**: Aktif geliştirme ve güncellemeler

---

**EchoDay - Her Gününüzü Daha İyi Hale Getirin! 🚀**

*Akıllı, sesli, çok platformlu günlük planlayıcınız.*

---

<div align="center">
  <p>Made with ❤️ by Yavuz Öbüz</p>
  <p>© 2025 EchoDay. All rights reserved.</p>
</div>
