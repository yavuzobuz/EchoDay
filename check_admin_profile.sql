-- ============================================
-- HIZLI ADMIN PROFİL KONTROL VE DÜZELTME
-- ============================================

-- 1. User ID'nizi bulun (giriş yapmaya çalıştığınız e-posta ile)
-- Bu sorguyu çalıştırıp user ID'nizi not alın
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'BURAYA-EMAIL-ADRESINIZI-YAZIN@example.com';

-- Çıktı örneği:
-- user_id: 69304938-4019-4822-bd57-5378f044c528
-- email: your@email.com
-- created_at: 2025-01-10 15:00:00

-- ============================================

-- 2. Bu user ID ile profil var mı kontrol edin
SELECT 
  id,
  email,
  display_name,
  role,
  is_active,
  created_at
FROM profiles
WHERE id = 'BURAYA-USER-ID-YAZIN';

-- ============================================

-- 3A. EĞER PROFİL VARSA - Role güncelleyin
UPDATE profiles 
SET 
  role = 'super_admin',
  is_active = true
WHERE id = 'BURAYA-USER-ID-YAZIN';

-- Doğrulayın
SELECT id, email, role, is_active FROM profiles WHERE id = 'BURAYA-USER-ID-YAZIN';

-- ============================================

-- 3B. EĞER PROFİL YOKSA - Profil oluşturun
INSERT INTO profiles (id, email, display_name, role, is_active)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'super_admin',
  true
FROM auth.users
WHERE id = 'BURAYA-USER-ID-YAZIN'
ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = true;

-- Doğrulayın
SELECT id, email, display_name, role, is_active FROM profiles WHERE id = 'BURAYA-USER-ID-YAZIN';

-- ============================================

-- 4. TABLO YAPISINI KONTROL ET
-- Role kolonu var mı?
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('role', 'is_active');

-- Eğer role kolonu yoksa:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================

-- 5. TÜM ADMIN KULLANICILARI GÖRÜNTÜLE
SELECT 
  p.id,
  p.email,
  p.display_name,
  p.role,
  p.is_active,
  u.created_at,
  u.last_sign_in_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role IN ('admin', 'super_admin')
ORDER BY p.role DESC, u.created_at DESC;

-- ============================================

-- 6. ACİL DURUM: GİRİŞ YAPTIĞINIZ KULLANICIYI HEMEN ADMIN YAPIN
-- (E-posta adresinizi değiştirin)
UPDATE profiles 
SET role = 'super_admin', is_active = true
WHERE email = (
  SELECT email FROM auth.users 
  WHERE email = 'BURAYA-EMAIL-ADRESINIZI-YAZIN@example.com'
);

-- Başarılı oldu mu kontrol edin
SELECT email, role, is_active 
FROM profiles 
WHERE email = 'BURAYA-EMAIL-ADRESINIZI-YAZIN@example.com';

-- ============================================

-- 7. RLS POLİTİKALARINI KONTROL ET
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Eğer hiç politika yoksa veya yanlışsa, yeniden oluşturun:

-- Önce eski politikaları temizle
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Yeni politikaları oluştur
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

-- ============================================

-- 8. SON KONTROL - HER ŞEY HAZIR MI?
-- Bu sorguyu çalıştırın ve sonuçları kontrol edin:
SELECT 
  'User exists in auth.users' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FAIL' END as status
FROM auth.users
WHERE email = 'BURAYA-EMAIL-ADRESINIZI-YAZIN@example.com'

UNION ALL

SELECT 
  'Profile exists' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FAIL - Profil oluşturun!' END as status
FROM profiles
WHERE email = 'BURAYA-EMAIL-ADRESINIZI-YAZIN@example.com'

UNION ALL

SELECT 
  'Role is admin or super_admin' as check_name,
  CASE 
    WHEN role IN ('admin', 'super_admin') THEN '✅ OK - ' || role
    ELSE '❌ FAIL - Role: ' || COALESCE(role, 'NULL') 
  END as status
FROM profiles
WHERE email = 'BURAYA-EMAIL-ADRESINIZI-YAZIN@example.com'

UNION ALL

SELECT 
  'is_active is true' as check_name,
  CASE 
    WHEN is_active = true THEN '✅ OK'
    ELSE '❌ FAIL - is_active: ' || COALESCE(is_active::text, 'NULL')
  END as status
FROM profiles
WHERE email = 'BURAYA-EMAIL-ADRESINIZI-YAZIN@example.com';

-- Tüm checkler ✅ OK olmalı!
