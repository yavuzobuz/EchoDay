# EchoDay Release Paketleri

Sürüm: 1.0.0  
Oluşturulma: 2025-10-08

Bu klasör, EchoDay’in Windows (Electron) ve Android (APK) kurulum dosyalarını tek paket halinde içerir.

## İçerik
- Windows/  
  - Sesli Günlük Planlayıcı Setup 1.0.0.exe (Önerilen – kurulum sihirbazı)  
  - Sesli Günlük Planlayıcı 1.0.0.exe (Portable)  
  - EchoDay 1.0.0.exe (Portable)
- Android/  
  - app-debug.apk (Geliştirme/Debug APK)
- CHECKSUMS.txt (SHA256 özetleri)

## Windows Kurulum (Electron)
1) Önerilen: `Windows/` klasöründeki “Sesli Günlük Planlayıcı Setup 1.0.0.exe” dosyasını çalıştırın.  
   - İlk çalıştırmada Windows SmartScreen uyarısı görebilirsiniz (imzasız derleme). “More info” > “Run anyway” ile devam edin.
2) Portable isterseniz, “Sesli Günlük Planlayıcı 1.0.0.exe” veya “EchoDay 1.0.0.exe” dosyalarını doğrudan çalıştırabilirsiniz.

## Android Kurulum (APK)
1) `Android/app-debug.apk` dosyasını telefonunuza aktarın ve açın.  
2) Gerekirse “Bilinmeyen kaynaklara izin ver” ayarını onaylayın.  
3) Uygulamayı açtıktan sonra:
   - Konum tabanlı hatırlatıcılar için “Konum” izni verin.  
   - Arka planda tetik için “Her zaman izin ver (Allow Always)” seçeneğini tercih edin.  
   - Pil optimizasyonu engel olursa (bazı cihazlarda), uygulama için pil optimizasyonunu devre dışı bırakmanız faydalı olacaktır.

Not: Bu APK “debug” imzasıyla derlenmiştir. Geniş dağıtım için “release” keystore ile imzalı bir APK/AAB üretilmesi tavsiye edilir.

## Konum Tabanlı Hatırlatıcılar
- Görev oluştururken veya mevcut görev üzerinde “konum hatırlatıcı” tanımlayabilirsiniz (yarıçap, tetik türü ve konum seçimi).  
- Uygulama açıkken periyodik kontrol yapılır. Android’de arka plan geofencing desteği için sistem izinlerinin verilmiş olması gerekir.

## Doğrulama (SHA256)
- Aynı klasördeki `CHECKSUMS.txt` dosyası, bu paketteki dosyaların SHA256 özetlerini içerir.  
- Dosya bütünlüğünü doğrulamak için:
  - Windows PowerShell: `Get-FileHash -Algorithm SHA256 .\<dosya>`
  - Çıktıdaki hash ile `CHECKSUMS.txt` içeriğini karşılaştırın.

## Geri Bildirim / Notlar
- İlk kurulumlarda izin diyalogları normaldir. Konum/Arka plan izinleri verilmezse konum tabanlı tetikler devreye girmeyebilir.  
- Hatalarla karşılaşırsanız sistem sürümü, cihaz modeli ve adımlar ile birlikte geri bildirim paylaşın.
