# 📱 EchoDay Mobil Test Rehberi

## 🚀 Hızlı Başlangıç

### 1. Geliştirme Sunucusunu Başlatın

Aşağıdaki komutlardan birini kullanın:

```bash
# Sadece mobil test için
npm run dev:mobile

# Veya network erişimi ile
npm run dev:network

# Veya standart geliştirme
npm run dev
```

### 2. IP Adresinizi Öğrenin

Bilgisayarınızın yerel ağ IP adresi: **192.168.0.20**

### 3. Mobil Cihazınızdan Erişin

Mobil cihazınızın tarayıcısında şu adresi açın:
```
http://192.168.0.20:5173
```

## 🔧 Ayarlar ve Yapılandırma

### Vite Konfigürasyonu
✅ `vite.config.ts` zaten mobil test için yapılandırılmış
```typescript
server: {
  host: '0.0.0.0',  // Tüm ağ arayüzlerinden erişime izin ver
  port: 5173        // Port numarası
}
```

### Package.json Scripts
✅ Mobil test script'leri eklendi:
- `dev:mobile` - Explicit mobil geliştirme
- `dev:network` - Ağ erişimli geliştirme
- `dev` - Standart geliştirme (zaten network destekli)

## 🛠️ Troubleshooting

### Bağlantı Sorunu Çözümleri

#### 1. Firewall Kontrolü
Windows Defender Firewall'da Node.js için izin verilmiş olmalı. Eğer bağlantı sorunu yaşıyorsanız:

1. **Windows Güvenliği** > **Güvenlik Duvarı ve ağ koruması**
2. **Bir uygulamaya güvenlik duvarından izin ver**
3. **Node.js** veya **Vite** için izin ekleyin

#### 2. Manuel Firewall Kuralı Ekleme
PowerShell'i yönetici olarak çalıştırın:

```powershell
# Gelen bağlantılar için kural ekle
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow

# Giden bağlantılar için kural ekle  
New-NetFirewallRule -DisplayName "Vite Dev Server Out" -Direction Outbound -Protocol TCP -LocalPort 5173 -Action Allow
```

#### 3. Alternatif IP Kontrol
Eğer 192.168.0.20 çalışmıyorsa, alternatif IP'leri deneyin:

```bash
# Windows'ta tüm IP adreslerini görün
ipconfig

# veya detaylı bilgi için
ipconfig /all
```

#### 4. Router Ayarları
- Mobil cihazınızın aynı WiFi ağında olduğundan emin olun
- Router'da AP isolation (misafir ağı izolasyonu) kapalı olmalı

### Yaygın Sorunlar ve Çözümleri

| Sorun | Çözüm |
|-------|-------|
| "Site erişilemez" hatası | Firewall kurallarını kontrol edin |
| Sayfa yüklenmiyor | IP adresini ve port'u kontrol edin (192.168.0.20:5173) |
| Yavaş yükleme | WiFi bağlantı kalitesini kontrol edin |
| Responsive sorunları | Chrome DevTools Mobile görünümünde de test edin |

## 📲 Mobil Test Kontrol Listesi

### ✅ Temel İşlevsellik
- [ ] Giriş/Çıkış işlemleri
- [ ] Görev ekleme/düzenleme/silme
- [ ] Not ekleme/düzenleme/silme
- [ ] Arşiv görüntüleme ve yönetimi

### ✅ Responsive Tasarım
- [ ] Menü navigasyonu (hamburger menü)
- [ ] Touch-friendly butonlar ve kontroller
- [ ] Mobil optimized modal'lar
- [ ] Swipe gesture'ları

### ✅ Performans
- [ ] Sayfa yükleme hızı
- [ ] Smooth scroll ve animasyonlar
- [ ] Touch response süresi
- [ ] Memory usage

### ✅ Mobil-Specific Features
- [ ] Touch gesture'lar (swipe, pinch, tap)
- [ ] Virtual keyboard uyumluluğu
- [ ] Portrait/Landscape orientations
- [ ] Mobile browser compatibility (Chrome, Safari, Firefox)

## 🔍 Debug İpuçları

### Browser Developer Tools
1. Chrome Mobile'da: **⋮** > **More tools** > **Developer tools**
2. Safari'de: **Settings** > **Safari** > **Advanced** > **Web Inspector**

### Console Logs
Geliştirme sırasında mobil console'da hataları görmek için:
```javascript
// Mobil debugger için
console.log('Mobile debug:', window.innerWidth, 'x', window.innerHeight);
```

### Network Monitoring
- **Chrome DevTools** > **Network** tab
- Yavaş bağlantıları simüle edin
- Resource loading sürelerini kontrol edin

## 🚨 Önemli Notlar

1. **HTTPS Gereklilikleri**: Bazı modern web API'leri (kamera, mikrofon, konum) HTTPS gerektirir
2. **Local Network**: Bu yöntem sadece yerel ağ içinde çalışır
3. **Performance**: Development server production'dan daha yavaş olabilir
4. **Hot Reload**: Mobil cihazlarda da hot reload çalışır

## 🌐 Production Testing

Gerçek production test için:

1. Build alın: `npm run build`
2. Preview server başlatın: `npm run preview`
3. Mobil cihazdan `http://192.168.0.20:4173` adresine gidin

---

## 📞 Destek

Sorunlarla karşılaştığınızda:
1. Konsol hatalarını kontrol edin
2. Network bağlantısını test edin: `ping 192.168.0.20`
3. Port'un açık olduğunu kontrol edin: `telnet 192.168.0.20 5173`

**İyi testler!** 🎉