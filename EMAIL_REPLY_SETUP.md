# 📧 Email Reply Özelliği - Kurulum Rehberi

## ✅ Tamamlanan Değişiklikler

### 1. Email Bilgilerinin Kalıcılığı
Email bilgileriniz **zaten kalıcı olarak** saklanıyordu:
- **OAuth hesapları** (Gmail/Outlook) → Supabase veritabanında `email_accounts` tablosunda
- **Manuel IMAP/POP3 hesapları** → LocalStorage'da `customMailAccounts` key'inde

Her uygulama açılışında hesaplarınız otomatik olarak yüklenmektedir.

### 2. Email'lere Cevap Verme Özelliği ✨ YENİ!
Artık email'lere doğrudan uygulama içinden cevap verebilirsiniz!

#### Eklenen Özellikler:
- ✅ **Yanıtla** butonu - Sadece gönderene cevap verir
- ✅ **Tümünü Yanıtla** butonu - Tüm alıcılara cevap verir
- ✅ **Gmail/Outlook OAuth** ile gönderim desteği
- ✅ **Manuel SMTP** desteği (IMAP/POP3 hesapları için)
- ✅ **Orijinal mesaj** görüntüleme
- ✅ **Re:** başlıklı otomatik konu satırı

---

## 🚀 Kurulum Adımları

### Adım 1: Nodemailer Paketini Yükleyin

Mail sunucusuna SMTP desteği için nodemailer gereklidir:

```bash
cd server
npm install
```

(Bu komut `package.json`'daki yeni `nodemailer` bağımlılığını yükleyecektir)

### Adım 2: Mail Köprü Sunucusunu Başlatın

Manuel IMAP/SMTP hesapları için köprü sunucusunu çalıştırın:

```bash
npm run mail:server
```

Bu sunucu `http://localhost:5123` adresinde çalışacaktır.

> **Not:** Gmail ve Outlook OAuth hesapları için bu sunucu gerekmez. Sadece manuel IMAP/SMTP kullanıyorsanız gereklidir.

### Adım 3: OAuth Scope'larını Güncelleyin

Gmail ve Outlook OAuth bağlantılarınızı yenileyin (sadece ilk kez):

1. **Profile** sayfasına gidin
2. **📬 Mail Hesabı Bağla** butonuna tıklayın
3. Gmail veya Outlook ile yeniden bağlanın

Bu, yeni `gmail.send` ve `Mail.Send` izinlerini alacaktır.

---

## 📝 Kullanım

### Email'lere Cevap Verme

1. **Gelen Kutunuzdan** bir email seçin
2. Email detay sayfasında şu butonları göreceksiniz:
   - **↩️ Yanıtla** - Sadece gönderene cevap verir
   - **↪️ Tümünü Yanıtla** - Tüm alıcılara (To/Cc) cevap verir
3. Cevabınızı yazın ve **📤 Gönder** butonuna tıklayın

### Manuel SMTP Ayarları (IMAP/POP3 Hesapları)

Manuel email hesabı eklerken artık SMTP bilgilerini de girebilirsiniz:

- **SMTP Sunucu**: (örn: `smtp.yandex.com`, `smtp.gmail.com`)
- **SMTP Port**: `587` (TLS) veya `465` (SSL)
- **SSL/TLS**: Port tipine göre işaretleyin

**Popüler Sağlayıcılar için SMTP Bilgileri:**

| Sağlayıcı | SMTP Host | Port | SSL/TLS |
|-----------|-----------|------|---------|
| Gmail | smtp.gmail.com | 587 | ❌ TLS |
| Outlook | smtp.office365.com | 587 | ❌ TLS |
| Yandex | smtp.yandex.com | 587 | ❌ TLS |
| Yahoo | smtp.mail.yahoo.com | 587 | ❌ TLS |

> **⚠️ Gmail Kullanıcıları:** Normal şifre çalışmaz! **Uygulama Şifresi** oluşturmalısınız:
> 🔗 https://myaccount.google.com/apppasswords

---

## 🔧 Teknik Detaylar

### Değiştirilen Dosyalar:

1. **`server/mail-server.cjs`** - SMTP endpoint eklendi (`/smtp/send`)
2. **`server/package.json`** - `nodemailer` dependency eklendi
3. **`src/types/mail.ts`** - 
   - `SendEmailRequest` interface
   - `ReplyEmailRequest` interface
   - SMTP ayarları için `CustomAccountConfig` genişletildi
   - Gmail/Outlook'a `send` scope'ları eklendi
4. **`src/services/mailService.ts`** - 
   - `sendEmail()` metodu
   - `replyEmail()` metodu
   - `sendGmailMessage()` (OAuth ile)
   - `sendOutlookMessage()` (OAuth ile)
   - `sendViaSMTP()` (manuel hesaplar için)
5. **`src/components/MailConnectModal.tsx`** - SMTP ayarları form alanları eklendi
6. **`src/components/MailList.tsx`** - 
   - Reply butonları
   - Reply modal component
   - `handleReply()` fonksiyonu

### API Endpoint'leri:

**SMTP Gönderimi:**
```
POST http://localhost:5123/smtp/send
Content-Type: application/json

{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "your-email@gmail.com",
  "pass": "your-app-password",
  "from": "your-email@gmail.com",
  "to": "recipient@example.com",
  "subject": "Re: Test",
  "text": "Reply message",
  "html": "<p>Reply message</p>",
  "inReplyTo": "original-message-id",
  "references": "original-message-id"
}
```

---

## 🐛 Sorun Giderme

### "Failed to send email" Hatası

**Gmail:**
- Normal şifre yerine **Uygulama Şifresi** kullandığınızdan emin olun
- 2-Aşamalı Doğrulama aktif olmalı

**Outlook:**
- SMTP ayarları doğru olmalı: `smtp.office365.com:587`
- "Daha az güvenli uygulamalar" açık olmalı

**Manuel SMTP:**
- Mail bridge sunucusu çalışıyor mu? (`npm run mail:server`)
- SMTP bilgileri doğru mu?
- Güvenlik duvarı SMTP portunu engelliyor olabilir

### "OAuth authentication failed"

1. Profile sayfasından mail hesabını kaldırın
2. Yeniden bağlanın (yeni scope'lar için izin istenecek)

### "SMTP connection failed"

- SMTP sunucu adresi ve port doğru mu?
- SSL/TLS ayarı port ile eşleşiyor mu?
  - Port 465 → SSL ✅
  - Port 587 → TLS (SSL ❌)

---

## 🎉 Özet

Artık EchoDay üzerinden email'lerinize cevap verebilirsiniz! 

✅ Email bilgileriniz kalıcı olarak saklanıyor
✅ Gmail/Outlook OAuth ile gönderim
✅ Manuel SMTP desteği
✅ Yanıtla ve Tümünü Yanıtla

Herhangi bir sorun olursa, yukarıdaki sorun giderme bölümüne bakın.

**İyi kullanımlar! 🚀**
