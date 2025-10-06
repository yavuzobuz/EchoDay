# ARŞİV SİSTEMİ İYİLEŞTİRME PLANI

## 📋 TESPIT EDİLEN SORUNLAR

### 🔴 KRİTİK ÖNCEL İKLİ SORUNLAR

#### 1. BulkAdd Çakışma Hatası
**Sorun**: Aynı ID'ye sahip kayıtlar tekrar eklenmek istendiğinde hata oluşuyor.
```typescript
// Mevcut kod (HATALI)
await db.todos.bulkAdd(todos);
```

**Çözüm**: `bulkPut` kullanarak upsert (update or insert) yapın
```typescript
await db.todos.bulkPut(todos);
```

#### 2. Schema Migration Sorunu
**Sorun**: Version 2'ye geçişte mevcut veriler yeniden indekslenmemiş olabilir.

**Çözüm**: Migration fonksiyonu ekleyin
```typescript
db.version(2).stores({
  todos: 'id, createdAt, text, completed',
  notes: 'id, createdAt, text',
}).upgrade(async trans => {
  // Mevcut verileri güncelle
  const todos = await trans.table('todos').toArray();
  console.log('[Archive] Migrating', todos.length, 'todos to version 2');
  // Herhangi bir veri dönüşümü gerekirse burada yapın
});
```

#### 3. Tarih/Saat Dilimi Tutarsızlığı
**Sorun**: Local time ile UTC karışıyor, yanlış tarih aralıkları kullanılıyor.

**Çözüm**: Tüm tarih işlemlerini UTC'ye normalize edin
```typescript
const getArchivedItemsForDate = async (date: string): Promise<{ todos: Todo[], notes: Note[] }> => {
  // UTC'de gün başı ve sonu
  const startDate = new Date(date + 'T00:00:00.000Z');
  const endDate = new Date(date + 'T23:59:59.999Z');

  const todos = await db.todos
    .where('createdAt')
    .between(startDate.toISOString(), endDate.toISOString(), true, true)
    .toArray();
    
  const notes = await db.notes
    .where('createdAt')
    .between(startDate.toISOString(), endDate.toISOString(), true, true)
    .toArray();
    
  return { todos, notes };
};
```

### 🟡 PERFORMANS İYİLEŞTİRMELERİ

#### 4. Arama Optimizasyonu
**Sorun**: `startsWithIgnoreCase` sadece başlangıç eşleşmesi buluyor, tam metin araması yok.

**Çözüm**: Daha iyi arama algoritması
```typescript
const searchArchive = async (query: string): Promise<{ todos: Todo[], notes: Note[] }> => {
  if (!query.trim()) return { todos: [], notes: [] };

  const lowerCaseQuery = query.toLowerCase();
  
  // Tüm verileri çek ve bellekte filtrele (daha iyi performans için)
  const [allTodos, allNotes] = await Promise.all([
    db.todos.toArray(),
    db.notes.toArray()
  ]);

  const todos = allTodos.filter(t => 
    t.text.toLowerCase().includes(lowerCaseQuery)
  );
  
  const notes = allNotes.filter(n => 
    n.text && n.text.toLowerCase().includes(lowerCaseQuery)
  );

  return { todos, notes };
};
```

**Alternatif**: Lunr.js veya Fuse.js gibi tam metin arama kütüphanesi kullanın.

#### 5. İstatistik Sorgulama Optimizasyonu
**Sorun**: `toArray()` ile tüm veri belleğe yükleniyor.

**Çözüm**: Sadece gerekli alanları çekin ve filtreleme yapın
```typescript
const getDashboardStats = async (currentTodos: Todo[]): Promise<DashboardStats> => {
  try {
    // Sadece completed olanları çek (index kullanarak)
    const completedArchived = await db.todos
      .where('completed')
      .equals(1)
      .toArray();
    
    const currentCompleted = currentTodos.filter(t => t.completed);
    const allCompleted = [...currentCompleted, ...completedArchived];

    // Tarih setini oluştur
    const completionDates = new Set(
      allCompleted.map(t => new Date(t.createdAt).toISOString().split('T')[0])
    );
    
    // ... streak hesaplama ...
    
    return { totalCompleted: allCompleted.length, currentStreak, last7Days };
  } catch (error) {
    console.error("Failed to calculate dashboard stats:", error);
    return { totalCompleted: 0, currentStreak: 0, last7Days: [] };
  }
};
```

### 🔵 VERİ GÜVENLİĞİ İYİLEŞTİRMELERİ

#### 6. Undo İşlemi Hata Yönetimi
**Sorun**: `removeNotes` hatası sessizce yutuluy or, kullanıcı bilgilendirilmiyor.

**Çözüm**: Hataları logla ve kullanıcıya bildir
```typescript
const handleUndo = async () => {
  if (!undoState) return;
  const items = undoState.notes;
  
  if (undoState.type === 'delete') {
    setNotes(prev => [...items, ...prev]);
  } else if (undoState.type === 'archive') {
    try {
      await archiveService.removeNotes(items.map(n => n.id));
      setNotes(prev => [...items, ...prev]);
      setNotification({ message: 'Notlar geri yüklendi', type: 'success' });
    } catch (error) {
      console.error('[Undo] Failed to restore from archive:', error);
      setNotification({ 
        message: 'Notlar arşivden kaldırılamadı. Lütfen tekrar deneyin.', 
        type: 'error' 
      });
      // Yine de UI'da göster ama arka planda arşivde kalsın
      setNotes(prev => [...items, ...prev]);
    }
  }
  
  setUndoState(null);
  if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
};
```

#### 7. Arşivleme İşlemi Hata Yönetimi
**Sorun**: Arşivleme hatası kullanıcıya net bildirilmiyor.

**Çözüm**: Detaylı hata mesajları
```typescript
const archiveItems = async (todos: Todo[], notes: Note[]): Promise<void> => {
  try {
    console.log(`[Archive] Starting archive: ${todos.length} todos, ${notes.length} notes`);
    
    await db.transaction('rw', db.todos, db.notes, async () => {
      if (todos.length > 0) {
        console.log('[Archive] Archiving todos:', todos.map(t => t.text));
        await db.todos.bulkPut(todos); // ✅ bulkAdd yerine bulkPut
        console.log('[Archive] Todos archived successfully');
      }
      if (notes.length > 0) {
        console.log('[Archive] Archiving notes:', notes.map(n => n.text || '(image note)'));
        await db.notes.bulkPut(notes); // ✅ bulkAdd yerine bulkPut
        console.log('[Archive] Notes archived successfully');
      }
    });
    
    console.log(`[Archive] Archive completed: ${todos.length} todos and ${notes.length} notes archived.`);
  } catch (error: any) {
    console.error('[Archive] Failed to archive items:', error);
    console.error('[Archive] Error name:', error?.name);
    console.error('[Archive] Error message:', error?.message);
    console.error('[Archive] Error stack:', error?.stack);
    
    // Kullanıcı dostu hata mesajı
    if (error?.name === 'QuotaExceededError') {
      throw new Error('Depolama alanı doldu. Lütfen eski arşivleri temizleyin.');
    } else {
      throw new Error(`Arşivleme başarısız: ${error?.message || 'Bilinmeyen hata'}`);
    }
  }
};
```

### 🟢 EK ÖZELLİKLER

#### 8. Arşiv Temizleme Fonksiyonu
**Öneri**: Eski arşivleri temizleme özelliği ekleyin
```typescript
const clearOldArchives = async (daysToKeep: number = 90): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();
    
    const deletedTodos = await db.todos
      .where('createdAt')
      .below(cutoffISO)
      .delete();
      
    const deletedNotes = await db.notes
      .where('createdAt')
      .below(cutoffISO)
      .delete();
    
    console.log(`[Archive] Cleared ${deletedTodos + deletedNotes} old items`);
    return deletedTodos + deletedNotes;
  } catch (error) {
    console.error('[Archive] Failed to clear old archives:', error);
    throw error;
  }
};
```

#### 9. Veritabanı Sağlık Kontrolü
**Öneri**: Başlangıçta veritabanı durumunu kontrol edin
```typescript
const checkDatabaseHealth = async (): Promise<{
  isHealthy: boolean;
  itemCount: number;
  size: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let itemCount = 0;
  
  try {
    await db.open();
    
    const [todoCount, noteCount] = await Promise.all([
      db.todos.count(),
      db.notes.count()
    ]);
    
    itemCount = todoCount + noteCount;
    
    // IndexedDB boyutunu tahmin et (her kayıt ~1KB)
    const estimatedSize = itemCount * 1024;
    
    console.log(`[Archive Health] Todos: ${todoCount}, Notes: ${noteCount}`);
    console.log(`[Archive Health] Estimated size: ${(estimatedSize / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      isHealthy: true,
      itemCount,
      size: estimatedSize,
      errors
    };
  } catch (error: any) {
    errors.push(error.message);
    return {
      isHealthy: false,
      itemCount: 0,
      size: 0,
      errors
    };
  }
};
```

#### 10. Export/Import Fonksiyonu
**Öneri**: Arşiv verilerini dışa/içe aktarma
```typescript
const exportArchive = async (): Promise<string> => {
  try {
    const [todos, notes] = await Promise.all([
      db.todos.toArray(),
      db.notes.toArray()
    ]);
    
    const exportData = {
      version: 2,
      exportDate: new Date().toISOString(),
      todos,
      notes
    };
    
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('[Archive] Export failed:', error);
    throw error;
  }
};

const importArchive = async (jsonData: string): Promise<void> => {
  try {
    const data = JSON.parse(jsonData);
    
    if (!data.version || !data.todos || !data.notes) {
      throw new Error('Geçersiz arşiv formatı');
    }
    
    await db.transaction('rw', db.todos, db.notes, async () => {
      await db.todos.bulkPut(data.todos);
      await db.notes.bulkPut(data.notes);
    });
    
    console.log(`[Archive] Imported ${data.todos.length} todos and ${data.notes.length} notes`);
  } catch (error) {
    console.error('[Archive] Import failed:', error);
    throw error;
  }
};
```

## 📝 UYGULAMA PLANI

### Faz 1: Kritik Düzeltmeler (Öncelik: YÜKSEK)
- [ ] `bulkAdd` yerine `bulkPut` kullan
- [ ] Schema migration fonksiyonu ekle
- [ ] Tarih/saat dilimi tutarsızlığını düzelt

### Faz 2: Performans İyileştirmeleri (Öncelik: ORTA)
- [ ] Arama algoritmasını iyileştir
- [ ] İstatistik sorgularını optimize et
- [ ] Gereksiz veri yüklemelerini azalt

### Faz 3: Veri Güvenliği (Öncelik: ORTA)
- [ ] Undo işlemi hata yönetimini iyileştir
- [ ] Arşivleme hata mesajlarını detaylandır
- [ ] Veritabanı sağlık kontrolü ekle

### Faz 4: Ek Özellikler (Öncelik: DÜŞÜK)
- [ ] Arşiv temizleme fonksiyonu
- [ ] Export/Import özelliği
- [ ] Arşiv istatistikleri dashboard'u

## 🧪 TEST SENARYOLARI

1. **Çift Arşivleme Testi**
   - Aynı görevi iki kez arşivle
   - Hata oluşmamalı, sadece bir kayıt olmalı

2. **Zaman Dilimi Testi**
   - Farklı zaman dilimlerinde tarih ara
   - Doğru günün kayıtlarını görmeli

3. **Büyük Veri Testi**
   - 1000+ kayıt arşivle
   - Arama ve istatistikler hızlı çalışmalı

4. **Hata Senaryosu Testi**
   - Disk kotası doluyken arşivle
   - Kullanıcıya anlaşılır hata mesajı göstermeli

5. **Undo Testi**
   - Arşivlenen notu geri al
   - Hem UI'da hem DB'de doğru çalışmalı

## 📚 EK KAYNAKLAR

- [Dexie.js Documentation](https://dexie.org/)
- [IndexedDB Best Practices](https://web.dev/indexeddb-best-practices/)
- [Timezone Handling in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
