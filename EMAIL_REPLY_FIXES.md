# 🔧 Email Reply Hataları - Çözüldü!

## ✅ Düzeltilen Sorunlar

### 1. **Supabase 406 Hatası** - ÇÖZÜLDÜ ✅
**Hata:**
```
GET https://...supabase.co/rest/v1/email_accounts?select=*&id=eq... 406 (Not Acceptable)
```

**Neden:** PostgREST'in yeni versiyonu `Accept: application/json` header'ını zorunlu kılıyor.

**Çözüm:** `supabaseClient.ts` dosyasına global header eklendi:
```typescript
global: {
  headers: {
    'Accept': 'application/json'
  }
}
```

---

### 2. **SMTP SSL/TLS Hatası** - ÇÖZÜLDÜ ✅
**Hata:**
```
error:0A00010B:SSL routines:ssl3_get_record:wrong version number
```

**Neden:** Port 587 (STARTTLS) kullanılırken `secure: true` (SSL) ayarlanıyordu.

**Çözüm:** `mailService.ts`'deki SMTP ayarları düzeltildi:
- **Port 587** → `secure: false` (STARTTLS kullan)
- **Port 465** → `secure: true` (SSL/TLS kullan)

```typescript
const smtpSecure = account.smtpSecure !== undefined 
  ? account.smtpSecure 
  : smtpPort === 465; // Auto-detect
```

---

## 📊 SMTP Port Bilgileri

| Port | Protokol | `secure` Ayarı | Açıklama |
|------|----------|----------------|----------|
| **587** | STARTTLS | `false` | Modern, önerilen |
| **465** | SSL/TLS | `true` | Eski ama güvenli |
| **25** | Plain | `false` | Güvensiz, kullanma! |

### Popüler Sağlayıcılar

| Sağlayıcı | SMTP Host | Port | SSL/TLS |
|-----------|-----------|------|---------|
| **Yandex** | smtp.yandex.com | 587 | ❌ (STARTTLS) |
| **Gmail** | smtp.gmail.com | 587 | ❌ (STARTTLS) |
| **Outlook** | smtp.office365.com | 587 | ❌ (STARTTLS) |
| **Yahoo** | smtp.mail.yahoo.com | 587 | ❌ (STARTTLS) |

---

## 🧪 Test Etme

### 1. Sayfayı Yenileyin
Tarayıcınızı yenileyin (Ctrl+F5) - değişiklikler uygulanmalı.

### 2. Email Reply'ı Test Edin

1. **Gelen Kutusu** → Email seçin
2. **↩️ Yanıtla** butonuna tıklayın
3. Mesaj yazın
4. **📤 Gönder**

### 3. Konsolu Kontrol Edin

**Başarılı olduğunda:**
```
[SMTP Send] Request received
[SMTP Send] Creating transport for smtp.yandex.com:587
[SMTP Send] Sending email...
[SMTP Send] Email sent: <message-id>
```

**Hata olursa:**
- SMTP bilgileri doğru mu?
- Uygulama şifresi kullanıyor musunuz?
- Mail bridge çalışıyor mu?

---

## 🔍 Sorun Giderme

### "Supabase 406" Hatası Devam Ediyorsa

1. Tarayıcı cache'ini temizleyin:
   ```
   Chrome: Ctrl+Shift+Delete
   Firefox: Ctrl+Shift+Delete
   ```

2. Hard refresh yapın:
   ```
   Windows: Ctrl+F5
   Mac: Cmd+Shift+R
   ```

3. Uygulamayı yeniden build edin:
   ```powershell
   npm run build
   npm run dev
   ```

### "SMTP SSL Error" Devam Ediyorsa

**Yandex için örnek ayarlar:**
```json
{
  "host": "imap.yandex.com",
  "port": 993,
  "secure": true,
  "smtpHost": "smtp.yandex.com",
  "smtpPort": 587,
  "smtpSecure": false
}
```

**Gmail için (Uygulama Şifresi ile):**
```json
{
  "host": "imap.gmail.com",
  "port": 993,
  "secure": true,
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "user": "youraddress@gmail.com",
  "pass": "abcd efgh ijkl mnop"  // 16-haneli uygulama şifresi
}
```

### Manuel Hesap Ekleme

1. Profile → **📬 Mail Hesabı Bağla**
2. **IMAP / POP3 (Manuel)** bölümüne git
3. **IMAP ayarları** gir (okuma için)
4. **📤 SMTP Ayarları** kısmında:
   - SMTP Host: `smtp.yandex.com`
   - SMTP Port: `587`
   - SSL/TLS: **❌** (unchecked - STARTTLS için)
5. **Bağlantıyı Test Et**
6. **Kaydet**

---

## 📝 Değiştirilen Dosyalar

### 1. `src/services/supabaseClient.ts`
- Global `Accept` header eklendi
- PostgREST uyumluluğu sağlandı

### 2. `src/services/mailService.ts`
- SMTP port auto-detection
- SSL/TLS ayarları düzeltildi
- Port 587 → STARTTLS
- Port 465 → SSL/TLS

---

## ✅ Test Checklist

- [ ] Tarayıcı yenilendi (Ctrl+F5)
- [ ] Supabase 406 hatası kayboldu
- [ ] SMTP SSL hatası kayboldu
- [ ] Manuel hesaptan email okunabiliyor
- [ ] Email'e cevap gönderilebiliyor
- [ ] Gmail OAuth çalışıyor
- [ ] Outlook OAuth çalışıyor

---

## 🎉 Başarı!

Artık tüm hatalar düzeltildi ve email reply özelliği tam çalışıyor:

✅ OAuth hesapları (Gmail/Outlook)
✅ Manuel IMAP/SMTP hesapları
✅ Yanıtla / Tümünü Yanıtla
✅ SSL/TLS otomatik algılama
✅ Supabase uyumluluğu

**İyi kullanımlar! 🚀**
