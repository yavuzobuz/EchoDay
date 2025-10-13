-- profiles tablosuna role kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));
    END IF;
END $$;

-- is_active kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- RLS politikalarını güncelle (admin erişimi için)
-- Önce var olan politikaları sil
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON profiles;

-- Yeni politikalar oluştur
-- Admin kullanıcıları tüm profilleri görebilir
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

-- Admin kullanıcıları profilleri güncelleyebilir
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

-- Super admin kullanıcıları profilleri silebilir
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

-- Kullanıcı kendi profilini görebilir
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Kullanıcı kendi profilini güncelleyebilir
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- İlk admin kullanıcıyı oluştur (e-posta adresinizi değiştirin)
-- NOT: Önce bu e-posta ile kayıt olmanız gerekiyor
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';

-- Komut: Bu scripti çalıştırdıktan sonra, bir kullanıcı ile giriş yapın
-- ve ardından aşağıdaki komutu çalıştırarak kendinizi admin yapın:
-- UPDATE profiles SET role = 'super_admin' WHERE id = 'your-user-id';
