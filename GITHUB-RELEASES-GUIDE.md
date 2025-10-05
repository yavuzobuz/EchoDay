# 🚀 GitHub Releases - Electron Uygulama Yükleme Kılavuzu

## 📋 Gerekli Linkler

### Ana Repo
- **Repo URL:** https://github.com/yavuzobuz/EchoDay

### Releases Sayfaları
- **Tüm Releases:** https://github.com/yavuzobuz/EchoDay/releases
- **Yeni Release Oluştur:** https://github.com/yavuzobuz/EchoDay/releases/new
- **En Son Release:** https://github.com/yavuzobuz/EchoDay/releases/latest

---

## 🛠️ Adım Adım Yükleme

### 1️⃣ Electron Uygulamasını Build Edin

Terminal'de şu komutu çalıştırın:

```bash
npm run electron:build
```

Bu komut `dist-electron` klasöründe şu dosyaları oluşturur:
- **Windows:** `EchoDay-Setup-X.X.X.exe`
- **macOS:** `EchoDay-X.X.X.dmg`
- **Linux:** `EchoDay-X.X.X.AppImage`

### 2️⃣ Değişiklikleri GitHub'a Push Edin

```bash
git add .
git commit -m "Release v1.0.0 hazırlığı"
git push origin main
```

### 3️⃣ GitHub'da Release Oluşturun

1. **GitHub Releases sayfasına gidin:**
   - https://github.com/yavuzobuz/EchoDay/releases/new

2. **Tag version oluşturun:**
   - Örnek: `v1.0.0`, `v1.0.1`, `v2.0.0` gibi

3. **Release başlığı ekleyin:**
   - Örnek: "EchoDay v1.0.0 - İlk Sürüm"

4. **Açıklama yazın:**
   ```markdown
   ## 🎉 EchoDay v1.0.0 - İlk Sürüm
   
   ### ✨ Özellikler:
   - Sesli görev ekleme
   - AI destekli görev analizi
   - Zaman çizelgesi görünümü
   - Günlük notlar
   - Karanlık mod desteği
   
   ### 📥 İndirme:
   Aşağıdan işletim sisteminize uygun dosyayı indirin:
   - **Windows:** EchoDay-Setup-X.X.X.exe
   - **macOS:** EchoDay-X.X.X.dmg
   - **Linux:** EchoDay-X.X.X.AppImage
   
   ### 📝 Kurulum:
   1. Yukarıdaki dosyayı indirin
   2. Installer'ı çalıştırın
   3. Kurulum tamamlandıktan sonra EchoDay'i açın
   ```

5. **Installer dosyalarını ekleyin:**
   - "Attach binaries" bölümüne tıklayın
   - `dist-electron` klasöründen build edilmiş dosyaları sürükleyip bırakın:
     - `EchoDay-Setup-X.X.X.exe` (Windows)
     - `EchoDay-X.X.X.dmg` (macOS)
     - `EchoDay-X.X.X.AppImage` (Linux)

6. **Release'i yayınlayın:**
   - "Publish release" butonuna tıklayın

---

## 🌐 Netlify Sitenize Entegrasyon

Release yayınlandıktan sonra, Netlify sitenizdeki butonu güncellemeniz gerekmez. 

Zaten bu linke yönlendiriyor:
```
https://github.com/yavuzobuz/EchoDay/releases/latest
```

Bu link **her zaman en son release'i** gösterir!

---

## 🔄 Otomatik Güncelleme (Opsiyonel)

Electron uygulamanızın otomatik güncellenmesi için `electron-builder` otomatik update özelliği kullanılabilir.

### electron-builder.json5 dosyasına ekleyin:

```json
{
  "publish": {
    "provider": "github",
    "owner": "yavuzobuz",
    "repo": "EchoDay"
  }
}
```

---

## 📊 İndirme İstatistikleri

Release sayfanızda kaç kişinin indirdiğini görebilirsiniz:
- https://github.com/yavuzobuz/EchoDay/releases

---

## ⚠️ Önemli Notlar

1. **İlk release için tag:** `v1.0.0` kullanın
2. **Sonraki versiyonlar:** `v1.0.1`, `v1.1.0`, `v2.0.0` şeklinde artırın
3. **Pre-release:** Beta sürümler için "This is a pre-release" kutucuğunu işaretleyin
4. **Dosya boyutları:** GitHub her dosya için 2GB limiti var (yeterli olacaktır)

---

## 🎯 Hızlı Komutlar

```bash
# Build yap
npm run electron:build

# Git'e ekle
git add .
git commit -m "Release v1.0.0"
git push

# Sonra GitHub web arayüzünden release oluştur
```

---

## 📞 Yardım

Sorun yaşarsanız:
- GitHub Issues: https://github.com/yavuzobuz/EchoDay/issues
- GitHub Docs: https://docs.github.com/en/repositories/releasing-projects-on-github

---

**Başarılar!** 🚀
