import React, { useState } from 'react';
import { WebhookConfig } from '../../types/webhook';
import GmailCanvas from './GmailCanvas';

interface GmailWebhookUIProps {
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

interface GmailSettings {
  emailFormat: 'task_list' | 'individual' | 'summary';
  includeDetails: boolean;
  includePriority: boolean;
  includeDeadline: boolean;
  includeLocation: boolean;
  customSubject: string;
  triggerEvents: string[];
  emailTemplate: string;
}

const GmailWebhookUI: React.FC<GmailWebhookUIProps> = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookName, setWebhookName] = useState('');
  const [settings, setSettings] = useState<GmailSettings>({
    emailFormat: 'individual',
    includeDetails: true,
    includePriority: true,
    includeDeadline: true,
    includeLocation: false,
    customSubject: '',
    triggerEvents: ['task_completed'],
    emailTemplate: 'default'
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
        name: webhookName || `Gmail - ${new Date().toLocaleDateString('tr-TR')}`,
        type: 'gmail',
        url: webhookUrl,
        isActive: true,
        events: settings.triggerEvents as any[],
        settings: {
          ...settings,
          customMessage: settings.emailTemplate
        }
      };

      onSave(config);
    }
  };

  const emailTemplates = [
    {
      id: 'default',
      name: 'Varsayılan',
      subject: '✅ Görev Tamamlandı: {{title}}',
      body: `Merhaba,

Aşağıdaki görev başarıyla tamamlandı:

📋 Görev: {{title}}
⏰ Tamamlanma: {{completedAt}}
🏷️ Öncelik: {{priority}}
📅 Son Tarih: {{dueDate}}

EchoDay ile üretkenliğinizi artırın!`
    },
    {
      id: 'minimal',
      name: 'Minimal',
      subject: '✅ {{title}}',
      body: 'Görev tamamlandı: {{title}}'
    },
    {
      id: 'detailed',
      name: 'Detaylı',
      subject: '📋 EchoDay - Görev Güncellemesi',
      body: `📋 GÖREV RAPORU

Görev: {{title}}
Durum: {{status}}
Öncelik: {{priority}}
Kategori: {{category}}
Oluşturulma: {{createdAt}}
Tamamlanma: {{completedAt}}
Son Tarih: {{dueDate}}
Konum: {{location}}

Açıklama: {{description}}

---
Bu e-posta EchoDay tarafından otomatik olarak gönderilmiştir.`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <span className="text-3xl">📧</span>
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Gmail Webhook Kurulumu</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Görevlerinizi Gmail'e otomatik e-posta olarak gönderin
          </p>
        </div>
      </div>

      {/* Webhook Temel Bilgileri */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Webhook Adı
          </label>
          <input
            type="text"
            value={webhookName}
            onChange={(e) => setWebhookName(e.target.value)}
            placeholder="Gmail Görev Bildirimleri"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Webhook URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Zapier veya Make.com üzerinden Gmail webhook URL'nizi alın
          </p>
        </div>
      </div>

      {/* Tetikleme Olayları */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          E-posta Gönderilecek Durumlar
        </label>
        <div className="space-y-2">
          {[
            { id: 'task_created', label: '📝 Yeni görev oluşturulduğunda', icon: '📝' },
            { id: 'task_completed', label: '✅ Görev tamamlandığında', icon: '✅' },
            { id: 'task_updated', label: '📝 Görev güncellendiğinde', icon: '📝' },
            { id: 'reminder_triggered', label: '⏰ Hatırlatma tetiklendiğinde', icon: '⏰' },
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

      {/* E-posta Formatı */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          E-posta Formatı
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: 'individual', label: 'Her Görev İçin Ayrı E-posta', desc: 'Her görev için tek e-posta' },
            { id: 'task_list', label: 'Görev Listesi', desc: 'Birden fazla görevi tek e-postada' },
            { id: 'summary', label: 'Özet Rapor', desc: 'Günlük/haftalık özet formatı' }
          ].map((format) => (
            <label key={format.id} className="cursor-pointer">
              <input
                type="radio"
                name="emailFormat"
                value={format.id}
                checked={settings.emailFormat === format.id}
                onChange={(e) => setSettings(prev => ({ ...prev, emailFormat: e.target.value as any }))}
                className="sr-only"
              />
              <div className={`p-4 border-2 rounded-lg transition-all ${
                settings.emailFormat === format.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}>
                <div className="font-medium text-sm text-gray-900 dark:text-white">{format.label}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{format.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* E-posta İçeriği Ayarları */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          E-posta İçeriği
        </label>
        <div className="space-y-3">
          {[
            { id: 'includeDetails', label: 'Görev detaylarını dahil et', checked: settings.includeDetails },
            { id: 'includePriority', label: 'Öncelik seviyesini göster', checked: settings.includePriority },
            { id: 'includeDeadline', label: 'Son tarihi dahil et', checked: settings.includeDeadline },
            { id: 'includeLocation', label: 'Konum bilgisini ekle', checked: settings.includeLocation }
          ].map((option) => (
            <label key={option.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={option.checked}
                onChange={(e) => setSettings(prev => ({ ...prev, [option.id]: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* E-posta Şablonu */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          E-posta Şablonu
        </label>
        <div className="space-y-3">
          {emailTemplates.map((template) => (
            <label key={template.id} className="cursor-pointer">
              <input
                type="radio"
                name="emailTemplate"
                value={template.id}
                checked={settings.emailTemplate === template.id}
                onChange={(e) => setSettings(prev => ({ ...prev, emailTemplate: e.target.value }))}
                className="sr-only"
              />
              <div className={`p-4 border-2 rounded-lg transition-all ${
                settings.emailTemplate === template.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}>
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-2">{template.name}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Konu:</strong> {template.subject}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono whitespace-pre-line">
                  {template.body.substring(0, 150)}...
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Özel Konu Satırı */}
      {settings.emailTemplate === 'default' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Özel Konu Satırı (Opsiyonel)
          </label>
          <input
            type="text"
            value={settings.customSubject}
            onChange={(e) => setSettings(prev => ({ ...prev, customSubject: e.target.value }))}
            placeholder="✅ EchoDay: {{title}} tamamlandı"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Kullanılabilir değişkenler: {'{{'} title {'}},'} {'{{'} priority {'}},'} {'{{'} dueDate {'}},'} {'{{'} status {'}}'} 
          </p>
        </div>
      )}

      {/* Gmail Workflow Canvas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          🎨 Workflow Tasarımcısı
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Gmail webhook'unuz için görsel workflow oluşturun. Node'ları sürükleyip bırakarak bağlantılar kurabilirsiniz.
        </p>
        <GmailCanvas 
          onWorkflowChange={(nodes, edges) => {
            console.log('Workflow değişti:', { nodes, edges });
          }}
        />
      </div>

      {/* Kurulum Talimatları */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📋 Kurulum Talimatları</h4>
        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
          <li>Zapier.com'da hesap oluşturun</li>
          <li>"Create Zap" butonuna tıklayın</li>
          <li>Trigger olarak "Webhooks by Zapier" seçin</li>
          <li>"Catch Hook" seçeneğini işaretleyin</li>
          <li>Size verilen webhook URL'i yukarıya yapıştırın</li>
          <li>Action olarak "Gmail" seçin</li>
          <li>"Send Email" aksiyonunu seçin</li>
          <li>E-posta ayarlarınızı yapılandırın</li>
        </ol>
      </div>

      {/* Butonlar */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={isLoading || !webhookUrl.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Test ediliyor...
            </>
          ) : (
            <>
              📧 Gmail Webhook'u Ekle
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

export default GmailWebhookUI;