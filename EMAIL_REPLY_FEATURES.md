# 📧 EchoDay Email Reply - Yeni Özellikler Kullanım Kılavuzu

## 🎉 Yeni Özellikler

EchoDay email sistemine aşağıdaki 3 yeni özellik eklendi:

### 1. 📋 Email Şablonları (Email Templates)
Sık kullanılan yanıtları kaydedip tekrar kullanabilirsiniz.

### 2. 📎 Ek Dosya Desteği (Attachments)
Email'lere dosya ekleyerek gönderebilirsiniz.

### 3. ✨ Zengin Metin Editörü (Rich Text Editor)
Email'lerinizi biçimlendirilmiş olarak yazabilirsiniz.

---

## 📋 Email Şablonları (Email Templates)

### Şablon Özellikleri
- ✅ Önceden hazırlanmış yanıtları kaydetme
- ✅ HTML formatında zengin içerik desteği
- ✅ Hızlı seçim ve kullanım
- ✅ Şablonları düzenleme ve silme
- ✅ LocalStorage'da kalıcı saklama

### Varsayılan Şablonlar
Sistem 3 hazır şablonla gelir:

#### 1. Teşekkür
```
Merhaba,

Mesajınız için teşekkür ederim. En kısa sürede size dönüş yapacağım.

Saygılarımla
```

#### 2. Toplantı İsteği
```
Merhaba,

Bu konu hakkında görüşmek isterim. Müsait olduğunuz bir zaman dilimini belirtir misiniz?

Teşekkürler
```

#### 3. Bilgi Talebi
```
Merhaba,

Bu konu hakkında daha fazla bilgi alabilir miyim? Özellikle aşağıdaki detayları öğrenmek istiyorum:

- [Detay 1]
- [Detay 2]
- [Detay 3]

Teşekkür ederim
```

### Şablon Kullanımı

#### Yeni Şablon Oluşturma
1. Email yanıtlama modalını açın
2. **"📋 Şablon Seç"** butonuna tıklayın
3. Şablon yöneticisi açılır
4. **"+ Yeni Şablon"** butonuna tıklayın
5. Şablon adı ve içeriğini girin
6. **"Kaydet"** butonuna tıklayın

#### Şablon Kullanma
1. Email yanıtlama modalında **"📋 Şablon Seç"** butonuna tıklayın
2. Listeden kullanmak istediğiniz şablonu seçin
3. Şablon içeriği otomatik olarak editöre yüklenir
4. İsterseniz düzenleyin ve gönderin

#### Şablon Düzenleme
1. Şablon yöneticisini açın
2. Düzenlemek istediğiniz şablonun üzerine gelin
3. **"✏️ Düzenle"** butonuna tıklayın
4. Değişiklikleri yapın ve **"Kaydet"** butonuna tıklayın

#### Şablon Silme
1. Şablon yöneticisini açın
2. Silmek istediğiniz şablonun üzerine gelin
3. **"🗑️ Sil"** butonuna tıklayın
4. Onaylayın

### Şablon Storage
- Şablonlar `localStorage` içinde `emailTemplates` anahtarı ile saklanır
- Tarayıcı verilerini temizlerseniz şablonlar silinir
- Export/Import özelliği gelecek güncellemelerde eklenecek

---

## 📎 Ek Dosya (Attachment) Desteği

### Özellikler
- ✅ Birden fazla dosya ekleme (varsayılan: 5 dosya)
- ✅ Base64 encoding ile güvenli gönderim
- ✅ Dosya önizleme ve bilgi gösterimi
- ✅ Dosya tipi simgeleri
- ✅ Dosya boyutu gösterimi
- ✅ Gmail, Outlook ve SMTP desteği

### Desteklenen Dosya Tipleri
- 📄 Dokümanlar: PDF, DOC, DOCX, TXT, RTF
- 📊 Tablolar: XLS, XLSX, CSV
- 🖼️ Resimler: JPG, PNG, GIF, SVG
- 📦 Arşivler: ZIP, RAR, 7Z
- 🎵 Medya: MP3, MP4, AVI
- 💻 Kod: JS, TS, JSON, HTML, CSS

### Dosya Ekleme
1. Email yanıtlama modalını açın
2. **"📎 Dosya Ekle"** butonuna tıklayın
3. Dosyalarınızı seçin (çoklu seçim desteklenir)
4. Eklenen dosyalar listede görünür

### Dosya Önizleme
Her dosya için şunlar gösterilir:
- 📁 Dosya tipi simgesi
- 📝 Dosya adı
- 📏 Dosya boyutu (KB/MB formatında)
- ❌ Silme butonu

### Dosya Kaldırma
- Her dosyanın yanındaki **"❌"** butonuna tıklayın
- Dosya listeden kaldırılır

### Boyut Limitleri
- **Gmail**: ~25 MB (attachment limit)
- **Outlook**: ~150 MB (attachment limit)
- **SMTP**: Sunucunuza göre değişir (genellikle 10-25 MB)

### Teknik Detaylar

#### Encoding
Dosyalar Base64 formatına çevrilerek gönderilir:
```typescript
interface EmailAttachmentFile {
  id: string;          // Benzersiz ID
  name: string;        // Dosya adı
  size: number;        // Byte cinsinden boyut
  type: string;        // MIME type
  data: string;        // Base64 encoded data
}
```

#### Gmail ile Gönderim
Gmail API multipart/mixed MIME formatı kullanır:
```
Content-Type: multipart/mixed; boundary="----WebKitFormBoundary..."

------WebKitFormBoundary...
Content-Type: text/html; charset=utf-8

[Email içeriği]

------WebKitFormBoundary...
Content-Type: application/pdf; name="document.pdf"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="document.pdf"

[Base64 data]
------WebKitFormBoundary...--
```

#### Outlook ile Gönderim
Microsoft Graph API JSON formatı kullanır:
```json
{
  "message": {
    "attachments": [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        "name": "document.pdf",
        "contentType": "application/pdf",
        "contentBytes": "[base64 data]"
      }
    ]
  }
}
```

#### SMTP ile Gönderim
Nodemailer otomatik olarak multipart email oluşturur:
```javascript
{
  attachments: [
    {
      filename: 'document.pdf',
      content: '[base64 data]',
      encoding: 'base64'
    }
  ]
}
```

---

## ✨ Zengin Metin Editörü (Rich Text Editor)

### Özellikler
- ✅ Metin biçimlendirme (Bold, Italic, Underline)
- ✅ Liste oluşturma (Sıralı ve sırasız)
- ✅ Link ekleme
- ✅ Biçimlendirmeyi temizleme
- ✅ HTML output desteği
- ✅ Dark mode uyumlu

### Kullanılabilir Formatlar

#### 1. **Bold (Kalın)** 🔤
- Kısayol: Ctrl/Cmd + B
- Seçili metni kalın yapar

#### 2. *Italic (İtalik)* 🔤
- Kısayol: Ctrl/Cmd + I
- Seçili metni italik yapar

#### 3. <u>Underline (Alt Çizgi)</u> 🔤
- Kısayol: Ctrl/Cmd + U
- Seçili metnin altını çizer

#### 4. Bullet List (Sırasız Liste) •
- Madde işaretli liste oluşturur
```
• Madde 1
• Madde 2
• Madde 3
```

#### 5. Numbered List (Sıralı Liste) 1.
- Numaralı liste oluşturur
```
1. Birinci madde
2. İkinci madde
3. Üçüncü madde
```

#### 6. Link Ekleme 🔗
1. Link eklemek istediğiniz metni seçin
2. 🔗 butonuna tıklayın
3. URL'yi girin
4. Enter'a basın

#### 7. Clear Formatting (Biçimlendirmeyi Temizle) 🧹
- Seçili metindeki tüm biçimlendirmeyi kaldırır
- Plain text'e dönüştürür

### Editör Kullanımı

#### Temel Kullanım
```typescript
<RichTextEditor
  value={htmlContent}
  onChange={setHtmlContent}
  minHeight="200px"
  disabled={false}
/>
```

#### HTML Çıktısı
Editör HTML string olarak çıktı verir:
```html
<p>
  Bu bir <strong>kalın</strong> ve 
  <em>italik</em> metin örneğidir.
</p>
<ul>
  <li>Madde 1</li>
  <li>Madde 2</li>
</ul>
```

### Keyboard Shortcuts
| Komut | Windows/Linux | Mac |
|-------|---------------|-----|
| Bold | Ctrl + B | Cmd + B |
| Italic | Ctrl + I | Cmd + I |
| Underline | Ctrl + U | Cmd + U |

### Stil ve Görünüm
- Modern, temiz arayüz
- Dark mode uyumlu toolbar
- Hover efektleri
- Focus indicator
- Responsive tasarım

---

## 🚀 Hızlı Başlangıç

### Email Yanıtlama İş Akışı

#### 1. Email Seçme
- Mail listesinden bir email seçin
- Email detayları görüntülenir

#### 2. Yanıtlama Modalını Açma
- **"↩️ Yanıtla"** veya **"↪️ Tümünü Yanıtla"** butonuna tıklayın
- Modal açılır

#### 3. Şablon Seçme (Opsiyonel)
- **"📋 Şablon Seç"** butonuna tıklayın
- Hazır şablondan birini seçin
- Şablon editöre yüklenir

#### 4. Mesajı Yazma/Düzenleme
- Zengin metin editörünü kullanarak mesajınızı yazın
- Bold, italic, list gibi formatlama araçlarını kullanın
- Link ekleyin

#### 5. Dosya Ekleme (Opsiyonel)
- **"📎 Dosya Ekle"** butonuna tıklayın
- İstediğiniz dosyaları seçin
- Dosyaları önizleyin

#### 6. Gönderme
- **"📤 Gönder"** butonuna tıklayın
- Email gönderilir
- Başarılı mesajı görüntülenir

---

## 🛠️ Teknik Bilgiler

### Değişiklik Yapılan Dosyalar

#### Frontend
```
src/components/
├── RichTextEditor.tsx          (YENİ)
├── EmailTemplateManager.tsx    (YENİ)
├── AttachmentPicker.tsx        (YENİ)
└── MailList.tsx                (GÜNCELLENDİ)

src/services/
└── mailService.ts              (GÜNCELLENDİ)

src/types/
└── mail.ts                     (GÜNCELLENDİ)
```

#### Backend
```
server/
└── mail-server.cjs             (GÜNCELLENDİ)
```

### API Değişiklikleri

#### SMTP Send Endpoint
```javascript
POST /smtp/send
{
  // ... existing fields
  attachments: [
    {
      name: "document.pdf",
      data: "[base64 string]",
      type: "application/pdf"
    }
  ]
}
```

### Type Definitions

#### EmailTemplate
```typescript
interface EmailTemplate {
  id: string;
  name: string;
  subject?: string;
  body: string;          // HTML content
  createdAt: string;
  updatedAt: string;
}
```

#### EmailAttachmentFile
```typescript
interface EmailAttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string;          // Base64 encoded
}
```

#### SendEmailRequest (Güncellenmiş)
```typescript
interface SendEmailRequest {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  inReplyTo?: string;
  references?: string;
  attachments?: EmailAttachmentFile[];  // YENİ
}
```

#### ReplyEmailRequest (Güncellenmiş)
```typescript
interface ReplyEmailRequest {
  originalMessage: EmailMessage;
  replyText: string;
  replyHtml?: string;
  replyAll?: boolean;
  attachments?: EmailAttachmentFile[];  // YENİ
}
```

---

## 🧪 Test Senaryoları

### Şablon Testi
1. ✅ Yeni şablon oluşturma
2. ✅ Şablon seçme ve kullanma
3. ✅ Şablon düzenleme
4. ✅ Şablon silme
5. ✅ Şablon persistence (localStorage)

### Attachment Testi
1. ✅ Tek dosya ekleme
2. ✅ Çoklu dosya ekleme
3. ✅ Dosya önizleme
4. ✅ Dosya silme
5. ✅ Gmail ile attachment gönderme
6. ✅ Outlook ile attachment gönderme
7. ✅ SMTP ile attachment gönderme

### Rich Text Editor Testi
1. ✅ Bold formatlamayı test et
2. ✅ Italic formatlamayı test et
3. ✅ Underline formatlamayı test et
4. ✅ Bullet list oluştur
5. ✅ Numbered list oluştur
6. ✅ Link ekle
7. ✅ Formatı temizle
8. ✅ HTML çıktısını doğrula

### Entegrasyon Testi
1. ✅ Şablon seç + Rich editor kullan + Attachment ekle
2. ✅ Gmail ile yanıt gönder (HTML + Attachments)
3. ✅ Outlook ile yanıt gönder (HTML + Attachments)
4. ✅ SMTP ile yanıt gönder (HTML + Attachments)

---

## 🐛 Sorun Giderme

### Şablonlar Görünmüyor
- Tarayıcı localStorage'ı kontrol edin
- Console'da hata var mı kontrol edin
- Sayfayı yenileyin (Ctrl/Cmd + R)

### Dosya Eklenmiyor
- Dosya boyutunu kontrol edin (çok büyük olabilir)
- Tarayıcı console'unu kontrol edin
- Farklı bir dosya deneyin

### Rich Text Editor Çalışmıyor
- Tarayıcı compatibility kontrol edin
- `contenteditable` desteği olmalı
- Dark mode ile uyumluluk kontrol edin

### Email Gönderilmiyor
1. **Gmail/Outlook OAuth**:
   - Token'ın geçerli olduğunu kontrol edin
   - Scope'ların doğru olduğunu kontrol edin

2. **SMTP**:
   - Mail server'ın çalıştığını kontrol edin (`http://localhost:5123`)
   - SMTP ayarlarının doğru olduğunu kontrol edin
   - Port ve secure ayarlarını kontrol edin

3. **Attachments**:
   - Dosya boyutunu kontrol edin
   - Base64 encoding'in doğru olduğunu kontrol edin
   - Server loglarını kontrol edin

### Mail Server Hataları
```bash
# Mail server durumunu kontrol et
curl http://localhost:5123

# SMTP test
curl -X POST http://localhost:5123/smtp/send \
  -H "Content-Type: application/json" \
  -d '{"host":"smtp.gmail.com","port":587,"user":"...","pass":"...","from":"...","to":"...","subject":"Test","text":"Test"}'
```

---

## 📊 Performans İpuçları

### Dosya Boyutu Optimizasyonu
- Büyük dosyaları compress edin
- Birden fazla küçük dosya yerine tek ZIP dosyası gönderin
- Resim dosyalarını optimize edin

### Base64 Encoding
- Base64, dosya boyutunu ~33% artırır
- 10MB dosya → ~13.3MB Base64 string
- Büyük dosyalar için alternatif çözümler düşünün

### LocalStorage Limitleri
- Tarayıcılar genellikle 5-10MB localStorage limiti koyar
- Çok sayıda büyük şablon kaydetmeyin
- Düzenli olarak kullanılmayan şablonları silin

---

## 🔮 Gelecek Güncellemeler

### Planlanıyor
- [ ] Şablon export/import özelliği
- [ ] Cloud storage ile attachment paylaşımı
- [ ] Emoji picker
- [ ] Markdown desteği
- [ ] Signature (imza) desteği
- [ ] Taslak kaydetme
- [ ] Email programlama (scheduled send)
- [ ] Inline image desteği
- [ ] Spell check

---

## 📝 Notlar

### Güvenlik
- ⚠️ SMTP şifreleri localStorage'da plain text olarak saklanır
- ⚠️ OAuth token'ları Supabase'de saklanır (daha güvenli)
- ⚠️ Base64 encoding != encryption
- ✅ Gmail/Outlook API'leri SSL/TLS kullanır

### Browser Compatibility
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ IE11 (Desteklenmez)

### Performance
- Orta seviye cihazlarda sorunsuz çalışır
- Çok büyük attachment'lar yavaşlamaya sebep olabilir
- Rich text editor performansı iyidir

---

## 📞 Destek

Sorun yaşarsanız:
1. Browser console'u kontrol edin
2. Network tab'ı kontrol edin
3. Mail server loglarını kontrol edin
4. Bu dokümandaki sorun giderme bölümüne bakın

---

## 🎯 Özet

EchoDay email sistemi artık aşağıdaki özelliklere sahiptir:

✅ **Email Şablonları**: Hızlı yanıt şablonları
✅ **Ek Dosya Desteği**: Çoklu dosya gönderimi
✅ **Zengin Metin Editörü**: HTML formatında email yazma
✅ **Gmail Desteği**: OAuth + API entegrasyonu
✅ **Outlook Desteği**: OAuth + Graph API entegrasyonu
✅ **SMTP Desteği**: Manuel email hesapları

Tüm özellikler tamamen entegre ve çalışır durumdadır. Başarılı kullanımlar! 🚀
