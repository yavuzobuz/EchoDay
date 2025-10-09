# ✅ Mail Entegrasyonu Kurulum Checklist

## 📋 Hazırlık (5-10 dakika)

### 1. Supabase Database
- [ ] Supabase Dashboard'a gir: https://app.supabase.com
- [ ] SQL Editor'e git
- [ ] `supabase/migrations/003_email_accounts.sql` dosyasını aç
- [ ] Tüm içeriği kopyala → SQL Editor'e yapıştır → RUN
- [ ] ✅ Başarılı mesajı gördün mü?

### 2. Google Cloud Console (Gmail için)
- [ ] https://console.cloud.google.com adresine git
- [ ] Yeni proje oluştur: "EchoDay"
- [ ] Gmail API'yi etkinleştir (APIs & Services → Library)
- [ ] OAuth Consent Screen yapılandır (External, test user ekle)
- [ ] Credentials oluştur (OAuth 2.0 Client ID, Web application)
- [ ] Redirect URI ekle: `http://localhost:5173/auth/gmail/callback`
- [ ] Client ID ve Secret'i kopyala

### 3. Azure Portal (Outlook için)
- [ ] https://portal.azure.com adresine git
- [ ] App Registration oluştur: "EchoDay"
- [ ] Redirect URI ekle: `http://localhost:5173/auth/outlook/callback`
- [ ] Client Secret oluştur ve HEMEN kopyala!
- [ ] API Permissions ekle: Mail.Read, User.Read
- [ ] Application (client) ID'yi kopyala

### 4. Environment Variables
- [ ] `.env.local` dosyasını aç
- [ ] Gmail değişkenlerini ekle:
  ```env
  VITE_GMAIL_CLIENT_ID=...
  VITE_GMAIL_CLIENT_SECRET=...
  ```
- [ ] Outlook değişkenlerini ekle:
  ```env
  VITE_OUTLOOK_CLIENT_ID=...
  VITE_OUTLOOK_CLIENT_SECRET=...
  ```
- [ ] Dosyayı kaydet

---

## 🚀 Kod Entegrasyonu (15-20 dakika)

### Oluşturulmuş Dosyalar ✅
- [x] `src/types/mail.ts` - Type tanımları
- [x] `src/services/mailService.ts` - Mail servisi
- [x] `src/components/MailConnectModal.tsx` - Bağlantı modal'ı
- [x] `src/components/MailList.tsx` - Mail listesi
- [x] `supabase/migrations/003_email_accounts.sql` - Database

### Yapılması Gerekenler 📝

#### 5. OAuth Callback Route'ları Ekle
`src/App.tsx` veya routing dosyanıza ekleyin:

```tsx
// Gmail callback route
<Route path="/auth/gmail/callback" element={<GmailCallback />} />

// Outlook callback route  
<Route path="/auth/outlook/callback" element={<OutlookCallback />} />
```

#### 6. Callback Component'lerini Oluştur
`src/components/auth/` klasörü altında:

**GmailCallback.tsx:**
```tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { mailService } from '../../services/mailService';

export default function GmailCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      mailService.handleOAuthCallback('gmail', code).then(() => {
        navigate('/'); // Ana sayfaya yönlendir
      });
    }
  }, [searchParams, navigate]);

  return <div>Gmail hesabı bağlanıyor...</div>;
}
```

**OutlookCallback.tsx:** (Gmail ile aynı, sadece 'outlook' yazın)

#### 7. Profile Sayfasına Mail Bölümü Ekle
`src/pages/Profile.tsx` dosyasına:

```tsx
import MailConnectModal from '../components/MailConnectModal';

// Component içinde:
const [isMailModalOpen, setIsMailModalOpen] = useState(false);

// JSX içinde mail hesapları bölümü:
<div className="section">
  <h3>Mail Hesapları</h3>
  <button onClick={() => setIsMailModalOpen(true)}>
    📧 Mail Hesabı Bağla
  </button>
  
  <MailConnectModal 
    isOpen={isMailModalOpen}
    onClose={() => setIsMailModalOpen(false)}
    onSuccess={() => {
      setIsMailModalOpen(false);
      // Mail hesaplarını yenile
    }}
  />
</div>
```

#### 8. Main.tsx'e Mail Tab Ekle
`src/Main.tsx` veya `src/App.tsx`:

```tsx
import MailList from './components/MailList';

// Tab state:
const [activeTab, setActiveTab] = useState<'todos' | 'mails'>('todos');

// JSX:
<div className="tabs">
  <button onClick={() => setActiveTab('todos')}>Görevler</button>
  <button onClick={() => setActiveTab('mails')}>Mailler</button>
</div>

{activeTab === 'todos' && <TodoList ... />}
{activeTab === 'mails' && <MailList onConnectClick={() => setIsMailModalOpen(true)} />}
```

---

## 🧪 Test (5 dakika)

### 9. Local Test
- [ ] Terminal'de: `npm run dev`
- [ ] Tarayıcıda: http://localhost:5173
- [ ] Profile sayfasına git
- [ ] "Mail Hesabı Bağla" butonuna tıkla
- [ ] Gmail butonuna tıkla
- [ ] Google'a yönlendirildin mi? ✅
- [ ] İzinleri onayla
- [ ] Uygulamaya geri dön
- [ ] Mail listesinde görüntülendi mi? ✅

### 10. Outlook Testi
- [ ] Aynı adımları Outlook için tekrarla
- [ ] Microsoft'a yönlendirildin mi? ✅
- [ ] Hesap eklendi mi? ✅

---

## 🎯 Tamamlandı! 

Tüm checkler işaretliyse, mail entegrasyonu çalışıyor demektir! 🎉

### Sorun mu var?
- `MAIL_INTEGRATION_GUIDE.md` dosyasındaki "Sorun Giderme" bölümüne bak
- Console'da hata var mı kontrol et (F12)
- Redirect URI'ları doğru mu?
- Environment variables doğru kaydedildi mi?

### Sonraki Adımlar
- [ ] Production için redirect URI'ları güncelle
- [ ] OAuth Consent Screen'i production'a al
- [ ] Token encryption ekle (güvenlik)
- [ ] Rate limiting ekle
- [ ] Mail gönderme özelliği ekle (opsiyonel)
