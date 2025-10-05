# 🚀 GitHub Release Komutları

## 1️⃣ İlk Önce Build Yapın (Yönetici PowerShell'de)

```powershell
# Yönetici PowerShell açın ve şu komutları çalıştırın:
cd "C:\Users\Obuzhukuk\Desktop\sesli-günlük-planlayıcı"
npm run electron:build
```

Build tamamlandıktan sonra `dist-electron` klasöründe `.exe` dosyanız olacak.

---

## 2️⃣ Git Tag Oluşturun

```powershell
# Version tag'i oluşturun
git tag -a v1.0.0 -m "EchoDay v1.0.0 - İlk Sürüm"

# Tag'i GitHub'a gönderin
git push origin v1.0.0
```

---

## 3️⃣ GitHub Web Arayüzünden Release Oluşturun

1. Tarayıcınızda açın: https://github.com/yavuzobuz/EchoDay/releases/new

2. **Tag version seçin:** `v1.0.0` (az önce oluşturduğunuz)

3. **Release title yazın:** `EchoDay v1.0.0 - İlk Sürüm`

4. **Description ekleyin:**

```markdown
## 🎉 EchoDay v1.0.0 - İlk Sürüm

Sesli günlük ve görev planlama uygulaması artık masaüstünde!

### ✨ Özellikler:
- 🎤 Sesli görev ekleme
- 🤖 AI destekli görev analizi (Gemini)
- 📊 Zaman çizelgesi görünümü
- 📝 Günlük notlar
- 🌓 Karanlık/Aydınlık mod
- 🔔 Görev hatırlatıcıları
- 📂 Otomatik arşivleme

### 📥 İndirme ve Kurulum:
1. Aşağıdan işletim sisteminize uygun dosyayı indirin
2. **Windows:** Portable .exe dosyasını çalıştırın (kurulum gerektirmez)
3. İlk açılışta Gemini API anahtarınızı ayarlardan girin

### 🔑 Gemini API Key Alma:
1. https://aistudio.google.com/app/apikey adresine gidin
2. "Create API Key" butonuna tıklayın
3. Anahtarı kopyalayın ve uygulamada Profil > API Anahtarı'na yapıştırın

### 🌐 Web Sürümü:
Tarayıcıda kullanmak için: https://eday1.netlify.app/

---

**Not:** Bu portable bir sürümdür, kurulum gerektirmez.
```

5. **Dosya ekleyin:**
   - "Attach binaries" bölümüne `.exe` dosyasını sürükleyin
   - Dosya yolu: `dist-electron\Sesli Günlük Planlayıcı.exe` (veya benzeri)

6. **"Publish release"** butonuna tıklayın

---

## 4️⃣ Release Doğrulama

Release yayınlandıktan sonra kontrol edin:

```
https://github.com/yavuzobuz/EchoDay/releases/latest
```

Bu link her zaman en son release'i gösterir ve web sitenizden buraya yönlendirme yapıyorsunuz.

---

## 📝 Not

- İlk release için `v1.0.0` kullanın
- Sonraki güncellemeler için: `v1.0.1`, `v1.1.0`, `v2.0.0` vb.
- Portable .exe Windows'da kurulum gerektirmez
- macOS ve Linux sürümleri için başka bir build yapmanız gerekir

---

## 🆘 Sorun Giderme

### Build Hataları:
- PowerShell'i **Yönetici** olarak çalıştırdığınızdan emin olun
- `node_modules` silip `npm install` yapın

### Tag Hataları:
```powershell
# Eğer tag zaten varsa, önce silin
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# Sonra yeniden oluşturun
git tag -a v1.0.0 -m "EchoDay v1.0.0"
git push origin v1.0.0
```

---

**Başarılar!** 🎉
