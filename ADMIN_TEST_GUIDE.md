# 🧪 Admin Panel Test Kılavuzu

## ⚠️ Bilinen Sorunlar ve Çözümler

### 1. "No routes matched location '//admin/login'" Hatası

**Sorun**: URL'de çift slash (`//admin/login`) görünüyor.

**Çözümler**:

#### A. Manuel URL Girişi (ÖNERİLEN)
Tarayıcınızın adres çubuğuna **direkt** şunu yazın:
```
http://localhost:5173/admin/login
```

#### B. Yönlendirme Kontrolü
Eğer başka bir sayfadan yönlendiriliyorsanız, o sayfadaki kodu kontrol edin:

**Yanlış** ❌:
```javascript
navigate('/admin/login')  // Eğer zaten '/' ile başlayan bir path içindeyseniz
window.location.href = '/admin/login'
```

**Doğru** ✅:
```javascript
navigate('/admin/login')  // Bu normalde doğrudur
// VEYA
window.location.href = 'http://localhost:5173/admin/login'
```

### 2. "406 Not Acceptable" Hatası - profiles Tablosu

**Sorun**: Supabase `profiles` tablosundan veri çekerken 406 hatası.

**Çözüm**: Artık `.maybeSingle()` kullanıyoruz, bu hata gitmeli ✅

### 3. "User profile not found" Mesajı

**Sorun**: Kullanıcınızın profili yok veya `role` kolonu eksik.

**Çözüm**:

#### Adım 1: Profile Kontrolü
```sql
-- Kullanıcınızın profili var mı?
SELECT * FROM profiles WHERE id = 'your-user-id';
```

#### Adım 2: Profil Yoksa Oluştur
```sql
-- Manuel profil oluştur
INSERT INTO profiles (id, email, display_name, role, is_active)
VALUES (
  'your-user-id',
  'your-email@example.com',
  'Your Name',
  'super_admin',
  true
);
```

#### Adım 3: Varsa Role Güncelle
```sql
-- Mevcut profile role ekle
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = 'your-user-id';
```

## ✅ Test Adımları

### 1. Veritabanı Hazırlığı

```sql
-- 1. Role kolonu var mı kontrol et
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'role';

-- 2. Eğer yoksa ekle
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- 3. is_active kolonu var mı kontrol et
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'is_active';

-- 4. Eğer yoksa ekle
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

### 2. Admin Kullanıcı Oluştur

**Seçenek A**: Mevcut kullanıcıyı admin yap
```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';
```

**Seçenek B**: Yeni kayıt ol ve admin yap
1. Uygulamada `/register` sayfasından kayıt ol
2. Supabase Auth > Users kısmından User ID'ni kopyala
3. SQL Editor'da:
```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = 'your-copied-user-id';
```

### 3. RLS Politikalarını Kur

```sql
-- Önceki politikaları temizle
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON profiles;

-- Yeni politikalar
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

### 4. Giriş Testi

1. **Tarayıcı Console'u Aç**: F12 tuşuna bas
2. **Adres Çubuğuna Yaz**: `http://localhost:5173/admin/login`
3. **Giriş Bilgilerinizi Girin**
4. **Console'da Hata Var mı Kontrol Et**

### 5. Beklenen Davranış

✅ **Başarılı Giriş**:
- Hatasız giriş yapılır
- `/admin/dashboard` sayfasına yönlendirilir
- Dashboard metrikleri görünür

❌ **Başarısız Giriş - Admin Değil**:
- "Bu alana erişim yetkiniz yok" mesajı
- Login sayfasında kalır

❌ **Başarısız Giriş - Profil Yok**:
- "Kullanıcı profili bulunamadı" mesajı
- Çıkış yapılır

## 🔍 Debug Komutları

### Kullanıcı Bilgilerini Görüntüle
```sql
-- Giriş yaptığınız kullanıcının bilgileri
SELECT 
  id,
  email,
  role,
  display_name,
  is_active,
  created_at
FROM profiles 
WHERE email = 'your-email@example.com';
```

### Tüm Admin Kullanıcıları Listele
```sql
SELECT 
  email,
  role,
  display_name,
  is_active
FROM profiles 
WHERE role IN ('admin', 'super_admin')
ORDER BY role DESC;
```

### Role Dağılımını Gör
```sql
SELECT 
  role,
  COUNT(*) as user_count
FROM profiles 
GROUP BY role;
```

## 🚨 Acil Durum: Admin Erişimi Kaybı

Eğer hiçbir admin kullanıcınız kalmadıysa:

```sql
-- Kendinizi acil olarak super admin yapın
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';

-- Doğrulayın
SELECT email, role FROM profiles WHERE role = 'super_admin';
```

## 📞 Sorun Devam Ediyorsa

1. **Browser Cache Temizle**: Ctrl + Shift + Delete
2. **Dev Server'ı Yeniden Başlat**: 
   ```bash
   # Terminal'de Ctrl+C yapın, sonra:
   npm run dev
   ```
3. **Console Loglarını Paylaş**: F12 > Console > Hataları kopyala

## ✨ Başarı Kontrol Listesi

- [ ] `profiles` tablosunda `role` kolonu var
- [ ] `profiles` tablosunda `is_active` kolonu var
- [ ] RLS politikaları kuruldu
- [ ] En az bir kullanıcı `super_admin`
- [ ] `/admin/login` sayfası açılıyor (çift slash YOK)
- [ ] Console'da 406 hatası YOK
- [ ] "User profile not found" mesajı YOK
- [ ] Giriş başarılı
- [ ] Dashboard açılıyor

---

**🎯 Hedef**: Tüm checkboxlar işaretli olmalı!
