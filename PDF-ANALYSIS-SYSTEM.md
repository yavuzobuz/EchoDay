# 📄 PDF Analiz ve İçerik Çıkarma Sistemi

## 🎯 Genel Bakış

Kullanıcılar herhangi bir PDF belgesini (max 15 sayfa) yükleyebilir, AI belgeden önemli bilgileri çıkarır ve kullanıcı bunları **görev** veya **not** olarak kaydedebilir.

---

## 📋 Kullanım Senaryoları

### Senaryo 1: Avukat - Duruşma Zaptı
**Kullanıcı:** Av. Mehmet
**PDF:** Duruşma Zaptı (3 sayfa)

**Akış:**
1. ➕ "PDF Yükle" butonuna tıklar
2. 📄 Duruşma zaptı PDF'ini seçer
3. 🤖 AI analiz eder ve şunları çıkarır:
   - **Mahkeme:** Ankara 5. Ağır Ceza Mahkemesi
   - **Dosya No:** 2024/123 Esas
   - **Adliye:** Ankara Adalet Sarayı
   - **Duruşma Tarihi:** 15 Kasım 2024, Saat 10:00
   - **Sonraki İşlem:** Tanık dinlemesi
   - **Hazırlanması Gerekenler:** Tanık listesi, delil dosyası

4. 📊 **Analiz Sonuçları Ekranı** açılır:
   ```
   📄 Duruşma Zaptı Analizi
   
   ✅ Tespit Edilen Bilgiler:
   
   [✓] Görev Olarak Ekle:
       📅 Duruşma - 15 Kasım 2024, 10:00
       📍 Ankara 5. Ağır Ceza Mahkemesi
       📂 Dosya: 2024/123 Esas
       🏛️ Adliye: Ankara Adalet Sarayı
       
   [✓] Görev Olarak Ekle:
       📋 Tanık listesi hazırla
       ⏰ Son tarih: 14 Kasım 2024
       
   [✓] Not Olarak Ekle:
       📝 "Önceki duruşmada eksik belgeler talep edildi..."
   ```

5. ✅ Kullanıcı istediği öğeleri seçer → **Kaydet**
6. 🎉 3 görev ve 1 not oluşturulur

---

### Senaryo 2: Muhasebeci - Fatura
**Kullanıcı:** Ahmet
**PDF:** Elektrik Faturası (1 sayfa)

**Akış:**
1. PDF yükler
2. AI analiz eder:
   - **Fatura Türü:** Elektrik
   - **Tutar:** 450 TL
   - **Son Ödeme Tarihi:** 28 Ekim 2024
   - **Müşteri No:** 123456789

3. **Analiz Sonuçları:**
   ```
   💡 Elektrik Faturası Analizi
   
   [✓] Görev Olarak Ekle:
       💰 Elektrik faturası öde - 450 TL
       ⏰ Son tarih: 28 Ekim 2024
       🔢 Müşteri No: 123456789
       
   [✓] Not Olarak Ekle:
       📝 Fatura detayları ve geçmiş tüketim bilgileri
   ```

4. Kullanıcı seçer ve kaydeder

---

### Senaryo 3: Öğrenci - Araştırma Raporu
**Kullanıcı:** Zeynep
**PDF:** Akademik Rapor (12 sayfa)

**Akış:**
1. Raporu yükler
2. AI analiz eder:
   - **Başlık:** "Yapay Zeka ve Hukuk"
   - **Önemli Noktalar:** 5 ana başlık
   - **Kaynaklar:** 15 kaynak
   - **Sonuç:** Özet paragraf

3. **Analiz Sonuçları:**
   ```
   📚 Akademik Rapor Analizi
   
   [✓] Not Olarak Ekle:
       📝 Ana Bulgular (5 madde)
       
   [✓] Not Olarak Ekle:
       📖 Önemli Alıntılar
       
   [✓] Görev Olarak Ekle:
       ✍️ Sunumu hazırla
       ⏰ Önerilen: 3 gün içinde
   ```

---

## 🔄 Sistem Akışı

```
┌─────────────────┐
│  Kullanıcı      │
│  PDF Yükler     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  PDF Validation         │
│  • Max 15 sayfa?        │
│  • Dosya boyutu < 10MB? │
│  • PDF formatı mı?      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  PDF → Base64           │
│  Dönüşüm                │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Gemini AI Analizi      │
│  • İçerik çıkarma       │
│  • Tarih tespiti        │
│  • Kişi/Kurum tespiti   │
│  • Eylem belirleme      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Structured Output      │
│  {                      │
│    tasks: [...],        │
│    notes: [...],        │
│    metadata: {...}      │
│  }                      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Önizleme Modal         │
│  • Tespit edilen öğeler │
│  • Checkbox seçimi      │
│  • Düzenleme imkanı     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Kullanıcı Onayı        │
│  • Görevleri seç        │
│  • Notları seç          │
│  • Düzenle (isteğe bağlı│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Veritabanına Kaydet    │
│  • Görevler listesine   │
│  • Notlar defterine     │
│  • PDF metadata ekle    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Başarı Bildirimi       │
│  "3 görev ve 2 not      │
│   başarıyla eklendi!"   │
└─────────────────────────┘
```

---

## 🏗️ Teknik Mimari

### 1. **Komponentler**

#### `PdfUploadZone.tsx`
```tsx
interface PdfUploadZoneProps {
  onFileSelect: (file: File) => void;
  maxPages?: number;
  maxSizeMB?: number;
}

// Features:
// - Drag & drop area
// - File picker button
// - File validation
// - Progress indicator
// - Error handling
```

#### `PdfAnalysisModal.tsx`
```tsx
interface PdfAnalysisModalProps {
  isOpen: boolean;
  pdfFile: File;
  onComplete: (tasks: Task[], notes: Note[]) => void;
  onCancel: () => void;
}

// Sections:
// 1. PDF Preview (thumbnail)
// 2. AI Analysis Loading
// 3. Results Display
// 4. Selection Checkboxes
// 5. Edit Fields
// 6. Action Buttons
```

#### `PdfResultsSelector.tsx`
```tsx
interface PdfResult {
  type: 'task' | 'note';
  title: string;
  content: string;
  metadata?: TaskMetadata | NoteMetadata;
  selected: boolean;
}

// Features:
// - Checkbox for each item
// - Inline editing
// - Category assignment
// - Date/time pickers for tasks
// - Priority selection
```

---

### 2. **Servisler**

#### `pdfService.ts`
```typescript
export const pdfService = {
  // PDF'i base64'e çevir
  async convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Sayfa sayısını kontrol et (metadata'dan)
  async getPageCount(file: File): Promise<number> {
    // PDF metadata parsing
  },

  // Dosya validasyonu
  validatePdf(file: File, maxPages = 15, maxSizeMB = 10): {
    valid: boolean;
    error?: string;
  } {
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'Sadece PDF dosyaları yüklenebilir' };
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return { valid: false, error: `Dosya boyutu ${maxSizeMB}MB'dan küçük olmalı` };
    }
    return { valid: true };
  }
};
```

#### `geminiService.ts` (Genişletme)
```typescript
interface PdfAnalysisResult {
  summary: string;
  suggestedTasks: Array<{
    title: string;
    description?: string;
    dueDate?: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    metadata?: Record<string, any>;
  }>;
  suggestedNotes: Array<{
    title: string;
    content: string;
    tags?: string[];
  }>;
  entities: {
    dates?: string[];
    people?: string[];
    organizations?: string[];
    locations?: string[];
    amounts?: string[];
  };
  documentType?: string; // 'court_document' | 'invoice' | 'report' | 'contract' | 'other'
}

export async function analyzePdfDocument(
  base64Data: string,
  apiKey: string,
  userPrompt?: string
): Promise<PdfAnalysisResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = userPrompt || `
Bu PDF belgesini analiz et ve şu bilgileri çıkar:

1. **Belge Türü**: Ne tür bir belge (duruşma zaptı, fatura, rapor, sözleşme, vb.)
2. **Önemli Tarihler**: Belgedeki tüm tarih ve saatleri listele
3. **Kişi ve Kurumlar**: Belgedeki kişi ve kurum isimleri
4. **Eylemler**: Kullanıcının yapması gereken işler
5. **Önemli Notlar**: Belgedeki kritik bilgiler

**Çıktı Formatı (JSON):**
{
  "documentType": "court_document",
  "summary": "Kısa özet...",
  "suggestedTasks": [
    {
      "title": "Duruşmaya katıl",
      "description": "Ankara 5. AGM",
      "dueDate": "2024-11-15T10:00:00",
      "category": "Hukuk",
      "priority": "high",
      "metadata": {
        "court": "Ankara 5. Ağır Ceza Mahkemesi",
        "caseNumber": "2024/123",
        "courthouse": "Ankara Adalet Sarayı"
      }
    }
  ],
  "suggestedNotes": [
    {
      "title": "Duruşma Notları",
      "content": "Önceki duruşmada...",
      "tags": ["hukuk", "duruşma"]
    }
  ],
  "entities": {
    "dates": ["2024-11-15 10:00"],
    "people": ["Av. Ahmet Yılmaz"],
    "organizations": ["Ankara 5. AGM"],
    "locations": ["Ankara Adalet Sarayı"]
  }
}
`;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64Data.split(',')[1] // Remove data:application/pdf;base64, prefix
      }
    }
  ]);

  const response = result.response.text();
  // JSON parsing with error handling
  return JSON.parse(response);
}
```

---

### 3. **Veri Yapıları**

#### Task Metadata Extension
```typescript
interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  
  // PDF'den gelen metadata
  pdfSource?: {
    fileName: string;
    uploadedAt: string;
    documentType?: string;
    pageReference?: number;
    extractedData?: Record<string, any>; // Özel alanlar
  };
}

// Örnek: Duruşma metadata
pdfSource: {
  fileName: "durusma_zapti_2024_123.pdf",
  uploadedAt: "2024-10-06T13:40:00Z",
  documentType: "court_document",
  extractedData: {
    court: "Ankara 5. Ağır Ceza Mahkemesi",
    caseNumber: "2024/123 Esas",
    courthouse: "Ankara Adalet Sarayı",
    hearingType: "Tanık dinlemesi"
  }
}
```

#### Note Extension
```typescript
interface Note {
  id: string;
  text: string;
  createdAt: string;
  tags?: string[];
  
  // PDF kaynağı
  pdfSource?: {
    fileName: string;
    uploadedAt: string;
    pageReference?: number;
  };
}
```

---

## 🎨 UI/UX Tasarımı

### Ana Ekranda PDF Upload Butonu
```
┌─────────────────────────────────────┐
│  📱 EchoDay Ana Ekran               │
├─────────────────────────────────────┤
│                                     │
│  [+ Yeni Görev]  [🎤 Sesli]        │
│  [📄 PDF Yükle]  [📝 Not Ekle]    │
│                                     │
└─────────────────────────────────────┘
```

### PDF Upload Modal
```
┌─────────────────────────────────────┐
│  📄 PDF Belgesi Yükle          [✕]  │
├─────────────────────────────────────┤
│                                     │
│   ┌─────────────────────────────┐  │
│   │                             │  │
│   │      📄 Dosya Seç           │  │
│   │   veya buraya sürükle       │  │
│   │                             │  │
│   │   Max: 15 sayfa, 10MB       │  │
│   │                             │  │
│   └─────────────────────────────┘  │
│                                     │
│   ✓ PDF formatı desteklenir         │
│   ✓ AI otomatik analiz yapar        │
│   ✓ Görev ve notları çıkarır        │
│                                     │
└─────────────────────────────────────┘
```

### Analiz Ekranı
```
┌─────────────────────────────────────┐
│  🤖 PDF Analiz Ediliyor...     [✕]  │
├─────────────────────────────────────┤
│                                     │
│  📄 durusma_zapti.pdf               │
│  ⏳ Sayfa 3/3 işleniyor...          │
│                                     │
│  [████████████░░░░░] 75%            │
│                                     │
└─────────────────────────────────────┘
```

### Sonuçlar ve Seçim Ekranı
```
┌─────────────────────────────────────┐
│  ✅ PDF Analizi Tamamlandı     [✕]  │
├─────────────────────────────────────┤
│                                     │
│  📄 durusma_zapti.pdf               │
│  📊 Belge Türü: Duruşma Zaptı       │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  🎯 Görev Önerileri (3)             │
│                                     │
│  [✓] 📅 Duruşmaya katıl             │
│      15 Kasım 2024, 10:00           │
│      📍 Ankara 5. AGM               │
│      [Düzenle]                      │
│                                     │
│  [✓] 📋 Tanık listesi hazırla       │
│      Son tarih: 14 Kas 2024         │
│      [Düzenle]                      │
│                                     │
│  [ ] 📂 Delil dosyası tamamla       │
│      Öncelik: Orta                  │
│      [Düzenle]                      │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  📝 Not Önerileri (2)               │
│                                     │
│  [✓] Duruşma Detayları              │
│      "Önceki duruşmada eksik..."    │
│      [Düzenle]                      │
│                                     │
│  [✓] Mahkeme Bilgileri              │
│      Dosya No: 2024/123 Esas        │
│      [Düzenle]                      │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                     │
│  [İptal]            [Seçilenleri    │
│                      Kaydet (5)] ✓  │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔧 Implementasyon Adımları

### Adım 1: PDF Upload Komponenti
```tsx
// src/components/PdfUploadZone.tsx
```

### Adım 2: Gemini Service Genişletme
```typescript
// src/services/geminiService.ts - analyzePdfDocument()
```

### Adım 3: PDF Analysis Modal
```tsx
// src/components/PdfAnalysisModal.tsx
```

### Adım 4: Ana App Entegrasyonu
```tsx
// src/App.tsx - PDF upload butonu ve state yönetimi
```

### Adım 5: Task/Note Metadata Extension
```typescript
// src/types.ts - pdfSource alanı ekleme
```

---

## 📱 Mobil Optimizasyon

- Touch-friendly file upload (48px minimum)
- Responsive modal design
- Inline editing with mobile keyboard
- Swipe gestures for checkbox toggle
- Bottom sheet style for mobile

---

## ✅ Başarı Kriterleri

1. ✓ PDF yükleme < 3 saniye
2. ✓ AI analiz < 10 saniye (15 sayfa için)
3. ✓ Doğruluk oranı > %85
4. ✓ Kullanıcı düzenleme imkanı
5. ✓ Çoklu görev/not oluşturma
6. ✓ Metadata zenginleştirme

---

## 🎯 Örnek Senaryolar - Test Cases

### Test 1: Duruşma Zaptı
- **Girdi**: 3 sayfalık duruşma zaptı
- **Beklenen Çıktı**: 
  - 1 duruşma görevi (tarih, saat, mahkeme)
  - 2 hazırlık görevi
  - 1 detaylı not

### Test 2: Elektrik Faturası
- **Girdi**: 1 sayfalık fatura
- **Beklenen Çıktı**:
  - 1 ödeme görevi (tutar, son tarih)
  - 1 not (müşteri no, tüketim bilgisi)

### Test 3: İş Sözleşmesi
- **Girdi**: 8 sayfalık sözleşme
- **Beklenen Çıktı**:
  - 3-4 önemli tarih görevi
  - 2-3 detaylı not (maddeler)

### Test 4: Akademik Makale
- **Girdi**: 12 sayfalık araştırma
- **Beklenen Çıktı**:
  - 0-1 görev (varsa deadline)
  - 3-5 not (ana noktalar, alıntılar)

---

**Hazırlayan:** AI Assistant  
**Tarih:** 6 Ekim 2025  
**Versiyon:** 1.0
