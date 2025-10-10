# EmailTemplateManager Test Rehberi

## Düzeltilen Sorun

**Problem**: EmailTemplateManager bileşeni `isOpen` prop'u bekliyordu ama MailList.tsx'te sadece conditional rendering kullanılıyordu.

**Çözüm**: MailList.tsx güncellenip `isOpen={showTemplateManager}` prop'u eklendi.

## Test Adımları

### 1. Uygulamayı Yeniden Başlat
```bash
# Eğer dev server çalışıyorsa durdurun (Ctrl+C)
npm run dev
```

### 2. Tarayıcıda Hard Refresh
- Chrome/Edge: `Ctrl + Shift + R` (Windows) veya `Cmd + Shift + R` (Mac)
- Firefox: `Ctrl + F5` (Windows) veya `Cmd + Shift + R` (Mac)

### 3. Browser Console'u Aç
- `F12` tuşuna basın
- `Console` sekmesine geçin
- Hataları izleyin

### 4. Şablon Yöneticisini Test Et

#### Adım 1: Email Seç
1. Mail listesinden herhangi bir email seçin
2. Email detayları görüntülensin

#### Adım 2: Yanıtla Modalını Aç
1. **"↩️ Yanıtla"** butonuna tıklayın
2. Yanıtlama modali açılsın

#### Adım 3: Şablon Modalını Aç
1. **"📋 Şablon Seç"** butonuna tıklayın
2. Şablon yöneticisi modali açılmalı

### Beklenen Görünüm

Şablon modali açıldığında göreceksiniz:
- ✅ Modal overlay (siyah transparan arka plan)
- ✅ "📝 Email Şablonları" başlığı
- ✅ "+ Yeni Şablon" butonu (sağ üstte)
- ✅ X (kapat) butonu
- ✅ 3 varsayılan şablon:
  - Teşekkür
  - Toplantı İsteği
  - Bilgi Talebi

### Şablon Kartları
Her şablon kartında:
- 📝 Şablon adı
- ✏️ Düzenle butonu (mavi)
- 🗑️ Sil butonu (kırmızı)
- Kartlara tıklayınca şablon editöre yüklenir

## Sorun Giderme

### Modal Açılmıyor
**Console'da hata kontrol edin:**
```javascript
// F12 > Console
// Şu hataları arayın:
- "Cannot read property 'isOpen' of undefined"
- "emailTemplateService is not defined"
- Import/export errors
```

**Çözüm:**
1. Hard refresh yapın
2. LocalStorage'ı temizleyin:
```javascript
// F12 > Console
localStorage.removeItem('emailTemplates');
location.reload();
```

### Modal Açılıyor Ama Şablon Yok
**LocalStorage'da şablon var mı kontrol edin:**
```javascript
// F12 > Console
console.log(JSON.parse(localStorage.getItem('emailTemplates') || '[]'));
```

**Varsayılan şablonları manuel yükle:**
```javascript
// F12 > Console
const defaultTemplates = [
  {
    id: '1',
    name: 'Teşekkür',
    body: '<p>Merhaba,</p><p>Mesajınız için teşekkür ederim. En kısa sürede size dönüş yapacağım.</p><p>Saygılarımla</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Toplantı İsteği',
    body: '<p>Merhaba,</p><p>Bu konu hakkında görüşmek isterim. Müsait olduğunuz bir zaman dilimini belirtir misiniz?</p><p>Teşekkürler</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Bilgi Talebi',
    body: '<p>Merhaba,</p><p>Bu konu hakkında daha fazla bilgi alabilir miyim? Özellikle aşağıdaki detayları öğrenmek istiyorum:</p><ul><li>[Detay 1]</li><li>[Detay 2]</li><li>[Detay 3]</li></ul><p>Teşekkür ederim</p>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
localStorage.setItem('emailTemplates', JSON.stringify(defaultTemplates));
location.reload();
```

### Modal Arka Planda Kalıyor
**z-index sorunu olabilir. CSS kontrol edin:**

Modal z-index: `z-50` (50)
Reply modal z-index: `z-50` (50)

**Çözüm**: EmailTemplateManager z-index'ini artırın:
```tsx
// Geçici çözüm - inline style ekleyin
<div className="fixed inset-0 z-[60] ...">
```

### RichTextEditor Çalışmıyor
**contentEditable desteğini kontrol edin:**
```javascript
// F12 > Console
document.createElement('div').isContentEditable; // true olmalı
```

### Şablon Kaydedilmiyor
**Console'da şu kodu çalıştırın:**
```javascript
// F12 > Console
const testTemplate = {
  id: 'test-' + Date.now(),
  name: 'Test Şablonu',
  body: '<p>Test içeriği</p>',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
const existing = JSON.parse(localStorage.getItem('emailTemplates') || '[]');
existing.push(testTemplate);
localStorage.setItem('emailTemplates', JSON.stringify(existing));
console.log('Kaydedildi:', existing);
location.reload();
```

## Başarılı Test Senaryosu

### 1. Yeni Şablon Oluşturma
```
1. "📋 Şablon Seç" → Modal açılır ✅
2. "+ Yeni Şablon" → Form açılır ✅
3. Ad: "Test"
4. İçerik: "Test mesajı"
5. "💾 Kaydet" → Şablon eklenir ✅
6. Liste güncellenir ✅
```

### 2. Şablon Kullanma
```
1. "📋 Şablon Seç" → Modal açılır ✅
2. "Teşekkür" kartına tıkla ✅
3. Modal kapanır ✅
4. Editörde şablon içeriği görünür ✅
```

### 3. Şablon Düzenleme
```
1. "📋 Şablon Seç" → Modal açılır ✅
2. Bir şablonun yanındaki "✏️" butonuna tıkla ✅
3. İçeriği değiştir
4. "💾 Kaydet" → Güncellenir ✅
```

### 4. Şablon Silme
```
1. "📋 Şablon Seç" → Modal açılır ✅
2. Bir şablonun yanındaki "🗑️" butonuna tıkla ✅
3. Onay ver ✅
4. Şablon silinir ✅
```

## Teknik Detaylar

### Dosya Yapısı
```
src/
├── components/
│   ├── RichTextEditor.tsx          ✅ Mevcut
│   ├── EmailTemplateManager.tsx    ✅ Mevcut
│   ├── AttachmentPicker.tsx        ✅ Mevcut
│   └── MailList.tsx                ✅ Güncellendi
├── services/
│   └── emailTemplateService.ts     ✅ Mevcut
└── types/
    └── mail.ts                     ✅ Güncellendi
```

### Props Interface
```typescript
// EmailTemplateManager.tsx
interface EmailTemplateManagerProps {
  isOpen: boolean;              // ✅ GEREKLİ
  onClose: () => void;          // ✅ GEREKLİ
  onSelectTemplate?: (template: EmailTemplate) => void;  // İsteğe bağlı
}
```

### Kullanım
```tsx
// MailList.tsx - DOĞRU ✅
<EmailTemplateManager
  isOpen={showTemplateManager}                    // ✅ EKLENDI
  onClose={() => setShowTemplateManager(false)}
  onSelectTemplate={handleTemplateSelect}
/>

// MailList.tsx - YANLIŞ ❌ (Önceki hali)
{showTemplateManager && (
  <EmailTemplateManager
    // isOpen eksikti ❌
    onClose={() => setShowTemplateManager(false)}
    onSelectTemplate={handleTemplateSelect}
  />
)}
```

## Sonuç

✅ **Sorun Çözüldü**: `isOpen` prop'u eklendi
✅ **Beklenen Davranış**: Modal açılıp kapanmalı
✅ **Test Edilmeli**: Yukarıdaki adımları takip edin

Eğer hala sorun varsa, browser console'unda görünen hataları paylaşın!
