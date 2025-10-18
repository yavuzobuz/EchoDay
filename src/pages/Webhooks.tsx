import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { webhookService } from '../services/webhookService';
import { WebhookConfig, WebhookTemplate } from '../types/webhook';
import WebhookChatbot from '../../components/WebhookChatbot';

// Helper: Convert text with URLs to clickable links
const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)|([a-zA-Z0-9.-]+\.[a-z]{2,}\/[^\s]*)/gi;
  const parts = text.split(urlRegex).filter(Boolean);
  
  return parts.map((part, index) => {
    if (part && (part.startsWith('http://') || part.startsWith('https://') || part.includes('.com') || part.includes('.org'))) {
      const url = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] hover:underline font-medium transition-colors"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const Webhooks: React.FC = () => {
  const navigate = useNavigate();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [templates, setTemplates] = useState<WebhookTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WebhookTemplate | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatbotContext, setChatbotContext] = useState<{ type?: string; name?: string; setupInstructions?: string[] }>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    channel: '',
    events: ['task_completed'] as string[]
  });

  useEffect(() => {
    // Verileri yükle
    webhookService.loadFromLocalStorage();
    setWebhooks(webhookService.getWebhooks());
    setTemplates(webhookService.getTemplates());
  }, []);

  const handleAddWebhook = async () => {
    if (!selectedTemplate || !formData.name || !formData.url) {
      setTestResult('❌ Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setIsLoading(true);
      
      // Önce test et
      const testResponse = await webhookService.testWebhook(formData.url, selectedTemplate.type);
      
      if (testResponse.success) {
        // Test başarılı, webhook'u ekle
        webhookService.addWebhook({
          name: formData.name,
          type: selectedTemplate.type,
          url: formData.url,
          isActive: true,
          events: formData.events as any[],
          settings: {
            channel: formData.channel,
            ...selectedTemplate.defaultSettings
          }
        });

        setWebhooks(webhookService.getWebhooks());
        setTestResult(`✅ Webhook başarıyla eklendi! Test mesajı gönderildi.`);
        
        // Formu temizle
        setFormData({ name: '', url: '', channel: '', events: ['task_completed'] });
        setSelectedTemplate(null);
        setShowAddForm(false);
      } else {
        setTestResult(`❌ Test başarısız: ${testResponse.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    setIsLoading(true);
    try {
      const response = await webhookService.triggerWebhook(webhook.id, {
        event: 'task_completed',
        timestamp: new Date().toISOString(),
        user: { id: 'test', name: 'Test Kullanıcısı' },
        data: { title: 'Test Görevi', description: 'Bu bir test mesajıdır' }
      });

      if (response.success) {
        setTestResult(`✅ ${webhook.name} - Test mesajı başarıyla gönderildi!`);
      } else {
        setTestResult(`❌ ${webhook.name} - Test başarısız: ${response.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Test hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWebhook = (id: string) => {
    webhookService.removeWebhook(id);
    setWebhooks(webhookService.getWebhooks());
    setTestResult('🗑️ Webhook silindi');
  };

  const toggleWebhook = (id: string) => {
    const webhook = webhookService.getWebhook(id);
    if (webhook) {
      webhookService.updateWebhook(id, { isActive: !webhook.isActive });
      setWebhooks(webhookService.getWebhooks());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Navbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex-shrink-0 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/app')} 
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Ana sayfaya dön"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--accent-color-500)] to-[var(--accent-color-600)] shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">🔗 Webhook Entegrasyonları</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">EchoDay'i diğer uygulamalarla bağlayın</p>
              </div>
            </div>
          </div>
          {/* Quick Stats */}
          <div className="hidden sm:flex items-center gap-4">
            <button
              onClick={() => {
                setChatbotContext(selectedTemplate ? {
                  type: selectedTemplate.type,
                  name: selectedTemplate.name,
                  setupInstructions: selectedTemplate.setupInstructions
                } : {});
                setIsChatbotOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
              title="AI Asistan ile Yardım Al"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="hidden md:inline">🤖 AI Yardım</span>
            </button>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Aktif</p>
              <p className="text-lg font-bold text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)]">
                {webhooks.filter(w => w.isActive).length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Toplam</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{webhooks.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">

        {/* Test Result */}
        {testResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-mono text-gray-900 dark:text-gray-100">{testResult}</div>
          </div>
        )}

        {/* Add Webhook Button */}
        {!showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
            >
              ➞ Yeni Webhook Ekle
            </button>
          </div>
        )}

        {/* Add Webhook Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Yeni Webhook Ekle</h2>
            
            {/* Template Selection */}
            {!selectedTemplate && (
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Servis Seçin:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {templates.map((template) => (
                    <button
                      key={template.type}
                      onClick={() => setSelectedTemplate(template)}
                      className="p-4 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg hover:border-[var(--accent-color-500)] dark:hover:border-[var(--accent-color-400)] hover:shadow-md transition-all text-left group"
                    >
                      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{template.icon}</div>
                      <div className="font-medium text-gray-900 dark:text-white">{template.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form Fields */}
            {selectedTemplate && (
              <div className="space-y-4">
                {/* Header with back button */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedTemplate.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{selectedTemplate.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTemplate.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Geri
                  </button>
                </div>

                {/* Briefing Section */}
                {selectedTemplate.briefing && (
                  <div className="bg-gradient-to-r from-[var(--accent-color-100)]/30 to-[var(--accent-color-100)]/10 dark:from-[var(--accent-color-900)]/10 dark:to-transparent p-4 rounded-lg border border-[var(--accent-color-200)] dark:border-[var(--accent-color-800)]">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-color-600)] dark:bg-[var(--accent-color-500)] flex items-center justify-center text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Ne İşe Yarar?</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {selectedTemplate.briefing}
                        </p>
                        {selectedTemplate.useCases && selectedTemplate.useCases.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">✍️ Kullanım Senaryoları:</p>
                            <ul className="space-y-1">
                              {selectedTemplate.useCases.map((useCase, index) => (
                                <li key={index} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)] flex-shrink-0 mt-0.5">•</span>
                                  <span>{useCase}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Webhook Adı
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Takım Bildirimleri"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[var(--accent-color-500)] focus:border-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder={selectedTemplate.exampleUrl}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[var(--accent-color-500)] focus:border-transparent transition-colors font-mono text-sm"
                  />
                </div>

                {(selectedTemplate.type === 'slack' || selectedTemplate.type === 'discord') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kanal (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      value={formData.channel}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                      placeholder={selectedTemplate.type === 'slack' ? '#productivity' : 'genel'}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[var(--accent-color-500)] focus:border-transparent transition-colors"
                    />
                  </div>
                )}

                {/* Setup Instructions - Enhanced */}
                <div className="bg-gradient-to-r from-[var(--accent-color-100)]/50 to-[var(--accent-color-100)]/30 dark:from-[var(--accent-color-900)]/20 dark:to-[var(--accent-color-900)]/10 p-6 rounded-xl border border-[var(--accent-color-300)] dark:border-[var(--accent-color-700)]">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-6 h-6 text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">Adım Adım Kurulum Rehberi</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedTemplate.setupInstructions.map((instruction, index) => (
                      <div key={index} className="flex gap-3 items-start group">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent-color-600)] dark:bg-[var(--accent-color-500)] text-white font-bold flex items-center justify-center text-sm shadow-md group-hover:scale-110 transition-transform">
                          {index + 1}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                            {renderTextWithLinks(instruction)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Visual hint */}
                  <div className="mt-4 pt-4 border-t border-[var(--accent-color-300)] dark:border-[var(--accent-color-700)]">
                    <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Linkler üzerine tıklayarak ilgili sayfaları yeni sekmede açabilirsiniz</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddWebhook}
                    disabled={isLoading}
                    className="bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
                  >
                    {isLoading ? '⏳ Test ediliyor...' : '✅ Test Et ve Ekle'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedTemplate(null);
                      setFormData({ name: '', url: '', channel: '', events: ['task_completed'] });
                    }}
                    className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
                  >
                    ❌ İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Webhook List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Aktif Webhook'lar ({webhooks.filter(w => w.isActive).length})
          </h2>
          
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">🔗</div>
              <div className="font-medium">Henüz webhook eklenmemiş</div>
              <div className="text-sm mt-1">Yukarıdaki butona tıklayarak ilk webhook'unuzu ekleyin</div>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className={`p-4 border rounded-lg transition-all ${
                    webhook.isActive 
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {templates.find(t => t.type === webhook.type)?.icon || '🔗'}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{webhook.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {webhook.type} • {webhook.events.length} event
                          {webhook.settings.channel && ` • ${webhook.settings.channel}`}
                        </div>
                        {webhook.lastTriggered && (
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            Son tetikleme: {new Date(webhook.lastTriggered).toLocaleString('tr-TR')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestWebhook(webhook)}
                        disabled={isLoading || !webhook.isActive}
                        className="bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors shadow-sm"
                      >
                        🧪 Test
                      </button>
                      <button
                        onClick={() => toggleWebhook(webhook.id)}
                        className={`px-3 py-1 rounded text-sm transition-colors shadow-sm ${
                          webhook.isActive
                            ? 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white'
                            : 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white'
                        }`}
                      >
                        {webhook.isActive ? '⏸️ Durdur' : '▶️ Aktif'}
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors shadow-sm"
                      >
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
      
      {/* AI Chatbot */}
      <WebhookChatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        webhookContext={chatbotContext}
      />
    </div>
  );
};

export default Webhooks;
