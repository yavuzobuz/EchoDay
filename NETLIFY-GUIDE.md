# 🚀 NETLIFY'A DEPLOY REHBERİ

## 📋 İÇİNDEKİLER
1. [Netlify Hesabı Oluşturma](#1-netlify-hesabı-oluşturma)
2. [Projeyi Deploy Etme](#2-projeyi-deploy-etme)
3. [Custom Domain Ekleme](#3-custom-domain-ekleme)
4. [Electron Download Linki](#4-electron-download-linki)
5. [Otomatik Deploy](#5-otomatik-deploy)

---

## 1. NETLIFY HESABI OLUŞTURMA

### Adım 1: Netlify'a Git
🔗 [https://netlify.com](https://netlify.com)

### Adım 2: Sign Up
- **GitHub** ile giriş yap (ÖNERİLEN - otomatik deploy için)
- veya Email ile kayıt ol

### Adım 3: Email Doğrula
- Email adresinize gelen linke tıklayın

✅ Hesabınız hazır!

---

## 2. PROJEYI DEPLOY ETME

### Yöntem A: GitHub ile (Otomatik Deploy - ÖNERİLEN)

#### 1. GitHub'a Push:
```bash
# Tüm değişiklikleri commit et
git add .
git commit -m "feat: Netlify deployment ready"

# GitHub'a push et
git push origin master
```

#### 2. Netlify'da Yeni Site:
1. Netlify Dashboard → **"Add new site"** → **"Import an existing project"**
2. **GitHub** seç
3. Repository'nizi seçin
4. Build ayarları:
   ```
   Build command: npm run build
   Publish directory: dist
   ```
5. **Deploy site** tıklayın

#### 3. Deploy Tamamlandı! 🎉
- URL'niz hazır: `https://random-name-12345.netlify.app`

---

### Yöntem B: Manual Deploy (Drag & Drop)

#### 1. Build Yapın:
```bash
npm run build
```

#### 2. Netlify'a Git:
- Dashboard → **"Add new site"** → **"Deploy manually"**

#### 3. Drag & Drop:
- `dist/` klasörünü sürükleyip bırakın

✅ Deploy edildi!

---

## 3. CUSTOM DOMAIN EKLEME

### Seçenek A: Netlify Subdomain Değiştir

1. Site settings → **Domain management**
2. **Options** → **Edit site name**
3. İsim girin: `sesli-gunluk-planlayici`
4. Yeni URL: `https://sesli-gunluk-planlayici.netlify.app`

### Seçenek B: Kendi Domain'inizi Ekle

#### 1. Domain Satın Alın:
- Namecheap
- GoDaddy
- Cloudflare (ucuz)

#### 2. Netlify'da Domain Ekle:
1. Site settings → **Domain management**
2. **Add custom domain**
3. Domain'inizi girin: `sesligunluk.com`

#### 3. DNS Ayarları:
Netlify size DNS kayıtları verir:

```
A Record:
Name: @
Value: 75.2.60.5

CNAME Record:
Name: www
Value: sesli-gunluk-planlayici.netlify.app
```

#### 4. Domain Provider'da Ayarla:
- Domain ayarlarına git
- DNS Records'a bu kayıtları ekle
- 24-48 saat bekle

✅ Domain aktif!

---

## 4. ELECTRON DOWNLOAD LİNKİ

### GitHub Releases Hazırlama:

#### 1. Electron Build:
```bash
npm run electron:build
```

#### 2. GitHub Release Oluştur:
1. GitHub repo → **Releases** → **Create new release**
2. Tag: `v1.0.0`
3. Title: `Sesli Günlük Planlayıcı v1.0.0`
4. Dosyaları yükle:
   - `dist-electron/` klasöründeki `.exe` dosyası
   - Rename: `Sesli-Gunluk-Planlayici-Setup.exe`

#### 3. Download Link Alın:
```
https://github.com/KULLANICI/REPO/releases/download/v1.0.0/Sesli-Gunluk-Planlayici-Setup.exe
```

### Landing Page Oluştur:

`public/index.html` dosyasını düzenle veya yeni bir `landing.html` oluştur:

```html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sesli Günlük Planlayıcı - AI Destekli Görev Yöneticisi</title>
  <meta name="description" content="Sesli komutlarla görevlerinizi yönetin, AI asistanıyla hayatınızı organize edin">
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    
    /* Hero Section */
    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 100px 20px;
      text-align: center;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    
    .hero h1 {
      font-size: 3.5em;
      margin-bottom: 20px;
      animation: fadeInDown 1s ease-out;
    }
    
    .hero p {
      font-size: 1.5em;
      margin-bottom: 40px;
      opacity: 0.9;
      animation: fadeInUp 1s ease-out 0.3s both;
    }
    
    .cta-buttons {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      justify-content: center;
      animation: fadeInUp 1s ease-out 0.6s both;
    }
    
    .btn {
      padding: 18px 40px;
      font-size: 1.2em;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: all 0.3s ease;
      font-weight: 600;
    }
    
    .btn-primary {
      background: white;
      color: #667eea;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    
    .btn-primary:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0,0,0,0.3);
    }
    
    .btn-secondary {
      background: transparent;
      color: white;
      border: 2px solid white;
    }
    
    .btn-secondary:hover {
      background: white;
      color: #667eea;
    }
    
    .download-info {
      margin-top: 30px;
      font-size: 0.9em;
      opacity: 0.8;
    }
    
    /* Features Section */
    .features {
      padding: 80px 20px;
      background: #f8f9fa;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .section-title {
      text-align: center;
      font-size: 2.5em;
      margin-bottom: 60px;
      color: #333;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 40px;
    }
    
    .feature-card {
      background: white;
      padding: 40px;
      border-radius: 15px;
      text-align: center;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .feature-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    }
    
    .feature-icon {
      font-size: 4em;
      margin-bottom: 20px;
    }
    
    .feature-card h3 {
      font-size: 1.5em;
      margin-bottom: 15px;
      color: #667eea;
    }
    
    .feature-card p {
      color: #666;
      line-height: 1.8;
    }
    
    /* Screenshots Section */
    .screenshots {
      padding: 80px 20px;
      background: white;
    }
    
    .screenshot-container {
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 40px;
    }
    
    .screenshot {
      flex: 1;
      min-width: 300px;
      max-width: 500px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    
    .screenshot img {
      width: 100%;
      height: auto;
      display: block;
    }
    
    /* Download Section */
    .download-section {
      padding: 80px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
    }
    
    .platform-buttons {
      display: flex;
      gap: 30px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 40px;
    }
    
    .platform-btn {
      background: white;
      color: #667eea;
      padding: 30px 40px;
      border-radius: 15px;
      text-decoration: none;
      min-width: 200px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    }
    
    .platform-btn:hover {
      transform: translateY(-10px);
      box-shadow: 0 15px 40px rgba(0,0,0,0.3);
    }
    
    .platform-icon {
      font-size: 3em;
      margin-bottom: 10px;
      display: block;
    }
    
    .platform-name {
      font-size: 1.3em;
      font-weight: 600;
      margin-bottom: 5px;
      display: block;
    }
    
    .platform-size {
      font-size: 0.9em;
      opacity: 0.7;
      display: block;
    }
    
    /* Footer */
    footer {
      background: #2d3748;
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    
    footer a {
      color: #667eea;
      text-decoration: none;
    }
    
    footer a:hover {
      text-decoration: underline;
    }
    
    /* Animations */
    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .hero h1 {
        font-size: 2.5em;
      }
      
      .hero p {
        font-size: 1.2em;
      }
      
      .cta-buttons {
        flex-direction: column;
        width: 100%;
      }
      
      .btn {
        width: 100%;
        max-width: 300px;
      }
    }
  </style>
</head>
<body>
  <!-- Hero Section -->
  <section class="hero">
    <h1>🎤 Sesli Günlük Planlayıcı</h1>
    <p>Sesli komutlarla görevlerinizi yönetin, AI asistanıyla hayatınızı organize edin</p>
    
    <div class="cta-buttons">
      <a href="#download" class="btn btn-primary" id="main-download-btn">
        ⬇️ İndir
      </a>
      <a href="https://github.com/KULLANICI/REPO" class="btn btn-secondary" target="_blank">
        📂 GitHub'da İncele
      </a>
    </div>
    
    <div class="download-info">
      ✨ Windows, macOS ve Linux için tamamen ücretsiz
    </div>
  </section>

  <!-- Features Section -->
  <section class="features">
    <div class="container">
      <h2 class="section-title">✨ Özellikler</h2>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🎤</div>
          <h3>Sesli Komut</h3>
          <p>Görevlerinizi sesle ekleyin ve yönetin. Mikrofona "toplantı ekle" deyin, AI otomatik anlasın ve eklesin.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🤖</div>
          <h3>AI Asistan</h3>
          <p>Google Gemini AI ile akıllı görev analizi. Görevleriniz otomatik olarak kategorize edilir ve önceliklendirilir.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">📝</div>
          <h3>Günlük Not</h3>
          <p>Düşüncelerinizi, fikirlerinizi ve anılarınızı kaydedin. Resim de ekleyebilirsiniz!</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">📅</div>
          <h3>Zaman Çizelgesi</h3>
          <p>Görevlerinizi timeline görünümünde görün. Geçmiş ve gelecek planlarınıza kolayca bakın.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🎨</div>
          <h3>Özelleştirilebilir</h3>
          <p>Mavi, yeşil, kırmızı temalar. Dark/Light mod. Cyberpunk teması da dahil!</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>Gizlilik</h3>
          <p>Tüm verileriniz cihazınızda saklanır. Bulut senkronizasyonu opsiyoneldir.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Download Section -->
  <section class="download-section" id="download">
    <div class="container">
      <h2 class="section-title">📥 Şimdi İndirin</h2>
      <p style="font-size: 1.2em; margin-bottom: 20px;">İşletim sisteminizi seçin</p>
      
      <div class="platform-buttons">
        <a href="https://github.com/KULLANICI/REPO/releases/download/v1.0.0/Sesli-Gunluk-Planlayici-Setup.exe" 
           class="platform-btn" id="windows-download">
          <span class="platform-icon">💻</span>
          <span class="platform-name">Windows</span>
          <span class="platform-size">v1.0.0 | 85 MB</span>
        </a>
        
        <a href="https://github.com/KULLANICI/REPO/releases/download/v1.0.0/Sesli-Gunluk-Planlayici.dmg" 
           class="platform-btn" id="mac-download">
          <span class="platform-icon">🍎</span>
          <span class="platform-name">macOS</span>
          <span class="platform-size">v1.0.0 | 90 MB</span>
        </a>
        
        <a href="https://github.com/KULLANICI/REPO/releases/download/v1.0.0/Sesli-Gunluk-Planlayici.AppImage" 
           class="platform-btn" id="linux-download">
          <span class="platform-icon">🐧</span>
          <span class="platform-name">Linux</span>
          <span class="platform-size">v1.0.0 | 95 MB</span>
        </a>
      </div>
      
      <p style="margin-top: 30px; opacity: 0.8;">
        Sorun mu yaşıyorsunuz? <a href="https://github.com/KULLANICI/REPO/issues" style="color: white; text-decoration: underline;">Bize bildirin</a>
      </p>
    </div>
  </section>

  <!-- Footer -->
  <footer>
    <div class="container">
      <p>&copy; 2025 Sesli Günlük Planlayıcı. MIT License.</p>
      <p style="margin-top: 10px;">
        <a href="https://github.com/KULLANICI/REPO">GitHub</a> | 
        <a href="https://github.com/KULLANICI/REPO/issues">Destek</a> | 
        <a href="#">Gizlilik Politikası</a>
      </p>
    </div>
  </footer>

  <script>
    // OS algılama ve otomatik download butonu
    function detectOS() {
      const platform = window.navigator.platform.toLowerCase();
      const userAgent = window.navigator.userAgent.toLowerCase();
      
      if (platform.includes('win')) return 'windows';
      if (platform.includes('mac')) return 'mac';
      if (platform.includes('linux')) return 'linux';
      
      // Mobile check
      if (/android/.test(userAgent)) return 'android';
      if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
      
      return 'windows'; // default
    }
    
    // Ana download butonunu güncelle
    const os = detectOS();
    const mainBtn = document.getElementById('main-download-btn');
    
    const osNames = {
      'windows': 'Windows',
      'mac': 'macOS',
      'linux': 'Linux',
      'android': 'Android (Web)',
      'ios': 'iOS (Web)'
    };
    
    const osIcons = {
      'windows': '💻',
      'mac': '🍎',
      'linux': '🐧',
      'android': '📱',
      'ios': '📱'
    };
    
    mainBtn.textContent = `${osIcons[os]} ${osNames[os]} için İndir`;
    
    // Download linkini ayarla
    if (os === 'windows') {
      mainBtn.href = document.getElementById('windows-download').href;
    } else if (os === 'mac') {
      mainBtn.href = document.getElementById('mac-download').href;
    } else if (os === 'linux') {
      mainBtn.href = document.getElementById('linux-download').href;
    } else {
      // Mobile için web versiyonuna yönlendir
      mainBtn.href = '/';
      mainBtn.textContent = `${osIcons[os]} Web Versiyonunu Aç`;
    }
    
    // Download tracking (opsiyonel - Google Analytics varsa)
    document.querySelectorAll('.platform-btn, #main-download-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        // Google Analytics event tracking
        if (window.gtag) {
          gtag('event', 'download', {
            'event_category': 'app',
            'event_label': this.textContent.trim()
          });
        }
      });
    });
  </script>
</body>
</html>
```

### Bu HTML'i Kullanmak İçin:

1. **GitHub bilgilerinizi güncelleyin:**
   - `KULLANICI` → GitHub kullanıcı adınız
   - `REPO` → Repository adınız

2. **Dosyayı kaydedin:**
   - Ya `public/landing.html` olarak
   - Ya da mevcut `index.html`'i değiştirin

---

## 5. OTOMATIK DEPLOY

### GitHub ile Otomatik Deploy Aktif!

Her `git push` yaptığınızda:
1. ✅ Netlify otomatik build yapar
2. ✅ Testleri çalıştırır
3. ✅ Deploy eder
4. ✅ Live olur (2-5 dakika)

### Deploy Durumunu Kontrol:

```bash
# Son commit'i push et
git add .
git commit -m "Update landing page"
git push origin master

# Netlify dashboard'da "Deploys" sekmesinden takip et
```

### Build Loglarını Görmek:

1. Netlify Dashboard → Site seçin
2. **Deploys** tab'ı
3. Build'e tıklayın → Logları görebilirsiniz

---

## 🎯 CHECKLIST

Netlify'a deploy etmeden önce:

- [ ] `netlify.toml` dosyası eklendi
- [ ] Landing page oluşturuldu (`public/landing.html` veya `index.html`)
- [ ] GitHub repo'ya push edildi
- [ ] Netlify'da site oluşturuldu
- [ ] Build ayarları doğru
- [ ] GitHub Release hazır (Electron download için)
- [ ] Download linkleri güncellendi
- [ ] Test edildi (https://YOUR-SITE.netlify.app)

---

## 🚀 BONUS: Environment Variables

API key'leri güvenli tutmak için:

1. Netlify Dashboard → Site settings → **Environment variables**
2. **Add variable**:
   ```
   Name: VITE_GEMINI_API_KEY
   Value: your-api-key-here
   ```

3. `vite.config.ts`'de kullan:
   ```typescript
   export default defineConfig({
     define: {
       'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY)
     }
   })
   ```

---

## 💡 İPUÇLARI

### Performance:
- ✅ Build zamanını kısaltmak için cache kullanın
- ✅ `npm ci` yerine `npm install` kullanın build'de
- ✅ Lazy loading kullanın

### SEO:
- ✅ Meta tags ekleyin
- ✅ `sitemap.xml` oluşturun
- ✅ `robots.txt` ekleyin

### Analytics:
- ✅ Netlify Analytics aktif edin (ücretli)
- ✅ veya Google Analytics ekleyin

---

## 📞 YARDIM

Sorun mu var?
- 📚 [Netlify Docs](https://docs.netlify.com)
- 💬 [Netlify Community](https://answers.netlify.com)
- 🐛 [Support](https://www.netlify.com/support/)

---

**Başarılar! 🎉**

Netlify linkinizi paylaşmayı unutmayın! 🚀
