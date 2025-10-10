import React, { useState, useEffect } from 'react';
import { EmailTemplate, EmailMessage } from '../types/mail';
import { emailTemplateService } from '../services/emailTemplateService';
import { geminiService } from '../services/geminiService';
import RichTextEditor from './RichTextEditor';

interface EmailTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: EmailTemplate) => void;
  currentEmail?: EmailMessage;
  apiKey?: string;
  accentColor?: 'blue' | 'green' | 'red';
}

const EmailTemplateManager: React.FC<EmailTemplateManagerProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentEmail,
  apiKey,
  accentColor = 'blue',
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{title: string, body: string}>>([]);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    setTemplates(emailTemplateService.getTemplates());
  };

  const handleSave = () => {
    if (editingTemplate && editingTemplate.name && editingTemplate.body) {
      emailTemplateService.saveTemplate(editingTemplate);
      loadTemplates();
      setEditingTemplate(null);
      setIsEditing(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Bu şablonu silmek istediğinizden emin misiniz?')) {
      emailTemplateService.deleteTemplate(id);
      loadTemplates();
    }
  };

  const handleSelect = (template: EmailTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
      onClose();
    }
  };

  const generateAITemplates = async () => {
    if (!currentEmail || !apiKey) {
      alert('AI önerileri için email ve API key gerekli');
      return;
    }

    setIsGeneratingAI(true);
    setAiSuggestions([]);

    try {
      const emailContent = currentEmail.bodyHtml || currentEmail.body || currentEmail.snippet || '';
      const prompt = `Aşağıdaki email'e 3 farklı yanıt şablonu oluştur. Her şablon farklı bir ton ve yaklaşım içermeli:

1. Profesyonel/Resmi Ton
2. Arkadaşça/Samimi Ton  
3. Kısa/Özlü Ton

Email Konusu: ${currentEmail.subject}
Email Gönderen: ${currentEmail.from.address}
Email İçeriği: ${emailContent.substring(0, 500)}

Her şablon için JSON formatında döndür:
[
  {"title": "Şablon Adı", "body": "<p>HTML formatında yanıt içeriği</p>"},
  ...
]

Sadece JSON array döndür, başka açıklama ekleme.`;

      const response = await geminiService.generateText(apiKey, prompt);
      
      if (response) {
        try {
          // Response'dan JSON'ı parse et
          const jsonMatch = response.match(/\[\s*{[\s\S]*}\s*\]/);
          if (jsonMatch) {
            const suggestions = JSON.parse(jsonMatch[0]);
            setAiSuggestions(suggestions);
          } else {
            throw new Error('JSON formatı bulunamadı');
          }
        } catch (e) {
          console.error('AI response parse error:', e);
          alert('AI yanıtı işlenirken hata oluştu');
        }
      }
    } catch (error) {
      console.error('AI template generation error:', error);
      alert('AI şablon oluşturulurken hata oluştu');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const saveAISuggestion = (suggestion: {title: string, body: string}) => {
    emailTemplateService.saveTemplate({
      name: suggestion.title,
      body: suggestion.body,
    });
    loadTemplates();
    setAiSuggestions([]);
  };

  if (!isOpen) return null;

  // Temaya göre gradient ve renk ayarları
  const themeColors = {
    blue: {
      header: 'from-blue-500 via-cyan-500 to-indigo-500',
      gradient: 'from-blue-500 to-cyan-600',
      light: 'bg-blue-50 dark:bg-blue-900/20',
      hover: 'hover:border-blue-500 dark:hover:border-blue-400',
    },
    green: {
      header: 'from-green-500 via-emerald-500 to-teal-500',
      gradient: 'from-green-500 to-emerald-600',
      light: 'bg-green-50 dark:bg-green-900/20',
      hover: 'hover:border-green-500 dark:hover:border-green-400',
    },
    red: {
      header: 'from-red-500 via-pink-500 to-rose-500',
      gradient: 'from-red-500 to-pink-600',
      light: 'bg-red-50 dark:bg-red-900/20',
      hover: 'hover:border-red-500 dark:hover:border-red-400',
    },
  };

  const colors = themeColors[accentColor];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r ${colors.header}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Email Şablonları
                </h2>
                <p className="text-xs text-white/80">Hızlı yanıt şablonlarınızı yönetin</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && !aiSuggestions.length && currentEmail && apiKey && (
                <button
                  onClick={generateAITemplates}
                  disabled={isGeneratingAI}
                  className="px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isGeneratingAI ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      🤖 AI ile Oluştur
                    </>
                  )}
                </button>
              )}
              {!isEditing && !aiSuggestions.length && (
                <button
                  onClick={() => {
                    setEditingTemplate({ name: '', subject: '', body: '' });
                    setIsEditing(true);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Yeni Şablon
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {aiSuggestions.length > 0 ? (
            // AI Suggestions View
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    🤖 AI Tarafından Önerilen Şablonlar
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Email'e uygun 3 farklı yanıt şablonu oluşturuldu
                  </p>
                </div>
                <button
                  onClick={() => setAiSuggestions([])}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  İptal
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="group p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-400 transition-all hover:shadow-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white font-bold shadow-lg`}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {suggestion.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">AI Önerisi</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg max-h-32 overflow-y-auto">
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                        dangerouslySetInnerHTML={{ __html: suggestion.body }}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => saveAISuggestion(suggestion)}
                        className={`flex-1 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r ${colors.gradient} hover:shadow-lg rounded-lg transition-all`}
                      >
                        💾 Kaydet ve Kullan
                      </button>
                      {onSelectTemplate && (
                        <button
                          onClick={() => {
                            onSelectTemplate({
                              id: 'temp-' + Date.now(),
                              name: suggestion.title,
                              body: suggestion.body,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            });
                            onClose();
                          }}
                          className={`px-4 py-2 text-sm font-semibold ${colors.light} rounded-lg transition-colors`}
                          style={{ color: `var(--${accentColor}-700)` }}
                        >
                          Direkt Kullan
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isEditing && editingTemplate ? (
            // Edit Form
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Şablon Adı *
                </label>
                <input
                  type="text"
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="ör: Teşekkür Mesajı"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Konu (opsiyonel)
                </label>
                <input
                  type="text"
                  value={editingTemplate.subject || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="ör: Teşekkürler"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  İçerik *
                </label>
                <RichTextEditor
                  value={editingTemplate.body || ''}
                  onChange={(html) => setEditingTemplate({ ...editingTemplate, body: html })}
                  placeholder="Şablon içeriğini buraya yazın..."
                  minHeight="250px"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={!editingTemplate.name || !editingTemplate.body}
                  className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💾 Kaydet
                </button>
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsEditing(false);
                  }}
                  className="px-6 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          ) : (
            // Template List
            <div>
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Henüz şablon yok</p>
                  <button
                    onClick={() => {
                      setEditingTemplate({ name: '', subject: '', body: '' });
                      setIsEditing(true);
                    }}
                    className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    + İlk Şablonunu Oluştur
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => {

                    return (
                      <div
                        key={template.id}
                        className={`group relative p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl ${colors.hover} hover:shadow-xl transition-all bg-white dark:bg-gray-800 overflow-hidden`}
                      >
                        {/* Gradient hover effect */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />

                        <div className="relative">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white font-bold shadow-lg`}>
                                📝
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                  {template.name}
                                </h3>
                                {template.subject && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {template.subject}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingTemplate(template);
                                  setIsEditing(true);
                                }}
                                className={`p-2 hover:bg-opacity-10 rounded-lg transition-colors`}
                                style={{ color: `var(--${accentColor}-600)` }}
                                title="Düzenle"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(template.id)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Sil"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="text-sm mb-4 line-clamp-3 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <div 
                              className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                              dangerouslySetInnerHTML={{ __html: template.body }}
                            />
                          </div>

                          {onSelectTemplate && (
                            <button
                              onClick={() => handleSelect(template)}
                              className={`w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r ${colors.gradient} hover:shadow-lg rounded-lg transition-all transform hover:scale-[1.02]`}
                            >
                              <span className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Bu Şablonu Kullan
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateManager;
