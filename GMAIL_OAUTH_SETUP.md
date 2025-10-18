# Gmail OAuth Kurulum Rehberi

## 📋 Gmail OAuth Ayarları (5-10 dakika)

### 1. Google Cloud Console'a Git
1. [Google Cloud Console](https://console.cloud.google.com) adresine git
2. Yeni proje oluştur veya mevcut projeyi seç
3. Proje adı: **EchoDay** (veya istediğin isim)

### 2. Gmail API'yi Etkinleştir
1. Sol menüden **APIs & Services** → **Library**
2. "Gmail API" ara ve seç
3. **Enable** butonuna tıkla

### 3. OAuth Consent Screen Yapılandır
1. Sol menüden **APIs & Services** → **OAuth consent screen**
2. **External** seç (dahili Google Workspace hesabı yoksa)
3. Zorunlu alanları doldur:
   - **App name**: EchoDay
   - **User support email**: mail adresin
   - **Developer contact information**: mail adresin
4. **Save and Continue**
5. **Scopes** bölümünde herhangi bir şey eklemene gerek yok, **Save and Continue**
6. **Test users** bölümünde kendi Gmail adresini ekle
7. **Save and Continue**

### 4. OAuth 2.0 Client ID Oluştur
1. Sol menüden **APIs & Services** → **Credentials**
2. **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: **EchoDay Web Client**
5. **Authorized redirect URIs** bölümüne ekle:
   ```
   http://localhost:5173/auth/gmail/callback
   http://localhost:3000/auth/gmail/callback
   ```
   (Geliştirme için her iki port da)
6. **CREATE**

### 5. Client ID ve Secret'i Kopyala
1. Oluşturulan client'a tıkla
2. **Client ID** ve **Client secret**'i kopyala
3. `.env` dosyasına ekle:
   ```env
   VITE_GMAIL_CLIENT_ID=your_client_id_here
   VITE_GMAIL_CLIENT_SECRET=your_client_secret_here
   ```

## 🧪 Test Etme

### 1. Uygulamayı Başlat
```bash
npm run dev
```

### 2. Test Adımları
1. Uygulamada Email sayfasına git (`/email`)
2. "Mail Hesabı Bağla" butonuna tıkla
3. "Gmail ile Bağlan" seç
4. Google'a yönlendirileceksin
5. Gmail hesabını seç ve izinleri onayla
6. Uygulamaya geri döneceksin

### 3. Doğrulama
- Browser Developer Tools → Network tab'inde OAuth isteğini görebilirsin
- Console'da hata mesajları var mı kontrol et
- Email listesinde Gmail hesabın görünüyor mu?

## 🚨 Yaygın Sorunlar

### "redirect_uri_mismatch" Hatası
- Google Cloud Console'daki redirect URI'ların doğru olduğundan emin ol
- Tam URL: `http://localhost:5173/auth/gmail/callback`

### "access_denied" Hatası
- OAuth consent screen'de test user olarak eklediğin mail adresi ile test et
- Uygulama henüz "verified" olmadığı için sadece test kullanıcıları bağlanabilir

### Token Hatası
- `.env` dosyasındaki client ID/secret doğru mu kontrol et
- Tarayıcı cache'i temizle ve tekrar dene

## 📝 Notlar

- Gmail OAuth implicit flow kullanıyor (web uygulamaları için güvenli)
- Access token 1 saat geçerli
- Refresh token implicit flow'da mevcut değil (implicit flow doğası gereği)
- Production'da app verification gerekecek

## 🔐 Güvenlik

- Client secret'i asla frontend kodunda kullanma (sadece server-side)
- Production'da HTTPS zorunlu
- Access token'ları güvenli sakla
- Token'ları log'lama veya console'a yazdırma