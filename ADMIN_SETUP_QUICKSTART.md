# ⚡ Admin Panel Hızlı Kurulum

## 🚨 Hatalar ve Çözümleri

### ❌ Hata 1: "Could not find the table 'public.user_profiles'"
**Çözüm**: Kod artık mevcut `profiles` tablosunu kullanıyor. ✅ Düzeltildi!

### ❌ Hata 2: "No routes matched location '//admin/login'"
**Çözüm**: URL'de çift slash olmamalı. Direkt `/admin/login` kullanın.

---

## 📋 Hızlı Kurulum Adımları

### 1️⃣ Supabase Veritabanını Hazırla

**Adım 1**: Supabase Dashboard > SQL Editor'a gidin

**Adım 2**: `supabase_migrations/add_role_to_profiles.sql` dosyasındaki SQL'i kopyalayın ve çalıştırın

Veya aşağıdaki komutu manuel olarak çalıştırın:

```sql
-- 1. Role kolonu ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. is_active kolonu ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

### 2️⃣ RLS Politikalarını Ayarla

```sql
-- Var olan politikaları temizle
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON profiles;

-- Admin için SELECT politikası
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
    OR id = auth.uid()
  );

-- Admin için UPDATE politikası
CREATE POLICY "Admin can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
    OR id = auth.uid()
  );

-- Super Admin için DELETE politikası
CREATE POLICY "Super admin can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );
```

### 3️⃣ İlk Admin Kullanıcıyı Oluştur

**Adım 1**: Normal bir kullanıcı olarak kayıt olun (uygulamada `/register`)

**Adım 2**: Supabase SQL Editor'da kendinizi admin yapın:

```sql
-- E-posta adresinizi değiştirin
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'sizin-email@example.com';
```

**Veya user ID ile:**

```sql
-- User ID'nizi değiştirin (Supabase Auth > Users'dan bakabilirsiniz)
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = 'your-user-id-here';
```

### 4️⃣ Admin Paneline Giriş

1. Tarayıcıda şu adrese gidin: `http://localhost:5173/admin/login`
2. Admin yaptığınız kullanıcının e-posta ve şifresiyle giriş yapın
3. Otomatik olarak Dashboard'a yönlendirileceksiniz! 🎉

---

## ✅ Kontrol Listesi

- [ ] `profiles` tablosuna `role` kolonu eklendi
- [ ] `profiles` tablosuna `is_active` kolonu eklendi  
- [ ] RLS politikaları oluşturuldu
- [ ] En az bir kullanıcı `super_admin` yapıldı
- [ ] `/admin/login` sayfası açılıyor
- [ ] Admin giriş başarılı
- [ ] Dashboard görüntüleniyor

---

## 🔍 Mevcut Profilinizi Kontrol Edin

```sql
-- Giriş yaptığınız kullanıcının role'ünü görmek için
SELECT id, email, role, full_name, is_active 
FROM profiles 
WHERE email = 'sizin-email@example.com';
```

Çıktı şöyle olmalı:
```
id: 69304938-4019-4822-bd57-5378f044c528
email: sizin-email@example.com
role: super_admin  ← Bu super_admin veya admin olmalı
full_name: İsminiz
is_active: true
```

---

## 🐛 Sorun Giderme

### "Admin access check error" hatası
- `profiles` tablosunda `role` kolonu var mı kontrol edin
- RLS politikalarının doğru kurulduğundan emin olun

### "Erişim Reddedildi" mesajı
- Kullanıcınızın role'ü `admin` veya `super_admin` olmalı
- SQL ile kontrol edin: `SELECT role FROM profiles WHERE id = auth.uid();`

### Giriş yaptıktan sonra hala login sayfasına dönüyor
- Tarayıcı console'da hata var mı kontrol edin (F12)
- Supabase bağlantınızı kontrol edin (`.env` dosyası)

---

## 📱 Test Kullanıcıları Oluştur

Geliştirme için farklı rollerde test kullanıcıları oluşturmak için:

```sql
-- Super Admin
UPDATE profiles SET role = 'super_admin' WHERE email = 'superadmin@test.com';

-- Normal Admin
UPDATE profiles SET role = 'admin' WHERE email = 'admin@test.com';

-- Normal User (default)
UPDATE profiles SET role = 'user' WHERE email = 'user@test.com';
```

---

## 🎯 Sonraki Adımlar

Admin paneline giriş yaptıktan sonra:

1. **Dashboard**: Sistem metriklerini görüntüleyin
2. **Kullanıcılar**: Kullanıcıları yönetin, rol atayın
3. **Analytics**: Detaylı raporları inceleyin
4. **Ayarlar**: Sistem ayarlarını yapılandırın

---

## 📚 Daha Fazla Bilgi

Detaylı dokümantasyon için: `ADMIN_PANEL_README.md`

---

**🎉 Hazırsınız! Admin paneliniz kullanıma hazır!**
