import { WebhookConfig, WebhookPayload, WebhookResponse, WebhookType, WebhookTemplate } from '../types/webhook';

class WebhookService {
  private webhooks: Map<string, WebhookConfig> = new Map();

  // Webhook şablonları
  private templates: WebhookTemplate[] = [
    {
      type: 'slack',
      name: 'Slack',
      description: 'Takım kanalına bildirim gönder',
      icon: '💬',
      briefing: 'Slack, dünya çapında milyonlarca kişinin kullandığı bir takım iletişim platformudur. EchoDay görevlerinizi otomatik olarak Slack kanallarınıza bildirerek takımınızı her zaman bilgilendirebilirsiniz.',
      useCases: [
        'Tamamlanan görevleri takım kanalına bildir',
        'Günlük özeti her sabah paylaş',
        'Önemli hatirlaticiları bildir',
        'Proje ilerlemesini güncel tut'
      ],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      zapierConfig: { needsCustomization: true, basePrompt: 'Kullanıcı Slack\'te bildirim almak istiyor. Ne tür bildirimler istiyorsun? (ör: Görev tamamlandığında, yeni görev eklendiğinde, günlük özet)' },
      setupInstructions: [
        '1. 🚀 ZAPIER İLE KOLAY KURULUM: https://zapier.com/apps/slack/integrations',
        '2. "Create Zap" butonuna tıklayın',
        '3. Trigger: "Webhooks by Zapier" -> "Catch Hook" seçin',
        '4. Zapier size webhook URL verecek - kopyalayın',
        '5. Action: "Slack" -> "Send Channel Message" seçin',
        '6. Slack hesabınıza bağlanın ve kanal seçin',
        '7. Mesaj formatını ayarlayın ve webhook URL\'i aşağıya yapıştırın',
        '———',
        'VEYA DİREKT WEBHOOK (Daha Hızlı): https://api.slack.com/messaging/webhooks üzerinden',
        'Slack workspace ayarlarından "Incoming Webhooks" ekleyin'
      ],
      exampleUrl: 'https://hooks.slack.com/services/T{workspace}/B{channel}/XXXXXXXXXXXXXXXXXXXXXXXX'
    },
    {
      type: 'discord',
      name: 'Discord',
      description: 'Discord sunucuna mesaj gönder',
      icon: '🎮',
      briefing: 'Discord, oyuncular ve topluluklar için popüler bir sohbet platformudur. Görevlerinizi Discord sunucunuza otomatik olarak göndererek topluluğunuzu bilgilendirebilirsiniz.',
      useCases: [
        'Proje güncellemelerini toplulukla paylaş',
        'Tamamlanan görevleri duyur',
        'Haftalık raporları otomatik paylaş',
        'Takım koordinasyonunu kolaylaştır'
      ],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. Discord uygulamasını açın ve webhook eklemek istediğiniz sunucuya gidin',
        '2. Bildirim göndermek istediğiniz kanalın yanındaki dişli çark (ayarlar) ikonuna tıklayın',
        '3. Sol menüden "Integrations" (Entegrasyonlar) sekmesini bulun ve tıklayın',
        '4. "Webhooks" bölümünü bulun ve "New Webhook" (Yeni Webhook) butonuna tıklayın',
        '5. Webhook\'a bir isim verin (isteğe bağlı olarak profil resmi ekleyebilirsiniz)',
        '6. "Copy Webhook URL" butonuna tıklayarak URL\'i panoya kopyalayın',
        '7. Kopyaladığınız URL\'i aşağıdaki "Webhook URL" alanına yapıştırın'
      ],
      exampleUrl: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'
    },
    {
      type: 'telegram',
      name: 'Telegram',
      description: 'Telegram bot ile mesaj gönder',
      icon: '✈️',
      briefing: 'Telegram, hızlı ve güvenli bir mesajlaşma uygulamasıdır. Kendi botınızı oluşturarak EchoDay bildirimlerini doğrudan Telegram\'a alabilirsiniz.',
      useCases: [
        'Kişisel hatirlaticiları telefona gönder',
        'Günlük özeti sabah oku',
        'Acil görevleri aninda bildir',
        'Mobil bildirim sistemi kur'
      ],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. Telegram uygulamasını açın ve arama kutusuna "BotFather" yazın',
        '2. Mavi tikli resmi BotFather hesabını bulun ve sohbeti açın',
        '3. Sohbet kutusuna "/newbot" yazıp gönderin (slash işaretini unutmayın)',
        '4. BotFather size bot adı soracak - istediğiniz isme yazabilirsiniz (ör: "EchoDay Bildirici")',
        '5. Sonra kullanıcı adı soracak - mutlaka "bot" ile bitmelidir (ör: "echoday_notifier_bot")',
        '6. BotFather size uzun bir token verecek (ör: 123456:ABC-DEF...) - bu token\'i kopyalayın',
        '7. Kendi sohbetinizden bot\'a mesaj gönderip chat_id almanız gerekecek (detay için: https://t.me/username_to_id_bot)'
      ],
      exampleUrl: 'https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage'
    },
    {
      type: 'teams',
      name: 'Microsoft Teams',
      description: 'Teams kanalına bildirim gönder',
      icon: '👥',
      briefing: 'Microsoft Teams, kurumsal takımlar için güçlü bir iş birliği platformudur. EchoDay görevlerinizi Teams kanallarınıza otomatik olarak göndererek takımınızı senkronize tutun.',
      useCases: ['Kurumsal proje güncellemeleri', 'Toplantı hatırlatmaları', 'Takım performans raporları', 'İş akışı bildirimler'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. Microsoft Teams uygulamasını açın ve webhook eklemek istediğiniz kanalı bulun',
        '2. Kanal adının yanındaki üç nokta (...) menüsüne tıklayın',
        '3. Açılan menüden "Connectors" (Bağlayıcılar) seçeneğini bulun ve tıklayın',
        '4. Arama kutusuna "Incoming Webhook" yazın ve bulunan sonuçta "Configure" (Yapılandır) butonuna tıklayın',
        '5. Webhook\'a anlamıflı bir isim verin (isteğe bağlı: bir resim de yükleyebilirsiniz)',
        '6. "Create" (Oluştur) butonuna tıklayın - ekranda uzun bir URL göreceksiniz',
        '7. Görünen URL\'i kopyalayın ve "Done" (Tamam) butonuna basın'
      ],
      exampleUrl: 'https://outlook.office.com/webhook/xxx/IncomingWebhook/xxx'
    },
    {
      type: 'zapier',
      name: 'Zapier',
      description: '5000+ uygulama ile entegrasyon',
      icon: '⚡',
      briefing: 'Zapier, 5000\'den fazla uygulamayı birbirine bağlayan güçlü bir otomasyon platformudur. EchoDay görevlerinizi Gmail, Sheets, CRM ve daha fazlasıyla entegre edin.',
      useCases: [
        'Tamamlanan görevleri Google Sheets\'e ekle',
        'Yeni görevi Gmail ile paylaş',
        'CRM\'e otomatik görev aktar',
        'Binlerce farklı uygulama ile entegre ol'
      ],
      defaultSettings: { retryCount: 2, timeout: 10000, includeDetails: true },
      setupInstructions: [
        '1. Tarayıcınızda https://zapier.com/app/zaps adresini açın (hesabınız yoksa ücretsiz kayıt olun)',
        '2. Sağ üstteki turuncu "Create Zap" (Zap Oluştur) butonuna tıklayın',
        '3. "Trigger" (Tetikleyici) bölümünde arama yaparak "Webhooks by Zapier" bulun ve seçin',
        '4. Event tipi olarak "Catch Hook" seçeneğini işaretleyin ve "Continue" (Devam) deyin',
        '5. Zapier size özel bir webhook URL verecek - bu URL\'i kopyalayın',
        '6. "Action" (Eylem) kısmında EchoDay verilerini göndermek istediğiniz uygulamayı seçin (Gmail, Sheets, vb.)',
        '7. Kopyaladığınız webhook URL\'ini aşağıdaki alana yapıştırın'
      ],
      exampleUrl: 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID/YOUR_HOOK_KEY/'
    },
    {
      type: 'make',
      name: 'Make (Integromat)',
      description: 'Görsel otomasyon platformu',
      icon: '🧩',
      briefing: 'Make (eski adıyla Integromat), sürükle-bırak arayüzü ile karmaşık otomasyon senaryoları oluşturmanızı sağlar. EchoDay verilerinizi görsel workflow\' larla işleyin.',
      useCases: ['Karmaşık iş akışları oluştur', 'Çoklu uygulama entegrasyonu', 'Veri dönüştürme ve işleme', 'Şartlı otomasyon senaryoları'],
      defaultSettings: { retryCount: 2, timeout: 10000, includeDetails: true },
      setupInstructions: [
        '1. Tarayıcınızda https://www.make.com/en/login adresini açın ve hesabınıza giriş yapın',
        '2. Ana sayfada "Create a new scenario" (Yeni Senaryo Oluştur) butonuna tıklayın',
        '3. Boş canvas üzerindeki artı (+) işaretine tıklayın',
        '4. Modül arama kutusuna "Webhooks" yazın ve Webhooks modülünü seçin',
        '5. "Custom webhook" (Custom mailhook) seçeneğini işaretleyin',
        '6. "Add" butonuna tıklayarak yeni bir webhook oluşturun, size özel bir URL gösterilecek',
        '7. Bu URL\'i kopyalayıp aşağıdaki alana yapıştırın'
      ],
      exampleUrl: 'https://hook.eu1.make.com/YOUR_HOOK_ID'
    },
    {
      type: 'notion',
      name: 'Notion',
      description: 'Notion veritabanına otomatik ekle',
      icon: '📑',
      briefing: 'Notion, not alma, proje yönetimi ve bilgi tabanları için all-in-one bir çalışma alanıdır. EchoDay görevlerinizi otomatik olarak Notion veritabanınıza aktarın.',
      useCases: ['Görev veritabanı oluştur', 'Proje dokumantasyonu güncelle', 'Haftalık raporları arşivle', 'Bilgi tabanlarını zenginleştir'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. Tarayıcınızda https://www.notion.so/my-integrations adresini açın',
        '2. "+ New integration" (Yeni Entegrasyon) butonuna tıklayın',
        '3. Integration\'a anlamıflı bir isim verin (isteğe bağlı: logo yükleyebilirsiniz)',
        '4. Hangi workspace\'te çalışacağını seçin ve "Submit" (Gönder) butonuna basın',
        '5. Sayfada görünen "Internal Integration Token" alanındaki token\'i kopyalayın (sadece bir kez görünür!)',
        '6. Notion\'da kullanmak istediğiniz veritabanı/sayfayı açın, sağ üstten "..." -> "Add connections" -> Integration\'nızı seçin',
        '7. Token\'i aşağıdaki alana yapıştırın (URL: https://api.notion.com/v1/pages)'
      ],
      exampleUrl: 'https://api.notion.com/v1/pages'
    },
    {
      type: 'trello',
      name: 'Trello',
      description: 'Trello kartlarına otomatik ekle',
      icon: '📋',
      briefing: 'Trello, Kanban tabanlı popüler bir proje yönetim aracıdır. EchoDay görevlerinizi Trello kartları olarak otomatik oluşturun ve iş akışınızı görselleştirin.',
      useCases: ['Görevleri Trello kartı olarak ekle', 'Sprint planlarını güncelle', 'Takım panosunu senkronize et', 'Proje ilerlemesini takip et'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. Tarayıcınızda https://trello.com/power-ups/admin adresini açın',
        '2. "New" (Yeni) butonuna tıklayarak yeni bir Power-Up oluşturun',
        '3. Power-Up\'a bir isim verin (basit bir isim yeterli)',
        '4. https://trello.com/app-key adresine giderek API Key\'inizi görün (sayfada "Your API Key" yazısının altında)',
        '5. Aynı sayfada "Token" linkine tıklayarak yetkilendirme yapın ve Token alın',
        '6. URL formatı: https://api.trello.com/1/cards?key=SIZIN_KEY&token=SIZIN_TOKEN',
        '7. Yukarıdaki URL\'i kendi Key ve Token\'iniz ile değiştirerek aşağıya yapıştırın'
      ],
      exampleUrl: 'https://api.trello.com/1/cards'
    },
    {
      type: 'asana',
      name: 'Asana',
      description: 'Asana projelerine görev ekle',
      icon: '✔️',
      briefing: 'Asana, kurumsal takımlar için güçlü bir proje ve görev yönetim platformudur. EchoDay görevlerinizi Asana projelerine otomatik olarak aktararak merkezi bir sistem oluşturun.',
      useCases: ['Görevleri Asana\'ya senkronize et', 'Proje milestone\' larını güncelle', 'Takım üyelerine görev ata', 'Rapor ve analiz için veri topla'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. Tarayıcınızda https://app.asana.com/0/my-apps adresini açın (Asana hesabınıza giriş yapın)',
        '2. "Personal access tokens" bölümünü bulun',
        '3. "+ Create new token" (Yeni Token Oluştur) butonuna tıklayın',
        '4. Token\'a anlamıflı bir isim verin (ör: "EchoDay Integration")',
        '5. "Create token" butonuna basın - ekranda uzun bir token görünür (DİKKAT: sadece bir kez gösterilir!)',
        '6. Görünen tokenı hemen kopyalayın ve güvenli bir yere kaydedin',
        '7. Aşağıdaki URL alanına şunu yazın: https://app.asana.com/api/1.0/tasks (Not: Token\'i sonraki adımda ekleyeceksiniz)'
      ],
      exampleUrl: 'https://app.asana.com/api/1.0/tasks'
    },
    {
      type: 'n8n',
      name: 'n8n',
      description: 'Self-hosted workflow automation',
      icon: '🤖',
      briefing: 'n8n, açık kaynaklı ve self-hosted bir otomasyon aracıdır. Kendi sunucunuzda çalıştırarak tam kontrol sağlayın ve EchoDay\' i 200+ hizmetle entegre edin.',
      useCases: ['Özel sunucuda otomasyon', 'Gizlilik odaklı entegrasyonlar', 'Karmaşık workflow\' lar', 'Maliyet etkin çözüm'],
      defaultSettings: { retryCount: 2, timeout: 10000, includeDetails: true },
      setupInstructions: [
        '1. Kendi n8n sunucunuzu tarayıcıda açın (isteğe bağlı: cloud.n8n.io kullanabilirsiniz)',
        '2. Ana sayfada "+ New Workflow" (Yeni İş Akışı) butonuna tıklayın',
        '3. Sol taraftaki node listesinden "Webhook" node\'unu sürükleyip canvas\'a bırakın',
        '4. Webhook node\'una tıklayın, sağ panelde "Webhook URL" göreceksiniz',
        '5. "Copy URL" butonuna basarak URL\'i kopyalayın',
        '6. Sağ üstten workflow\'u "Active" (Aktif) yapın (toggle butonu)',
        '7. Kopyaladığınız URL\'i aşağıdaki alana yapıştırın'
      ],
      exampleUrl: 'https://your-n8n-instance.com/webhook/your-webhook-id'
    },
    {
      type: 'pabbly',
      name: 'Pabbly Connect',
      description: 'Otomasyon ve entegrasyon platformu',
      icon: '🔗',
      briefing: 'Pabbly Connect, uygun fiyatlı ve kullanıcı dostu bir otomasyon platformudur. Sınırsız workflow ile EchoDay verilerinizi diğer uygulamalarla entegre edin.',
      useCases: ['Bütçe dostu otomasyon', 'Çoklu uygulama bağlantısı', 'E-posta pazarlama entegrasyonu', 'CRM ve satış otomasyonu'],
      defaultSettings: { retryCount: 2, timeout: 10000, includeDetails: true },
      setupInstructions: [
        '1. Tarayıcınızda https://www.pabbly.com/connect/ adresini açın ve hesabınıza giriş yapın',
        '2. "Create Workflow" (Yeni İş Akışı) butonuna tıklayın',
        '3. Workflow\'a anlamıflı bir isim verin ve kaydedin',
        '4. "Trigger" bölümünde "Webhook" seçeneğini bulun ve tıklayın',
        '5. "Webhook URL" kısmından size özel oluşturulan URL\'i kopyalayın',
        '6. "Action" kısmında verilerinizi göndermek istediğiniz uygulamayı seçin ve yapılandırın',
        '7. Kopyaladığınız webhook URL\'ini aşağıdaki alana yapıştırın'
      ],
      exampleUrl: 'https://connect.pabbly.com/workflow/sendwebhookdata/xxx'
    },
    {
      type: 'google-chat',
      name: 'Google Chat',
      description: 'Google Chat odalarına mesaj',
      icon: '🗨️',
      briefing: 'Google Chat, Google Workspace\'in entegre mesajlaşma çözümüdür. Gmail, Calendar ve Drive ile entegre çalışan bir ortamda EchoDay bildirimlerini alın.',
      useCases: ['Workspace takımlarına bildirim', 'Google ekosistemi entegrasyonu', 'Kurumsal iletişim', 'Proje odalarına güncellemeler'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. Google Chat uygulamasını açın veya chat.google.com adresine gidin',
        '2. Webhook eklemek istediğiniz odaya (space) gidin',
        '3. Oda adının yanındaki üç nokta (...) menüsünü tıklayın',
        '4. "Apps & integrations" (Uygulamalar ve Entegrasyonlar) seçeneğini bulun',
        '5. "Webhooks" sekmesine geçin ve "Add webhook" (Webhook Ekle) butonuna tıklayın',
        '6. Webhook\'a anlamıflı bir isim verin (ör: "EchoDay Bildirimleri")',
        '7. "Save" butonuna basın, görünen webhook URL\'ini kopyalayın ve aşağıya yapıştırın'
      ],
      exampleUrl: 'https://chat.googleapis.com/v1/spaces/AAAA1234567/messages?key=AIzaSy&token=abcd1234xyz'
    },
    {
      type: 'google-calendar',
      name: 'Google Calendar',
      description: 'Görevleri takvime otomatik ekle',
      icon: '📅',
      briefing: 'Google Calendar, dünyanın en popüler takvim uygulamasıdır. EchoDay görevlerinizi otomatik olarak takvim etkinliklerine dönüştürün ve hatırlatmaları bir arada yönetin.',
      useCases: ['Görevleri takvim etkinliği olarak ekle', 'Deadline hatırlatmaları', 'Toplantı öncesi görev kontrolü', 'Zaman yönetimi optimizasyonu'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      zapierConfig: {
        title: 'EchoDay -> Google Calendar Etkinlik',
        description: 'Her yeni görev otomatik olarak Google Calendar etkinliğine dönüşsün',
        triggerPrompt: 'Webhooks by Zapier -> Catch Hook',
        actionSteps: [
          {
            step: 'Action: Google Calendar -> Create Detailed Event',
            fields: [
              { name: 'Calendar', value: '[Takvim seçin]', note: 'Varsayılan takvim veya özel takvim' },
              { name: 'Event Title', value: '{{webhook__data__title}}', note: 'Görev başlığı' },
              { name: 'Start Date & Time', value: '{{webhook__data__datetime}}', note: 'Görev zamanı' },
              { name: 'End Date & Time', value: 'Start + 1 hour', note: 'Bitiş otomatik hesaplanacak' },
              { name: 'Description', value: '{{webhook__data__description}}\n\nÖncelik: {{webhook__data__priority}}\nKategori: {{webhook__data__category}}', note: 'Detaylı açıklama' },
              { name: 'Location', value: '{{webhook__data__location}}', note: 'Konum varsa' }
            ]
          }
        ],
        samplePayload: `{
  "event": "task_created",
  "timestamp": "2025-10-21T10:00:00Z",
  "user": { "id": "user123", "name": "Ali Yılmaz" },
  "data": {
    "title": "Proje toplantısı",
    "description": "Sprint planlama toplantısı",
    "datetime": "2025-10-25T14:00:00Z",
    "priority": "high",
    "category": "toplantı"
  }
}`
      },
      setupInstructions: [
        '1. 🚀 ZAPIER İLE KOLAY KURULUM: https://zapier.com/apps/google-calendar/integrations',
        '2. "Create Zap" butonuna tıklayın',
        '3. Trigger: "Webhooks by Zapier" -> "Catch Hook" seçin ve webhook URL alın',
        '4. Action: "Google Calendar" -> "Create Detailed Event" seçin',
        '5. Google hesabınıza bağlanın ve takvim seçin',
        '6. Görev bilgilerini takvim alanlarına eşleştirin (title -> event name, date -> start time)',
        '7. Aldığınız webhook URL\'ini aşağıya yapıştırın'
      ],
      exampleUrl: 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID/'
    },
    {
      type: 'gmail',
      name: 'Gmail',
      description: 'E-posta bildirimleri gönder',
      icon: '📧',
      briefing: 'Gmail ile görev bildirimlerini e-posta olarak alın. Tamamlanan görevler, günlük özetler ve hatırlatıcılar doğrudan mailinize gelsin.',
      useCases: ['Görev tamamlandığında mail al', 'Günlük özet maili', 'Deadline yaklaşıyor uyarıları', 'Ekip üyelerine otomatik rapor'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      zapierConfig: {
        title: 'EchoDay -> Gmail Bildirim',
        description: 'Her görev oluştuğunda veya tamamlandığında Gmail ile bildirim al',
        triggerPrompt: 'Webhooks by Zapier -> Catch Hook',
        actionSteps: [
          {
            step: 'Action: Gmail -> Send Email',
            fields: [
              { name: 'To', value: 'your-email@gmail.com', note: 'Bildirimi alacak mail adresi' },
              { name: 'Subject', value: '✅ Yeni Görev: {{webhook__data__title}}', note: 'Mail başlığı' },
              { name: 'Body Type', value: 'HTML', note: 'Zengin format için HTML seçin' },
              { name: 'Body', value: `<h2>🎯 {{webhook__data__title}}</h2>
<p><strong>📅 Tarih:</strong> {{webhook__data__datetime}}</p>
<p><strong>⚡ Öncelik:</strong> {{webhook__data__priority}}</p>
<p><strong>🏷️ Kategori:</strong> {{webhook__data__category}}</p>
<hr>
<p>{{webhook__data__description}}</p>`, note: 'HTML formatında mail içeriği' }
            ]
          }
        ],
        samplePayload: `{
  "event": "task_created",
  "timestamp": "2025-10-21T10:00:00Z",
  "user": { "id": "user123", "name": "Ayşe Kaya" },
  "data": {
    "title": "Rapor hazırla",
    "description": "Aylık satış raporu",
    "datetime": "2025-10-23T09:00:00Z",
    "priority": "medium",
    "category": "iş"
  }
}`
      },
      setupInstructions: [
        '1. 🚀 ZAPIER İLE KOLAY KURULUM: https://zapier.com/apps/gmail/integrations',
        '2. "Create Zap" butonuna tıklayın',
        '3. Trigger: "Webhooks by Zapier" -> "Catch Hook" seçin',
        '4. Zapier size webhook URL verecek - kopyalayın',
        '5. Action: "Gmail" -> "Send Email" seçin',
        '6. Gmail hesabınıza bağlanın',
        '7. "To" alanına mail adresinizi, "Subject" ve "Body" alanlarını webhook verileriyle doldurun',
        '8. Webhook URL\'ini aşağıya yapıştırın'
      ],
      exampleUrl: 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID/'
    },
    {
      type: 'google-sheets',
      name: 'Google Sheets',
      description: 'Görevleri spreadsheet\'e kaydet',
      icon: '📊',
      briefing: 'Google Sheets ile görev verilerinizi otomatik olarak bir tabloda toplayın. Analiz, raporlama ve veri işleme için mükemmel bir çözüm.',
      useCases: ['Görev geçmişini kaydet', 'Performans analizi yap', 'Aylık rapor oluştur', 'Takım dashboard\' u besle'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      zapierConfig: {
        title: 'EchoDay -> Google Sheets Görev Takibi',
        description: 'Her görev otomatik olarak Sheets\'e kaydedilsin ve analiz yapılabilsin',
        triggerPrompt: 'Webhooks by Zapier -> Catch Hook',
        actionSteps: [
          {
            step: 'Action: Google Sheets -> Create Spreadsheet Row',
            fields: [
              { name: 'Spreadsheet', value: '[Spreadsheet seçin veya yeni oluşturun]', note: 'EchoDay Görevler adında yeni sheet açın' },
              { name: 'Worksheet', value: 'Sheet1', note: 'İlk sekme' },
              { name: 'Görev ID', value: '{{webhook__data__id}}', note: 'A kolonu: Benzersiz ID' },
              { name: 'Başlık', value: '{{webhook__data__title}}', note: 'B kolonu: Görev adı' },
              { name: 'Tarih', value: '{{webhook__data__datetime}}', note: 'C kolonu: Tarih/saat' },
              { name: 'Öncelik', value: '{{webhook__data__priority}}', note: 'D kolonu: high/medium/low' },
              { name: 'Kategori', value: '{{webhook__data__category}}', note: 'E kolonu: Kategori' },
              { name: 'Oluşturulma', value: '{{webhook__timestamp}}', note: 'F kolonu: Kayıt zamanı' },
              { name: 'Kullanıcı', value: '{{webhook__user__name}}', note: 'G kolonu: Kim ekledi' }
            ]
          }
        ],
        samplePayload: `{
  "event": "task_created",
  "timestamp": "2025-10-21T10:00:00Z",
  "user": { "id": "user123", "name": "Mehmet Demir" },
  "data": {
    "id": "task_12345",
    "title": "Müşteri görüşmesi",
    "datetime": "2025-10-22T15:00:00Z",
    "priority": "high",
    "category": "satış"
  }
}`
      },
      setupInstructions: [
        '1. 🚀 ZAPIER İLE KOLAY KURULUM: https://zapier.com/apps/google-sheets/integrations',
        '2. "Create Zap" butonuna tıklayın',
        '3. Trigger: "Webhooks by Zapier" -> "Catch Hook" seçin ve webhook URL alın',
        '4. Action: "Google Sheets" -> "Create Spreadsheet Row" seçin',
        '5. Google hesabınıza bağlanın, bir spreadsheet ve sheet seçin',
        '6. Webhook verilerini (task title, date, status) kolonlara eşleştirin',
        '7. Webhook URL\'ini aşağıya yapıştırın'
      ],
      exampleUrl: 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID/'
    },
    {
      type: 'whatsapp',
      name: 'WhatsApp',
      description: 'WhatsApp mesajı gönder',
      icon: '💬',
      briefing: 'WhatsApp Business API ile görev bildirimlerini WhatsApp üzerinden alın. Dünya\'nın en popüler mesajlaşma uygulamasında hatırlatıcılarınızı görün.',
      useCases: ['Kişisel hatırlatıcı al', 'Takıma hızlı bildirim', 'Mobil first bildirim sistemi', 'Acil görev uyarıları'],
      defaultSettings: { retryCount: 3, timeout: 8000, includeDetails: true },
      zapierConfig: {
        title: 'EchoDay -> WhatsApp Bildirim',
        description: 'Görevler WhatsApp mesajı olarak telefonunuza gelsin',
        triggerPrompt: 'Webhooks by Zapier -> Catch Hook',
        actionSteps: [
          {
            step: 'Action: Twilio -> Send WhatsApp Message (via Zapier)',
            fields: [
              { name: 'From Number', value: 'whatsapp:+14155238886', note: 'Twilio Sandbox numarası (veya onaylı numara)' },
              { name: 'To Number', value: 'whatsapp:+905551234567', note: 'Sizin WhatsApp numaranız (+90 ile başlayarak)' },
              { name: 'Message', value: `🎯 *Yeni Görev Eklendi*

📝 {{webhook__data__title}}
📅 {{webhook__data__datetime}}
⚡ Öncelik: {{webhook__data__priority}}
🏷️ {{webhook__data__category}}

_EchoDay ile gönderildi_`, note: 'Markdown destekli mesaj' }
            ]
          }
        ],
        samplePayload: `{
  "event": "task_created",
  "timestamp": "2025-10-21T10:00:00Z",
  "user": { "id": "user123", "name": "Fatma Yıldız" },
  "data": {
    "title": "Doktor randevusu",
    "datetime": "2025-10-22T10:30:00Z",
    "priority": "high",
    "category": "sağlık"
  }
}`
      },
      setupInstructions: [
        '1. 🚀 TWILIO İLE KOLAY KURULUM: https://www.twilio.com/docs/whatsapp/quickstart',
        '2. Twilio hesabı oluşturun (https://www.twilio.com/try-twilio - ücretsiz deneme mevcut)',
        '3. WhatsApp Business API için başvurun veya Twilio Sandbox kullanın',
        '4. Twilio Console\'da WhatsApp Sandbox\'u aktifleştirin',
        '5. ZAPIER ENTEGRASYONU: https://zapier.com/apps/twilio/integrations',
        '6. Zapier\'da "Create Zap" -> Trigger: "Webhooks by Zapier" -> "Catch Hook"',
        '7. Action: "Twilio" -> "Send WhatsApp Message" seçin',
        '8. Twilio hesabınıza bağlanın ve webhook URL\'ini alıp aşağıya yapıştırın',
        'NOT: WhatsApp Business API onay süreci gerektirir, test için Sandbox kullanabilirsiniz'
      ],
      exampleUrl: 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID/'
    },
    {
      type: 'outlook-calendar',
      name: 'Outlook Calendar',
      description: 'Görevleri Outlook takvime ekle',
      icon: '📆',
      briefing: 'Microsoft Outlook Calendar, kurumsal dünyada en çok kullanılan takvim uygulamasıdır. EchoDay görevlerinizi Outlook takviminize otomatik ekleyerek iş ve kişisel hayatınızı senkronize tutun.',
      useCases: ['Görevleri takvim etkinliği olarak ekle', 'Toplantı öncesi hatırlatıcılar', 'Deadline takibi', 'Office 365 entegrasyonu'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      zapierConfig: {
        title: 'EchoDay -> Outlook Calendar Otomatik Etkinlik',
        description: 'EchoDay\'de görev ekleyince otomatik Outlook Calendar etkinliği oluştur',
        triggerPrompt: 'Webhooks by Zapier -> Catch Hook',
        actionSteps: [
          {
            step: 'Action: Microsoft Outlook -> Create Event',
            fields: [
              { name: 'Calendar', value: '[Takvim seçin]', note: 'Office 365 veya Outlook.com takvimi' },
              { name: 'Subject', value: '{{webhook__data__title}}', note: 'Görev başlığı' },
              { name: 'Start Time', value: '{{webhook__data__date}}', note: 'Görev başlangıç tarihi/saati' },
              { name: 'End Time', value: '{{webhook__data__dueDate}}', note: 'Görev bitiş tarihi/saati (veya Start Time + 1 saat)' },
              { name: 'Body', value: '📝 {{webhook__data__description}}\n\n✅ Öncelik: {{webhook__data__priority}}\n🏷️ Kategori: {{webhook__data__category}}', note: 'Görev detayları' },
              { name: 'Location', value: '{{webhook__data__location}}', note: 'Varsa konum bilgisi' },
              { name: 'Reminder', value: '15 minutes before', note: 'Etkinlikten 15 dk önce hatırlat' }
            ]
          }
        ],
        samplePayload: `{
  "event": "task_created",
  "timestamp": "2025-10-20T12:00:00Z",
  "user": { "id": "user123", "name": "Kullanıcı Adı" },
  "data": {
    "title": "Proje sunumu hazırla",
    "description": "Q4 raporları için sunum hazırlanacak",
    "priority": "high",
    "category": "iş",
    "date": "2025-10-25T09:00:00Z",
    "dueDate": "2025-10-25T11:00:00Z",
    "location": "Toplantı Odası A"
  }
}`
      },
      setupInstructions: [
        '1. 🚀 ZAPIER İLE KOLAY KURULUM: https://zapier.com/apps/microsoft-outlook/integrations',
        '2. "Create Zap" butonuna tıklayın',
        '3. Trigger: "Webhooks by Zapier" -> "Catch Hook" seçin',
        '4. Zapier size webhook URL verecek - kopyalayın',
        '5. Action: "Microsoft Outlook" -> "Create Event" seçin',
        '6. Microsoft hesabınıza bağlanın (Office 365 veya Outlook.com)',
        '7. Takvim seçin ve görev verilerini etkinlik alanlarına eşleştirin',
        '8. Webhook URL\'ini aşağıya yapıştırın'
      ],
      exampleUrl: 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID/'
    },
    {
      type: 'gmail-to-task',
      name: 'Gmail → Görev',
      description: 'Gelen mailleri otomatik görev yap',
      icon: '📩',
      briefing: 'Gmail\'e gelen belirli mailleri otomatik olarak EchoDay görevine dönüştürün. "TODO" etiketi, belirli gönderici veya konu filtreleriyle sadece istediğiniz mailleri görev yapın.',
      useCases: ['"TODO" label\' lı mailleri görev yap', 'Belirli kişiden gelen görevleri otomatik ekle', 'Müşteri taleplerini göreve çevir', 'Mail inbox\'u boşalt, görevleri EchoDay\'de yönet'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. 🚀 ZAPIER İLE KOLAY KURULUM: https://zapier.com/apps/gmail/integrations',
        '2. "Create Zap" butonuna tıklayın',
        '3. Trigger: "Gmail" -> "New Email" (veya "New Labeled Email") seçin',
        '4. Gmail hesabınıza bağlanın ve filtre ayarlayın (ör: Label = "TODO" veya belirli gönderici)',
        '5. Action: "Webhooks by Zapier" -> "POST" seçin',
        '6. URL: http://localhost:5123/api/tasks (veya EchoDay API endpoint\'iniz)',
        '7. Payload Type: "json" seçin, Body\'ye: {"title": "{{Email Subject}}", "description": "{{Email Body Plain}}"}',
        '8. Test edin ve webhook\'u aktif edin',
        'NOT: Bu template için EchoDay\'de bir API endpoint ayarlamanız gerekir (localhost:5123/api/tasks)'
      ],
      exampleUrl: 'http://localhost:5123/api/tasks'
    },
    {
      type: 'outlook-to-task',
      name: 'Outlook → Görev',
      description: 'Outlook maillerini otomatik görev yap',
      icon: '📨',
      briefing: 'Outlook\'a (Office 365 veya Outlook.com) gelen belirli mailleri otomatik olarak EchoDay görevine dönüştürün. Klasör, gönderici veya konu filtreleriyle tam kontrol.',
      useCases: ['Belirli klasördeki mailleri görev yap', 'Şeften gelen talimatları otomatik ekle', 'Müşteri taleplerini takip et', 'Kurumsal mail\'i görev yönetimine entegre et'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. 🚀 ZAPIER İLE KOLAY KURULUM: https://zapier.com/apps/microsoft-outlook/integrations',
        '2. "Create Zap" butonuna tıklayın',
        '3. Trigger: "Microsoft Outlook" -> "New Email" (veya "New Email in Folder") seçin',
        '4. Microsoft hesabınıza bağlanın ve filtre belirleyin (klasör, gönderici, konu)',
        '5. Action: "Webhooks by Zapier" -> "POST" seçin',
        '6. URL: http://localhost:5123/api/tasks (veya EchoDay API endpoint\'iniz)',
        '7. Payload: {"title": "{{Subject}}", "description": "{{Body}}", "source": "outlook"}',
        '8. Test edin ve Zap\'i aktif hale getirin',
        'NOT: EchoDay\'de task oluşturma API endpoint\'i gereklidir'
      ],
      exampleUrl: 'http://localhost:5123/api/tasks'
    },
    {
      type: 'outlook-mail',
      name: 'Outlook Mail Gönder',
      description: 'Outlook ile e-posta bildirimi',
      icon: '✉️',
      briefing: 'Microsoft Outlook Mail ile görev bildirimlerini profesyonel e-postalar olarak alın. Kurumsal mail hesabınızı kullanarak takım üyelerinize otomatik raporlar gönderin.',
      useCases: ['Görev tamamlama mailleri', 'Günlük/haftalık raporlar', 'Ekip bilgilendirme', 'Kurumsal iletişim otomasyonu'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. 🚀 ZAPIER İLE KOLAY KURULUM: https://zapier.com/apps/microsoft-outlook/integrations/webhooks',
        '2. "Create Zap" butonuna tıklayın',
        '3. Trigger: "Webhooks by Zapier" -> "Catch Hook" seçin ve webhook URL alın',
        '4. Action: "Microsoft Outlook" -> "Send Email" seçin',
        '5. Microsoft hesabınıza (Office 365/Outlook.com) bağlanın',
        '6. "To" alanına alıcı mail adresini, "Subject" ve "Body" alanlarını webhook verileriyle doldurun',
        '7. İsteğe bağlı: CC, BCC ve öncelik ayarlarını yapılandırın',
        '8. Webhook URL\'ini aşağıya yapıştırın'
      ],
      exampleUrl: 'https://hooks.zapier.com/hooks/catch/YOUR_HOOK_ID/'
    },
    {
      type: 'airtable',
      name: 'Airtable',
      description: 'Airtable veritabanına kayıt ekle',
      icon: '🗄️',
      briefing: 'Airtable, spreadsheet ve veritabanının gücünü birleştiren modern bir platformdur. EchoDay görevlerinizi Airtable base\'inize otomatik aktararak güçlü görselleştirmeler ve iş akışları oluşturun.',
      useCases: ['Görev veritabanı oluştur', 'Kanban board senkronize et', 'Proje yönetimi dashboard\' u', 'Takım koordinasyon sistemi'],
      defaultSettings: { retryCount: 3, timeout: 5000, includeDetails: true },
      setupInstructions: [
        '1. Tarayıcınızda https://airtable.com/create/tokens adresini açın',
        '2. "Create new token" (Yeni Token Oluştur) butonuna tıklayın',
        '3. Token\'a anlamlı bir isim verin (ör: "EchoDay Integration")',
        '4. Scopes bölümünde "data.records:write" iznini seçin',
        '5. Access bölümünde webhook göndermek istediğiniz base\'i seçin',
        '6. "Create token" butonuna basın ve görünen token\'ı kopyalayın',
        '7. API endpoint formatı: https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME (Base ID\'yi Airtable API dökümanından alabilirsiniz)',
        '8. Token\'ı Authorization header olarak kullanmanız gerekecek (Bearer YOUR_TOKEN)'
      ],
      exampleUrl: 'https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_NAME'
    },
    {
      type: 'generic',
      name: 'Özel Webhook',
      description: 'Kendi API endpoint\'ini ekle',
      icon: '🔧',
      briefing: 'Özel webhook ile kendi API endpoint\'inizi bağlayabilirsiniz. Kendi sistemleriniz, custom uygulamalarınız veya diğer herhangi bir HTTP API ile entegrasyon sağlayın.',
      useCases: ['Özel iç sistemlere bağlantı', 'Custom API entegrasyonu', 'Mikro servis mimarileri', 'Geliştirme ve test ortamları'],
      defaultSettings: { retryCount: 2, timeout: 10000, includeDetails: false },
      setupInstructions: [
        '1. Kendi API endpoint\'inizi hazırlayın (kendi sunucunuzda veya bulut servisinde)',
        '2. Endpoint\'in HTTP POST metodunu kabul ettiğinden emin olun',
        '3. Endpoint\'in JSON formatında veri (ör: {"event": "...", "data": {...}}) kabul ettiğini doğrulayın',
        '4. Gerekirse authentication ekleyin (Bearer token, API key, vb.)',
        '5. Endpoint\'inizi test edin (Postman veya curl ile deneyebilirsiniz)',
        '6. Çalıştığından emin olduktan sonra tam URL\'i aşağıdaki alana yapıştırın',
        'Not: Bu seçenek teknik bilgi gerektirir, eğer emin değilseniz önceden hazır servislerden birini seçin'
      ],
      exampleUrl: 'https://api.example.com/webhook'
    }
  ];

  // URL validasyonu
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Webhook tipine göre URL formatını doğrula
  private validateUrlForType(url: string, type: WebhookType): { valid: boolean; error?: string } {
    const urlLower = url.toLowerCase();
    
    switch (type) {
      case 'slack':
        if (!urlLower.includes('hooks.slack.com')) {
          return { valid: false, error: 'Slack webhook URL\'i "hooks.slack.com" içermelidir. Slack workspace ayarlarından "Incoming Webhooks" oluşturun.' };
        }
        break;
        
      case 'discord':
        if (!urlLower.includes('discord.com/api/webhooks')) {
          return { valid: false, error: 'Discord webhook URL\'i "discord.com/api/webhooks" içermelidir. Discord kanal ayarlarından webhook oluşturun.' };
        }
        break;
        
      case 'telegram':
        if (!urlLower.includes('api.telegram.org')) {
          return { valid: false, error: 'Telegram bot URL\'i "api.telegram.org" içermelidir. BotFather\'dan bot oluşturup token alın.' };
        }
        break;
        
      case 'teams':
        if (!urlLower.includes('outlook.office.com/webhook')) {
          return { valid: false, error: 'Microsoft Teams webhook URL\'i "outlook.office.com/webhook" içermelidir. Teams kanalından Incoming Webhook oluşturun.' };
        }
        break;
        
      case 'google-calendar':
      case 'gmail':
      case 'google-sheets':
      case 'whatsapp':
      case 'outlook-calendar':
      case 'outlook-mail':
        // Bu servisler Zapier webhook URL\'i gerektirir
        if (!urlLower.includes('hooks.zapier.com')) {
          return { 
            valid: false, 
            error: `${type === 'google-calendar' ? 'Google Calendar' : type === 'gmail' ? 'Gmail' : type === 'google-sheets' ? 'Google Sheets' : type === 'whatsapp' ? 'WhatsApp' : type === 'outlook-calendar' ? 'Outlook Calendar' : 'Outlook Mail'} için Zapier webhook URL\'i gereklidir. Zapier\'da "Webhooks by Zapier" -> "Catch Hook" ile webhook oluşturun.` 
          };
        }
        break;
        
      case 'zapier':
      case 'make':
      case 'n8n':
      case 'pabbly':
        // Bu platformların kendi webhook URL\'leri var
        if (type === 'zapier' && !urlLower.includes('hooks.zapier.com')) {
          return { valid: false, error: 'Zapier webhook URL\'i "hooks.zapier.com" içermelidir.' };
        }
        if (type === 'make' && !urlLower.includes('hook.') && !urlLower.includes('make.com')) {
          return { valid: false, error: 'Make webhook URL\'i "hook.*.make.com" formatında olmalıdır.' };
        }
        break;
        
      case 'notion':
        if (!urlLower.includes('api.notion.com')) {
          return { valid: false, error: 'Notion API URL\'i "api.notion.com" içermelidir.' };
        }
        break;
        
      case 'trello':
        if (!urlLower.includes('api.trello.com')) {
          return { valid: false, error: 'Trello API URL\'i "api.trello.com" içermelidir.' };
        }
        break;
        
      case 'asana':
        if (!urlLower.includes('app.asana.com/api')) {
          return { valid: false, error: 'Asana API URL\'i "app.asana.com/api" içermelidir.' };
        }
        break;
        
      case 'airtable':
        if (!urlLower.includes('api.airtable.com')) {
          return { valid: false, error: 'Airtable API URL\'i "api.airtable.com" içermelidir.' };
        }
        break;
        
      case 'google-chat':
        if (!urlLower.includes('chat.googleapis.com')) {
          return { valid: false, error: 'Google Chat webhook URL\'i "chat.googleapis.com" içermelidir.' };
        }
        break;
        
      // gmail-to-task ve outlook-to-task localhost veya custom endpoint olabilir
      case 'gmail-to-task':
      case 'outlook-to-task':
        // Bu servisler kullanıcının kendi API endpoint\'i olabilir, validasyon yapmayız
        break;
        
      case 'generic':
        // Generic webhook için özel validasyon yok
        break;
    }
    
    return { valid: true };
  }

  // Webhook ekleme
  addWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt'>): string {
    if (!this.isValidUrl(config.url)) {
      throw new Error('Geçersiz URL formatı');
    }
    
    // Webhook tipine göre URL formatını kontrol et
    const validation = this.validateUrlForType(config.url, config.type);
    if (!validation.valid) {
      throw new Error(validation.error || 'Geçersiz webhook URL formatı');
    }

    const id = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const webhook: WebhookConfig = {
      ...config,
      id,
      createdAt: new Date()
    };

    this.webhooks.set(id, webhook);
    this.saveToLocalStorage();
    return id;
  }

  // Webhook silme
  removeWebhook(id: string): boolean {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      this.saveToLocalStorage();
    }
    return deleted;
  }

  // Webhook güncelleme
  updateWebhook(id: string, updates: Partial<WebhookConfig>): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook) return false;

    if (updates.url && !this.isValidUrl(updates.url)) {
      throw new Error('Geçersiz URL formatı');
    }

    this.webhooks.set(id, { ...webhook, ...updates });
    this.saveToLocalStorage();
    return true;
  }

  // Webhook tetikleme
  async triggerWebhook(id: string, payload: WebhookPayload): Promise<WebhookResponse> {
    const webhook = this.webhooks.get(id);
    if (!webhook || !webhook.isActive) {
      return { success: false, error: 'Webhook bulunamadı veya aktif değil' };
    }

    // Event kontrolü
    if (!webhook.events.includes(payload.event)) {
      return { success: false, error: 'Bu event için webhook aktif değil' };
    }

    return this.sendWebhook(webhook, payload);
  }

  // HTTP isteği gönderme
  private async sendWebhook(webhook: WebhookConfig, payload: WebhookPayload): Promise<WebhookResponse> {
    const maxRetries = webhook.settings.retryCount || 3;
    const timeout = webhook.settings.timeout || 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const formattedPayload = this.formatPayload(webhook.type, payload, webhook.settings);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Zapier CORS için basit request kullan (preflight yok)
        // Content-Type: text/plain kullanarak preflight'ı bypass et
        let response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify(formattedPayload),
          signal: controller.signal,
          mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          webhook.lastTriggered = new Date();
          this.saveToLocalStorage();
          return {
            success: true,
            statusCode: response.status,
            message: 'Webhook başarıyla gönderildi'
          };
        } else {
          let errorDetail = response.statusText;
          try {
            const errorBody = await response.text();
            if (errorBody) errorDetail += ` - ${errorBody.substring(0, 200)}`;
          } catch {}
          throw new Error(`HTTP ${response.status}: ${errorDetail}`);
        }

      } catch (error) {
        console.error(`Webhook gönderimi başarısız (Deneme ${attempt}/${maxRetries}):`, error);
        
        // Hata tiplerine göre mesaj özelleştir
        let errorMessage = 'Bilinmeyen hata';
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = `Zaman aşımı (${timeout}ms). Webhook sunucusu yanıt vermiyor.`;
          } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = 'Ağ hatası. URL erişilebilir değil veya CORS politikası engelliyor.';
          } else {
            errorMessage = error.message;
          }
        }
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: errorMessage
          };
        }

        // Retry delay (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    return { success: false, error: 'Maksimum deneme sayısına ulaşıldı' };
  }

  // Payload formatı (servis tipine göre)
  private formatPayload(type: WebhookType, payload: WebhookPayload, settings: any) {
    switch (type) {
      case 'slack':
        return {
          text: settings.customMessage || this.getDefaultMessage(payload),
          channel: settings.channel,
          username: settings.username || 'EchoDay',
          icon_emoji: ':white_check_mark:'
        };

      case 'discord':
        return {
          content: settings.customMessage || this.getDefaultMessage(payload),
          username: settings.username || 'EchoDay',
          avatar_url: 'https://your-domain.com/icon.png'
        };

      default:
        return payload;
    }
  }

  // Varsayılan mesaj formatı
  private getDefaultMessage(payload: WebhookPayload): string {
    switch (payload.event) {
      case 'task_completed':
        return `✅ ${payload.user.name} görevi tamamladı: ${payload.data.title}`;
      case 'task_created':
        return `📝 ${payload.user.name} yeni görev ekledi: ${payload.data.title}`;
      case 'goal_completed':
        return `🎯 ${payload.user.name} hedefini tamamladı!`;
      case 'daily_summary':
        return `📊 Günlük özet: ${payload.data.completed}/${payload.data.total} görev tamamlandı`;
      default:
        return `🔔 EchoDay bildirimi: ${payload.event}`;
    }
  }

  // Test webhook
  async testWebhook(url: string, type: WebhookType = 'generic'): Promise<WebhookResponse> {
    if (!this.isValidUrl(url)) {
      return { success: false, error: 'Geçersiz URL formatı' };
    }
    
    // Webhook tipine göre URL formatını kontrol et
    const validation = this.validateUrlForType(url, type);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const testPayload: WebhookPayload = {
      event: 'task_completed',
      timestamp: new Date().toISOString(),
      user: { id: 'test', name: 'Test Kullanıcısı' },
      data: { title: 'Test Görevi', description: 'Bu bir test mesajıdır' }
    };

    const tempWebhook: WebhookConfig = {
      id: 'test',
      name: 'Test',
      type,
      url,
      isActive: true,
      events: ['task_completed'],
      settings: { retryCount: 1, timeout: 5000 },
      createdAt: new Date()
    };

    return this.sendWebhook(tempWebhook, testPayload);
  }

  // Getter metodları
  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }

  getTemplates(): WebhookTemplate[] {
    return this.templates;
  }

  getActiveWebhooks(): WebhookConfig[] {
    return this.getWebhooks().filter(w => w.isActive);
  }

  // Local Storage
  private saveToLocalStorage(): void {
    try {
      const data = Array.from(this.webhooks.entries());
      localStorage.setItem('echoday_webhooks', JSON.stringify(data));
    } catch (error) {
      console.error('Webhook verileri kaydedilemedi:', error);
    }
  }

  loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem('echoday_webhooks');
      if (data) {
        const entries = JSON.parse(data);
        this.webhooks = new Map(entries);
      }
    } catch (error) {
      console.error('Webhook verileri yüklenemedi:', error);
    }
  }
}

export const webhookService = new WebhookService();