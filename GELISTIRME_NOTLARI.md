# EchoDay Geliştirme Notları

Tarih: 2025-10-08

## iOS (Geofencing + Bildirimler) — TODO

Amaç: iOS’ta arka planda konum tabanlı hatırlatıcıların (geofencing) ve yerel bildirimlerin sorunsuz çalışması.

Önkoşullar:
- Apple Developer hesabı
- iOS imzalama dosyaları: .p12 sertifikası ve .mobileprovision profili

Platform Kurulumu (Mac üzerinde):
1) iOS platformunu ekle ve senkronize et
- `npx cap add ios`
- `npx cap sync ios`
- `npx cap open ios` (Xcode’u açar)

2) Info.plist İzinleri
- Xcode’da `ios/App/App/Info.plist` içine aşağıdaki anahtarları ekleyin (değer metinlerini ihtiyacınıza göre düzenleyin):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Yakınınızdaki görev hatırlatıcılarını sunabilmek için konumunuza, uygulama kullanılırken erişmemiz gerekiyor.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Arka planda konum hatırlatıcıları için konumunuza erişim gerekiyor.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Arka planda konum hatırlatıcıları için gereklidir.</string>

<key>UIBackgroundModes</key>
<array>
  <string>location</string>
</array>
```

3) Background Modes (Capabilities)
- Xcode > Target > Signing & Capabilities > “Background Modes” ekleyin
- “Location updates” kutusunu işaretleyin

4) İzin Akışı (iOS)
- “When In Use” izni genellikle ilk olarak istenir.
- Geofencing için “Always” izni gerekir; kullanıcı OS ayarlarından sonradan “Always” olarak güncelleyebilir.

5) Test Önerisi (iOS gerçek cihaz)
- Görev için konum hatırlatıcısını etkinleştirip küçük yarıçap (100–200m) seçin.
- Uygulama arka plandayken hedef bölgeye yaklaşınca bildirim gelmelidir.

## macOS Olmadan IPA Üretimi (CI/CD)

Windows üzerinde iOS derlemesi yapılamadığından bulutta macOS runner kullanan bir CI önerisi:

GitHub Actions (macos-latest):
- Secrets (opsiyonel, imzalı IPA için):
  - `P12_BASE64`: .p12 sertifikanın base64’ü
  - `P12_PASSWORD`: .p12 parolası
  - `PROVISIONING_PROFILE_BASE64`: .mobileprovision dosyasının base64’ü
- İş akışı özet akış:
  1) Node kurulumu ve web build (vite)
  2) `npx cap add ios` ve `npx cap sync ios`
  3) Info.plist patch (konum ve background izinleri)
  4) CocoaPods kurulumu ve `pod install`
  5) `xcodebuild` ile archive ve (Secrets varsa) IPA export

Örnek workflow taslağı (repo kökünde `.github/workflows/ios-build.yml`):

```yaml
name: ios-build

on:
  workflow_dispatch:

jobs:
  build-ios:
    runs-on: macos-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install deps
        run: npm ci

      - name: Build web
        run: npm run build

      - name: Add iOS platform (idempotent)
        run: npx cap add ios || true

      - name: Sync Capacitor iOS
        run: npx cap sync ios

      - name: Patch Info.plist for location permissions
        run: |
          INFO_PLIST="ios/App/App/Info.plist"
          /usr/libexec/PlistBuddy -c "Set :NSLocationWhenInUseUsageDescription 'Yakınınızdaki görev hatırlatıcılarını sunabilmek için konumunuza, uygulama kullanılırken erişmemiz gerekiyor.'" "$INFO_PLIST" || \
          /usr/libexec/PlistBuddy -c "Add :NSLocationWhenInUseUsageDescription string 'Yakınınızdaki görev hatırlatıcılarını sunabilmek için konumunuza, uygulama kullanılırken erişmemiz gerekiyor.'" "$INFO_PLIST"
          /usr/libexec/PlistBuddy -c "Set :NSLocationAlwaysAndWhenInUseUsageDescription 'Arka planda konum hatırlatıcıları için konumunuza erişim gerekiyor.'" "$INFO_PLIST" || \
          /usr/libexec/PlistBuddy -c "Add :NSLocationAlwaysAndWhenInUseUsageDescription string 'Arka planda konum hatırlatıcıları için konumunuza erişim gerekiyor.'" "$INFO_PLIST"
          /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes array" "$INFO_PLIST" || true
          /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes:0 string location" "$INFO_PLIST" || true

      - name: Install CocoaPods
        run: sudo gem install cocoapods

      - name: Pod install
        run: |
          cd ios/App
          pod install

      - name: Optional signing setup (only if secrets exist)
        if: ${{ secrets.P12_BASE64 && secrets.PROVISIONING_PROFILE_BASE64 }}
        env:
          P12_BASE64: ${{ secrets.P12_BASE64 }}
          P12_PASSWORD: ${{ secrets.P12_PASSWORD }}
          PROVISIONING_PROFILE_BASE64: ${{ secrets.PROVISIONING_PROFILE_BASE64 }}
        run: |
          echo "$P12_BASE64" | base64 --decode > signing.p12
          echo "$PROVISIONING_PROFILE_BASE64" | base64 --decode > profile.mobileprovision
          security create-keychain -p "" build.keychain
          security import signing.p12 -k ~/Library/Keychains/build.keychain -P "$P12_PASSWORD" -T /usr/bin/codesign
          security list-keychains -s ~/Library/Keychains/build.keychain
          security default-keychain -s ~/Library/Keychains/build.keychain
          security unlock-keychain -p "" ~/Library/Keychains/build.keychain
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          UUID=$(/usr/libexec/PlistBuddy -c 'Print :UUID' /dev/stdin <<< $(/usr/bin/security cms -D -i profile.mobileprovision))
          cp profile.mobileprovision ~/Library/MobileDevice/Provisioning\ Profiles/$UUID.mobileprovision

      - name: Build archive
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -sdk iphoneos -archivePath $PWD/build/App.xcarchive clean archive

      - name: Export IPA (if signing)
        if: ${{ secrets.P12_BASE64 && secrets.PROVISIONING_PROFILE_BASE64 }}
        run: |
          cd ios/App
          cat > ExportOptions.plist <<EOF
          <?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
            <key>method</key>
            <string>ad-hoc</string>
            <key>compileBitcode</key>
            <false/>
            <key>signingStyle</key>
            <string>manual</string>
            <key>stripSwiftSymbols</key>
            <true/>
            <key>destination</key>
            <string>export</string>
          </dict>
          </plist>
          EOF
          xcodebuild -exportArchive -archivePath $PWD/build/App.xcarchive -exportOptionsPlist ExportOptions.plist -exportPath $PWD/build/export

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ios-output
          path: |
            ios/App/build/App.xcarchive
            ios/App/build/export/*.ipa
```

Alternatifler:
- Ionic Appflow: GitHub repo bağla, iOS build seç; imzalama dosyalarını portala yükle; IPA üret
- Codemagic: Capacitor şablonuyla benzer akış ve imzalama yönetimi

---

## Android / Kod Durumu (bilgi notu)
- Yerel bildirim (mobil): `@capacitor/local-notifications@6` eklendi ve senkronize edildi.
- Veri modeli: `Todo.locationReminder?: { lat; lng; radius; trigger; enabled; lastTriggeredAt }` alanı eklendi.
- UI: Görev ekleme modalinde konum hatırlatıcı seçeneği ve mevcut görevlerde `GeoReminderModal` ile düzenleme.
- Foreground konum kontrolü: `useGeoReminders` her 3 dakikada bir konumu kontrol ederek yakın görevler için bildirim üretir.
- Geofence servis sarmalayıcı: `geofenceService` (cordova-plugin-geofence varsa gerçek, yoksa no-op).
- Android Manifest: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `RECEIVE_BOOT_COMPLETED` eklendi.

## Açık İşler / Sonraki Adımlar
- iOS Info.plist ve Background Modes eklenmesi (CI üzerinden otomatik patch uygulanabilir).
- iOS imzalama entegrasyonu (GitHub Secrets ile), IPA üretimi ve cihazda test.
- Konum hatırlatıcıları için harita tabanlı seçim (opsiyonel UX iyileştirmesi).
