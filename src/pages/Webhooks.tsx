import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { webhookService } from '../services/webhookService';
import { WebhookConfig, WebhookTemplate } from '../types/webhook';
import WebhookChatbot from '../../components/WebhookChatbot';

// Helper: Convert text with URLs to clickable links
const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const parts = text.split(urlRegex).filter(Boolean);
  
  return parts.map((part, index) => {
    if (part && part.match(/^https?:\/\//i)) {
      return (
        <a
          key={index}
          href={part}
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
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatbotContext, setChatbotContext] = useState<{ type?: string; name?: string; setupInstructions?: string[]; zapierConfigMode?: boolean; zapierConfig?: any }>({});
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);

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
    // Validasyon kontrolleri
    if (!selectedTemplate) {
      setTestResult('❌ Lütfen bir servis seçin');
      return;
    }
    
    if (!formData.url.trim()) {
      setTestResult('❌ Webhook URL alanı zorunludur');
      return;
    }
    
    // URL format kontrolü
    try {
      new URL(formData.url);
    } catch {
      setTestResult('❌ Geçersiz URL formatı. URL "https://" ile başlamalıdır');
      return;
    }
    
    // İsim yoksa otomatik oluştur
    const webhookName = formData.name.trim() || `${selectedTemplate.name} - ${new Date().toLocaleDateString('tr-TR')}`;

    try {
      setIsLoading(true);
      setTestResult('⏳ Webhook test ediliyor...');
      
      // Önce test et
      const testResponse = await webhookService.testWebhook(formData.url, selectedTemplate.type);
      
      if (testResponse.success) {
        // Test başarılı, webhook'u ekle
        webhookService.addWebhook({
          name: webhookName,
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
        setTestResult(`✅ Webhook başarıyla eklendi ve test edildi! "${webhookName}" adıyla kaydedildi.`);
        
        // Formu temizle
        setFormData({ name: '', url: '', channel: '', events: ['task_completed'] });
        setSelectedTemplate(null);
        setShowAddForm(false);
      } else {
        setTestResult(`❌ Webhook testi başarısız: ${testResponse.error || 'Bilinmeyen hata'}\n\nURL'yi kontrol edin ve tekrar deneyin.`);
      }
    } catch (error) {
      setTestResult(`❌ Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    setTestingWebhookId(webhook.id);
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
      setTestingWebhookId(null);
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
              onClick={() => navigate(-1)} 
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Önceki sayfaya dön"
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
          <div className={`rounded-lg shadow-sm p-4 mb-6 border ${
            testResult.includes('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
              : testResult.includes('⏳')
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
              : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100">{testResult}</div>
              <button 
                onClick={() => setTestResult('')} 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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

                {/* Zapier Config Assistant Button */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => {
                      setChatbotContext({
                        type: selectedTemplate.type,
                        name: selectedTemplate.name,
                        setupInstructions: selectedTemplate.setupInstructions,
                        zapierConfigMode: true,
                        zapierConfig: (selectedTemplate as any).zapierConfig
                      });
                      setIsChatbotOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    🤖 Yapılandırma Asistanı
                  </button>
                  <button
                    onClick={() => setShowQuickTemplates(!showQuickTemplates)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    📋 Hazır Şablonlar
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

                {/* Quick Zapier Templates */}
                {showQuickTemplates && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800 mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">🚀 Hazır Zapier Yapılandırma Şablonları</h4>
                    </div>
                    
                    {(selectedTemplate as any).zapierConfig ? (
                      <div className="space-y-4">
                        {/* Workflow başlığı ve açıklama */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                          <h5 className="font-bold text-base text-gray-900 dark:text-white mb-1">
                            {(selectedTemplate as any).zapierConfig.title}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {(selectedTemplate as any).zapierConfig.description}
                          </p>
                        </div>

                        {/* Action steps */}
                        {(selectedTemplate as any).zapierConfig.actionSteps?.map((step: any, idx: number) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start justify-between mb-3">
                              <h6 className="font-semibold text-sm text-gray-900 dark:text-white">
                                {step.step}
                              </h6>
                              <button
                                onClick={() => {
                                  const text = step.fields.map((f: any) => `${f.name}: ${f.value}${f.note ? ` (${f.note})` : ''}`).join('\n');
                                  navigator.clipboard.writeText(text);
                                  setTestResult('✅ Alan eşleştirmeleri panoya kopyalandı!');
                                }}
                                className="p-1.5 rounded bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                title="Kopyala"
                              >
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            
                            {/* Fields */}
                            <div className="space-y-2">
                              {step.fields.map((field: any, fIdx: number) => (
                                <div key={fIdx} className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                        {field.name}
                                      </div>
                                      <div className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                                        {field.value}
                                      </div>
                                      {field.note && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                          {field.note}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Sample Payload */}
                        {(selectedTemplate as any).zapierConfig.samplePayload && (
                          <div className="bg-gray-900 dark:bg-black p-4 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="font-semibold text-sm text-gray-100">
                                📦 Örnek Webhook Verisi (Test için)
                              </h6>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText((selectedTemplate as any).zapierConfig.samplePayload);
                                  setTestResult('✅ Örnek payload panoya kopyalandı!');
                                }}
                                className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                                title="Kopyala"
                              >
                                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                              {(selectedTemplate as any).zapierConfig.samplePayload}
                            </pre>
                          </div>
                        )}

                        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            💡 <strong>İpucu:</strong> Her bölümün sağ üstünden alan eşleştirmelerini kopyalayabilir, Zapier\'a yapıştırabilirsiniz!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Template 1 */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all group">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-sm text-gray-900 dark:text-white">📅 Görev → Takvim Etkinliği</h5>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`**Trigger:** Webhooks by Zapier -> Catch Hook\n\n**Action:** ${selectedTemplate.name} -> Create Event\n\n**Field Mapping:**\n- Subject: {{webhook__data__title}}\n- Start Time: {{webhook__data__date}}\n- End Time: {{webhook__data__dueDate}}\n- Body: {{webhook__data__description}}\n- Priority: {{webhook__data__priority}}`);
                              setTestResult('✅ Şablon panoya kopyalandı!');
                            }}
                            className="p-1.5 rounded bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors opacity-0 group-hover:opacity-100"
                            title="Kopyala"
                          >
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Yeni görev ekleyince otomatik takvim etkinliği oluştur</p>
                        <div className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {'Subject: {{webhook__data__title}}\nStart: {{webhook__data__date}}\nEnd: {{webhook__data__dueDate}}'}
                        </div>
                      </div>

                      {/* Template 2 */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all group">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-sm text-gray-900 dark:text-white">✅ Görev Tamamlandı → Bildirim</h5>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`**Trigger:** Webhooks by Zapier -> Catch Hook\n\n**Filter:** Only continue if event = "task_completed"\n\n**Action:** ${selectedTemplate.name} -> Send Message/Email\n\n**Field Mapping:**\n- Message: "✅ Görev tamamlandı: {{webhook__data__title}}"\n- Details: {{webhook__data__description}}\n- User: {{webhook__user__name}}`);
                              setTestResult('✅ Şablon panoya kopyalandı!');
                            }}
                            className="p-1.5 rounded bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors opacity-0 group-hover:opacity-100"
                            title="Kopyala"
                          >
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Görev tamamlanınca bildirim gönder</p>
                        <div className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {'Filter: event = "task_completed"\nMessage: "✅ {{title}}"\nUser: {{webhook__user__name}}'}
                        </div>
                      </div>

                      {/* Template 3 */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all group">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-sm text-gray-900 dark:text-white">📊 Tüm Görevler → Sheets/DB</h5>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`**Trigger:** Webhooks by Zapier -> Catch Hook\n\n**Action:** Google Sheets / Airtable -> Create Row\n\n**Field Mapping:**\n- Title: {{webhook__data__title}}\n- Description: {{webhook__data__description}}\n- Priority: {{webhook__data__priority}}\n- Category: {{webhook__data__category}}\n- Date: {{webhook__data__date}}\n- Status: {{webhook__data__completed}}`);
                              setTestResult('✅ Şablon panoya kopyalandı!');
                            }}
                            className="p-1.5 rounded bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors opacity-0 group-hover:opacity-100"
                            title="Kopyala"
                          >
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Her görevi otomatik tabloya kaydet</p>
                        <div className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded text-gray-700 dark:text-gray-300">
                          Columns: title, description,<br/>
                          priority, category, date, status
                        </div>
                      </div>

                      {/* Template 4 */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all group">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-sm text-gray-900 dark:text-white">🔥 Yüksek Öncelik → Acil Bildirim</h5>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`**Trigger:** Webhooks by Zapier -> Catch Hook\n\n**Filter:** Only continue if priority = "high"\n\n**Action:** ${selectedTemplate.name} -> Send Urgent Notification\n\n**Field Mapping:**\n- Message: "🔥 ACİL: {{webhook__data__title}}"\n- Description: {{webhook__data__description}}\n- Due Date: {{webhook__data__dueDate}}`);
                              setTestResult('✅ Şablon panoya kopyalandı!');
                            }}
                            className="p-1.5 rounded bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors opacity-0 group-hover:opacity-100"
                            title="Kopyala"
                          >
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Sadece yüksek öncelikli görevleri bildir</p>
                        <div className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {'Filter: priority = "high"\nMessage: "🔥 ACİL: {{title}}"\nDue: {{webhook__data__dueDate}}'}
                        </div>
                      </div>

                        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            💡 <strong>İpucu:</strong> Her şablonun sağ üstündeki <strong>kopyala</strong> butonuna tıklayarak Zapier&apos;a yapıştırabilirsiniz!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Webhook Adı <span className="text-xs text-gray-500 dark:text-gray-400">(Opsiyonel - boş bırakılırsa otomatik oluşturulur)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={`Örn: ${selectedTemplate.name} Bildirimleri`}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[var(--accent-color-500)] focus:border-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Webhook URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder={selectedTemplate.exampleUrl}
                    className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[var(--accent-color-500)] focus:border-[var(--accent-color-500)] transition-colors font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Yukarıdaki kurulum adımlarını takip ederek webhook URL'nizi alın</p>
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
                
                {/* Events Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bildirim Olayları <span className="text-xs text-gray-500 dark:text-gray-400">(En az bir tane seçilmeli)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: 'task_completed', label: '✅ Görev Tamamlandı' },
                      { value: 'task_created', label: '📝 Yeni Görev' },
                      { value: 'task_updated', label: '✏️ Görev Güncellendi' },
                      { value: 'goal_completed', label: '🎯 Hedef Tamamlandı' },
                      { value: 'daily_summary', label: '📊 Günlük Özet' },
                      { value: 'weekly_report', label: '📅 Haftalık Rapor' }
                    ].map((event) => (
                      <label 
                        key={event.value}
                        className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event.value)}
                          onChange={(e) => {
                            const newEvents = e.target.checked
                              ? [...formData.events, event.value]
                              : formData.events.filter(ev => ev !== event.value);
                            setFormData({ ...formData, events: newEvents });
                          }}
                          className="w-4 h-4 text-[var(--accent-color-600)] border-gray-300 rounded focus:ring-[var(--accent-color-500)]"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

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
                        disabled={testingWebhookId === webhook.id || !webhook.isActive}
                        className="bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors shadow-sm"
                      >
                        {testingWebhookId === webhook.id ? '⌛ Test...' : '🧪 Test'}
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
