-- ============================================
-- ABONELİK SİSTEMİ VERİTABANI ŞEMASI
-- ============================================

-- 1. Subscriptions tablosu oluştur
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'canceled', 'expired', 'trial')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
  features JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. İndeksler
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

-- 3. Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Profiles tablosuna abonelik ilişkisi ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';

-- 5. RLS Politikaları
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi aboneliklerini görebilir
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Kullanıcılar kendi aboneliklerini güncelleyebilir (bazı alanlar)
CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin tüm abonelikleri görebilir
CREATE POLICY "Admin can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admin tüm abonelikleri güncelleyebilir
CREATE POLICY "Admin can update all subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admin yeni abonelik oluşturabilir
CREATE POLICY "Admin can insert subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Super admin abonelik silebilir
CREATE POLICY "Super admin can delete subscriptions"
  ON subscriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- 6. Subscription Plans tablosu (plan şablonları)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan planları ekle
INSERT INTO subscription_plans (name, display_name, description, price, billing_cycle, features, limits) VALUES
('free', 'Ücretsiz', 'Temel özellikler', 0, 'lifetime', 
  '{"tasks": true, "notes": true, "ai_assistant": false, "email_integration": false, "analytics": false}',
  '{"max_tasks": 50, "max_notes": 20, "ai_requests_per_day": 0}'
),
('basic', 'Temel', 'Bireysel kullanıcılar için', 9.99, 'monthly',
  '{"tasks": true, "notes": true, "ai_assistant": true, "email_integration": true, "analytics": false}',
  '{"max_tasks": 500, "max_notes": 200, "ai_requests_per_day": 50}'
),
('pro', 'Pro', 'Profesyoneller için', 19.99, 'monthly',
  '{"tasks": true, "notes": true, "ai_assistant": true, "email_integration": true, "analytics": true, "priority_support": true}',
  '{"max_tasks": -1, "max_notes": -1, "ai_requests_per_day": 500}'
),
('enterprise', 'Kurumsal', 'Şirketler için', 49.99, 'monthly',
  '{"tasks": true, "notes": true, "ai_assistant": true, "email_integration": true, "analytics": true, "priority_support": true, "custom_integration": true, "dedicated_support": true}',
  '{"max_tasks": -1, "max_notes": -1, "ai_requests_per_day": -1}'
)
ON CONFLICT (name) DO NOTHING;

-- RLS için subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Herkes planları görebilir
CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admin planları yönetebilir
CREATE POLICY "Admin can manage subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 7. Payment History tablosu
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);

ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi ödeme geçmişini görebilir
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin tüm ödeme geçmişini görebilir
CREATE POLICY "Admin can view all payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 8. Realtime'ı aktifleştir
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_history;

-- 9. Yardımcı fonksiyonlar

-- Aktif abonelik kontrolü
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID, p_plan_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
    AND plan_type = p_plan_type
    AND status = 'active'
    AND (end_date IS NULL OR end_date > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Abonelik süresini uzat
CREATE OR REPLACE FUNCTION extend_subscription(
  p_subscription_id UUID,
  p_days INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET end_date = COALESCE(end_date, NOW()) + (p_days || ' days')::INTERVAL,
      updated_at = NOW()
  WHERE id = p_subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Süresi dolan abonelikleri otomatik iptal et
CREATE OR REPLACE FUNCTION expire_old_subscriptions()
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
  AND end_date < NOW()
  AND end_date IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 10. İstatistikler için view
CREATE OR REPLACE VIEW subscription_stats AS
SELECT
  plan_type,
  status,
  COUNT(*) as count,
  SUM(amount) as total_revenue
FROM subscriptions
GROUP BY plan_type, status;

-- Admin bu view'ı görebilir
GRANT SELECT ON subscription_stats TO authenticated;

-- ============================================
-- KURULUM TAMAMLANDI
-- ============================================

-- Test: İstatistikleri göster
SELECT * FROM subscription_stats;

-- Tüm planları göster
SELECT * FROM subscription_plans ORDER BY price;
