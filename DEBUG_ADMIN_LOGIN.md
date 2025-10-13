# 🔍 Admin Login Debug Rehberi

## Sorun: Giriş yapılmıyor ve hata da vermiyor

### ✅ Şimdi Debug Logları Eklendi!

Artık tarayıcı console'unda (F12) detaylı loglar göreceksiniz:

```
=== ADMIN LOGIN START ===
Email: your@email.com
Step 1: Attempting Supabase auth...
Step 2: Auth successful, user: 69304938-4019-4822-bd57-5378f044c528
Step 3: Checking profile for user: 69304938-4019-4822-bd57-5378f044c528
Profile data: {role: "super_admin"}
Profile error: null
User role: super_admin
Step 4: Access granted! Navigating to dashboard...
=== ADMIN LOGIN SUCCESS ===
=== ADMIN LOGIN END ===
```

## 📋 Debug Adımları

### 1. Tarayıcı Console'u Açın
- **Windows/Linux**: F12 veya Ctrl+Shift+I
- **Mac**: Cmd+Option+I
- "Console" sekmesine tıklayın

### 2. Login Sayfasına Gidin
```
http://localhost:5173/admin/login
```

### 3. Giriş Yapın ve Console'u İzleyin

Loglar hangi adımda durdu?

---

## 🎯 Olası Senaryolar ve Çözümleri

### Senaryo 1: "Profile not found for user"
```
Step 3: Checking profile for user: xxx
Profile data: null
Profile error: null
❌ Profile not found for user: xxx
```

**Sorun**: Kullanıcınızın profili yok

**Çözüm**: 
1. `check_admin_profile.sql` dosyasını açın
2. E-posta adresinizi yazın
3. Adım 1-3B'yi sırayla çalıştırın

Veya hızlı çözüm:
```sql
-- User ID'nizi bulun
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Profil oluşturun
INSERT INTO profiles (id, email, display_name, role, is_active)
SELECT id, email, email, 'super_admin', true
FROM auth.users WHERE email = 'your@email.com'
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
```

---

### Senaryo 2: "Access denied. User role: user"
```
Step 3: Checking profile for user: xxx
Profile data: {role: "user"}
User role: user
❌ Access denied. User role: user
```

**Sorun**: Kullanıcınız var ama role 'user'

**Çözüm**:
```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your@email.com';

-- Doğrula
SELECT email, role FROM profiles WHERE email = 'your@email.com';
```

---

### Senaryo 3: Auth Error
```
Step 1: Attempting Supabase auth...
❌ Auth error: {message: "Invalid login credentials"}
```

**Sorun**: E-posta veya şifre yanlış

**Çözüm**:
1. E-posta adresinizi kontrol edin
2. Şifrenizi doğru yazdığınızdan emin olun
3. Gerekirse şifre sıfırlayın

---

### Senaryo 4: Profile Check Error
```
Step 3: Checking profile for user: xxx
Profile data: null
❌ Profile error: {code: "PGRST...", message: "..."}
```

**Sorun**: Veritabanı erişim hatası veya RLS problemi

**Çözüm**:
```sql
-- 1. RLS politikalarını kontrol et
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';

-- 2. Role kolonu var mı?
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- 3. Yoksa ekle
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
```

---

### Senaryo 5: Hiçbir Log Yok
```
(Console'da hiçbir şey görünmüyor)
```

**Sorun**: Sayfa yüklenemiyor veya JavaScript hatası var

**Çözüm**:
1. Console'da kırmızı hatalar var mı kontrol edin
2. Sayfayı yenileyin (Ctrl+F5)
3. Dev server'ı yeniden başlatın:
   ```bash
   # Terminal'de
   Ctrl+C
   npm run dev
   ```

---

## 🛠️ Hızlı Düzeltme Scripti

Tüm sorunları tek seferde çözmek için:

```sql
-- 1. Role kolonu ekle (yoksa)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. is_active kolonu ekle (yoksa)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Kendinizi admin yapın (E-POSTANıZı DEĞİŞTİRİN!)
INSERT INTO profiles (id, email, display_name, role, is_active)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  'super_admin',
  true
FROM auth.users
WHERE email = 'YOUR-EMAIL@example.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'super_admin', is_active = true;

-- 4. Doğrula
SELECT 
  u.email,
  p.role,
  p.is_active,
  CASE 
    WHEN p.role IN ('admin', 'super_admin') THEN '✅ GİRİŞ YAPABİLİR'
    ELSE '❌ ERİŞİM YOK'
  END as access_status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'YOUR-EMAIL@example.com';
```

---

## 📊 Kontrol Paneli

### Tüm Admin Kullanıcıları Görüntüle
```sql
SELECT 
  p.email,
  p.role,
  p.is_active,
  u.last_sign_in_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role IN ('admin', 'super_admin')
ORDER BY p.role DESC;
```

### Role Dağılımı
```sql
SELECT 
  COALESCE(role, 'NULL') as role,
  COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY count DESC;
```

---

## 🚨 ACİL DURUM PROSEDÜRÜ

Eğer hiçbir şey işe yaramıyorsa:

### Adım 1: Profil Tablosunu Kontrol Et
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';
```

Tablo yoksa:
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Adım 2: RLS'i Geçici Kapat (SADECE GELİŞTİRME)
```sql
-- UYARI: Sadece yerel geliştirme için!
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Giriş yapın

-- Sonra tekrar açın
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Adım 3: Supabase Bağlantısını Test Et
Browser console'da:
```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

Eğer `undefined` görüyorsanız, `.env` dosyanızı kontrol edin.

---

## 📱 İletişim

Sorun devam ediyorsa, bana şunları gönderin:

1. **Browser Console Çıktısı**: Tüm logları kopyalayın
2. **SQL Sorgu Sonuçları**: 
   ```sql
   SELECT email, role, is_active FROM profiles WHERE email = 'your@email.com';
   ```
3. **Supabase Dashboard Screenshot**: Auth > Users kısmından

---

## ✅ Başarı Kontrolü

Giriş başarılı olduğunda console'da görmeli siniz:

```
=== ADMIN LOGIN START ===
Email: your@email.com
Step 1: Attempting Supabase auth...
Step 2: Auth successful, user: xxxx-xxxx-xxxx
Step 3: Checking profile for user: xxxx-xxxx-xxxx
Profile data: {role: "super_admin"}
User role: super_admin
Step 4: Access granted! Navigating to dashboard...
=== ADMIN LOGIN SUCCESS ===
=== ADMIN LOGIN END ===
```

Ve `/admin/dashboard` sayfasına yönlendirileceksiniz! 🎉

---

**Son Güncelleme**: 2025-10-11
**Debug Logları Aktif**: ✅ Evet
