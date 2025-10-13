# Admin Güvenlik Dokümantasyonu

## 🔒 Güvenlik Katmanları

### 1. **Kimlik Doğrulama (Authentication)**
- Supabase Auth kullanılıyor
- JWT token tabanlı session yönetimi
- Token otomatik yenileme (her 5 dakikada bir)
- Session timeout kontrolü

### 2. **Yetkilendirme (Authorization)**
- Role-based access control (RBAC)
- Email tabanlı admin listesi (development)
- Database role alanı (production için hazır)
- Admin ve Super Admin rolleri

### 3. **Rate Limiting**
- Client-side: 10 istek/dakika limit
- Server-side: SQL fonksiyonu ile kontrol
- Kullanıcı ve aksiyon bazlı limitler
- Otomatik temizleme mekanizması

### 4. **Activity Logging**
- Tüm admin aksiyonları loglanıyor
- User ID, aksiyon, detay, zaman damgası
- IP adresi ve User-Agent kaydı
- Audit trail için veritabanı desteği

### 5. **Session Management**
- Active session tracking
- Multi-device session kontrolü
- Session expire yönetimi
- Otomatik cleanup (her saat)

### 6. **Row Level Security (RLS)**
- Tüm tablolar RLS ile korunuyor
- Policy-based access control
- User-specific data isolation
- Admin-only queries

## 🛠️ Kurulum

### 1. Database Migration
```bash
# Supabase SQL Editor'de çalıştırın:
cat supabase/migrations/003_admin_security.sql
```

### 2. Context Ekleme
App.tsx'te AdminSecurityProvider ekleyin:

```typescript
import { AdminSecurityProvider } from './contexts/AdminSecurityContext';

<BrowserRouter>
  <AuthProvider>
    <AdminAuthProvider>
      <AdminSecurityProvider>
        <I18nProvider>
          <AppContent />
        </I18nProvider>
      </AdminSecurityProvider>
    </AdminAuthProvider>
  </AuthProvider>
</BrowserRouter>
```

### 3. Admin Sayfalarında Kullanım
```typescript
import { useAdminSecurity } from '../contexts/AdminSecurityContext';

function AdminPage() {
  const { isSecure, logActivity, rateLimit } = useAdminSecurity();

  const handleAction = async () => {
    // Rate limit kontrolü
    if (!rateLimit('delete_user')) {
      alert('Çok fazla istek! Lütfen bekleyin.');
      return;
    }

    // İşlem
    await deleteUser();

    // Log aktivite
    await logActivity('delete_user', { userId: 'xxx' });
  };
}
```

## 📋 Güvenlik Kontrol Listesi

### Production'a Çıkmadan Önce

- [ ] Email tabanlı admin listesini kaldır
- [ ] Database role alanını kullan
- [ ] HTTPS kullan (SSL/TLS)
- [ ] Environment variables'ı güvenli tut
- [ ] Rate limiting'i sıkılaştır (5 istek/dakika)
- [ ] IP whitelist ekle (opsiyonel)
- [ ] 2FA implementasyonu (opsiyonel)
- [ ] Security headers ekle
- [ ] CORS ayarlarını kontrol et
- [ ] SQL injection koruması (hazır)
- [ ] XSS koruması (React default)
- [ ] CSRF token ekle

### Monitoring

- [ ] Admin activity logs'u düzenli kontrol et
- [ ] Suspicious activity alertleri kur
- [ ] Failed login attempts'i izle
- [ ] Session hijacking patterns ara
- [ ] Rate limit violations logla

## 🔍 SQL Queries

### Admin Kullanıcısı Ekleme
```sql
-- Bir kullanıcıyı admin yap
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';

-- Super admin yap
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'superadmin@example.com';
```

### Activity Logs Görüntüleme
```sql
-- Son 100 admin aktivitesi
SELECT 
  aal.created_at,
  p.email,
  aal.action,
  aal.details,
  aal.ip_address
FROM admin_activity_logs aal
JOIN profiles p ON p.id = aal.user_id
ORDER BY aal.created_at DESC
LIMIT 100;

-- Belirli bir kullanıcının aktiviteleri
SELECT * FROM admin_activity_logs
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

### Active Sessions
```sql
-- Aktif admin sessions
SELECT 
  s.created_at,
  p.email,
  s.ip_address,
  s.expires_at,
  s.last_activity
FROM admin_sessions s
JOIN profiles p ON p.id = s.user_id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity DESC;

-- Expired sessions temizle
SELECT clean_expired_admin_sessions();
```

### Rate Limit Kontrolü
```sql
-- Rate limit durumu
SELECT * FROM rate_limits
WHERE identifier = 'user-id-here'
ORDER BY window_start DESC;

-- Rate limit test
SELECT check_rate_limit('test-user', 'test-action', 5, 1);
```

## ⚠️ Güvenlik Uyarıları

### Development Mode
- **Tüm kullanıcılar admin!** Production'da mutlaka değiştirin.
- AdminAuthContext.tsx:43 satırı değiştirin
- `isDevelopment ? true` kısmını kaldırın

### Best Practices
1. **Asla şifreleri kod içine yazmayın**
2. **API keys'leri .env dosyasında tutun**
3. **Supabase keys'leri secure edin**
4. **Admin paneline sadece güvenilir networklerden erişim**
5. **Düzenli security audit yapın**
6. **Dependency güncellemelerini takip edin**
7. **Error messages'da sensitive bilgi vermeyin**
8. **Logging'de sensitive data kaydetmeyin**

## 🚀 Gelişmiş Güvenlik (Opsiyonel)

### IP Whitelisting
```typescript
const ALLOWED_IPS = [
  '192.168.1.100',
  '10.0.0.50'
];

const checkIP = async () => {
  const response = await fetch('https://api.ipify.org?format=json');
  const { ip } = await response.json();
  return ALLOWED_IPS.includes(ip);
};
```

### 2FA Implementation
```typescript
// TOTP-based 2FA
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const generate2FA = () => {
  const secret = speakeasy.generateSecret({
    name: 'EchoDay Admin'
  });
  return secret;
};
```

### Brute Force Protection
```sql
-- Login attempts table
CREATE TABLE login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  success BOOLEAN DEFAULT false,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5 failed attempts = 15 min lockout
CREATE OR REPLACE FUNCTION check_login_attempts(p_email VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  v_failed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_failed_count
  FROM login_attempts
  WHERE email = p_email
    AND success = false
    AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  RETURN v_failed_count < 5;
END;
$$ LANGUAGE plpgsql;
```

## 📚 Kaynaklar

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)

## 📞 Destek

Güvenlik sorunları için: security@echoday.com
