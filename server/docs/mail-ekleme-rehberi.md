# Mail Ekleme Rehberi (IMAP/POP3)

Bu rehber, EchoDay projesinde e-posta hesabı ekleyip mailleri görüntülemek için kullanılan Mail Bridge servisinin (server/mail-server.cjs) nasıl çalıştığını ve nasıl kullanılacağını adım adım anlatır. Bu sürüm okuma/önizleme odaklıdır (IMAP/POP3). İleride SMTP ile “gönderme” desteği ayrıca eklenebilir.

Ana fikir: İstemci (web/mobile) doğrudan mail sağlayıcınıza bağlanmaz. Bunun yerine küçük bir HTTP köprüsüne (Mail Bridge) JSON istekleri gönderir; köprü IMAP/POP üzerinden mailleri çeker ve güvenli bir yanıt döner.

---

Mimari görünüm

<svg width="760" height="200" viewBox="0 0 760 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mail akış diyagramı">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L6,3 z" fill="#1f2937" />
    </marker>
  </defs>
  <!-- Boxes -->
  <rect x="30" y="50" width="220" height="70" rx="10" fill="#e6f4ff" stroke="#1f2937" />
  <text x="140" y="85" text-anchor="middle" font-size="14" fill="#111827">İstemci (EchoDay)</text>

  <rect x="270" y="50" width="220" height="70" rx="10" fill="#ecfdf5" stroke="#065f46" />
  <text x="380" y="75" text-anchor="middle" font-size="14" fill="#064e3b">Mail Bridge (HTTP)</text>
  <text x="380" y="95" text-anchor="middle" font-size="12" fill="#065f46">Varsayılan: http://localhost:5123</text>

  <rect x="510" y="50" width="220" height="70" rx="10" fill="#fff7ed" stroke="#9a3412" />
  <text x="620" y="75" text-anchor="middle" font-size="14" fill="#7c2d12">IMAP/POP Sunucusu</text>
  <text x="620" y="95" text-anchor="middle" font-size="12" fill="#9a3412">(Gmail, Yandex, Kurumsal vs.)</text>

  <!-- Arrows -->
  <line x1="250" y1="85" x2="270" y2="85" stroke="#1f2937" stroke-width="2" marker-end="url(#arrow)" />
  <text x="260" y="75" text-anchor="middle" font-size="12" fill="#374151">JSON/HTTPS</text>

  <line x1="490" y1="85" x2="510" y2="85" stroke="#1f2937" stroke-width="2" marker-end="url(#arrow)" />
  <text x="500" y="75" text-anchor="middle" font-size="12" fill="#374151">IMAPS/POP3S</text>
</svg>

---

Hızlı başlangıç (geliştirici)

1) Mail Bridge’i yerel olarak çalıştırın:
- Windows PowerShell

```powershell path=null start=null
# Proje kökünden
Set-Location server
npm install
npm start   # http://localhost:5123
```

2) İstemci uygulamada bridge adresini ayarlayın:
- Örnek (Vite tabanlı web):

```bash path=null start=null
# Geliştirme için
VITE_MAIL_BRIDGE_URL=http://localhost:5123
```

Üretime alma için server/DEPLOY.md dosyasındaki Docker/Render örneklerini izleyin. Canlıda HTTPS zorunludur.

---

IMAP ile “mail ekleme” (hesap bağlama) akışı

1) Bağlantıyı test edin

```bash path=null start=null
curl -X POST "${VITE_MAIL_BRIDGE_URL}/imap/test" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "{{IMAP_HOST}}",
    "port": 993,
    "secure": true,
    "user": "{{IMAP_USER}}",
    "pass": "{{IMAP_PASS}}"
  }'
```

- Başarılı yanıt:
```json path=null start=null
{ "success": true, "data": { "ok": true } }
```
- Hata durumunda success=false ve açıklama döner.

2) Son mailleri listeleyin

```bash path=null start=null
curl -X POST "${VITE_MAIL_BRIDGE_URL}/imap/list" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "{{IMAP_HOST}}",
    "port": 993,
    "secure": true,
    "user": "{{IMAP_USER}}",
    "pass": "{{IMAP_PASS}}",
    "mailbox": "INBOX",
    "limit": 20
  }'
```

- Örnek yanıt (kısaltılmış):
```json path=null start=null
{
  "success": true,
  "data": [
    {
      "id": "1234",
      "subject": "Hoş geldiniz",
      "from": { "address": "noreply@example.com", "name": "Example" },
      "to": [{ "address": "you@example.com", "name": ""}],
      "date": "2025-10-08T21:35:00.000Z",
      "snippet": "",
      "isRead": false,
      "hasAttachments": true
    }
  ]
}
```

3) Mesaj detayını çekin (HTML + inline görseller)

```bash path=null start=null
curl -X POST "${VITE_MAIL_BRIDGE_URL}/imap/message" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "{{IMAP_HOST}}",
    "port": 993,
    "secure": true,
    "user": "{{IMAP_USER}}",
    "pass": "{{IMAP_PASS}}",
    "mailbox": "INBOX",
    "uid": 1234
  }'
```

- Örnek yanıt (kısaltılmış):
```json path=null start=null
{
  "success": true,
  "data": {
    "bodyHtml": "<html>...inline img src=\"data:image/png;base64,...\" ...</html>",
    "attachments": [
      { "filename": "logo.png", "mimeType": "image/png", "size": 12345, "inline": true }
    ]
  }
}
```

Notlar
- bodyHtml içindeki cid: referansları otomatik olarak data URL’lerine dönüştürülür; bu sayede içerik çevrimdışı da görüntülenebilir.
- İsimler UID üzerinden gelir; IMAP tarafında kalıcı kimlik budur.

---

POP3 ile “mail ekleme” (alternatif)

1) Bağlantıyı test edin

```bash path=null start=null
curl -X POST "${VITE_MAIL_BRIDGE_URL}/pop/test" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "{{POP_HOST}}",
    "port": 995,
    "secure": true,
    "user": "{{POP_USER}}",
    "pass": "{{POP_PASS}}"
  }'
```

2) Son mesaj başlıklarını listeleyin

```bash path=null start=null
curl -X POST "${VITE_MAIL_BRIDGE_URL}/pop/list" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "{{POP_HOST}}",
    "port": 995,
    "secure": true,
    "user": "{{POP_USER}}",
    "pass": "{{POP_PASS}}",
    "limit": 20
  }'
```

---

İstek sırası diyagramı

<svg width="760" height="240" viewBox="0 0 760 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="İstek sırası">
  <defs>
    <marker id="arrow2" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L6,3 z" fill="#111827" />
    </marker>
  </defs>
  <!-- Swimlanes -->
  <text x="80" y="25" text-anchor="middle" font-size="12">İstemci</text>
  <text x="380" y="25" text-anchor="middle" font-size="12">Mail Bridge</text>
  <text x="680" y="25" text-anchor="middle" font-size="12">IMAP/POP</text>
  <line x1="80" y1="30" x2="80" y2="220" stroke="#d1d5db"/>
  <line x1="380" y1="30" x2="380" y2="220" stroke="#d1d5db"/>
  <line x1="680" y1="30" x2="680" y2="220" stroke="#d1d5db"/>

  <!-- Steps -->
  <line x1="80" y1="60" x2="380" y2="60" stroke="#111827" marker-end="url(#arrow2)"/>
  <text x="230" y="50" text-anchor="middle" font-size="12">POST /imap/test</text>

  <line x1="380" y1="80" x2="680" y2="80" stroke="#111827" marker-end="url(#arrow2)"/>
  <text x="530" y="70" text-anchor="middle" font-size="12">IMAP bağlan/çık</text>

  <line x1="80" y1="120" x2="380" y2="120" stroke="#111827" marker-end="url(#arrow2)"/>
  <text x="230" y="110" text-anchor="middle" font-size="12">POST /imap/list</text>

  <line x1="380" y1="140" x2="680" y2="140" stroke="#111827" marker-end="url(#arrow2)"/>
  <text x="530" y="130" text-anchor="middle" font-size="12">Mailbox kilitle + fetch</text>

  <line x1="80" y1="180" x2="380" y2="180" stroke="#111827" marker-end="url(#arrow2)"/>
  <text x="230" y="170" text-anchor="middle" font-size="12">POST /imap/message</text>

  <line x1="380" y1="200" x2="680" y2="200" stroke="#111827" marker-end="url(#arrow2)"/>
  <text x="530" y="190" text-anchor="middle" font-size="12">Mesaj indir + cid→dataURL</text>
</svg>

---

Güvenlik ve en iyi uygulamalar

- Her zaman HTTPS kullanın. Yerelde test tamamlandıktan sonra canlıya alırken TLS zorunlu.
- Köprü hizmetini herkese açık yapacaksanız, ek bir doğrulama (ör. API anahtarı veya oturum JWT kontrolü) koyun.
- CORS’u prod’da daraltın (mail-server.cjs içinde şu an dev için gevşek).
- Kullanıcı kimlik bilgilerini asla loglarda düz metin tutmayın; istemci tarafında güvenle saklayın (örn. OS secure storage).
- Sağlayıcı bağımlı ayarlar (Gmail için App Password, kurumsal IMAP için güvenilen IP vs.) gerekebilir.

---

Üretime alma (özet)

- Docker/Render ile hızlı kurulum için: server/DEPLOY.md dosyasını izleyin.
- Canlı URL’nizi istemci .env içine yazın: VITE_MAIL_BRIDGE_URL=https://mailbridge.sizinalanadiniz.com

---

Sık karşılaşılan hatalar

- IMAP auth hatası: Kullanıcı/şifre, 2FA, App Password ya da “less secure apps” ayarlarını kontrol edin.
- Port/secure uyumsuzluğu: IMAP genelde 993+TLS, POP3 genelde 995+TLS.
- HTML gövde boş: Bazı plain-text maillerde parsed.html olmayabilir; parsed.textAsHtml kullanımı devrede.
- Ekler görünmüyor: hasAttachments=false ise gövde yapısında ek yok demektir; inline görseller data URL’e çevrilir.

---

Uç noktaların özeti

- GET / → "Mail bridge is running"
- POST /imap/test → IMAP bağlantı testi
- POST /imap/list → Mesaj listesi (envelope/özet)
- POST /imap/message → Mesajın HTML gövdesi + inline ekler
- POST /pop/test → POP3 bağlantı testi
- POST /pop/list → POP3 başlık listesi (TOP)

---

İstemci örnekleri

- fetch ile test (IMAP):
```js path=null start=null
const base = process.env.VITE_MAIL_BRIDGE_URL || 'http://localhost:5123';
const body = {
  host: '{{IMAP_HOST}}', port: 993, secure: true,
  user: '{{IMAP_USER}}', pass: '{{IMAP_PASS}}'
};
fetch(`${base}/imap/test`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
}).then(r => r.json()).then(console.log);
```

- Listeleme (IMAP):
```js path=null start=null
fetch(`${base}/imap/list`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...body, mailbox: 'INBOX', limit: 20 })
}).then(r => r.json()).then(console.log);
```

- Mesaj detayı (IMAP):
```js path=null start=null
fetch(`${base}/imap/message`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...body, mailbox: 'INBOX', uid: 1234 })
}).then(r => r.json()).then(data => {
  const html = data?.data?.bodyHtml || '';
  document.getElementById('viewer').innerHTML = html;
});
```

—

Geri bildirim

Bu rehberi ihtiyaçlarınıza göre genişletebilirim (ör. SMTP ile gönderim, OAuth2 ile Gmail/Outlook entegrasyonu, ek indirme/ileri yönlendirme). İstediğiniz ekleri belirtin.
