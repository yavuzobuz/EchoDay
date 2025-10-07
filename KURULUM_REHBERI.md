# 📥 EchoDay - Sesli Günlük Planlayıcı Kurulum Rehberi

## 🎉 Hoş Geldiniz!

EchoDay'i indirdiğiniz için teşekkür ederiz! Bu rehber, uygulamayı kurmanız ve kullanmaya başlamanız için size yardımcı olacak.

## 📦 İndirilen Dosyalar

**dist-electron** klasöründe aşağıdaki dosyalar bulunmaktadır:

### 🚀 Kurulum Dosyaları

1. **Sesli Günlük Planlayıcı Setup 1.0.0.exe** (~92.6 MB)
   - ✅ **ÖNERİLEN** - Tam kurulum paketi
   - Uygulamayı Windows'a kurar
   - Başlat menüsüne kısayol ekler
   - Otomatik güncellemeler alabilir
   - Kaldırma programı içerir

2. **Sesli Günlük Planlayıcı 1.0.0.exe** (~92.4 MB)
   - 🎒 Taşınabilir versiyon
   - Kurulum gerektirmez
   - USB'den çalıştırılabilir
   - Sistem değişikliği yapmaz

## 🔧 Kurulum Adımları

### Seçenek 1: Standart Kurulum (Önerilen)

1. **Sesli Günlük Planlayıcı Setup 1.0.0.exe** dosyasını çift tıklayın
2. Windows güvenlik uyarısı çıkarsa "Yine de çalıştır" seçin
3. Kurulum sihirbazını takip edin:
   - Kurulum konumunu seçin (varsayılan: `C:\Users\[Kullanıcı]\AppData\Local\Programs\smart-todo-assistant`)
   - "Masaüstü kısayolu oluştur" seçeneğini işaretleyin
4. "Kur" butonuna tıklayın
5. Kurulum tamamlandığında "Bitir" ile uygulamayı başlatın

### Seçenek 2: Taşınabilir Versiyon

1. **Sesli Günlük Planlayıcı 1.0.0.exe** dosyasını istediğiniz klasöre kopyalayın
2. Dosyayı çift tıklayarak çalıştırın
3. Kurulum gerekmez, doğrudan başlatılır

## 🎯 İlk Kullanım

### 1. Gemini API Anahtarı Kurulumu

Uygulamanın AI özelliklerini kullanabilmek için Gemini API anahtarına ihtiyacınız var:

1. [Google AI Studio](https://makersuite.google.com/app/apikey) adresine gidin
2. Google hesabınızla giriş yapın
3. "Get API Key" butonuna tıklayın
4. API anahtarınızı kopyalayın
5. EchoDay uygulamasını açın
6. Sağ üstteki **Profil** ikonuna tıklayın
7. "Gemini API Anahtarı" alanına yapıştırın
8. "Kaydet" butonuna tıklayın

### 2. İlk Görev Ekleme

#### Sesli Komutla:
1. Mikrofon butonuna tıklayın
2. "Yarın saat 14:00'te doktora git" gibi bir komut söyleyin
3. AI görevinizi analiz edip otomatik olarak ekleyecek

#### Metin ile:
1. "+" butonuna tıklayın
2. Görevinizi yazın
3. AI tarih ve öncelik önerecek
4. "Ekle" butonuna basın

## ✨ Özellikler

### 🎤 Sesli Asistan
- Wake word ile aktivasyon (varsayılan: "Asistan")
- Doğal dil işleme ile görev ekleme
- Türkçe ses tanıma desteği

### 🤖 AI Özellikleri
- Otomatik görev analizi
- Akıllı öncelik belirleme
- Tarih ve saat önerisi
- Kategori tanımlama
- Günlük özet raporları

### 📊 Raporlar ve Analitik
- Kategori bazlı istatistikler
- Zaman analizi
- Haftalık/Aylık raporlar
- Verimlilik skoru
- AI öngörüleri

### 📝 Günlük Not Defteri
- Metin notları
- Resim ekleme
- PDF analizi
- AI destekli not işleme

### 🔔 Hatırlatıcılar
- Zamanlanmış bildirimler
- Erteleme seçenekleri
- Çoklu hatırlatma
- Ses ile uyarı

### 📁 Arşiv Sistemi
- Otomatik arşivleme
- Gelişmiş arama
- Tarih bazlı filtreleme
- Export/Import

## ⚙️ Ayarlar

### Tema Seçenekleri
- 🌞 Açık Mod
- 🌙 Koyu Mod
- 🎨 3 Renk Teması (Mavi, Yeşil, Kırmızı)

### Asistan Ayarları
- Wake word değiştirme
- Ses tanıma dili
- Bildirim sesleri
- Otomatik arşivleme

## 🔒 Gizlilik ve Güvenlik

- ✅ Tüm veriler yerel olarak saklanır (IndexedDB)
- ✅ İsteğe bağlı Supabase senkronizasyonu
- ✅ API anahtarları güvenli şekilde saklanır
- ✅ Kişisel verileriniz paylaşılmaz

## 🐛 Sorun Giderme

### Mikrofon çalışmıyor
1. Windows ayarlarından mikrofon izni verin
2. Tarayıcı ayarlarından mikrofon erişimini kontrol edin
3. Varsayılan mikrofonu ayarlayın

### API Hatası
1. API anahtarının doğru olduğundan emin olun
2. İnternet bağlantınızı kontrol edin
3. API kotanızı kontrol edin

### Veritabanı Hatası
- Uygulama açıldığında `DatabaseClosedError` görüyorsanız:
  - Bu sorun son güncellemede düzeltildi
  - Uygulamayı yeniden başlatın
  - Sorun devam ederse `%AppData%\Local\smart-todo-assistant` klasörünü temizleyin

### Performans Sorunları
1. Eski arşivleri temizleyin (Ayarlar > Arşiv Yönetimi)
2. Tarayıcı önbelleğini temizleyin
3. Uygulamayı yeniden başlatın

## 📞 Destek

### Dokümantasyon
- `DATABASE_FIX_README.md` - Veritabanı düzeltmeleri
- `ANALYTICS_DOCUMENTATION.md` - Analitik sistem
- `SUPABASE_INTEGRATION.md` - Bulut senkronizasyonu

### Güncelleme
- Uygulama otomatik güncellemeleri kontrol eder
- Yeni sürüm çıktığında bildirim alırsınız

## 🚀 Sistem Gereksinimleri

### Minimum
- Windows 10 veya üstü
- 4 GB RAM
- 200 MB disk alanı
- İnternet bağlantısı (AI özellikleri için)

### Önerilen
- Windows 11
- 8 GB RAM
- Mikrofon (sesli komutlar için)
- Hızlı internet bağlantısı

## 📝 Sürüm Notları

### v1.0.0 (2025-10-07)
- ✅ İlk stabil sürüm
- ✅ DatabaseClosedError düzeltmesi
- ✅ Gelişmiş analitik sistemi
- ✅ Mobil responsive tasarım
- ✅ Türkçe ses tanıma
- ✅ PDF analizi desteği

## 🎯 İpuçları

1. **Düzenli Kullanım**: Her gün görevlerinizi gözden geçirin
2. **AI Özetleri**: Günlük özet raporlarını kontrol edin
3. **Kategoriler**: AI otomatik kategori atar, daha iyi analiz için
4. **Hatırlatıcılar**: Önemli görevler için birden fazla hatırlatıcı ekleyin
5. **Arşiv**: Eski görevleri düzenli olarak arşivleyin

## 📄 Lisans

Bu uygulama kişisel ve ticari kullanım için ücretsizdir.

---

**Keyifli Kullanımlar! 🎉**

EchoDay Ekibi
