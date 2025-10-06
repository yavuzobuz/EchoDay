# 🚨 ACİL GÜVENLİK EYLEMLERİ

## ✅ Tamamlanan Düzeltmeler

### 1. XSS Açığı Giderildi ✓
- `AiAssistantMessage.tsx` dosyasına DOMPurify eklendi
- `dangerouslySetInnerHTML` artık güvenli HTML sanitization kullanıyor
- Yalnızca tablo etiketlerine izin veriliyor (table, thead, tbody, tr, th, td)

### 2. NPM Güvenlik Açıkları Giderildi ✓
- Vite 5.2.0 → 7.1.9'a güncellendi
- Esbuild güvenlik açığı (GHSA-67mh-4wv8-2f99) giderildi
- `npm audit` artık 0 güvenlik açığı gösteriyor

---

## 🔴 HEMEN YAPILMASI GEREKENLER

### 1. Supabase API Anahtarlarını YENİLE (KRİTİK)
.env dosyanızdaki API anahtarları açığa çıktı:
- **URL**: https://sdtntnqcdyjhzlhgbofp.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (tam anahtar görünür)

#### Adımlar:
1. [Supabase Dashboard](https://app.supabase.com/project/sdtntnqcdyjhzlhgbofp/settings/api) 'a gidin
2. Settings → API → "Reset Project API Keys" butonuna tıklayın
3. Yeni anahtarları kopyalayın
4. `.env` dosyanızı yeni anahtarlarla güncelleyin
5. Eski anahtarları iptal edin

```bash
# .env dosyasını güncelle (YENİ ANAHTARLAR)
VITE_SUPABASE_URL=https://sdtntnqcdyjhzlhgbofp.supabase.co
VITE_SUPABASE_ANON_KEY=<YENİ_ANAHTAR_BURAYA>
```

### 2. Git Geçmişinden Anahtarları Temizle
.env dosyası git'e commitlendiyse, geçmişten tamamen silin:

```powershell
# BFG Repo-Cleaner ile (ÖNERİLEN):
# 1. BFG'yi indirin: https://rtyley.github.io/bfg-repo-cleaner/
# 2. Çalıştırın:
java -jar bfg.jar --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# VEYA git filter-branch ile:
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all
git push origin --force --all
```

⚠️ **UYARI**: Bu işlem sonrası tüm ekip üyelerinin repo'yu yeniden clone etmesi gerekecek!

### 3. GitHub/GitLab Secrets Taraması
Eğer repo public ise veya GitHub'da paylaşıldıysa:
1. Repo'yu private yapın (geçici olarak)
2. [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning) aktif mi kontrol edin
3. Tüm commit history'yi tarayan bir tool kullanın:
   ```bash
   # TruffleHog ile tarama
   docker run --rm -v C:\Users\Obuzhukuk\Desktop\sesli-günlük-planlayıcı:/proj trufflesecurity/trufflehog:latest git file:///proj
   ```

---

## 🟡 ORTA PRİORİTE İYİLEŞTİRMELER

### 4. LocalStorage Şifreleme Ekle
API anahtarları ve hassas veriler localStorage'da şifresiz:

```typescript
// crypto-storage.ts (ÖNERİLEN)
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'user-specific-key'; // User ID'den türet

export function encryptData(data: any): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
}

export function decryptData(encryptedData: string): any {
  const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

// Kullanım
localStorage.setItem('apiKey', encryptData(apiKey));
const apiKey = decryptData(localStorage.getItem('apiKey'));
```

Kurulum:
```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

### 5. Content Security Policy (CSP) Ekle
`index.html` dosyasına CSP header ekleyin:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' https://sdtntnqcdyjhzlhgbofp.supabase.co https://*.google.com">
```

### 6. Rate Limiting Ekle
API isteklerine rate limiting ekleyin (Supabase tarafında):
- Supabase Dashboard → Settings → API → Rate Limits
- Dakika başına maksimum istek sayısı belirleyin

### 7. HTTPS Kullanımını Zorla
Netlify/Production deployment için:
```toml
# netlify.toml
[[redirects]]
  from = "http://*"
  to = "https://:splat"
  status = 301
  force = true
```

---

## 📋 GÜVENLİK KONTROL LİSTESİ

- [x] XSS açığı giderildi (DOMPurify)
- [x] NPM bağımlılıkları güncellendi (Vite 7.1.9)
- [ ] Supabase API anahtarları yenilendi
- [ ] Git history'den anahtarlar silindi
- [ ] LocalStorage şifreleme eklendi
- [ ] CSP header eklendi
- [ ] HTTPS zorunlu hale getirildi
- [ ] Rate limiting yapılandırıldı

---

## 🔒 GÜVENLİK EN İYİ PRATİKLERİ

1. **Asla API anahtarlarını kodda tutma**: Tüm anahtarlar environment variables'da olmalı
2. **.env dosyasını git'e ekleme**: .gitignore'da olduğundan emin olun
3. **Public repo'larda .env.example kullan**: Gerçek değerler yerine placeholder'lar
4. **Düzenli güvenlik taraması**: `npm audit` her hafta çalıştırın
5. **Dependency updates**: Aylık güvenlik güncellemeleri yapın
6. **Code review**: Tüm kod değişikliklerinde güvenlik kontrolü

---

## 📞 Sorun Yaşarsanız

Bu adımları uygularken sorun yaşarsanız:
1. Değişiklikleri commit etmeden önce backup alın
2. Development ortamında test edin
3. Production'a deploy etmeden önce tüm testleri çalıştırın

**Son Güncelleme**: 2025-10-06
**Tarama Tarihi**: 2025-10-06
**Tespit Edilen Açıklar**: 4 (2 KRİTİK, 2 ORTA)
**Giderilen Açıklar**: 2 (XSS, NPM vulnerabilities)
**Bekleyen Açıklar**: 2 (API keys, localStorage encryption)
