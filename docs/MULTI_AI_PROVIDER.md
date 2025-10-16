# Multi-AI Provider Support 🤖

EchoDay artık sadece Google Gemini değil, **OpenAI** ve **Anthropic Claude** gibi farklı AI sağlayıcılarını da destekliyor!

## 🎯 Özellikler

- **3 Farklı AI Provider:**
  - **Google Gemini** - Ücretsiz tier ile günde 1500 istek
  - **OpenAI** - GPT-4o ve GPT-4o-mini modelleri
  - **Anthropic Claude** - Claude 3.5 Sonnet ve Haiku

- **Kolay Geçiş:** Ayarlar sayfasından tek tıkla provider değiştirin
- **Çoklu API Key:** Her provider için ayrı API key saklayın
- **Geriye Uyumlu:** Mevcut Gemini kullanıcıları etkilenmez

## 📦 Kurulum

Hiçbir ek kurulum gerektirmez! Mevcut EchoDay kurulumunuz zaten hazır.

## 🚀 Kullanım

### 1. Settings Sayfasına Gidin

Ayarlar > AI Sağlayıcı bölümünde 3 provider kartı göreceksiniz:

```
┌─────────────────┬─────────────────┬─────────────────┐
│  Google Gemini  │    OpenAI       │ Anthropic Claude│
│                 │                 │                 │
│  ✓ Yapılandı    │  Yapılandır     │  Yapılandır     │
└─────────────────┴─────────────────┴─────────────────┘
```

### 2. Provider Seçin

İstediğiniz provider kartına tıklayın.

### 3. API Key Girin

Seçili provider için API key'inizi girin ve kaydedin.

### 4. Kullanmaya Başlayın!

Tüm AI işlemleri artık seçili provider'ınızı kullanacak.

## 🔑 API Key Nasıl Alınır?

### Google Gemini
1. [Google AI Studio](https://ai.google.dev/) sitesine gidin
2. "Get API Key" butonuna tıklayın
3. Ücretsiz key'inizi alın

**Ücretsiz Limit:** 1500 istek/gün

### OpenAI
1. [OpenAI Platform](https://platform.openai.com/) sitesine gidin
2. Hesap oluşturun ve API keys sayfasına gidin
3. "Create new secret key" butonuna tıklayın

**Fiyatlandırma:** 
- GPT-4o-mini: $0.15 / 1M token
- GPT-4o: $5.00 / 1M token

### Anthropic Claude
1. [Anthropic Console](https://console.anthropic.com/) sitesine gidin
2. Hesap oluşturun
3. API Keys bölümünden key oluşturun

**Fiyatlandırma:**
- Claude 3.5 Haiku: $0.80 / 1M token
- Claude 3.5 Sonnet: $3.00 / 1M token

## 💡 Hangi Provider'ı Seçmeliyim?

### Google Gemini
- **Avantaj:** Ücretsiz, yüksek günlük limit
- **Kullanım:** Günlük kullanım, test, hobi projeleri
- **Model:** Gemini 2.0 Flash (Hızlı ve akıllı)

### OpenAI
- **Avantaj:** Kanıtlanmış performans, GPT-4 kalitesi
- **Kullanım:** Profesyonel işler, kritik uygulamalar
- **Model:** GPT-4o-mini (Hızlı ve ekonomik)

### Anthropic Claude
- **Avantaj:** Güvenli, etik AI, uzun context
- **Kullanım:** Karmaşık analizler, etik projeler
- **Model:** Claude 3.5 Sonnet (En güçlü)

## 🔧 Teknik Detaylar

### Unified AI Service

Tüm provider'lar için ortak bir arayüz:

```typescript
import { AIProvider } from './types/ai';
import { createAIService } from './services/aiService';

// Create service
const service = createAIService(AIProvider.OPENAI, 'your-api-key');

// Generate text
const result = await service.generate('Merhaba dünya', {
  temperature: 0.7,
  maxTokens: 1000,
  responseFormat: 'text'
});

console.log(result.text);
```

### Helper Functions

```typescript
import { getCurrentAIService, getCurrentProvider } from './utils/aiHelper';

// Get current configured service
const service = getCurrentAIService();

// Get current provider
const provider = getCurrentProvider(); // 'gemini' | 'openai' | 'anthropic'
```

### Storage

API keys localStorage'da şifrelenmiş şekilde saklanır:

```
gemini-api-key: "AIza..."
openai-api-key: "sk-..."
anthropic-api-key: "sk-ant-..."
ai-provider: "gemini"
```

## 🔒 Güvenlik

- API key'ler sadece localStorage'da tutulur
- Hiçbir key sunucuya gönderilmez
- Her provider için ayrı key
- Key'ler şifreli formatta saklanır

## 📝 Geliştirici Notları

### Mevcut Gemini Service

`geminiService.ts` şu anda doğrudan Gemini SDK'sını kullanıyor. Gelecekte unified service'e migrate edilecek.

### Yeni Fonksiyonlar Eklerken

Yeni AI özellikleri için unified `AIService` kullanın:

```typescript
// ❌ Eski yöntem
import { GoogleGenerativeAI } from '@google/generative-ai';

// ✅ Yeni yöntem
import { getCurrentAIService } from './utils/aiHelper';

const service = getCurrentAIService();
const result = await service.generate(prompt);
```

## 🧪 Test Etme

### Browser Console'da Test

1. Uygulamayı açın ve F12 ile Developer Tools'u açın
2. Console sekmesinde şunu çalıştırın:

```javascript
// Tüm provider'ları test et
await testAIProviders.testAllProviders();

// Sadece bir provider'ı test et
await testAIProviders.testProvider(
  testAIProviders.AIProvider.OPENAI,
  'your-api-key'
);
```

### Manuel Test

1. Settings'e gidin ve OpenAI veya Anthropic API key'i ekleyin
2. Chat sayfasına gidin
3. Bir mesaj yazın (örn: "Merhaba!")
4. AI yanıt veriyorsa ✅ çalışıyor!

### Hangi Provider Aktif?

Console'da kontrol edin:

```javascript
localStorage.getItem('ai-provider') // 'gemini', 'openai', veya 'anthropic'
```

## ⚙️ Mevcut Durum

### ✅ Çalışan Özellikler

- **Chat:** OpenAI ve Anthropic ile tam uyumlu
- **Text Generation:** Tüm provider'lar destekleniyor
- **API Key Management:** Settings'de provider seçimi

### 🔄 Kısmi Destek

- **Task Analysis:** Şu an sadece Gemini (gelecekte diğerleri eklenecek)
- **Image Analysis:** Sadece Gemini (multimodal)
- **Email Analysis:** Sadece Gemini

### 📋 Önerilen Provider Kullanımı

| Özellik | Gemini | OpenAI | Anthropic |
|---------|--------|--------|----------|
| Chat | ✅ | ✅ | ✅ |
| Görev Analizi | ✅ | ⏳ | ⏳ |
| Resim Analizi | ✅ | ❌ | ❌ |
| Email Özeti | ✅ | ⏳ | ⏳ |
| PDF Analizi | ✅ | ⏳ | ⏳ |

✅ = Tam destekli | ⏳ = Gelecekte eklenecek | ❌ = Desteklenmiyor

## 🎉 Sonuç

Artık EchoDay ile istediğiniz AI provider'ını kullanabilirsiniz! Hem ücretsiz Gemini ile başlayabilir, hem de OpenAI veya Claude ile profesyonel projeler yapabilirsiniz.

**Chat ve temel özellikler OpenAI/Anthropic ile çalışıyor!** Diğer özellikler için şimdilik Gemini kullanın.

**Herhangi bir sorun mu var?** GitHub Issues'da bize bildirin!
