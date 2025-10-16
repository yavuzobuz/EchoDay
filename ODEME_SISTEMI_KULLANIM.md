# 💳 Ödeme Sistemi - Basit Kullanım Rehberi

## ✅ Ne Yaptık?

1. **Stripe paketlerini yükledik** ✓
2. **Ödeme servisi ekledik** (`StripeCheckout.tsx`) ✓
3. **Limit kontrolü servisi ekledik** (`subscriptionLimitsService.ts`) ✓
4. **Kullanım göstergesi widget'ı ekledik** (`UsageLimitWidget.tsx`) ✓
5. **Pricing sayfasına ödeme modalı ekledik** ✓

## 🚀 Şimdi Ne Yapmalısın?

### ADIM 1: Veritabanını Hazırla (5 dakika)

1. **Supabase'e git**: https://supabase.com
2. Projen → **SQL Editor** sekmesine git
3. `supabase_migrations/add_subscriptions_table.sql` dosyasını aç
4. İçeriği **kopyala** ve SQL Editor'e **yapıştır**
5. **RUN** butonuna tıkla
6. ✅ "Success" mesajı görmelisin

### ADIM 2: Uygulamayı Çalıştır

```bash
npm run dev
```

### ADIM 3: Test Et

1. Tarayıcıda aç: `http://localhost:5173`
2. `/pricing` sayfasına git
3. **"Pro Al"** veya **"Pro+ Al"** butonuna tıkla
4. Demo ödeme ekranı açılacak
5. **"Ödeme Yap"** butonuna tıkla (2 saniye bekleyecek)
6. ✅ Başarılı mesajı göreceksin!

## 📋 Planlar ve Limitler

| Plan | Görevler | Notlar | AI/gün | Fiyat |
|------|----------|--------|--------|-------|
| **Ücretsiz** | 50 | 20 | 5 | 0₺ |
| **Temel** | 500 | 200 | 50 | 9.99₺ |
| **Pro** | ∞ | ∞ | 500 | 19.99₺ |
| **Kurumsal** | ∞ | ∞ | ∞ | 49.99₺ |

## 🎯 Kullanım Örnekleri

### Ana sayfada limit göster

```tsx
import UsageLimitWidget from './components/UsageLimitWidget';

function Dashboard() {
  const { user } = useAuth();
  
  return (
    <div>
      <UsageLimitWidget userId={user.id} />
    </div>
  );
}
```

### Görev eklerken limit kontrol et

```tsx
import { checkLimit } from './services/subscriptionLimitsService';

async function handleAddTask() {
  // Limiti kontrol et
  const check = await checkLimit(user.id, 'max_tasks');
  
  if (!check.allowed) {
    alert('Görev limitine ulaştınız! Planınızı yükseltin.');
    navigate('/pricing');
    return;
  }
  
  // Görevi ekle
  await addTask(newTask);
}
```

## 🎮 DEMO MOD

Bu **demo** bir ödeme sistemidir:
- ✅ Gerçek para çekilmez
- ✅ Test amaçlıdır
- ✅ Abonelikler Supabase'e kaydedilir
- ✅ Limitler çalışır

## 🔄 Gerçek Stripe'a Geçiş (İleride)

Gerçek ödeme almak istediğinde:

1. Stripe hesabı aç: https://stripe.com
2. Test API key al
3. `.env` dosyasına ekle:
```env
VITE_STRIPE_PUBLIC_KEY=pk_test_your_key_here
```
4. Detaylı rehber: `PAYMENT_INTEGRATION_GUIDE.md`

## 🐛 Sorun Mu Var?

### Ödeme modalı açılmıyor
- Tarayıcı console'u kontrol et (F12)
- `StripeCheckout.tsx` dosyası var mı kontrol et

### Supabase hatası
- SQL migration'ı çalıştırdın mı?
- Supabase bağlantı bilgileri doğru mu?

### Limit kontrolü çalışmıyor
- Veritabanında `subscriptions` tablosu var mı?
- User ID doğru mu?

## 📞 Yardım

- Detaylı rehber: `PAYMENT_INTEGRATION_GUIDE.md`
- Kod örnekleri dosya içinde mevcut

---

**İyi çalışmalar! 🚀**
