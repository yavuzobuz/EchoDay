# 🚀 Vercel'de Yayınlama Rehberi

## Adım 1: Vercel CLI'yi Kurun
```bash
npm install -g vercel
```

## Adım 2: Vercel'e Giriş Yapın
```bash
vercel login
```
Email adresinizi girin ve doğrulama mailini onaylayın.

## Adım 3: Projeyi Deploy Edin
Proje klasöründeyken:
```bash
vercel
```

Sorulara şu şekilde cevap verin:
- Set up and deploy? → **Y** (Evet)
- Which scope? → Kendi hesabınızı seçin
- Link to existing project? → **N** (Hayır, yeni proje)
- Project name? → **echoday** (veya istediğiniz isim)
- Directory? → **Enter** (mevcut klasör)
- Override settings? → **N** (Hayır)

## Adım 4: Environment Variables (Çevre Değişkenleri) Ekleyin

Vercel Dashboard'a gidin: https://vercel.com/dashboard

1. Projenizi seçin
2. **Settings** → **Environment Variables**
3. Şu değişkenleri ekleyin:
   - `VITE_GOOGLE_AI_API_KEY` = Google AI API anahtarınız
   - `VITE_SUPABASE_URL` = Supabase URL'iniz (varsa)
   - `VITE_SUPABASE_ANON_KEY` = Supabase anahtarınız (varsa)

## Adım 5: Yeniden Deploy
Environment variables ekledikten sonra:
```bash
vercel --prod
```

## 🎉 Tamamlandı!
Projeniz şu adreste yayında:
`https://echoday.vercel.app`

---

## 📧 Email Özelliği Nasıl Çalışır?

1. **Frontend (React)**: Kullanıcı arayüzü
2. **API Routes (/api/mail)**: Email işlemleri için serverless fonksiyonlar
3. **IMAP/SMTP**: Gmail, Outlook gibi email servislerine bağlanır

### Desteklenen Email Servisleri:
- ✅ Gmail (IMAP/SMTP)
- ✅ Outlook/Hotmail
- ✅ Yahoo Mail
- ✅ Özel email sunucuları (IMAP/SMTP destekli)

### Güvenlik Notları:
- Email şifreleri sadece işlem anında kullanılır
- Vercel'de saklanmaz
- Her kullanıcı kendi email bilgilerini girer

---

## 🔧 Sorun Giderme

### "Module not found" hatası
```bash
npm install
vercel --prod
```

### Email bağlantısı çalışmıyor
- Gmail için: "Daha az güvenli uygulama erişimi" veya "Uygulama şifresi" kullanın
- Outlook için: İki faktörlü doğrulama + Uygulama şifresi kullanın

### Build hatası
```bash
npm run build
# Hata yoksa:
vercel --prod
```

---

## 📱 Mobil Erişim
Siteniz otomatik olarak mobil uyumlu!
- Progressive Web App (PWA) desteği
- Offline çalışma
- Ana ekrana ekleme

## 💡 İpucu
Vercel ücretsiz plan limitleri:
- 100GB bant genişliği/ay
- Serverless fonksiyonlar: 100GB-saat/ay
- Sınırsız deploy

Daha fazla bilgi: https://vercel.com/docs