import React, { useState } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import { Todo, Note } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Todo | Note | null;
  type: 'todo' | 'note';
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item, type }) => {
  const [copied, setCopied] = useState(false);
  const [shareFormat, setShareFormat] = useState<'simple' | 'detailed' | 'markdown'>('simple');

  if (!isOpen || !item) return null;

  const generateShareText = () => {
    if (type === 'todo') {
      const todo = item as Todo;
      
      switch (shareFormat) {
        case 'simple':
          return `📋 ${todo.text}`;
        
        case 'detailed':
          let text = `📋 Görev: ${todo.text}\n`;
          if (todo.datetime) {
            text += `⏰ Tarih: ${new Date(todo.datetime).toLocaleString('tr-TR')}\n`;
          }
          if (todo.aiMetadata?.category) {
            text += `🏷️ Kategori: ${todo.aiMetadata.category}\n`;
          }
          if (todo.aiMetadata?.estimatedDuration) {
            text += `⌛ Süre: ${todo.aiMetadata.estimatedDuration} dakika\n`;
          }
          if (todo.aiMetadata?.destination) {
            text += `📍 Hedef: ${todo.aiMetadata.destination}\n`;
          }
          return text;
        
        case 'markdown':
          let md = `## 📋 ${todo.text}\n\n`;
          if (todo.datetime) {
            md += `**⏰ Tarih:** ${new Date(todo.datetime).toLocaleString('tr-TR')}\n\n`;
          }
          if (todo.aiMetadata?.category) {
            md += `**🏷️ Kategori:** ${todo.aiMetadata.category}\n\n`;
          }
          if (todo.aiMetadata?.estimatedDuration) {
            md += `**⌛ Tahmini Süre:** ${todo.aiMetadata.estimatedDuration} dakika\n\n`;
          }
          if (todo.aiMetadata?.destination) {
            md += `**📍 Hedef:** ${todo.aiMetadata.destination}\n\n`;
          }
          if (todo.aiMetadata?.routingInfo) {
            md += `### 🗺️ Yol Tarifi:\n${todo.aiMetadata.routingInfo}\n\n`;
          }
          md += `---\n*EchoDay ile oluşturuldu*`;
          return md;
        
        default:
          return todo.text;
      }
    } else {
      const note = item as Note;
      
      switch (shareFormat) {
        case 'simple':
          return `📝 ${note.text || '(Resimli Not)'}`;
        
        case 'detailed':
          let text = `📝 Not:\n${note.text || '(Resimli Not)'}\n`;
          text += `📅 Oluşturulma: ${new Date(note.createdAt).toLocaleString('tr-TR')}\n`;
          if (note.imageUrl) {
            text += `🖼️ Resim içeriyor\n`;
          }
          return text;
        
        case 'markdown':
          let md = `## 📝 Not\n\n`;
          md += `${note.text || '*(Resimli Not)*'}\n\n`;
          if (note.imageUrl) {
            md += `📷 *Bu not bir resim içermektedir*\n\n`;
          }
          md += `---\n*${new Date(note.createdAt).toLocaleString('tr-TR')} tarihinde oluşturuldu*\n`;
          md += `*EchoDay ile kaydedildi*`;
          return md;
        
        default:
          return note.text || '(Resimli Not)';
      }
    }
  };

  const handleCopy = async () => {
    try {
      const text = generateShareText();
      await Clipboard.write({ string: text });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    const text = generateShareText();
    
    // Try Web Share API first (mobile/native sharing)
    if (navigator.share) {
      try {
        await navigator.share({
          title: type === 'todo' ? 'EchoDay Görev' : 'EchoDay Not',
          text: text,
        });
        return; // Success, exit
      } catch (error) {
        // User cancelled or share failed
        if (error instanceof Error && error.name === 'AbortError') {
          // User cancelled, do nothing
          return;
        }
        console.warn('Web Share API failed, falling back to clipboard:', error);
      }
    }
    
    // Fallback: Copy to clipboard
    try {
      await Clipboard.write({ string: text });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Clipboard fallback also failed:', error);
    }
  };

  const shareText = generateShareText();
  const hasWebShare = 'share' in navigator;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--accent-color-600)]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            Paylaş
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Paylaşım Formatı:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShareFormat('simple')}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  shareFormat === 'simple'
                    ? 'bg-[var(--accent-color-600)] text-white border-[var(--accent-color-600)]'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Basit
              </button>
              <button
                onClick={() => setShareFormat('detailed')}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  shareFormat === 'detailed'
                    ? 'bg-[var(--accent-color-600)] text-white border-[var(--accent-color-600)]'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Detaylı
              </button>
              <button
                onClick={() => setShareFormat('markdown')}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  shareFormat === 'markdown'
                    ? 'bg-[var(--accent-color-600)] text-white border-[var(--accent-color-600)]'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Markdown
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Önizleme:</label>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 min-h-[200px] max-h-[400px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">{shareText}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
          {/* Primary Share Button */}
          <button
            onClick={handleShare}
            className={`w-full px-4 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-[var(--accent-color-600)] text-white hover:bg-[var(--accent-color-700)]'
            }`}
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Panoya Kopyalandı!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                {hasWebShare ? 'Paylaş' : 'Panoya Kopyala'}
              </>
            )}
          </button>
          
          {/* Secondary button: Manual copy (only show if Web Share is available) */}
          {hasWebShare && (
            <button
              onClick={handleCopy}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              Veya Panoya Kopyala
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
