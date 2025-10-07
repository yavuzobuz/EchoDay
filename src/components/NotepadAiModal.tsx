import React, { useState, useMemo } from 'react';
import { Note } from '../types';

interface NotepadAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selectedNotes: Note[], prompt: string) => void;
  notes: Note[];
}

const NotepadAiModal: React.FC<NotepadAiModalProps> = ({ isOpen, onClose, onSubmit, notes }) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [prompt, setPrompt] = useState('');

  const noteLines = useMemo(() => notes, [notes]);

  const handleCheckboxChange = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndices.length > 0 && prompt.trim()) {
      const selectedNotes = selectedIndices.map(index => noteLines[index]);
      onSubmit(selectedNotes, prompt.trim());
    }
  };
  
  const setQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notları AI ile İşle</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">1. İşlem Yapılacak Notları Seçin:</h3>
            <div className="touch-compact max-h-40 overflow-y-auto space-y-2 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600">
              {noteLines.length > 0 ? noteLines.map((note, index) => (
                <label key={note.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIndices.includes(index)}
                    onChange={() => handleCheckboxChange(index)}
                    className="h-4 w-4 sm:h-5 sm:w-5 rounded border-gray-300 dark:border-gray-600 text-[var(--accent-color-600)] focus:ring-[var(--accent-color-500)] bg-gray-100 dark:bg-gray-900"
                  />
                  <span className="text-gray-800 dark:text-gray-200 flex-1 min-w-0 break-words">{note.text || '(Resimli Not)'}</span>
                  {note.imageUrl && <img src={note.imageUrl} className="h-8 w-8 object-cover rounded-sm flex-shrink-0" alt="not görseli"/>}
                </label>
              )) : (
                <p className="text-center text-gray-500 dark:text-gray-400">İşlem yapılacak not bulunmuyor.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">2. Hızlı Eylemler (İsteğe Bağlı):</h3>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setQuickPrompt('Bu notları kısa ve anlaşılır bir şekilde özetle.')} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Notları Özetle</button>
                <button type="button" onClick={() => setQuickPrompt('Bu notlardan bir yapılacaklar listesi oluştur.')} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Görev Listesi Oluştur</button>
                <button type="button" onClick={() => setQuickPrompt('Bu notları bir e-posta taslağı haline getir.')} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">E-posta Oluştur</button>
                <button type="button" onClick={() => setQuickPrompt('Bu notlardan başlıkları içeren bir HTML tablo oluştur. Sadece <table> etiketiyle tabloyu döndür. Metin ve varsa resimlerden elde edilen bilgiler de kullanılsın.')} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Tablo Oluştur</button>
            </div>
          </div>

          <div>
             <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">3. AI'dan Ne Yapmasını İstiyorsunuz?</h3>
            <textarea
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none transition-colors duration-300"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Örn: Bu notları özetle ve bir e-posta taslağı oluştur."
            />
          </div>
        </div>
        
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            İptal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50"
            disabled={selectedIndices.length === 0 || !prompt.trim()}
          >
            Gönder
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotepadAiModal;
