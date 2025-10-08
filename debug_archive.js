// EchoDay Arşiv Debug Script
// Browser console'a yapıştırın ve çalıştırın

console.log("🔍 EchoDay Arşiv Debug Başlatılıyor...");

// Supabase kontrol
if (window.supabase) {
  console.log("✅ Supabase aktif");
  
  // Kullanıcı ID'si al
  const userId = localStorage.getItem('sb-sdtntnqcdyjhzlhgbofp-auth-token');
  if (userId) {
    const userData = JSON.parse(userId);
    const userIdValue = userData?.user?.id;
    console.log("👤 User ID:", userIdValue);
    
    // Arşivlenen notları kontrol et
    window.supabase.from('archived_notes')
      .select('*')
      .eq('user_id', userIdValue)
      .then(({ data, error }) => {
        if (error) {
          console.error("❌ Supabase archived_notes hatası:", error);
        } else {
          console.log("📝 Arşivlenen notlar:", data?.length || 0);
          if (data?.length > 0) {
            console.table(data.map(n => ({
              id: n.id,
              text: n.text?.substring(0, 50) + "...",
              created_at: n.created_at,
              archived_at: n.archived_at
            })));
          }
        }
      });
    
    // Arşivlenen todoları kontrol et  
    window.supabase.from('archived_todos')
      .select('*')
      .eq('user_id', userIdValue)
      .then(({ data, error }) => {
        if (error) {
          console.error("❌ Supabase archived_todos hatası:", error);
        } else {
          console.log("✅ Arşivlenen görevler:", data?.length || 0);
          if (data?.length > 0) {
            console.table(data.map(t => ({
              id: t.id,
              text: t.text?.substring(0, 50) + "...",
              created_at: t.created_at,
              archived_at: t.archived_at
            })));
          }
        }
      });
  }
} else {
  console.log("⚠️ Supabase bulunamadı, IndexedDB kontrol ediliyor...");
  
  // IndexedDB kontrol
  if ('indexedDB' in window) {
    const request = indexedDB.open('SmartTodoArchive');
    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log("✅ IndexedDB açıldı");
      
      // Notes tablosunu kontrol et
      const notesTransaction = db.transaction(['notes'], 'readonly');
      const notesStore = notesTransaction.objectStore('notes');
      const notesRequest = notesStore.getAll();
      
      notesRequest.onsuccess = () => {
        console.log("📝 Arşivlenen notlar (IndexedDB):", notesRequest.result?.length || 0);
        if (notesRequest.result?.length > 0) {
          console.table(notesRequest.result.map(n => ({
            id: n.id,
            text: n.text?.substring(0, 50) + "...",
            createdAt: n.createdAt,
            userId: n.userId
          })));
        }
      };
      
      // Todos tablosunu kontrol et
      const todosTransaction = db.transaction(['todos'], 'readonly');
      const todosStore = todosTransaction.objectStore('todos');
      const todosRequest = todosStore.getAll();
      
      todosRequest.onsuccess = () => {
        console.log("✅ Arşivlenen görevler (IndexedDB):", todosRequest.result?.length || 0);
        if (todosRequest.result?.length > 0) {
          console.table(todosRequest.result.map(t => ({
            id: t.id,
            text: t.text?.substring(0, 50) + "...",
            createdAt: t.createdAt,
            userId: t.userId
          })));
        }
      };
    };
    
    request.onerror = () => {
      console.error("❌ IndexedDB açılamadı:", request.error);
    };
  } else {
    console.error("❌ IndexedDB desteklenmiyor");
  }
}

console.log("📋 Test tamamlandı. Sonuçları yukarıda görebilirsiniz.");
console.log("💡 Eğer arşivlenen notlar görünmüyorsa, bugünkü tarihi seçin veya 'Tümü' filtresini kullanın.");