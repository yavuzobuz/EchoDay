/**
 * Test Script for Daily Archive Scheduler and AI Analytics
 * 
 * Bu script, otomatik arşivleme ve AI analiz sistemini test eder.
 * 
 * Kullanım:
 * 1. Browser console'unu açın
 * 2. Bu dosyanın içeriğini kopyalayıp yapıştırın
 * 3. Test fonksiyonlarını çalıştırın
 */

// =====================================================
// TEST 1: Scheduler Konfigürasyonu
// =====================================================

console.log('🧪 TEST 1: Scheduler Configuration');
console.log('='.repeat(50));

const config = window.dailyArchiveScheduler?.getConfig();
if (config) {
  console.log('✅ Scheduler başarıyla yüklendi');
  console.log('Config:', config);
  console.log('  - Enabled:', config.enabled);
  console.log('  - Archive Time:', config.archiveTime);
  console.log('  - Archive Completed Only:', config.archiveCompletedOnly);
  console.log('  - AI Analysis:', config.enableAIAnalysis);
} else {
  console.error('❌ Scheduler yüklenemedi! Main.tsx\'de import edildiğinden emin olun.');
}

console.log('\n');

// =====================================================
// TEST 2: Manuel Arşivleme Testi
// =====================================================

async function testManualArchive() {
  console.log('🧪 TEST 2: Manual Archive');
  console.log('='.repeat(50));
  
  try {
    console.log('⏳ Manuel arşivleme başlatılıyor...');
    await window.dailyArchiveScheduler.triggerManualArchive();
    console.log('✅ Manuel arşivleme tamamlandı!');
    console.log('📝 Konsol loglarını kontrol edin.');
  } catch (error) {
    console.error('❌ Arşivleme hatası:', error.message);
    if (error.message.includes('guest')) {
      console.warn('⚠️  Guest mode tespit edildi. Lütfen giriş yapın.');
    }
  }
  
  console.log('\n');
}

// =====================================================
// TEST 3: AI Analytics Testi
// =====================================================

async function testAIAnalytics() {
  console.log('🧪 TEST 3: AI Analytics');
  console.log('='.repeat(50));
  
  // Kullanıcı ID'sini al
  const authData = localStorage.getItem('supabase-auth');
  if (!authData) {
    console.error('❌ Kullanıcı bulunamadı. Lütfen giriş yapın.');
    return;
  }
  
  try {
    const { user } = JSON.parse(authData);
    const userId = user?.id;
    
    if (!userId) {
      console.error('❌ User ID alınamadı.');
      return;
    }
    
    console.log('👤 User ID:', userId);
    
    // Görevleri yükle
    const todosKey = `todos_${userId}`;
    const todosData = localStorage.getItem(todosKey);
    
    if (!todosData) {
      console.warn('⚠️  Görev bulunamadı.');
      return;
    }
    
    const todos = JSON.parse(todosData);
    console.log('📋 Toplam görev:', todos.length);
    
    // Analytics servisi varsa test et
    if (window.taskAnalyticsService) {
      console.log('⏳ Görev desenleri analiz ediliyor...');
      const patterns = await window.taskAnalyticsService.analyzeTaskPatterns(todos, userId);
      console.log('✅ Tespit edilen desenler:', patterns.length);
      patterns.slice(0, 3).forEach(p => {
        console.log(`  - ${p.patternType}: ${p.description} (${(p.confidence * 100).toFixed(0)}% güven)`);
      });
      
      console.log('⏳ Kullanıcı alışkanlıkları öğreniliyor...');
      const habits = await window.taskAnalyticsService.updateUserHabits(todos, userId);
      console.log('✅ Öğrenilen alışkanlıklar:', habits.length);
      habits.forEach(h => {
        console.log(`  - ${h.habitType} (${(h.strength * 100).toFixed(0)}% güç)`);
      });
      
      console.log('⏳ AI içgörüleri oluşturuluyor...');
      const insights = await window.taskAnalyticsService.generateInsights(userId);
      console.log('✅ Oluşturulan içgörüler:', insights.length);
      insights.forEach(i => {
        console.log(`  - [${i.type}] ${i.title}`);
        console.log(`    ${i.description}`);
      });
    } else {
      console.error('❌ taskAnalyticsService yüklenmemiş');
    }
  } catch (error) {
    console.error('❌ Analytics testi hatası:', error);
  }
  
  console.log('\n');
}

// =====================================================
// TEST 4: Config Değiştirme Testi
// =====================================================

function testConfigUpdate() {
  console.log('🧪 TEST 4: Config Update');
  console.log('='.repeat(50));
  
  try {
    const oldConfig = window.dailyArchiveScheduler.getConfig();
    console.log('📋 Eski config:', oldConfig);
    
    // Geçici değişiklik
    console.log('⏳ Config güncelleniyor...');
    window.dailyArchiveScheduler.updateConfig({
      archiveTime: '01:00'
    });
    
    const newConfig = window.dailyArchiveScheduler.getConfig();
    console.log('📋 Yeni config:', newConfig);
    
    if (newConfig.archiveTime === '01:00') {
      console.log('✅ Config güncelleme başarılı!');
    } else {
      console.error('❌ Config güncellenemedi');
    }
    
    // Geri al
    window.dailyArchiveScheduler.updateConfig({
      archiveTime: oldConfig.archiveTime
    });
    console.log('↩️  Config eski haline döndürüldü');
  } catch (error) {
    console.error('❌ Config testi hatası:', error);
  }
  
  console.log('\n');
}

// =====================================================
// TEST 5: LocalStorage Kontrolü
// =====================================================

function testLocalStorage() {
  console.log('🧪 TEST 5: LocalStorage Check');
  console.log('='.repeat(50));
  
  // Scheduler config
  const schedulerConfig = localStorage.getItem('dailyArchiveScheduler_config');
  if (schedulerConfig) {
    console.log('✅ Scheduler config localStorage\'da mevcut');
    console.log(JSON.parse(schedulerConfig));
  } else {
    console.warn('⚠️  Scheduler config localStorage\'da bulunamadı');
  }
  
  // User data
  const authData = localStorage.getItem('supabase-auth');
  if (authData) {
    const { user } = JSON.parse(authData);
    console.log('✅ Kullanıcı oturum açmış:', user?.email);
    
    const userId = user?.id;
    const todosKey = `todos_${userId}`;
    const notesKey = `notes_${userId}`;
    const lastArchiveKey = `lastArchiveDate_${userId}`;
    
    const todosData = localStorage.getItem(todosKey);
    const notesData = localStorage.getItem(notesKey);
    const lastArchive = localStorage.getItem(lastArchiveKey);
    
    if (todosData) {
      const todos = JSON.parse(todosData);
      console.log(`✅ Görevler yüklü: ${todos.length} adet`);
    }
    
    if (notesData) {
      const notes = JSON.parse(notesData);
      console.log(`✅ Notlar yüklü: ${notes.length} adet`);
    }
    
    if (lastArchive) {
      console.log(`✅ Son arşivleme: ${new Date(lastArchive).toLocaleString('tr-TR')}`);
    } else {
      console.log('ℹ️  Henüz arşivleme yapılmamış');
    }
  } else {
    console.warn('⚠️  Kullanıcı giriş yapmamış (Guest mode)');
  }
  
  console.log('\n');
}

// =====================================================
// TEST 6: Supabase Bağlantı Kontrolü
// =====================================================

async function testSupabaseConnection() {
  console.log('🧪 TEST 6: Supabase Connection');
  console.log('='.repeat(50));
  
  if (!window.supa) {
    console.error('❌ Supabase client bulunamadı');
    return;
  }
  
  try {
    console.log('⏳ Supabase bağlantısı test ediliyor...');
    const { data: user, error } = await window.supa.auth.getUser();
    
    if (error) {
      console.error('❌ Auth hatası:', error.message);
      return;
    }
    
    if (!user?.user) {
      console.warn('⚠️  Kullanıcı oturum açmamış');
      return;
    }
    
    console.log('✅ Supabase bağlantısı başarılı');
    console.log('👤 User ID:', user.user.id);
    
    // Tabloları kontrol et
    console.log('⏳ Analytics tabloları kontrol ediliyor...');
    
    const tables = [
      'user_task_patterns',
      'user_habits',
      'analytics_metadata'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await window.supa
          .from(table)
          .select('count')
          .eq('user_id', user.user.id)
          .limit(1);
        
        if (error && error.code === '42P01') {
          console.error(`❌ Tablo bulunamadı: ${table}`);
          console.log('   SQL migration\'ı çalıştırmayı unutmayın!');
        } else if (error) {
          console.error(`❌ ${table} hatası:`, error.message);
        } else {
          console.log(`✅ Tablo mevcut: ${table}`);
        }
      } catch (err) {
        console.error(`❌ ${table} kontrolü başarısız:`, err.message);
      }
    }
  } catch (error) {
    console.error('❌ Supabase test hatası:', error);
  }
  
  console.log('\n');
}

// =====================================================
// TOPLU TEST RUNNER
// =====================================================

async function runAllTests() {
  console.clear();
  console.log('🚀 DAILY ARCHIVE SCHEDULER - TEST SUITE');
  console.log('='.repeat(50));
  console.log('\n');
  
  // Senkron testler
  testLocalStorage();
  testConfigUpdate();
  
  // Asenkron testler
  await testSupabaseConnection();
  await testManualArchive();
  await testAIAnalytics();
  
  console.log('🏁 TÜM TESTLER TAMAMLANDI');
  console.log('='.repeat(50));
  console.log('\n');
  console.log('📝 Sonuçları yukarıda inceleyin.');
  console.log('📚 Daha fazla bilgi: IMPLEMENTATION_GUIDE.md');
}

// =====================================================
// KULLANIM TALİMATLARI
// =====================================================

console.log('\n');
console.log('📚 TESTLERİ ÇALIŞTIRMAK İÇİN:');
console.log('='.repeat(50));
console.log('1. Tüm testler: await runAllTests()');
console.log('2. Manuel arşiv: await testManualArchive()');
console.log('3. AI Analytics: await testAIAnalytics()');
console.log('4. Supabase bağlantı: await testSupabaseConnection()');
console.log('5. LocalStorage: testLocalStorage()');
console.log('6. Config güncelle: testConfigUpdate()');
console.log('\n');

// Export test functions (browser console için)
if (typeof window !== 'undefined') {
  window.schedulerTests = {
    runAll: runAllTests,
    manualArchive: testManualArchive,
    aiAnalytics: testAIAnalytics,
    supabase: testSupabaseConnection,
    localStorage: testLocalStorage,
    configUpdate: testConfigUpdate
  };
  
  console.log('✅ Test fonksiyonları window.schedulerTests üzerinden erişilebilir');
  console.log('Örnek: await window.schedulerTests.runAll()');
}
