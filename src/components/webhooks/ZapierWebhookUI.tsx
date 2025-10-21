import React, { useState } from 'react';
import { WebhookConfig } from '../../types/webhook';

interface ZapierWebhookUIProps {
  formData: {
    name: string;
    url: string;
    channel: string;
    events: string[];
  };
  setFormData: (data: any) => void;
  onSave?: (config: Partial<WebhookConfig>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface ZapierSettings {
  triggerEvents: string[];
  dataFormat: 'full' | 'minimal' | 'custom';
  includeMetadata: boolean;
  customFields: { [key: string]: boolean };
  zapName: string;
  targetApp: string;
  automationType: 'instant' | 'scheduled' | 'conditional';
}

const ZapierWebhookUI: React.FC<ZapierWebhookUIProps> = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookName, setWebhookName] = useState('');
  const [settings, setSettings] = useState<ZapierSettings>({
    triggerEvents: ['task_completed'],
    dataFormat: 'full',
    includeMetadata: true,
    customFields: {
      title: true,
      description: true,
      priority: true,
      dueDate: true,
      category: true,
      tags: false,
      location: false,
      createdAt: true,
      completedAt: true
    },
    zapName: '',
    targetApp: '',
    automationType: 'instant'
  });

  const handleSave = () => {
    if (!webhookUrl.trim()) {
      alert('Webhook URL alanı zorunludur');
      return;
    }

    // Update parent form data with webhook URL
    setFormData({
      ...formData,
      url: webhookUrl,
      name: webhookName || formData.name
    });

    if (onSave) {
      const config: Partial<WebhookConfig> = {
        name: webhookName || `Zapier - ${settings.targetApp || 'Otomasyon'}`,
        type: 'zapier',
        url: webhookUrl,
        isActive: true,
        events: settings.triggerEvents as any[],
        settings: {
          ...settings,
          customMessage: `Zapier ${settings.automationType} automation`
        }
      };

      onSave(config);
    }
  };

  const popularApps = [
    { id: 'gmail', name: 'Gmail', icon: '📧', desc: 'E-posta gönder' },
    { id: 'slack', name: 'Slack', icon: '💬', desc: 'Mesaj gönder' },
    { id: 'trello', name: 'Trello', icon: '📋', desc: 'Kart oluştur' },
    { id: 'notion', name: 'Notion', icon: '📑', desc: 'Sayfa ekle' },
    { id: 'sheets', name: 'Google Sheets', icon: '📊', desc: 'Satır ekle' },
    { id: 'calendar', name: 'Google Calendar', icon: '📅', desc: 'Etkinlik oluştur' },
    { id: 'discord', name: 'Discord', icon: '🎮', desc: 'Mesaj gönder' },
    { id: 'teams', name: 'Microsoft Teams', icon: '👥', desc: 'Bildirim gönder' }
  ];

  const zapierTemplates = [
    {
      id: 'gmail_task_complete',
      name: '📧 Gmail - Görev Tamamlama E-postası',
      description: 'Görev tamamlandığında Gmail ile e-posta gönder',
      events: ['task_completed'],
      targetApp: 'gmail',
      config: 'Subject: ✅ {{title}} tamamlandı\nBody: Görev başarıyla tamamlandı: {{title}}'
    },
    {
      id: 'slack_notifications',
      name: '💬 Slack - Takım Bildirimleri',
      description: 'Tüm görev güncellemelerini Slack kanalına gönder',
      events: ['task_created', 'task_completed', 'task_updated'],
      targetApp: 'slack',
      config: 'Channel: #tasks\nMessage: {{event}}: {{title}}'
    },
    {
      id: 'trello_card_creation',
      name: '📋 Trello - Otomatik Kart Oluşturma',
      description: 'Yeni görevleri Trello kartı olarak ekle',
      events: ['task_created'],
      targetApp: 'trello',
      config: 'Board: EchoDay Tasks\nList: To Do\nCard: {{title}}'
    },
    {
      id: 'sheets_logging',
      name: '📊 Google Sheets - Görev Kaydı',
      description: 'Tüm görev aktivitelerini Google Sheets\'e kaydet',
      events: ['task_created', 'task_completed', 'task_updated'],
      targetApp: 'sheets',
      config: 'Spreadsheet: Task Log\nRow: {{date}} | {{title}} | {{status}}'
    },
    {
      id: 'calendar_events',
      name: '📅 Google Calendar - Etkinlik Oluşturma',
      description: 'Son tarihi olan görevleri takvim etkinliği olarak ekle',
      events: ['task_created'],
      targetApp: 'calendar',
      config: 'Calendar: Tasks\nEvent: {{title}}\nDate: {{dueDate}}'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <span className="text-3xl">⚡</span>
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Zapier Webhook Kurulumu</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            5000+ uygulamayla otomatik entegrasyon oluşturun
          </p>
        </div>
      </div>

      {/* Hızlı Şablonlar */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">🚀 Popüler Zapier Şablonları</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {zapierTemplates.map((template) => (
            <div
              key={template.id}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all group"
              onClick={() => {
                setSettings(prev => ({
                  ...prev,
                  triggerEvents: template.events,
                  targetApp: template.targetApp,
                  zapName: template.name
                }));
                setWebhookName(template.name);
              }}
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {template.name}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {template.description}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-mono bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                {template.config}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Temel Bilgileri */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Zap Adı
          </label>
          <input
            type="text"
            value={webhookName}
            onChange={(e) => setWebhookName(e.target.value)}
            placeholder="EchoDay → Gmail Bildirimleri"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Zapier Webhook URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            required
          />
        </div>
      </div>

      {/* Hedef Uygulama Seçimi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Hedef Uygulama (Zapier'da bağlanacak uygulama)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {popularApps.map((app) => (
            <label key={app.id} className="cursor-pointer">
              <input
                type="radio"
                name="targetApp"
                value={app.id}
                checked={settings.targetApp === app.id}
                onChange={(e) => setSettings(prev => ({ ...prev, targetApp: e.target.value }))}
                className="sr-only"
              />
              <div className={`p-3 border-2 rounded-lg transition-all text-center ${
                settings.targetApp === app.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}>
                <div className="text-2xl mb-1">{app.icon}</div>
                <div className="font-medium text-xs text-gray-900 dark:text-white">{app.name}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{app.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Otomasyon Türü */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Otomasyon Türü
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: 'instant', label: '⚡ Anında', desc: 'Olay gerçekleşir gerçekleşmez tetiklenir' },
            { id: 'scheduled', label: '⏰ Zamanlanmış', desc: 'Belirli aralıklarla çalışır' },
            { id: 'conditional', label: '🔀 Koşullu', desc: 'Belirli koşullar sağlandığında çalışır' }
          ].map((type) => (
            <label key={type.id} className="cursor-pointer">
              <input
                type="radio"
                name="automationType"
                value={type.id}
                checked={settings.automationType === type.id}
                onChange={(e) => setSettings(prev => ({ ...prev, automationType: e.target.value as any }))}
                className="sr-only"
              />
              <div className={`p-4 border-2 rounded-lg transition-all ${
                settings.automationType === type.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}>
                <div className="font-medium text-sm text-gray-900 dark:text-white">{type.label}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{type.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Tetikleme Olayları */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Zapier'ı Tetikleyecek Olaylar
        </label>
        <div className="space-y-2">
          {[
            { id: 'task_created', label: '📝 Yeni görev oluşturulduğunda', icon: '📝' },
            { id: 'task_completed', label: '✅ Görev tamamlandığında', icon: '✅' },
            { id: 'task_updated', label: '📝 Görev güncellendiğinde', icon: '📝' },
            { id: 'reminder_triggered', label: '⏰ Hatırlatma tetiklendiğinde', icon: '⏰' },
            { id: 'goal_completed', label: '🎯 Hedef tamamlandığında', icon: '🎯' },
            { id: 'daily_summary', label: '📊 Günlük özet', icon: '📊' },
            { id: 'weekly_report', label: '📈 Haftalık rapor', icon: '📈' }
          ].map((event) => (
            <label key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.triggerEvents.includes(event.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSettings(prev => ({
                      ...prev,
                      triggerEvents: [...prev.triggerEvents, event.id]
                    }));
                  } else {
                    setSettings(prev => ({
                      ...prev,
                      triggerEvents: prev.triggerEvents.filter(t => t !== event.id)
                    }));
                  }
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-lg">{event.icon}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{event.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Veri Formatı */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Zapier'a Gönderilecek Veri Formatı
        </label>
        <div className="space-y-3">
          {[
            { id: 'full', label: '📋 Tam Veri', desc: 'Tüm görev bilgileri dahil' },
            { id: 'minimal', label: '⚡ Minimal', desc: 'Sadece temel bilgiler (başlık, durum)' },
            { id: 'custom', label: '🔧 Özel', desc: 'Seçtiğiniz alanları dahil et' }
          ].map((format) => (
            <label key={format.id} className="cursor-pointer">
              <input
                type="radio"
                name="dataFormat"
                value={format.id}
                checked={settings.dataFormat === format.id}
                onChange={(e) => setSettings(prev => ({ ...prev, dataFormat: e.target.value as any }))}
                className="sr-only"
              />
              <div className={`p-3 border-2 rounded-lg transition-all flex items-center gap-3 ${
                settings.dataFormat === format.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}>
                <div className="font-medium text-sm text-gray-900 dark:text-white">{format.label}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{format.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Özel Alan Seçimi */}
      {settings.dataFormat === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Zapier'a Gönderilecek Alanlar
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(settings.customFields).map(([field, checked]) => (
              <label key={field} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    customFields: { ...prev.customFields, [field]: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {field === 'dueDate' ? 'Son Tarih' : 
                   field === 'createdAt' ? 'Oluşturulma' :
                   field === 'completedAt' ? 'Tamamlanma' :
                   field === 'title' ? 'Başlık' :
                   field === 'description' ? 'Açıklama' :
                   field === 'priority' ? 'Öncelik' :
                   field === 'category' ? 'Kategori' :
                   field === 'tags' ? 'Etiketler' :
                   field === 'location' ? 'Konum' : field}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Kurulum Talimatları */}
      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
        <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">⚡ Zapier Kurulum Adımları</h4>
        <ol className="text-sm text-orange-800 dark:text-orange-200 space-y-1 list-decimal list-inside">
          <li>Zapier.com'da hesap oluşturun (ücretsiz plan mevcut)</li>
          <li>"Create Zap" butonuna tıklayın</li>
          <li>Trigger olarak "Webhooks by Zapier" seçin</li>
          <li>"Catch Hook" seçeneğini işaretleyin</li>
          <li>Size verilen webhook URL'i yukarıya kopyalayın</li>
          <li>Action olarak hedef uygulamanızı seçin ({settings.targetApp || 'Gmail, Slack, vb.'})</li>
          <li>Uygulamanızı bağlayın ve aksiyonu yapılandırın</li>
          <li>Zap'i test edin ve aktif hale getirin</li>
        </ol>
      </div>

      {/* Butonlar */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={isLoading || !webhookUrl.trim()}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Test ediliyor...
            </>
          ) : (
            <>
              ⚡ Zapier Webhook'u Ekle
            </>
          )}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
          >
            ❌ İptal
          </button>
        )}
      </div>
    </div>
  );
};

export default ZapierWebhookUI;