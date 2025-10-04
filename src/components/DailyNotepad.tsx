import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSpeechRecognition } from '../hooks/useSpeechRecognitionUnified';
import { Note } from '../types';

interface DailyNotepadProps {
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  onOpenAiModal: () => void;
  onAnalyzeImage: (noteId: string) => void;
}

const DailyNotepad: React.FC<DailyNotepadProps> = ({ notes, setNotes, onOpenAiModal, onAnalyzeImage }) => {
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteImage, setNewNoteImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);


  const handleAddNote = (text: string) => {
    if (!text.trim() && !newNoteImage) return;

    const newNote: Note = {
      id: uuidv4(),
      text: text.trim(),
      imageUrl: newNoteImage || undefined,
      createdAt: new Date().toISOString(),
    };

    setNotes([newNote, ...notes]);
    setNewNoteText('');
    setNewNoteImage(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  
  const { isListening, startListening, stopListening, hasSupport } = useSpeechRecognition((finalTranscript) => {
    handleAddNote(finalTranscript)
  });


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewNoteImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddNote(newNoteText);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setNewNoteImage(reader.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };
  
  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleSaveEdit = () => {
    if (editingNoteId) {
      setNotes(notes.map(n => n.id === editingNoteId ? { ...n, text: editText } : n));
      setEditingNoteId(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditText('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
    } else if (e.key === 'Escape') {
        handleCancelEdit();
    }
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900/70 p-3 sm:p-4 rounded-lg min-h-[20rem] sm:min-h-[32rem] flex flex-col">
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--accent-color-500)]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Günlük Not Defterim</span>
          <span className="sm:hidden">Notlarım</span>
        </h3>
        <button
            onClick={onOpenAiModal}
            className="p-2 rounded-full bg-white/50 dark:bg-gray-700 text-[var(--accent-color-500)] hover:bg-white dark:hover:bg-gray-600 transition-all transform hover:scale-110 shadow-sm"
            aria-label="Notları AI ile işle"
            title="Notları AI ile işle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        </button>
      </div>
      
      <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4 custom-scrollbar">
        {notes.length === 0 && (
           <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 p-4">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
             </svg>
             <p className="mt-4 font-semibold text-lg text-gray-600 dark:text-gray-400">Not defteriniz şimdilik boş</p>
             <p className="text-sm">Aklınızdan geçenleri, fikirlerinizi veya anılarınızı buraya ekleyin.</p>
           </div>
        )}
        {notes.map(note => (
            <div key={note.id} className="bg-yellow-50 dark:bg-slate-800 rounded-lg text-sm group relative border border-yellow-200 dark:border-slate-700 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200 overflow-hidden">
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 flex gap-1 sm:gap-1.5 transition-opacity opacity-0 group-hover:opacity-100">
                    <button onClick={() => handleStartEdit(note)} className="p-1 sm:p-1.5 rounded-full bg-black/10 text-gray-600 hover:bg-blue-500 hover:text-white dark:bg-white/10 dark:text-gray-300 dark:hover:bg-blue-500" title="Düzenle">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button onClick={() => handleDeleteNote(note.id)} className="p-1 sm:p-1.5 rounded-full bg-black/10 text-gray-600 hover:bg-red-500 hover:text-white dark:bg-white/10 dark:text-gray-300 dark:hover:bg-red-500" title="Sil">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                </div>
                {note.imageUrl && (
                    <div className="relative">
                        <img src={note.imageUrl} alt="Not görseli" className="w-full h-24 sm:h-32 object-cover"/>
                        <button 
                          onClick={() => onAnalyzeImage(note.id)}
                          className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 z-10 p-1 sm:p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                          aria-label="Resimdeki metni çıkar"
                          title="Resimdeki metni çıkar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                    </div>
                )}
                <div className="p-3 sm:p-4">
                  {editingNoteId === note.id ? (
                      <div>
                        <textarea
                          ref={editInputRef}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="w-full p-2 text-xs sm:text-sm bg-white/50 dark:bg-slate-700/50 border border-yellow-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-[var(--accent-color-500)] focus:outline-none resize-y text-gray-800 dark:text-gray-200"
                          rows={3}
                        />
                        <div className="flex gap-2 mt-2">
                           <button onClick={handleSaveEdit} className="px-2 sm:px-3 py-1 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700">Kaydet</button>
                           <button onClick={handleCancelEdit} className="px-2 sm:px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">İptal</button>
                        </div>
                      </div>
                  ) : (
                    <>
                       <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words min-h-[2rem]">{note.text}</p>
                       <p className="text-right text-xs text-yellow-600 dark:text-slate-400 mt-2 sm:mt-3">
                            {new Date(note.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </>
                  )}
                </div>
            </div>
        ))}
      </div>

      <form onSubmit={handleFormSubmit} className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="bg-white/60 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/60 rounded-lg focus-within:ring-2 focus-within:ring-[var(--accent-color-500)] transition-all">
         {newNoteImage && (
             <div className="relative p-2">
                <img src={newNoteImage} alt="Yeni not önizlemesi" className="max-h-28 w-auto rounded-md"/>
                <button type="button" onClick={() => { setNewNoteImage(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 m-1 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
             </div>
         )}
        <textarea
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          onPaste={handlePaste}
          placeholder="Yeni not ekle veya resim yapıştır..."
          className="w-full p-2 bg-transparent focus:outline-none resize-none text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400"
          rows={2}
        />
        </div>
        <div className="flex justify-between items-center mt-2">
            <div className="flex gap-1">
                <input type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} className="hidden"/>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400" aria-label="Resim Ekle" title="Resim Ekle">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                </button>
                 {hasSupport && (
                    <button type="button" onClick={isListening ? stopListening : startListening} className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'}`} aria-label={isListening ? 'Dinlemeyi Durdur' : 'Sesli Not Ekle'} title={isListening ? 'Dinlemeyi Durdur' : 'Sesli Not Ekle'}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                )}
            </div>
            <button type="submit" className="px-4 py-1.5 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50 text-sm font-semibold shadow-sm hover:shadow-md transition-all" disabled={!newNoteText.trim() && !newNoteImage}>
                Ekle
            </button>
        </div>
      </form>
    </div>
  );
};

export default DailyNotepad;