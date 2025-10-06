// Timezone Test Utility
// Bu dosya zaman dönüştürmelerinin doğru çalışıp çalışmadığını test eder

console.log('=== Saat Dilimi Test Programı ===\n');

// Mevcut sistem bilgileri
const now = new Date();
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const offsetMinutes = -now.getTimezoneOffset();
const offsetHours = (offsetMinutes / 60).toFixed(1).replace(/\.0$/, '');

console.log('1. SİSTEM BİLGİLERİ:');
console.log(`   - Saat Dilimi: ${tz}`);
console.log(`   - UTC Offset: ${Number(offsetHours) >= 0 ? '+' : ''}${offsetHours} saat`);
console.log(`   - Şu anki UTC zamanı: ${now.toISOString()}`);
console.log(`   - Şu anki yerel zaman: ${now.toLocaleString('tr-TR', { hour12: false, timeZone: tz })}`);
console.log('');

// Test senaryoları
console.log('2. TEST SENARYOLARI:\n');

// Test 1: Yarın saat 15:00
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(15, 0, 0, 0);

console.log('Test 1: "Yarın saat 15:00"');
console.log(`   - Yerel tarih/saat oluşturuldu: ${tomorrow.toLocaleString('tr-TR', { hour12: false, timeZone: tz })}`);
console.log(`   - UTC'ye çevrilmiş: ${tomorrow.toISOString()}`);
console.log(`   - Geri yerel zamana: ${tomorrow.toLocaleString('tr-TR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    timeZone: tz,
    hour12: false
})}`);
console.log('');

// Test 2: Bugün saat 18:30
const today = new Date(now);
today.setHours(18, 30, 0, 0);

console.log('Test 2: "Bugün saat 18:30"');
console.log(`   - Yerel tarih/saat oluşturuldu: ${today.toLocaleString('tr-TR', { hour12: false, timeZone: tz })}`);
console.log(`   - UTC'ye çevrilmiş: ${today.toISOString()}`);
console.log(`   - Geri yerel zamana: ${today.toLocaleString('tr-TR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    timeZone: tz,
    hour12: false
})}`);
console.log('');

// Test 3: UTC string'den yerel zamana
const utcString = '2025-10-07T12:00:00.000Z';
const fromUTC = new Date(utcString);

console.log('Test 3: UTC string\'den yerel zamana dönüşüm');
console.log(`   - UTC string: ${utcString}`);
console.log(`   - JavaScript Date objesi: ${fromUTC.toISOString()}`);
console.log(`   - Yerel zamana: ${fromUTC.toLocaleString('tr-TR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    timeZone: tz,
    hour12: false
})}`);
console.log(`   - Beklenen: 7 Eki 2025 15:00 (UTC+3 için 12:00 + 3 = 15:00)`);
console.log('');

// Test 4: Manuel UTC hesaplama
console.log('Test 4: Manuel dönüşüm doğrulama');
console.log(`   - Yerel saat: 15:00`);
console.log(`   - UTC offset: ${offsetHours} saat`);
console.log(`   - UTC'ye çevrilmiş: 15:00 - ${offsetHours} = ${15 - Number(offsetHours)}:00`);
console.log(`   - AI'ya verilecek format: YYYY-MM-DDTHH:mm:00.000Z`);
console.log('');

console.log('3. SORUN TESPITI:');
console.log('   Eğer görevinizdeki saat yanlış görünüyorsa:');
console.log('   - AI analizi sonucu UTC formatında doğru mu kayıt ediliyor?');
console.log('   - TodoItem.tsx\'te gösterimde timeZone parametresi kullanılıyor mu?');
console.log('   - Tarayıcı ve sistem saat dilimleri aynı mı?');
console.log('');

console.log('4. ÖNERİLEN ÇÖZÜM:');
console.log('   ✅ TodoItem.tsx güncellendi - timeZone parametresi eklendi');
console.log('   ✅ geminiService.ts güncellendi - AI prompt\'u geliştirildi');
console.log('   📝 Test için: Yeni bir görev ekleyin: "Yarın saat 15:00 toplantı"');
console.log('   📝 Görev listesinde "15:00" görünmeli (yerel saat)');
