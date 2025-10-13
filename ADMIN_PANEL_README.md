# 🎯 EchoDay Admin Panel

Modern, kullanıcı dostu ve tam kapsamlı bir admin paneli oluşturuldu.

## ✨ Özellikler

### 🔐 Güvenlik
- **Rol Tabanlı Yetkilendirme**: Super Admin, Admin ve User rolleri
- **Güvenli Giriş**: Şifre görünürlüğü kontrolü
- **Oturum Yönetimi**: Otomatik oturum zaman aşımı
- **İki Faktörlü Kimlik Doğrulama** desteği

### 📊 Dashboard
- **Canlı İstatistikler**: 
  - Toplam kullanıcı sayısı
  - Aktif kullanıcı oranı
  - Görev istatistikleri
  - Tamamlanma oranları
- **Grafik ve Görselleştirme**: 
  - Kullanıcı büyümesi grafikleri
  - Görev tamamlama çemberi
  - Aktivite logları
- **Hızlı İşlemler**: 
  - Yeni kullanıcı ekleme
  - Toplu e-posta gönderme
  - Rapor oluşturma

### 👥 Kullanıcı Yönetimi
- **CRUD İşlemleri**: Kullanıcı ekleme, düzenleme, silme
- **Rol Atama**: Kullanıcılara rol atama/değiştirme
- **Filtreleme & Arama**: 
  - E-posta ile arama
  - İsim ile arama
  - Role göre filtreleme
- **Kullanıcı Detayları**:
  - Son giriş tarihi
  - Kayıt tarihi
  - Aktif/Pasif durumu

### 📈 Analytics & Raporlar
- **Detaylı Metrikler**:
  - Toplam görüntülenme
  - Aktif kullanıcı sayısı
  - Tamamlanan görev sayısı
  - Ortalama oturum süresi
- **Trend Analizi**: Önceki döneme göre değişim yüzdeleri
- **Grafikler**:
  - Haftalık kullanıcı büyümesi
  - Görev tamamlama oranı (dairesel grafik)
- **Aktif Kullanıcı Tablosu**: En çok görev yapan kullanıcılar
- **Rapor İndirme**: PDF/Excel formatında rapor indirme

### ⚙️ Sistem Ayarları
- **Genel Ayarlar**:
  - Site adı ve URL
  - Varsayılan dil (TR/EN/DE)
  - Zaman dilimi ayarları
  - Bakım modu
  
- **Güvenlik Ayarları**:
  - Yeni kayıt izni
  - E-posta doğrulama
  - İki faktörlü kimlik doğrulama
  - Oturum zaman aşımı

- **Bildirim Ayarları**:
  - Push bildirimleri
  - E-posta bildirimleri

- **Depolama Ayarları**:
  - Maksimum dosya boyutu
  - Depolama kullanım grafiği

- **API Ayarları**:
  - API anahtarı yönetimi
  - Rate limiting izleme

## 🚀 Kurulum

### 1. Gerekli Bağımlılıklar
Tüm bağımlılıklar zaten `package.json`'da mevcut:
```bash
npm install
```

### 2. Supabase Yapılandırması

`.env` dosyanıza Supabase bilgilerinizi ekleyin:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Veritabanı Tabloları

Supabase'de `user_profiles` tablosunu oluşturun:

```sql
-- user_profiles tablosu
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- RLS (Row Level Security) politikaları
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Admin kullanıcıları tüm profilleri görebilir
CREATE POLICY "Admin can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admin kullanıcıları profilleri güncelleyebilir
CREATE POLICY "Admin can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Super admin kullanıcıları profilleri silebilir
CREATE POLICY "Super admin can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );
```

### 4. İlk Admin Kullanıcı Oluşturma

Bir kullanıcı oluşturduktan sonra, Supabase SQL Editor'da:

```sql
-- Kendinizi super admin yapın
UPDATE user_profiles
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

## 📱 Kullanım

### Admin Girişi
1. Uygulamayı başlatın: `npm run dev`
2. Tarayıcıda `/admin/login` adresine gidin
3. Admin e-posta ve şifrenizle giriş yapın

### Dashboard
- Ana sayfa otomatik olarak yüklenecektir
- Tüm metrikleri ve istatistikleri görebilirsiniz
- Hızlı işlemler için butonları kullanabilirsiniz

### Kullanıcı Yönetimi
1. Sol menüden "Kullanıcılar"ı seçin
2. Kullanıcıları arayın veya filtreleyin
3. Düzenle simgesine tıklayarak rol değiştirin
4. Sil simgesine tıklayarak kullanıcıyı silin

### Ayarları Değiştirme
1. Sol menüden "Ayarlar"ı seçin
2. İstediğiniz bölümdeki ayarları değiştirin
3. "Ayarları Kaydet" butonuna tıklayın

## 🎨 Tasarım Özellikleri

### Dark Mode
- Varsayılan olarak dark mode aktiftir
- Tüm sayfalar dark mode ile uyumludur
- Modern gradient ve glassmorphism efektleri

### Responsive Tasarım
- Mobil cihazlar için optimize edilmiş
- Tablet ve desktop görünümleri
- Hamburger menü (mobil)

### Animasyonlar
- Smooth transitions
- Hover efektleri
- Loading animasyonları
- Modal açılış/kapanış animasyonları

## 🔒 Güvenlik Notları

1. **Rol Kontrolü**: Tüm admin route'ları `AdminProtectedRoute` ile korunmaktadır
2. **Supabase RLS**: Row Level Security politikaları aktif olmalıdır
3. **API Anahtarları**: .env dosyanızı git'e eklemeyin
4. **Super Admin Yetkisi**: Super admin yetkisini dikkatli verin

## 🎯 Admin Panel Route'ları

```
/admin/login          - Admin giriş sayfası
/admin/dashboard      - Ana dashboard
/admin/users          - Kullanıcı yönetimi
/admin/analytics      - Analytics ve raporlar
/admin/settings       - Sistem ayarları
```

## 📦 Dosya Yapısı

```
src/
├── contexts/
│   └── AdminAuthContext.tsx          # Admin yetkilendirme
├── pages/
│   └── admin/
│       ├── AdminLogin.tsx            # Giriş sayfası
│       ├── AdminDashboard.tsx        # Dashboard
│       ├── AdminUsers.tsx            # Kullanıcı yönetimi
│       ├── AdminAnalytics.tsx        # Analytics
│       └── AdminSettings.tsx         # Ayarlar
├── components/
│   └── admin/
│       └── AdminLayout.tsx           # Layout & Navigation
└── App.tsx                           # Route yapılandırması
```

## 🆘 Sorun Giderme

### "Erişim Reddedildi" Hatası
- Kullanıcınızın role kontrol edin: `SELECT role FROM user_profiles WHERE email = 'your-email';`
- Role 'admin' veya 'super_admin' olmalı

### Supabase Bağlantı Hatası
- `.env` dosyanızın doğru yapılandırıldığından emin olun
- Supabase URL ve Anon Key'in doğru olduğundan emin olun

### Kullanıcılar Görünmüyor
- RLS politikalarını kontrol edin
- Admin yetkilerinizin olduğundan emin olun

## 🚀 Geliştirme İpuçları

### Yeni Sayfa Ekleme
1. `src/pages/admin/` altında yeni sayfa oluşturun
2. `AdminLayout` ile sarmalayın
3. `App.tsx`'e route ekleyin
4. `AdminLayout.tsx`'deki navigation'a ekleyin

### Yeni Rol Ekleme
1. `AdminAuthContext.tsx`'deki `UserRole` tipini güncelleyin
2. RLS politikalarını güncelle
3. Gerekli yerlerde rol kontrolü ekleyin

## 📝 Lisans

Bu admin paneli EchoDay projesi için özel olarak geliştirilmiştir.

---

**Geliştirici Notları:**
- Tüm sayfalar TypeScript ile yazılmıştır
- Tailwind CSS kullanılmıştır
- Heroicons kullanılmıştır
- Supabase backend olarak kullanılmaktadır
- React Router v6 kullanılmaktadır

**🎉 Başarılar! Admin paneliniz kullanıma hazır!**
