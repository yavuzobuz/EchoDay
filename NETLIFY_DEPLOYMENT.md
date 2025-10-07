# Netlify Deployment Rehberi

## 🚀 Netlify'a Deploy Etme

### 1. Netlify Hesabı Oluştur
- [netlify.com](https://netlify.com) adresine git
- GitHub/GitLab hesabınla giriş yap

### 2. Projeyi Deploy Et
- **"Add new site"** → **"Import an existing project"**
- Git provider'ınızı seçin (GitHub/GitLab)
- Repository'nizi seçin
- Build ayarları otomatik algılanacak (`netlify.toml` dosyasından)

### 3. Environment Variables Ekle

Deploy ettikten sonra **Site Settings → Environment Variables** bölümüne gidin ve şu değişkenleri ekleyin:

#### Supabase Ayarları (Zorunlu)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Gemini AI Ayarları (Opsiyonel)
```
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### 4. Environment Variables Nereden Alınır?

#### Supabase
1. [app.supabase.com](https://app.supabase.com) → Projenizi seçin
2. **Settings → API**
3. **Project URL** → `VITE_SUPABASE_URL`
4. **anon/public key** → `VITE_SUPABASE_ANON_KEY`

#### Gemini API
1. [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. API Key oluştur → `VITE_GEMINI_API_KEY`

### 5. Re-Deploy
Environment variables ekledikten sonra:
- **Deploys** sekmesine git
- **Trigger deploy** → **Clear cache and deploy site**

## 📱 APK Dosyası

APK dosyası (`public/sesli-asistan.apk`) otomatik olarak deploy edilecek ve şu adresten erişilebilir olacak:
```
https://your-site.netlify.app/sesli-asistan.apk
```

## 🔒 Güvenlik Notları

- ⚠️ **DİKKAT:** `.env` dosyasını asla Git'e eklemeyin!
- ✅ `.gitignore` dosyası zaten `.env*` dosyalarını ignore ediyor
- ✅ Environment variables sadece Netlify Dashboard'dan eklenmelidir
- ✅ `VITE_SUPABASE_ANON_KEY` public key'dir, güvenlidir (Supabase RLS kurallarıyla korunur)

## 🛠️ Lokal Geliştirme

Lokal geliştirme için `.env.local` dosyası oluşturun:

```bash
# .env.local dosyası oluştur
cp .env.example .env.local

# Değerleri düzenle
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

## 🔄 Güncelleme Workflow

1. Kodda değişiklik yap
2. Git'e push et
3. Netlify otomatik deploy eder
4. Environment variables değişmedi mi kontrol et

## 📞 Sorun Giderme

### Build Hatası
- **Netlify Logs** → Build log'ları kontrol edin
- Environment variables doğru mu?
- `netlify.toml` dosyası doğru mu?

### Environment Variables Çalışmıyor
- Netlify Dashboard'da doğru yazıldığından emin olun
- `VITE_` prefix'i var mı?
- Re-deploy ettiniz mi?

### APK İndirilmiyor
- `public/sesli-asistan.apk` dosyası var mı?
- `netlify.toml` içinde APK header'ları var mı?
- Build log'larını kontrol edin

---

## 🎉 Deploy Başarılı!

Siteniz şu adreste yayında: `https://your-site-name.netlify.app`

Custom domain eklemek için:
- **Domain settings** → **Add custom domain**
