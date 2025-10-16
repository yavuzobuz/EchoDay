# 💳 Demo Ödeme Sistemi Entegrasyon Rehberi

## 📋 İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Kurulum](#kurulum)
3. [Kullanım](#kullanım)
4. [Plan Limitleri](#plan-limitleri)
5. [Gerçek Stripe Entegrasyonu](#gerçek-stripe-entegrasyonu)
6. [Test Senaryoları](#test-senaryoları)

---

## 🎯 Genel Bakış

Bu proje artık **demo ödeme sistemi** ve **plan bazlı kullanıcı sınırlamaları** içermektedir.

### Eklenen Özellikler
- ✅ Stripe demo ödeme entegrasyonu
- ✅ Plan bazlı limitler (Ücretsiz, Temel, Pro, Kurumsal)
- ✅ Kullanım takibi (Görevler, Notlar, AI istekleri)
- ✅ Gerçek zamanlı limit göstergeleri
- ✅ Otomatik upgrade uyarıları

### Kullanılan Teknolojiler
- **Stripe.js** - Ödeme entegrasyonu
- **Supabase** - Abonelik veritabanı
- **React + TypeScript** - Frontend

---

## 🚀 Kurulum

### 1. Paketleri Yükle
```bash
npm install @stripe/stripe-js stripe
```

### 2. Veritabanı Şemasını Oluştur
Supabase SQL Editor'de şu dosyayı çalıştırın:
```
supabase_migrations/add_subscriptions_table.sql
```

Bu şema şunları oluşturur:
- `subscriptions` tablosu - Kullanıcı abonelikleri
- `subscription_plans` tablosu - Plan şablonları
- `payment_history` tablosu - Ödeme geçmişi
- RLS politikaları - Güvenlik
- Yardımcı fonksiyonlar

### 3. Stripe Hesabı (Opsiyonel)
Gerçek ödeme için:
1. [Stripe](https://stripe.com) hesabı açın
2. Test mode API key'lerini alın
3. `.env` dosyasına ekleyin:
```env
VITE_STRIPE_PUBLIC_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
```

---

## 💡 Kullanım

### Plan Limitleri

Varsayılan plan limitleri:

#### 🆓 Ücretsiz Plan
- Görevler: 50
- Notlar: 20
- AI istekleri/gün: 5
- E-posta entegrasyonu: ❌
- Analitik: ❌

#### 💼 Temel Plan (₺9.99/ay)
- Görevler: 500
- Notlar: 200
- AI istekleri/gün: 50
- E-posta entegrasyonu: ✅
- Analitik: ❌

#### 🚀 Pro Plan (₺19.99/ay)
- Görevler: Sınırsız
- Notlar: Sınırsız
- AI istekleri/gün: 500
- E-posta entegrasyonu: ✅
- Analitik: ✅
- Öncelikli destek: ✅

#### 🏢 Kurumsal Plan (₺49.99/ay)
- Her şey sınırsız
- Özel entegrasyonlar
- Ayrılmış destek

---

## 🔧 Kod Kullanımı

### 1. Limit Kontrolü (Görev Ekleme Örneği)

```typescript
import { checkLimit } from './services/subscriptionLimitsService';

async function addTask(userId: string, task: any) {
  // Limiti kontrol et
  const limitCheck = await checkLimit(userId, 'max_tasks');
  
  if (!limitCheck.allowed) {
    // Limit aşıldı - kullanıcıyı bilgilendir
    alert(limitCheck.reason);
    // Upgrade sayfasına yönlendir
    window.location.href = '/pricing';
    return;
  }
  
  // Limit OK - görevi ekle
  await supabase.from('todos').insert(task);
}
```

### 2. Özellik Erişim Kontrolü

```typescript
import { checkFeatureAccess } from './services/subscriptionLimitsService';

async function openEmailIntegration(userId: string) {
  const access = await checkFeatureAccess(userId, 'email_integration');
  
  if (!access.allowed) {
    alert('E-posta entegrasyonu planınızda bulunmuyor');
    return;
  }
  
  // Özelliği aç
  openEmailModal();
}
```

### 3. Kullanım Widget'ı Göster

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

### 4. Demo Ödeme Sayfası

```tsx
import StripeCheckout from './components/StripeCheckout';
import { useState } from 'react';

function PricingPage() {
  const [showCheckout, setShowCheckout] = useState(false);
  
  const handlePaymentSuccess = async (result: any) => {
    // Aboneliği Supabase'e kaydet
    await supabase.from('subscriptions').insert({
      user_id: user.id,
      plan_type: 'pro',
      status: 'active',
      transaction_id: result.transactionId,
    });
    
    alert('Ödeme başarılı!');
  };
  
  return (
    <div>
      {showCheckout ? (
        <StripeCheckout
          planId="pro_monthly"
          planName="Pro Plan"
          amount={19.99}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowCheckout(false)}
        />
      ) : (
        <button onClick={() => setShowCheckout(true)}>
          Satın Al
        </button>
      )}
    </div>
  );
}
```

---

## 🔐 Gerçek Stripe Entegrasyonu

Demo moddan gerçek ödemeye geçmek için:

### 1. Backend API Oluştur
```javascript
// server/payment-api.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/create-payment-intent', async (req, res) => {
  const { amount, planId, userId } = req.body;
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Kuruş cinsinden
    currency: 'try',
    metadata: { planId, userId },
  });
  
  res.json({ clientSecret: paymentIntent.client_secret });
});
```

### 2. Frontend'de Stripe Elements Kullan
```tsx
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY!);

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    // Backend'den client secret al
    const { clientSecret } = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 19.99, planId: 'pro' }),
    }).then(r => r.json());
    
    // Ödemeyi onayla
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      },
    });
    
    if (result.error) {
      alert(result.error.message);
    } else {
      // Başarılı - aboneliği kaydet
      saveSubscription(result.paymentIntent);
    }
  };
  
  return (
    <Elements stripe={stripePromise}>
      <form onSubmit={handleSubmit}>
        <CardElement />
        <button type="submit">Öde</button>
      </form>
    </Elements>
  );
}
```

### 3. Webhook Handler Ekle
```javascript
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body, 
    sig, 
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Ödeme başarılı - aboneliği aktifleştir
      const paymentIntent = event.data.object;
      activateSubscription(paymentIntent.metadata.userId);
      break;
    case 'customer.subscription.deleted':
      // Abonelik iptal - kullanıcıyı downgrade et
      deactivateSubscription(event.data.object.customer);
      break;
  }
  
  res.json({received: true});
});
```

---

## 🧪 Test Senaryoları

### 1. Ücretsiz Kullanıcı Test
```typescript
// 50 görev ekle
for (let i = 0; i < 50; i++) {
  await addTask(userId, { title: `Task ${i}` });
}

// 51. görev eklenmeye çalışılırken limit uyarısı görmeli
await addTask(userId, { title: 'Task 51' }); // ❌ Engellenmeli
```

### 2. Pro Kullanıcı Test
```typescript
// Sınırsız görev ekleyebilmeli
for (let i = 0; i < 1000; i++) {
  await addTask(userId, { title: `Task ${i}` });
} // ✅ Hepsi eklenebilmeli
```

### 3. Demo Ödeme Test
```typescript
// Demo ödeme yap
const result = await processPayment('pro_monthly', 'monthly');

console.log(result.success); // true
console.log(result.transactionId); // demo_txn_12345...

// Abonelik veritabanında aktif olmalı
const subscription = await getUserSubscription(userId);
console.log(subscription.status); // 'active'
console.log(subscription.plan_type); // 'pro'
```

### 4. AI İstek Limiti Test
```typescript
// Ücretsiz kullanıcı: 5 AI isteği
for (let i = 0; i < 5; i++) {
  await sendAIRequest(userId, 'test query');
} // ✅ OK

await sendAIRequest(userId, 'test query'); // ❌ Limit aşıldı
```

---

## 📊 Veritabanı Sorguları

### Aktif Abonelikleri Listele
```sql
SELECT 
  s.*, 
  p.display_name as plan_name,
  u.email
FROM subscriptions s
JOIN subscription_plans p ON s.plan_type = p.name
JOIN auth.users u ON s.user_id = u.id
WHERE s.status = 'active';
```

### Plan İstatistikleri
```sql
SELECT 
  plan_type,
  COUNT(*) as user_count,
  SUM(amount) as total_revenue
FROM subscriptions
WHERE status = 'active'
GROUP BY plan_type;
```

### Süresi Dolacak Abonelikler
```sql
SELECT * FROM subscriptions
WHERE end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
AND status = 'active';
```

---

## 🎨 UI Customization

### Limit Göstergesi Renkleri
```css
/* subscriptionLimitsService.ts içinde */
const getProgressColor = (current: number, limit: number) => {
  const percentage = (current / limit) * 100;
  if (percentage >= 90) return 'bg-red-500';      // %90+ Kırmızı
  if (percentage >= 75) return 'bg-yellow-500';   // %75-90 Sarı
  return 'bg-blue-500';                            // %0-75 Mavi
};
```

### Upgrade Prompt Eşiği
```typescript
// %80'e ulaşınca uyar
export function shouldShowUpgradePrompt(limitCheck) {
  const percentage = (limitCheck.current / limitCheck.limit) * 100;
  return percentage >= 80; // Burası değiştirilebilir
}
```

---

## 🔒 Güvenlik Notları

1. **RLS (Row Level Security)** aktif - kullanıcılar sadece kendi aboneliklerini görebilir
2. **API Key'ler** `.env` dosyasında saklanmalı, asla git'e pushlanmamalı
3. **Webhook imzaları** doğrulanmalı (Stripe webhook secret kullan)
4. **Client-side validation** her zaman backend'de de kontrol edilmeli

---

## 📚 Ek Kaynaklar

- [Stripe Dokümantasyonu](https://stripe.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [React Stripe.js Docs](https://stripe.com/docs/stripe-js/react)

---

## 🤝 Destek

Sorular için:
- Email: support@echoday.com
- GitHub Issues: [proje-linki]

---

## 📝 Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.
