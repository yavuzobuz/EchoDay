# 📧 Mail Entegrasyonu Kurulum Rehberi

EchoDay artık Gmail ve Outlook hesaplarınızı güvenli OAuth 2.0 ile bağlayabilir!

## 🎯 Özellikler

- ✅ Gmail hesap bağlama (OAuth 2.0)
- ✅ Outlook/Hotmail hesap bağlama (OAuth 2.0)
- ✅ Birden fazla mail hesabı desteği
- ✅ Gelen kutusu görüntüleme
- ✅ Mail okuma
- ✅ Otomatik token yenileme
- ✅ Güvenli token saklama (Supabase)
- ✅ Şifre saklamıyoruz! (Sadece OAuth token'ları)

---

## 🔧 Kurulum Adımları

### 1️⃣ Supabase Migration'ı Uygulayın

Supabase Dashboard → SQL Editor'e gidin ve şu dosyayı çalıştırın:

```bash
supabase/migrations/003_email_accounts.sql
```

Veya manuel olarak:

```sql
-- SQL içeriğini Supabase SQL Editor'e yapıştırın ve RUN
```

### 2️⃣ Gmail OAuth Kurulumu

#### A) Google Cloud Console'a Gidin
https://console.cloud.google.com

#### B) Yeni Proje Oluşturun (veya mevcut projeyi seçin)
1. Sol üst köşeden proje seçin
2. "New Project" tıklayın
3. Proje adı: "EchoDay Mail Integration"
4. Create

#### C) Gmail API'yi Etkinleştirin
1. APIs & Services → Library
2. "Gmail API" aratın
3. Enable

#### D) OAuth Consent Screen Yapılandırın
1. APIs & Services → OAuth consent screen
2. User Type: **External** (kullanıcılarınız dışarıdan bağlanacak)
3. Create
4. **App Information:**
   - App name: `EchoDay`
   - User support email: sizin@email.com
   - Developer contact: sizin@email.com
5. Scopes: Şimdilik boş bırakın
6. Test users: Kendi gmail adresinizi ekleyin
7. Save and Continue

#### E) Credentials Oluşturun
1. APIs & Services → Credentials
2. Create Credentials → OAuth 2.0 Client ID
3. Application type: **Web application**
4. Name: `EchoDay Web Client`
5. **Authorized redirect URIs:**
   ```
   http://localhost:5173/auth/gmail/callback
   https://yourdomain.com/auth/gmail/callback
   ```
6. Create
7. **Client ID** ve **Client Secret**'i kopyalayın

#### F) .env.local Dosyasına Ekleyin
```env
VITE_GMAIL_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
VITE_GMAIL_CLIENT_SECRET=your_client_secret_here
```

---

### 3️⃣ Outlook OAuth Kurulumu

#### A) Azure Portal'a Gidin
https://portal.azure.com

#### B) App Registration Oluşturun
1. Sol menüden: **App registrations**
2. **New registration**
3. **App Information:**
   - Name: `EchoDay`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: 
     - Platform: **Web**
     - URI: `http://localhost:5173/auth/outlook/callback`
4. Register

#### C) Client Secret Oluşturun
1. Sol menüden: **Certificates & secrets**
2. **New client secret**
3. Description: `EchoDay Secret`
4. Expires: 24 months
5. Add
6. **Value** kolonundaki değeri hemen kopyalayın (bir daha göremezsiniz!)

#### D) API Permissions Ekleyin
1. Sol menüden: **API permissions**
2. **Add a permission**
3. **Microsoft Graph**
4. **Delegated permissions**
5. Şu izinleri ekleyin:
   - `Mail.Read`
   - `User.Read`
6. Add permissions
7. (Opsiyonel) **Grant admin consent** butonuna tıklayın

#### E) .env.local Dosyasına Ekleyin
```env
VITE_OUTLOOK_CLIENT_ID=your_application_id_here
VITE_OUTLOOK_CLIENT_SECRET=your_client_secret_value_here
```

---

### 4️⃣ Environment Variables Kontrolü

`.env.local` dosyanız şöyle görünmeli:

```env
# Supabase (zaten var)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Gmail OAuth
VITE_GMAIL_CLIENT_ID=123456789.apps.googleusercontent.com
VITE_GMAIL_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx

# Outlook OAuth
VITE_OUTLOOK_CLIENT_ID=12345678-1234-1234-1234-123456789abc
VITE_OUTLOOK_CLIENT_SECRET=abc~xxxxxxxxxxxxx
```

---

## 🚀 Kullanım

### 1. Uygulamayı Başlatın

```bash
npm run dev
```

### 2. Profile Sayfasına Gidin
- Sol üst köşeden profil ikonuna tıklayın
- "Mail Hesapları" bölümünü bulun
- "Mail Hesabı Bağla" butonuna tıklayın

### 3. Mail Hesabı Bağlayın
- Gmail veya Outlook butonuna tıklayın
- OAuth izin sayfasına yönlendirileceksiniz
- İzinleri onaylayın
- Otomatik olarak uygulamaya geri döneceksiniz

### 4. Maillerinizi Görüntüleyin
- Ana sayfada "Mailler" sekmesine gidin
- Gelen kutunuzu görüntüleyin
- Mail'e tıklayarak detaylarını okuyun

---

## 🔒 Güvenlik Notları

### ✅ Güvenli Taraf
- Şifreleriniz **HİÇBİR ZAMAN** saklanmaz
- Sadece OAuth token'ları Supabase'de tutulur
- Token'lar RLS (Row Level Security) ile korunur
- Her kullanıcı sadece kendi hesaplarına erişebilir

### ⚠️ Dikkat Edilmesi Gerekenler
- `.env.local` dosyasını **asla** Git'e eklemeyin
- Production'da token'ları **şifrelenmiş** olarak saklayın
- OAuth secret'ları **güvenli** bir yerde tutun
- Test kullanıcılarını ekleyip production'a geçin

---

## 🐛 Sorun Giderme

### Gmail bağlantısı çalışmıyor
**Hata:** "redirect_uri_mismatch"
- **Çözüm:** Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs listesinde `http://localhost:5173/auth/gmail/callback` olduğundan emin olun

**Hata:** "Access blocked: This app's request is invalid"
- **Çözüm:** OAuth Consent Screen yapılandırmasını kontrol edin, test kullanıcısı olarak kendinizi ekleyin

### Outlook bağlantısı çalışmıyor
**Hata:** "AADSTS500208: The domain of the requesting application does not match a verified domain"
- **Çözüm:** Redirect URI'ı kontrol edin, Azure Portal'da doğru girildiğinden emin olun

**Hata:** "AADSTS65001: The user or administrator has not consented"
- **Çözüm:** API Permissions → Grant admin consent butonuna tıklayın

### Token süresi doldu hatası
- **Çözüm:** Token otomatik yenilenmelidir. Sorun devam ederse hesabı silip yeniden bağlayın

---

## 📊 Teknik Detaylar

### Kullanılan Teknolojiler
- React + TypeScript
- Supabase (Database + Auth)
- Google Gmail API
- Microsoft Graph API
- OAuth 2.0 Authorization Code Flow

### Database Schema
```sql
email_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  provider TEXT ('gmail' | 'outlook'),
  email_address TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN
)
```

### API Endpoints

**Gmail:**
- Auth: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- Messages: `https://gmail.googleapis.com/gmail/v1/users/me/messages`

**Outlook:**
- Auth: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- Token: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
- Messages: `https://graph.microsoft.com/v1.0/me/messages`

---

## 🎉 Tamamdı!

Artık kullanıcılarınız Gmail ve Outlook hesaplarını güvenli bir şekilde bağlayabilir!

Sorularınız için: [GitHub Issues](https://github.com/your-repo/issues)
