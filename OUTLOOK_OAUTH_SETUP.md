# Outlook OAuth Kurulum Rehberi

## 📋 Outlook OAuth Ayarları (5-10 dakika)

### 1. Azure Portal'a Git
1. [Azure Portal](https://portal.azure.com) adresine git
2. Microsoft hesabınla giriş yap

### 2. App Registration Oluştur
1. Arama çubuğuna **"App registrations"** yaz
2. **+ New registration** tıkla
3. Aşağıdaki bilgileri gir:
   - **Name**: EchoDay
   - **Supported account types**: Personal Microsoft accounts only seç
   - **Redirect URI**: Web seç, URL: `http://localhost:5173/auth/outlook/callback`
4. **Register** tıkla

### 3. Application (client) ID'yi Kopyala
1. Overview sayfasında **Application (client) ID**'yi kopyala
2. `.env` dosyasına ekle:
   ```env
   VITE_OUTLOOK_CLIENT_ID=your_application_id_here
   ```

### 4. Client Secret Oluştur
1. Sol menüden **Certificates & secrets**
2. **Client secrets** tab'inda **+ New client secret**
3. Description: **EchoDay Web Client Secret**
4. Expires: **24 months** (veya istediğin süre)
5. **Add** tıkla
6. ⚠️ **ÖNEMLİ**: Secret **Value**'sunu HEMEN kopyala! (sonra görüntüleyemezsin)
7. `.env` dosyasına ekle:
   ```env
   VITE_OUTLOOK_CLIENT_SECRET=your_secret_value_here
   ```

### 5. API Permissions Ekle
1. Sol menüden **API permissions**
2. **+ Add a permission**
3. **Microsoft Graph** seç
4. **Delegated permissions** seç
5. Aşağıdaki izinleri ekle:
   - **Mail.Read** (mail okuma)
   - **Mail.Send** (mail gönderme - opsiyonel)
   - **User.Read** (kullanıcı profili okuma)
6. **Add permissions** tıkla
7. **Grant admin consent** tıkla (kendi hesabın için)

### 6. Redirect URI Güncelle (gerekirse)
1. Sol menüden **Authentication**
2. **Redirect URIs** bölümünde doğru URL'i kontrol et:
   ```
   http://localhost:5173/auth/outlook/callback
   ```
3. **Access tokens** ve **ID tokens** kutularını işaretle
4. **Save** tıkla

## 🧪 Test Etme

### 1. Uygulamayı Başlat
```bash
npm run dev
```

### 2. Test Adımları
1. Uygulamada Email sayfasına git (`/email`)
2. "Mail Hesabı Bağla" butonuna tıkla
3. "Outlook ile Bağlan" seç
4. Microsoft'a yönlendirileceksin
5. Outlook/Hotmail hesabını seç ve izinleri onayla
6. Uygulamaya geri döneceksin

### 3. Doğrulama
- Browser Developer Tools → Network tab'inde OAuth isteğini görebilirsin
- Console'da hata mesajları var mı kontrol et
- Email listesinde Outlook hesabın görünüyor mu?

## 🚨 Yaygın Sorunlar

### "redirect_uri_mismatch" Hatası
- Azure Portal'daki redirect URI'nin doğru olduğundan emin ol
- Tam URL: `http://localhost:5173/auth/outlook/callback`

### "invalid_client" Hatası
- Client ID doğru mu kontrol et
- Client secret yanlış kopyalanmış olabilir (yeniden oluştur)

### "insufficient_scope" Hatası
- API permissions'da Mail.Read izni var mı kontrol et
- Admin consent verildi mi?

### CORS Hatası
- Bu normal, Microsoft Graph API'si browser'dan direkt çağrılamaz
- Bizim kodumuz server-side çalıştığı için sorun yok

## 📝 Microsoft Hesap Türleri

- **Personal**: @outlook.com, @hotmail.com, @live.com
- **Work/School**: Office 365, kurumsal hesaplar
- Bizim ayarımız personal hesaplar için optimize edilmiş

## 🔐 Güvenlik

- Client secret'i asla frontend kodunda kullanma
- Secret'i güvenli sakla (environment variables)
- Production'da HTTPS zorunlu
- Token'ları log'lama

## 📧 Desteklenen Email Sağlayıcıları

✅ **Çalışanlar**:
- @outlook.com
- @hotmail.com  
- @live.com
- @msn.com

❌ **Çalışmayanlar** (farklı kurulum gerekir):
- Office 365 kurumsal hesapları (farklı tenant kurulumu)
- Exchange Server

## 🚀 Production Hazırlığı

Production'a geçerken:
1. Redirect URI'yi production domain'e güncelle
2. Client secret'i güvenli bir yerde sakla (Azure Key Vault vs.)
3. Token encryption ekle
4. Rate limiting uygula