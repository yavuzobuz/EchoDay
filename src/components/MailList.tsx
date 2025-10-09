import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { Todo, Note, Priority, EmailSummary } from '../types';
import { mailService } from '../services/mailService';
import { EmailAccount, EmailMessage } from '../types/mail';
import { geminiService } from '../services/geminiService';

interface MailListProps {
  onConnectClick: () => void;
  apiKey: string;
}

const MailList: React.FC<MailListProps> = ({ onConnectClick, apiKey }) => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opMsg, setOpMsg] = useState<string | null>(null);
  const [emailSummary, setEmailSummary] = useState<EmailSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  const htmlToText = (html?: string): string => {
    if (!html) return '';
    const el = document.createElement('div');
    el.innerHTML = html;
    const text = el.textContent || el.innerText || '';
    return text.replace(/\s+$/g, '').slice(0, 4000); // limit size defensively
  };

  const analyzeEmailWithAI = async (email: EmailMessage) => {
    console.log('[MailList] Debug - API key from prop:', { hasKey: !!apiKey, type: typeof apiKey, length: apiKey?.length });
    
    if (!apiKey) {
      setOpMsg('AI analizi için Gemini API key gerekli - Ayarlara gidin');
      setTimeout(() => setOpMsg(null), 3000);
      return;
    }

    setIsAnalyzing(true);
    try {
      const summary = await geminiService.analyzeEmail(apiKey, email);
      if (summary) {
        setEmailSummary(summary);
        console.log('[MailList] Email summary:', summary);
      } else {
        setOpMsg('Email analizi başarısız oldu');
        setTimeout(() => setOpMsg(null), 3000);
      }
    } catch (error) {
      console.error('Error analyzing email:', error);
      setOpMsg('Email analizi sırasında hata oluştu');
      setTimeout(() => setOpMsg(null), 3000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveTasksFromSummary = (tasks: EmailSummary['suggestedTasks']) => {
    if (!tasks || tasks.length === 0) return;
    
    try {
      const todosKey = `todos_${userId}`;
      const existing: Todo[] = JSON.parse(localStorage.getItem(todosKey) || '[]');
      
      const newTodos: Todo[] = tasks.map(task => ({
        id: uuidv4(),
        text: task.text,
        priority: task.priority,
        datetime: task.datetime,
        completed: false,
        createdAt: new Date().toISOString(),
        aiMetadata: { 
          category: task.category,
          estimatedDuration: task.estimatedDuration,
          tags: ['email', 'ai-suggested'] 
        },
      }));
      
      const updated = [...newTodos, ...existing];
      localStorage.setItem(todosKey, JSON.stringify(updated));
      setOpMsg(`${newTodos.length} görev eklendi`);
      setTimeout(() => setOpMsg(null), 3000);
    } catch (e) {
      console.error('saveTasksFromSummary failed', e);
      setOpMsg('Görevler eklenemedi');
      setTimeout(() => setOpMsg(null), 3000);
    }
  };

  const saveNotesFromSummary = (notes: EmailSummary['suggestedNotes']) => {
    if (!notes || notes.length === 0) return;
    
    try {
      const notesKey = `notes_${userId}`;
      const existing: Note[] = JSON.parse(localStorage.getItem(notesKey) || '[]');
      
      const newNotes: Note[] = notes.map(note => ({
        id: uuidv4(),
        text: `${note.title}\n\n${note.content}`,
        createdAt: new Date().toISOString(),
        tags: note.tags || ['email', 'ai-suggested'],
      }));
      
      const updated = [...newNotes, ...existing];
      localStorage.setItem(notesKey, JSON.stringify(updated));
      setOpMsg(`${newNotes.length} not eklendi`);
      setTimeout(() => setOpMsg(null), 3000);
    } catch (e) {
      console.error('saveNotesFromSummary failed', e);
      setOpMsg('Notlar eklenemedi');
      setTimeout(() => setOpMsg(null), 3000);
    }
  };

  const saveToNotes = (email: EmailMessage) => {
    try {
      const notesKey = `notes_${userId}`;
      const existing: Note[] = JSON.parse(localStorage.getItem(notesKey) || '[]');
      const plain = email.bodyHtml ? htmlToText(email.bodyHtml) : (email.body || email.bodyPreview || email.snippet || '');
      const lines = [
        `Konu: ${email.subject || '(Konu yok)'}`,
        `Gönderen: ${email.from.name || email.from.address} <${email.from.address}>`,
        `Tarih: ${new Date(email.date).toLocaleString('tr-TR')}`,
        '',
        'Özet:',
        plain
      ];
      const newNote: Note = {
        id: uuidv4(),
        text: lines.join('\n'),
        createdAt: new Date().toISOString(),
      };
      const updated = [newNote, ...existing];
      localStorage.setItem(notesKey, JSON.stringify(updated));
      setOpMsg('E-posta notlara eklendi');
      setTimeout(() => setOpMsg(null), 2500);
    } catch (e) {
      console.error('saveToNotes failed', e);
      setOpMsg('Notlara eklenemedi');
      setTimeout(() => setOpMsg(null), 2500);
    }
  };

  const saveToTodos = (email: EmailMessage) => {
    try {
      const todosKey = `todos_${userId}`;
      const existing: Todo[] = JSON.parse(localStorage.getItem(todosKey) || '[]');
      const newTodo: Todo = {
        id: uuidv4(),
        text: `E-posta: ${email.subject || '(Konu yok)'}`,
        priority: Priority.Medium,
        datetime: null,
        completed: false,
        createdAt: new Date().toISOString(),
        aiMetadata: { tags: ['email'] },
      };
      const updated = [newTodo, ...existing];
      localStorage.setItem(todosKey, JSON.stringify(updated));
      setOpMsg('E-postadan görev oluşturuldu');
      setTimeout(() => setOpMsg(null), 2500);
    } catch (e) {
      console.error('saveToTodos failed', e);
      setOpMsg('Görev oluşturulamadı');
      setTimeout(() => setOpMsg(null), 2500);
    }
  };

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load emails when account is selected
  useEffect(() => {
    if (selectedAccount) {
      loadEmails(selectedAccount.id);
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    
    const response = await mailService.getEmailAccounts();
    
    if (response.success && response.data) {
      const remote = response.data;
      // Load local custom accounts
      const custom = JSON.parse(localStorage.getItem('customMailAccounts') || '[]').map((c: any) => ({ id: c.id, provider: 'custom', emailAddress: c.user, displayName: c.user, customConfig: c }));
      const merged = [...custom, ...remote];
      setAccounts(merged as any);
      if (merged.length > 0 && !selectedAccount) {
        setSelectedAccount(merged[0] as any);
      }
    } else {
      setError(response.error || 'Hesaplar yüklenemedi');
    }
    
    setIsLoading(false);
  };

  const loadEmails = async (accountId: string) => {
    setIsLoading(true);
    setError(null);
    
    if (selectedAccount?.provider === 'custom' && (selectedAccount as any).customConfig) {
      const cfg = (selectedAccount as any).customConfig;
      const j = await mailService.listIMAP(cfg, 20);
      if (j.success) setEmails(j.data);
      else setError(j.error || 'E-postalar yüklenemedi');
    } else {
      const response = await mailService.fetchEmails(accountId, 20);
      if (response.success && response.data) {
        setEmails(response.data);
      } else {
        setError(response.error || 'E-postalar yüklenemedi');
      }
    }
    
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Dün';
    } else if (days < 7) {
      return `${days} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }
  };

  const getProviderIcon = (provider: string) => {
    if (provider === 'gmail') {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M5,5 L7,6.5 L12,10 L17,6.5 L19,5 L12,0 Z" />
          <path fill="#FBBC05" d="M0,8 L5,5 L5,17 L0,20 Z" />
          <path fill="#34A853" d="M24,8 L19,5 L19,17 L24,20 Z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#0078D4" d="M0,0 h24 v24 H0 Z" />
        <path fill="#FFF" d="M6,6 h5 v5 H6 Z M13,6 h5 v5 h-5 Z M6,13 h5 v5 H6 Z M13,13 h5 v5 h-5 Z" />
      </svg>
    );
  };

  // No accounts connected
  if (accounts.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Mail Hesabı Bağlayın
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            E-postalarınızı görüntülemek için Gmail veya Outlook hesabınızı bağlayın.
          </p>
          <button
            onClick={onConnectClick}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            📧 Mail Hesabı Bağla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Account & Email List */}
      <div className="w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        {/* Account Selector */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Gelen Kutusu</h2>
            <button
              onClick={onConnectClick}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Yeni hesap ekle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {/* Selected Account Display */}
          {selectedAccount && (
            <div className="relative">
              {accounts.length > 1 ? (
                <select
                  value={selectedAccount.id}
                  onChange={(e) => {
                    const account = accounts.find(acc => acc.id === e.target.value);
                    if (account) setSelectedAccount(account);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.provider.toUpperCase()} - {account.emailAddress}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {getProviderIcon(selectedAccount.provider)}
                  <span className="truncate">{selectedAccount.emailAddress}</span>
                </div>
              )}
              {accounts.length > 1 && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-gray-500 dark:text-gray-400">Henüz e-posta yok</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {emails.map((email) => (
                <button
                  key={email.id}
                  onClick={async () => {
                    setSelectedEmail(email);
                    setEmailSummary(null); // Önceki özetlemeyi temizle
                    try {
                      const detail = selectedAccount?.provider === 'custom' ? await mailService.imapMessage((selectedAccount as any).customConfig, email.id) : await mailService.getEmailDetail(selectedAccount!.id, email.id);
                      if (detail.success && detail.data) {
                        setSelectedEmail(prev => prev ? { ...prev, bodyHtml: detail.data.bodyHtml || prev.bodyHtml, attachments: (detail.data as any).attachments || prev.attachments } : prev);
                      } else {
                        console.error('Failed to fetch email detail:', detail.error);
                        setError(detail.error || 'E-posta içeriği alınamadı');
                      }
                    } catch (e) { 
                      console.error('Exception fetching email detail:', e);
                      setError('E-posta içeriği alınırken bir hata oluştu');
                    }
                  }}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedEmail?.id === email.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${!email.isRead ? 'font-semibold' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-sm truncate flex-1 ${!email.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {email.from.name || email.from.address}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-2 flex-shrink-0">
                      {formatDate(email.date)}
                    </span>
                  </div>
                  <div className={`text-sm mb-1 truncate ${!email.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {email.subject || '(Konu yok)'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                    {email.snippet}
                  </div>
                  {email.hasAttachments && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs text-gray-700 dark:text-gray-300">
                        📎 Ek var
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Detail View */}
      <div className="flex-1 bg-white dark:bg-gray-800">
        {selectedEmail ? (
          <div className="h-full flex flex-col">
            {/* Email Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedEmail.subject || '(Konu yok)'}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedEmail.from.name || selectedEmail.from.address}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedEmail.from.address}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                    {new Date(selectedEmail.date).toLocaleString('tr-TR')}
                  </div>
                  <button
                    onClick={() => analyzeEmailWithAI(selectedEmail)}
                    disabled={isAnalyzing}
                    className="px-3 py-1.5 text-xs rounded bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900/60 disabled:opacity-50"
                    title="AI ile e-postayı analiz et"
                  >
                    {isAnalyzing ? '🔄 Analiz ediliyor...' : '🤖 AI Analiz'}
                  </button>
                  <button
                    onClick={() => saveToNotes(selectedEmail)}
                    className="px-3 py-1.5 text-xs rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                    title="Bu e-postayı notlara ekle"
                  >
                    📝 Notlara Ekle
                  </button>
                  <button
                    onClick={() => saveToTodos(selectedEmail)}
                    className="px-3 py-1.5 text-xs rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"
                    title="Bu e-postadan görev oluştur"
                  >
                    ✅ Görev Oluştur
                  </button>
                </div>
              </div>
              {opMsg && (
                <div className="mt-3 px-3 py-2 text-xs rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 inline-block">
                  {opMsg}
                </div>
              )}
            </div>

            {/* AI Summary Panel */}
            {emailSummary && (
              <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      🤖 AI Analiz
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        emailSummary.urgency === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                        emailSummary.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                      }`}>
                        {emailSummary.urgency === 'high' ? 'Yüksek Aciliyet' : emailSummary.urgency === 'medium' ? 'Orta Aciliyet' : 'Düşük Aciliyet'}
                      </span>
                    </h3>
                    <button
                      onClick={() => setEmailSummary(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* Summary */}
                  <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">Özet:</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{emailSummary.summary}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Key Points */}
                    {emailSummary.keyPoints.length > 0 && (
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Önemli Noktalar:</h4>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {emailSummary.keyPoints.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Action Items */}
                    {emailSummary.actionItems.length > 0 && (
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Aksiyon Gereken:</h4>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {emailSummary.actionItems.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-red-500 mt-1">❗</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {/* Entities */}
                  {(emailSummary.entities.dates?.length || emailSummary.entities.people?.length || emailSummary.entities.organizations?.length || emailSummary.entities.locations?.length || emailSummary.entities.amounts?.length) && (
                    <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Önemli Bilgiler:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        {emailSummary.entities.dates?.length > 0 && (
                          <div>
                            <div className="font-medium text-blue-600 dark:text-blue-400">📅 Tarihler:</div>
                            {emailSummary.entities.dates.map((date, idx) => <div key={idx} className="text-gray-600 dark:text-gray-400">{date}</div>)}
                          </div>
                        )}
                        {emailSummary.entities.people?.length > 0 && (
                          <div>
                            <div className="font-medium text-green-600 dark:text-green-400">👥 Kişiler:</div>
                            {emailSummary.entities.people.map((person, idx) => <div key={idx} className="text-gray-600 dark:text-gray-400">{person}</div>)}
                          </div>
                        )}
                        {emailSummary.entities.organizations?.length > 0 && (
                          <div>
                            <div className="font-medium text-purple-600 dark:text-purple-400">🏢 Kurumlar:</div>
                            {emailSummary.entities.organizations.map((org, idx) => <div key={idx} className="text-gray-600 dark:text-gray-400">{org}</div>)}
                          </div>
                        )}
                        {emailSummary.entities.locations?.length > 0 && (
                          <div>
                            <div className="font-medium text-red-600 dark:text-red-400">📍 Konumlar:</div>
                            {emailSummary.entities.locations.map((loc, idx) => <div key={idx} className="text-gray-600 dark:text-gray-400">{loc}</div>)}
                          </div>
                        )}
                        {emailSummary.entities.amounts?.length > 0 && (
                          <div>
                            <div className="font-medium text-yellow-600 dark:text-yellow-400">💰 Tutarlar:</div>
                            {emailSummary.entities.amounts.map((amount, idx) => <div key={idx} className="text-gray-600 dark:text-gray-400">{amount}</div>)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Suggested Actions */}
                  {(emailSummary.suggestedTasks?.length || emailSummary.suggestedNotes?.length) && (
                    <div className="mt-4 flex gap-2">
                      {emailSummary.suggestedTasks && emailSummary.suggestedTasks.length > 0 && (
                        <button
                          onClick={() => saveTasksFromSummary(emailSummary.suggestedTasks)}
                          className="px-3 py-2 text-sm rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"
                        >
                          ✅ {emailSummary.suggestedTasks.length} Görev Ekle
                        </button>
                      )}
                      {emailSummary.suggestedNotes && emailSummary.suggestedNotes.length > 0 && (
                        <button
                          onClick={() => saveNotesFromSummary(emailSummary.suggestedNotes)}
                          className="px-3 py-2 text-sm rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                        >
                          📝 {emailSummary.suggestedNotes.length} Not Ekle
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedEmail.bodyHtml ? (
                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.bodyHtml) }} />
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {selectedEmail.body || selectedEmail.snippet || selectedEmail.bodyPreview}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p>Görüntülemek için bir e-posta seçin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MailList;
