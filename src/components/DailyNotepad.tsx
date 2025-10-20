import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Note } from '../types';
import { archiveService } from '../services/archiveService';
import { Clipboard } from '@capacitor/clipboard';
import { useAuth } from '../contexts/AuthContext';
import { PencilSquareIcon, HeartIcon, TagIcon, ShareIcon, TrashIcon, BookmarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../contexts/I18nContext';
import { encryptedNotesService } from '../services/encryptedNotesService';

interface DailyNotepadProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  onOpenAiModal: () => void;
  onAnalyzeImage: (noteId: string) => void;
  onShareNote: (note: Note) => void;
  setNotification?: (notification: { message: string; type: 'success' | 'error' } | null) => void;
  onAnalyzePdf?: (pdfFile: File, customPrompt?: string, encryptNotes?: boolean) => void;
  onExtractTextFromImage?: (dataUrl: string) => Promise<string | null>;
  onDeleteNotesRemote?: (ids: string[]) => Promise<void> | void;
  onSelectionModeChange?: (active: boolean) => void;
}

const DailyNotepad: React.FC<DailyNotepadProps> = ({ notes, setNotes, onOpenAiModal, onAnalyzeImage, onShareNote, setNotification, onAnalyzePdf, onExtractTextFromImage, onDeleteNotesRemote, onSelectionModeChange }) => {
  const { t, lang } = useI18n();
  // Get user ID for archive
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  
  // Sorting and filtering state
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterTag, setFilterTag] = useState<string>('');
  const [newNoteText, setNewNoteText] = useState('');
  // Preview URL (Object URL) for immediate display, and Data URL for persistence/sync
  const [newNoteImagePreview, setNewNoteImagePreview] = useState<string | null>(null);
  const [newNoteImageDataUrl, setNewNoteImageDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

// Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Encrypted notes state
  const [encryptNew, setEncryptNew] = useState<boolean>(false);
  const [decryptedTexts, setDecryptedTexts] = useState<Record<string, string>>({});
  const [isVaultOpen, setIsVaultOpen] = useState<boolean>(false);
  const [vaultUnlocked, setVaultUnlocked] = useState<boolean>(false);
  const [vaultError, setVaultError] = useState<string>('');
  const vaultTimerRef = useRef<number | null>(null as any);
  const [vaultDetailNote, setVaultDetailNote] = useState<Note | null>(null);
  const [showEncryptWarning, setShowEncryptWarning] = useState(false);

  // Local undo snackbar state
  const [undoState, setUndoState] = useState<{
    type: 'delete' | 'archive';
    notes: Note[];
  } | null>(null);
  const undoTimerRef = useRef<number | null>(null as any);

  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Inline tag editor state
  const [tagEditorFor, setTagEditorFor] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState<string>('');


const handleAddNote = useCallback(async (text: string) => {
    if (!text.trim() && !newNoteImageDataUrl) return;

    const baseNote: Note = {
      id: uuidv4(),
      text: text.trim(),
      imageUrl: newNoteImageDataUrl || undefined,
      createdAt: new Date().toISOString(),
    };

    let noteToSave: Note = baseNote;

    if (encryptNew) {
      try {
        const enc = await encryptedNotesService.encrypt(baseNote.text);
        noteToSave = {
          ...baseNote,
          text: '',
          isEncrypted: true,
          ciphertext: enc.ciphertext,
          iv: enc.iv,
          salt: enc.salt,
        };
      } catch (e) {
        console.warn('[DailyNotepad] Encryption cancelled or failed:', e);
        return; // do not add note if encryption failed/cancelled
      }
    }

    setNotes(prev => [noteToSave, ...prev]);
    setNewNoteText('');
    if (newNoteImagePreview) URL.revokeObjectURL(newNoteImagePreview);
    setNewNoteImagePreview(null);
    setNewNoteImageDataUrl(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  }, [newNoteImageDataUrl, newNoteImagePreview, encryptNew]);

  
  // Simple Web Speech API implementation - no Capacitor plugins
  const [isListening, setIsListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setHasSupport(!!SpeechRecognition);
  }, []);
  
  const handleTranscript = useCallback((finalTranscript: string) => {
    const transcript = finalTranscript.toLowerCase();
    const commands = {
      tr: ['tamam', 'bitti', 'kaydet', 'not ekle', 'ekle', 'tamam kaydet', 'not olarak kaydet'],
      en: ['okay', 'done', 'save', 'add note', 'save note', 'okay save', 'that\'s it']
    };
    
    const currentCommands = commands[lang as 'tr' | 'en'] || commands.en;
    const hasCommand = currentCommands.some(cmd => {
      const words = transcript.split(' ');
      const lastWords = words.slice(-cmd.split(' ').length).join(' ');
      return lastWords === cmd || transcript.endsWith(cmd);
    });
    
    if (hasCommand) {
      let noteText = finalTranscript;
      for (const cmd of currentCommands) {
        const regex = new RegExp(`\\b${cmd.replace(/'/g, "\\'").replace(/\s+/g, '\\s+')}\\s*$`, 'gi');
        noteText = noteText.replace(regex, '').trim();
      }
      
      if (noteText.trim() || newNoteImageDataUrl) {
        handleAddNote(noteText);
        // Clear immediately after saving
        setTimeout(() => {
          setNewNoteText('');
        }, 0);
        if (setNotification) {
          setNotification({ 
            message: lang === 'tr' ? 'Not sesli komutla kaydedildi!' : 'Note saved with voice command!', 
            type: 'success' 
          });
        }
      }
    } else {
      setNewNoteText(finalTranscript);
    }
  }, [lang, newNoteImageDataUrl, handleAddNote, setNotification]);
  
  const startListening = useCallback(() => {
    if (!hasSupport || isListening) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      
      setNewNoteText(transcript);
      
      // Check if final
      const isFinal = event.results[event.results.length - 1]?.isFinal;
      if (isFinal) {
        handleTranscript(transcript);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (setNotification) {
        setNotification({
          message: 'Ses tanıma hatası: ' + event.error,
          type: 'error'
        });
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [hasSupport, isListening, lang, handleTranscript, setNotification]);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);


  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1) Hemen küçük önizleme için Object URL kullan
      try {
        const objectUrl = URL.createObjectURL(file);
        // Eski önizlemeyi serbest bırak
        if (newNoteImagePreview) URL.revokeObjectURL(newNoteImagePreview);
        setNewNoteImagePreview(objectUrl);
      } catch {}

      // 2) Kalıcı saklama ve OCR için Data URL'e dönüştür
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setNewNoteImageDataUrl(dataUrl);
        // Otomatik metin çıkarma (varsa)
        try {
          if (onExtractTextFromImage) {
            if (setNotification) setNotification({ message: 'Resim analiz ediliyor...', type: 'success' });
            const extracted = await onExtractTextFromImage(dataUrl);
            if (extracted) {
              setNewNoteText(prev => (prev ? `${prev}\n\n${extracted}` : extracted));
              if (setNotification) setNotification({ message: 'Resimdeki metin not alanına eklendi.', type: 'success' });
            } else if (setNotification) {
              setNotification({ message: 'Resimden metin çıkarılamadı.', type: 'error' });
            }
          }
        } catch (err) {
          console.error('[DailyNotepad] Auto extract failed:', err);
          if (setNotification) setNotification({ message: 'Resim analizi başarısız oldu.', type: 'error' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (onAnalyzePdf) {
        // PDF analizi yaparken şifreleme ayarını da ilet
        onAnalyzePdf(file, undefined, encryptNew);
      }
      // Reset input
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    } else if (file) {
      if (setNotification) {
        setNotification({ message: 'Sadece PDF dosyaları yüklenebilir', type: 'error' });
      }
    }
  };

  const handleTogglePin = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n));
  };

  const handleToggleFavorite = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, favorite: !n.favorite, updatedAt: new Date().toISOString() } : n));
  };

  const handleAddTag = (id: string) => {
    setTagEditorFor(id);
    setTagInput('');
  };

  const handleSubmitTags = (id: string) => {
    const input = tagInput;
    const newTags = input.split(',').map(t => t.trim()).filter(Boolean);
    if (newTags.length === 0) { setTagEditorFor(null); return; }
    setNotes(notes.map(n => n.id === id ? { ...n, tags: Array.from(new Set([...(n.tags || []), ...newTags])), updatedAt: new Date().toISOString() } : n));
    setTagEditorFor(null);
    setTagInput('');
  };

  const handleRemoveTag = (id: string, tag: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, tags: (n.tags || []).filter(t => t !== tag), updatedAt: new Date().toISOString() } : n));
  };


  const toggleSelection = (id: string) => {
    setSelectedNoteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllVisible = (visible: Note[]) => {
    setSelectedNoteIds(visible.map(n => n.id));
  };

  const clearSelection = () => setSelectedNoteIds([]);

  const handleBulkDelete = async (visible: Note[]) => {
    const toDelete = visible.filter(n => selectedNoteIds.includes(n.id));
    if (toDelete.length === 0) return;
    // Save for undo
    setUndoState({ type: 'delete', notes: toDelete });
    // Remove from current list
    setNotes(notes.filter(n => !selectedNoteIds.includes(n.id)));
    // Reset selection
    setSelectionMode(false);
    onSelectionModeChange?.(false);
    setSelectedNoteIds([]);
    // Start undo timer (6s)
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), 6000);
    // Remote delete if available (avoid re-appearing after refresh)
    try {
      if (onDeleteNotesRemote) await onDeleteNotesRemote(toDelete.map(n => n.id));
    } catch (e) {
      console.warn('[DailyNotepad] Remote delete failed:', e);
    }
  };

  const handleBulkArchive = async (visible: Note[]) => {
    const toArchive = visible.filter(n => selectedNoteIds.includes(n.id));
    if (toArchive.length === 0) return;
    try {
      console.log(`[DailyNotepad] Archiving ${toArchive.length} notes for user ${userId}`);
      await archiveService.archiveItems([], toArchive, userId);
      // Save for undo
      setUndoState({ type: 'archive', notes: toArchive });
      // Remove from current list
      setNotes(notes.filter(n => !selectedNoteIds.includes(n.id)));
      setSelectionMode(false);
      onSelectionModeChange?.(false);
      setSelectedNoteIds([]);
      // Timer
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = window.setTimeout(() => setUndoState(null), 6000);
      
      // Remove from remote so they don't come back after refresh
      try {
        if (onDeleteNotesRemote) await onDeleteNotesRemote(toArchive.map(n => n.id));
      } catch (e) {
        console.warn('[DailyNotepad] Remote delete after archive failed:', e);
      }
      
      if (setNotification) {
        setNotification({ message: `${toArchive.length} not arşivlendi`, type: 'success' });
      }
    } catch (e: any) {
      console.error('Archive failed:', e);
      if (setNotification) {
        setNotification({ 
          message: e.message || 'Notlar arşivlenemedi. Lütfen tekrar deneyin.', 
          type: 'error' 
        });
      }
    }
  };

  // Single note archive helper (desktop/mobile action button)
  const handleArchiveSingle = async (note: Note) => {
    try {
      console.log(`[DailyNotepad] Archiving single note ${note.id} for user ${userId}`);
      await archiveService.archiveItems([], [note], userId);
      // Remove locally
      setNotes(prev => prev.filter(n => n.id !== note.id));
      // Remote delete to avoid reappearing after refresh
      try {
        if (onDeleteNotesRemote) await onDeleteNotesRemote([note.id]);
      } catch (e) {
        console.warn('[DailyNotepad] Remote delete after single archive failed:', e);
      }
      if (setNotification) setNotification({ message: 'Not arşivlendi', type: 'success' });
    } catch (e: any) {
      console.error('[DailyNotepad] Single archive failed:', e);
      if (setNotification) setNotification({ message: e.message || 'Not arşivlenemedi', type: 'error' });
    }
  };

  const handleBulkShare = async (visible: Note[]) => {
    const toShare = visible.filter(n => selectedNoteIds.includes(n.id));
    if (toShare.length === 0) return;
    const text = toShare.map(n => `📝 ${n.text || '(Resimli Not)'}${n.imageUrl ? '\n📷 (resim var)' : ''}\n— ${new Date(n.createdAt).toLocaleString('tr-TR')}`).join('\n\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Notlar', text });
      } else {
        await Clipboard.write({ string: text });
      }
    } catch (e) {
      console.warn('Share failed:', e);
      try { await Clipboard.write({ string: text }); } catch {}
    }
  };

  const handleUndo = async () => {
    if (!undoState) return;
    const items = undoState.notes;
    
    if (undoState.type === 'delete') {
      // Restore notes (prepend)
      setNotes(prev => [...items, ...prev]);
      if (setNotification) {
        setNotification({ message: `${items.length} not geri yüklendi`, type: 'success' });
      }
    } else if (undoState.type === 'archive') {
      // Remove from archive DB then restore
      try {
        console.log(`[DailyNotepad] Removing ${items.length} notes from archive for user ${userId}`);
        await archiveService.removeNotes(items.map(n => n.id), userId);
        setNotes(prev => [...items, ...prev]);
        if (setNotification) {
          setNotification({ message: `${items.length} not arşivden geri yüklendi`, type: 'success' });
        }
      } catch (error: any) {
        console.error('[Undo] Failed to restore from archive:', error);
        if (setNotification) {
          setNotification({ 
            message: 'Notlar arşivden kaldırılamadı. Yine de UI\'da gösterilecek.', 
            type: 'error' 
          });
        }
        // Still restore in UI even if DB removal fails
        setNotes(prev => [...items, ...prev]);
      }
    }
    
    setUndoState(null);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
  };

  const handleDeleteNote = async (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
    try {
      if (onDeleteNotesRemote) await onDeleteNotesRemote([id]);
    } catch (e) {
      console.warn('[DailyNotepad] Remote single delete failed:', e);
    }
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
setNewNoteImageDataUrl(reader.result as string);
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
      setNotes(notes.map(n => n.id === editingNoteId ? { ...n, text: editText, updatedAt: new Date().toISOString() } : n));
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

  // Simple linkify: convert URLs in plain text to clickable links
  const linkify = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        try {
          new URL(part);
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-[var(--accent-color-600)] break-words">
              {part}
            </a>
          );
        } catch { /* invalid URL fallback */ }
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Toggle checklist checkbox on a specific line
  const toggleChecklistLine = (note: Note, lineIndex: number) => {
    const lines = (note.text || '').split('\n');
    const line = lines[lineIndex] || '';
    const match = line.match(/^\- \[( |x|X)\] (.*)$/);
    if (!match) return;
    const checked = match[1].toLowerCase() === 'x';
    const label = match[2];
    const newLine = `- [${checked ? ' ' : 'x'}] ${label}`;
    lines[lineIndex] = newLine;
    const newText = lines.join('\n');
    setNotes(notes.map(n => n.id === note.id ? { ...n, text: newText, updatedAt: new Date().toISOString() } : n));
  };

// Render markdown-like content with checklist support
  // Improve OCR'd text appearance by merging consecutive short lines into paragraphs
  const renderNoteContent = (note: Note) => {
    // Encrypted note rendering
    if (note.isEncrypted) {
      const decrypted = decryptedTexts[note.id];
      if (decrypted) {
        // render decrypted as normal
        const rawLines = (decrypted || '').split('\n');
        const elements: React.ReactNode[] = [];
        let paragraphBuffer: string[] = [];
        const flushParagraph = (key: string) => {
          if (paragraphBuffer.length > 0) {
            const text = paragraphBuffer.join(' ').replace(/\s+/g, ' ').trim();
            if (text) {
              elements.push(
                <p key={key} className="text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-normal break-words">
                  {linkify(text)}
                </p>
              );
            }
            paragraphBuffer = [];
          }
        };
        rawLines.forEach((line, idx) => {
          const trimmed = line.trim();
          if (trimmed === '') { flushParagraph(`p-${idx}`); return; }
          paragraphBuffer.push(trimmed);
          if (/[\.!?؛،]$/.test(trimmed)) flushParagraph(`p-${idx}`);
        });
        flushParagraph('p-last');
        return <div className="space-y-1">{elements}</div>;
      }
      // locked view
      return (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">🔒 Şifreli not (kilitli)</span>
          <button
            className="px-2 py-1 text-xs rounded bg-[var(--accent-color-600)] text-white hover:bg-[var(--accent-color-700)]"
            onClick={async () => {
              try {
                const plain = await encryptedNotesService.decrypt({ ciphertext: note.ciphertext!, iv: note.iv!, salt: note.salt! });
                setDecryptedTexts(prev => ({ ...prev, [note.id]: plain }));
              } catch (e) {
                alert('Parola hatalı veya çözme başarısız.');
              }
            }}
          >Kilit Aç</button>
        </div>
      );
    }

    const rawLines = (note.text || '').split('\n');
    const elements: React.ReactNode[] = [];
    let paragraphBuffer: string[] = [];

    const flushParagraph = (key: string) => {
      if (paragraphBuffer.length > 0) {
        const text = paragraphBuffer.join(' ').replace(/\s+/g, ' ').trim();
        if (text) {
          elements.push(
            <p key={key} className="text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-normal break-words">
              {linkify(text)}
            </p>
          );
        }
        paragraphBuffer = [];
      }
    };

    rawLines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Headings
      const h1 = trimmed.match(/^# (.*)$/);
      const h2 = trimmed.match(/^## (.*)$/);
      const h3 = trimmed.match(/^### (.*)$/);
      if (h1 || h2 || h3) {
        flushParagraph(`p-${idx}`);
        if (h1) elements.push(<h3 key={`h1-${idx}`} className="text-base sm:text-lg font-bold mt-1">{linkify(h1[1])}</h3>);
        if (h2) elements.push(<h4 key={`h2-${idx}`} className="text-sm sm:text-base font-semibold mt-1">{linkify(h2[1])}</h4>);
        if (h3) elements.push(<h5 key={`h3-${idx}`} className="text-sm font-semibold mt-1">{linkify(h3[1])}</h5>);
        return;
      }

      // Checklist
      const checklist = trimmed.match(/^\- \[( |x|X)\] (.*)$/);
      if (checklist) {
        flushParagraph(`p-${idx}`);
        const checked = checklist[1].toLowerCase() === 'x';
        const label = checklist[2];
        elements.push(
          <label key={`c-${idx}`} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 h-4 w-4 text-[var(--accent-color-600)]" checked={checked} onChange={() => toggleChecklistLine(note, idx)} />
            <span className={`${checked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{linkify(label)}</span>
          </label>
        );
        return;
      }

      // Blank line → paragraph break
      if (trimmed === '') {
        flushParagraph(`p-${idx}`);
        return;
      }

      // Accumulate normal lines into a paragraph buffer
      paragraphBuffer.push(trimmed);

      // If the line ends with punctuation, flush to form a sentence/paragraph
      if (/[\.!?؛،]$/.test(trimmed)) {
        flushParagraph(`p-${idx}`);
      }
    });

    // Flush remaining buffer
    flushParagraph('p-last');

    return <div className="space-y-1">{elements}</div>;
  };

  // Editing helpers for Markdown
  const insertAtCursor = (snippet: string) => {
    const el = editInputRef.current;
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const before = editText.substring(0, start);
    const after = editText.substring(end);
    const next = before + snippet + after;
    setEditText(next);
    setTimeout(() => {
      el.focus();
      const cursor = start + snippet.length;
      el.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const insertChecklistItem = () => insertAtCursor("- [ ] ");
  const applyHeading = (level: 1 | 2 | 3) => {
    const prefix = level === 1 ? '# ' : level === 2 ? '## ' : '### ';
    insertAtCursor(prefix);
  };

  // Derived: compute available tags for filter
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || []))).slice(0, 50);

  // Helper: build note card classes without complex JSX template strings
  const noteCardClasses = (note: Note) => {
    const base = 'relative rounded-lg text-sm group shadow-md hover:shadow-2xl hover:-translate-y-1 hover:border-opacity-80 transition-all duration-300 ease-out border';
    const palette: Record<NonNullable<Note['color']>, string> = {
      yellow: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
      blue: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
      green: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
      red: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
      purple: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
      gray: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
    };
    const colorKey = (note.color || 'yellow') as NonNullable<Note['color']>;
    return `${base} ${palette[colorKey]}`;
  };

  // Derived: filter and sort notes (pinned first always)
  const visibleNotes = notes
    .filter(n => !n.isEncrypted) // Hide encrypted notes from main list
    .filter(n => !filterTag || (n.tags || []).includes(filterTag))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? (tB - tA) : (tA - tB);
    });

  // UI helper classes
  const selectionButtonClass = `px-2 py-1 rounded-md text-xs sm:text-sm border ${selectionMode ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white dark:bg-gray-700'} border-gray-300 dark:border-gray-600`;

  return (
    <div className="bg-gray-100 dark:bg-gray-900/70 p-3 sm:p-4 rounded-lg min-h-[20rem] sm:min-h-[32rem] flex flex-col">
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        {/* Left title area */}
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--accent-color-500)]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">{t('notepad.title','My Daily Notepad')}</span>
          <span className="sm:hidden">{t('notepad.titleShort','Notes')}</span>
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { const next = !selectionMode; setSelectionMode(next); onSelectionModeChange?.(next); if (!selectionMode) setSelectedNoteIds([]); }}
            className={selectionButtonClass}
            title={t('notepad.selectionMode','Selection Mode')}
          >
            <span className="hidden sm:inline">{selectionMode ? t('notepad.closeSelection','Close Selection') : t('notepad.selectionMode','Selection Mode')}</span>
            <span className="sm:hidden">{selectionMode ? t('common.close','Close') : t('notepad.select','Select')}</span>
          </button>
          <button
            onClick={onOpenAiModal}
            className="p-2 rounded-full bg-white/50 dark:bg-gray-700 text-[var(--accent-color-500)] hover:bg-white dark:hover:bg-gray-600 transition-all transform hover:scale-110 shadow-sm"
            aria-label={t('notepad.aiProcess','Process notes with AI')}
            title={t('notepad.aiProcess','Process notes with AI')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        </button>
        <button
            onClick={() => setIsVaultOpen(true)}
            className="p-2 rounded-full bg-white/50 dark:bg-gray-700 text-purple-600 dark:text-purple-300 hover:bg-white dark:hover:bg-gray-600 transition-all transform hover:scale-110 shadow-sm"
            aria-label={t('notepad.encryptedArea','Encrypted Area')}
            title={t('notepad.encryptedArea','Encrypted Area')}
          >
<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" clipRule="evenodd"/></svg>
        </button>
      </div>
    </div>
      
      {/* Selection toolbar (when selection mode) */}
      {selectionMode && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm p-2 bg-white/60 dark:bg-gray-800/60 rounded border border-gray-200 dark:border-gray-700">
          <span className="font-semibold">{t('notepad.selected','Selected')}: {selectedNoteIds.length}</span>
          <div className="flex gap-2">
<button onClick={() => selectAllVisible(visibleNotes)} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">{t('common.selectAll','Select All')}</button>
<button onClick={clearSelection} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">{t('common.clear','Clear')}</button>
          </div>
          <div className="flex gap-2 ml-auto">
<button onClick={() => handleBulkShare(visibleNotes)} className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">{t('common.share','Share')}</button>
<button onClick={() => handleBulkArchive(visibleNotes)} className="px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700">{t('common.archive','Archive')}</button>
<button onClick={() => handleBulkDelete(visibleNotes)} className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">{t('common.delete','Delete')}</button>
          </div>
        </div>
      )}

      {/* Toolbar: Sort & Filter */}
      <div className="mb-2 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 col-span-2 sm:col-auto">
          <label className="hidden sm:block text-gray-600 dark:text-gray-300">{t('notepad.sort','Sort')}:</label>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="w-full sm:w-auto px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
            <option value="newest">{t('notepad.sortNewest','Date: Newest → Oldest')}</option>
            <option value="oldest">{t('notepad.sortOldest','Date: Oldest → Newest')}</option>
          </select>
        </div>
        <div className="flex items-center gap-2 col-span-2 sm:col-auto">
          <label className="hidden sm:block text-gray-600 dark:text-gray-300">{t('notepad.tag','Tag')}:</label>
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="w-full sm:w-auto px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
            <option value="">{t('notepad.allTags','All')}</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 sm:-mr-2 space-y-4 custom-scrollbar">
        {visibleNotes.length === 0 && (
           <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 p-4">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
             </svg>
             <p className="mt-4 font-semibold text-lg text-gray-600 dark:text-gray-400">{t('notepad.emptyTitle','Your notepad is empty for now')}</p>
             <p className="text-sm">{t('notepad.emptyMessage','Add your thoughts, ideas, or memories here.')}</p>
           </div>
        )}
        {visibleNotes.map(note => (
            <div key={note.id} className={noteCardClasses(note)}>
                {/* Selection checkbox */}
                {selectionMode && (
                  <label className="absolute top-1 left-1 sm:top-2 sm:left-2 z-20">
                    <input type="checkbox" checked={selectedNoteIds.includes(note.id)} onChange={() => toggleSelection(note.id)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[var(--accent-color-600)]" />
                  </label>
                )}
                <div className="hidden sm:flex absolute top-1 right-1 sm:top-2 sm:right-2 z-20 gap-1 sm:gap-1.5 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    {/* Pin - hidden on mobile */}
                    <button onClick={() => handleTogglePin(note.id)} className={`hidden sm:flex p-1.5 rounded-full ${note.pinned ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-600/40 dark:text-yellow-200' : 'bg-black/10 text-gray-600 dark:bg-white/10 dark:text-gray-300'} hover:bg-yellow-300`} title={t('notepad.pin','Pin')}>
                        <BookmarkIcon className="h-4 w-4" />
                    </button>
                    {/* Favorite - hidden on mobile */}
                    <button onClick={() => handleToggleFavorite(note.id)} className={`hidden sm:flex p-1.5 rounded-full ${note.favorite ? 'bg-pink-200 text-pink-800 dark:bg-pink-600/40 dark:text-pink-200' : 'bg-black/10 text-gray-600 dark:bg-white/10 dark:text-gray-300'} hover:bg-pink-300`} title={t('notepad.favorite','Favorite')}>
                        <HeartIcon className="h-4 w-4" />
                    </button>
                    {/* Edit */}
                    <button onClick={() => handleStartEdit(note)} className="p-1 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 sm:p-1.5 sm:bg-black/10 sm:text-gray-600 sm:hover:bg-blue-500 sm:hover:text-white sm:dark:bg-white/10 sm:dark:text-gray-300 sm:dark:hover:bg-blue-500" title={t('notepad.edit','Edit')}>
                        <PencilSquareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    {/* Share */}
                    <button onClick={() => onShareNote(note)} className="p-1 rounded-full text-gray-400 hover:text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 sm:p-1.5 sm:bg-black/10 sm:text-gray-600 sm:hover:bg-green-500 sm:hover:text-white sm:dark:bg-white/10 sm:dark:text-gray-300 sm:dark:hover:bg-green-500" title={t('common.share','Share')}>
                        <ShareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    {/* Archive (single) */}
                    <button onClick={(e) => { e.stopPropagation(); handleArchiveSingle(note); }} className="p-1 rounded-full text-gray-400 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50 sm:p-1.5 sm:bg-black/10 sm:text-gray-600 sm:hover:bg-amber-500 sm:hover:text-white sm:dark:bg-white/10 sm:dark:text-gray-300 sm:dark:hover:bg-amber-500" title={t('common.archive','Archive')}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                    </button>
                    {/* Delete */}
                    <button onClick={() => handleDeleteNote(note.id)} className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 sm:p-1.5 sm:bg-black/10 sm:text-gray-600 sm:hover:bg-red-500 sm:hover:text-white sm:dark:bg-white/10 sm:dark:text-gray-300 sm:dark:hover:bg-red-500" title={t('common.delete','Delete')}>
                        <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </div>
                {note.imageUrl && (
                    <div className="relative">
                        <img src={note.imageUrl} alt={t('notepad.noteImage','Note image')} className="w-full h-24 sm:h-32 object-cover"/>
<button 
                          onClick={() => onAnalyzeImage(note.id)}
                          className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 z-10 p-1 sm:p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                          aria-label={t('notepad.extractText','Extract text from image')}
                          title={t('notepad.extractText','Extract text from image')}
                        >
                          <SparklesIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                    </div>
                )}
                <div className="p-2 sm:p-4">
                  {/* Mobile-only toolbar: icons on top, text below */}
                  <div className="sm:hidden mb-2 flex items-center justify-end gap-2">
                    {/* Pin (mobile) */}
                    <div className="relative group">
<button onClick={() => handleTogglePin(note.id)} className={`p-1 rounded-full ${note.pinned ? 'text-yellow-600' : 'text-gray-400'} hover:text-yellow-600 hover:bg-white/10 dark:hover:bg-white/10`} aria-label={t('notepad.pin','Pin')}>
                        <BookmarkIcon className="h-4 w-4" />
                      </button>
<span className="hidden sm:absolute sm:-top-6 sm:right-0 sm:px-1.5 sm:py-0.5 sm:rounded sm:bg-black/70 sm:text-white sm:text-[10px] sm:whitespace-nowrap sm:group-hover:inline-block pointer-events-none select-none">{t('notepad.pin','Pin')}</span>
                    </div>
                    {/* Favorite (mobile) */}
                    <div className="relative group">
<button onClick={() => handleToggleFavorite(note.id)} className={`p-1 rounded-full ${note.favorite ? 'text-pink-600' : 'text-gray-400'} hover:text-pink-600 hover:bg-white/10 dark:hover:bg-white/10`} aria-label={t('notepad.favorite','Favorite')}>
                        <HeartIcon className="h-4 w-4" />
                      </button>
<span className="hidden sm:absolute sm:-top-6 sm:right-0 sm:px-1.5 sm:py-0.5 sm:rounded sm:bg-black/70 sm:text-white sm:text-[10px] sm:whitespace-nowrap sm:group-hover:inline-block pointer-events-none select-none">{t('notepad.favorite','Favorite')}</span>
                    </div>
                    {/* Add tag (mobile) */}
                    <div className="relative group">
<button onClick={() => handleAddTag(note.id)} className="p-1 rounded-full text-gray-400 hover:text-purple-500 hover:bg-white/10 dark:hover:bg-white/10" aria-label={t('notepad.addTag','Add Tag')}>
<TagIcon className="h-4 w-4" />
                      </button>
<span className="hidden sm:absolute sm:-top-6 sm:right-0 sm:px-1.5 sm:py-0.5 sm:rounded sm:bg-black/70 sm:text-white sm:text-[10px] sm:whitespace-nowrap sm:group-hover:inline-block pointer-events-none select-none">{t('notepad.addTag','Add Tag')}</span>
                    </div>
                    <div className="relative group">
<button onClick={() => handleStartEdit(note)} className="p-1 rounded-full text-gray-400 hover:text-blue-500 hover:bg-white/10 dark:hover:bg-white/10" aria-label={t('notepad.edit','Edit')} >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
<span className="hidden sm:absolute sm:-top-6 sm:right-0 sm:px-1.5 sm:py-0.5 sm:rounded sm:bg-black/70 sm:text-white sm:text-[10px] sm:whitespace-nowrap sm:group-hover:inline-block pointer-events-none select-none">{t('notepad.edit','Edit')}</span>
                    </div>
                    <div className="relative group">
<button onClick={() => onShareNote(note)} className="p-1 rounded-full text-gray-400 hover:text-green-500 hover:bg-white/10 dark:hover:bg-white/10" aria-label={t('common.share','Share')} >
                        <ShareIcon className="h-4 w-4" />
                      </button>
<span className="hidden sm:absolute sm:-top-6 sm:right-0 sm:px-1.5 sm:py-0.5 sm:rounded sm:bg-black/70 sm:text-white sm:text-[10px] sm:whitespace-nowrap sm:group-hover:inline-block pointer-events-none select-none">{t('common.share','Share')}</span>
                    </div>
                    <div className="relative group">
<button onClick={() => handleDeleteNote(note.id)} className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-white/10 dark:hover:bg-white/10" aria-label={t('common.delete','Delete')} >
                        <TrashIcon className="h-4 w-4" />
                      </button>
<span className="hidden sm:absolute sm:-top-6 sm:right-0 sm:px-1.5 sm:py-0.5 sm:rounded sm:bg-black/70 sm:text-white sm:text-[10px] sm:whitespace-nowrap sm:group-hover:inline-block pointer-events-none select-none">{t('common.delete','Delete')}</span>
                    </div>
                    {/* Archive (mobile single) */}
                    <div className="relative group">
                      <button onClick={() => handleArchiveSingle(note)} className="p-1 rounded-full text-gray-400 hover:text-amber-600 hover:bg-white/10 dark:hover:bg-white/10" aria-label={t('common.archive','Archive')} >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                      </button>
                      <span className="hidden sm:absolute sm:-top-6 sm:right-0 sm:px-1.5 sm:py-0.5 sm:rounded sm:bg-black/70 sm:text-white sm:text-[10px] sm:whitespace-nowrap sm:group-hover:inline-block pointer-events-none select-none">{t('common.archive','Archive')}</span>
                    </div>
                  </div>
                  {/* Tags Row + Inline Tag Editor (only when not editing the note text) */}
                  <div className="mb-2">
                    {(!editingNoteId || editingNoteId !== note.id) ? (
                      <div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(note.tags || []).map((tag, idx) => (
                            <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-white/70 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 ${idx > 1 ? 'hidden sm:inline-flex' : ''}`}>
                              {tag}
                              <button onClick={() => handleRemoveTag(note.id, tag)} className="ml-1 text-gray-400 hover:text-red-500" title={t('notepad.removeTag','Remove tag')}>×</button>
                            </span>
                          ))}
                          {((note.tags || []).length > 2) && (
                            <span className="inline-flex sm:hidden items-center px-2 py-0.5 rounded-full text-[11px] bg-white/60 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">+{(note.tags || []).length - 2}</span>
                          )}
                          <button onClick={() => handleAddTag(note.id)} className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">
                            {t('notepad.addTag','Add Tag')}
                          </button>
                        </div>
                        {tagEditorFor === note.id ? (
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder={t('notepad.tagPlaceholder','tag1, tag2')} className="flex-1 min-w-[8rem] px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs" />
                            <button onClick={() => handleSubmitTags(note.id)} className="px-2 py-1 rounded bg-[var(--accent-color-600)] text-white text-[11px]">{t('common.add','Add')}</button>
                            <button onClick={() => { setTagEditorFor(null); setTagInput(''); }} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-[11px]">{t('common.cancel','Cancel')}</button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {editingNoteId === note.id ? (
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                        <button onClick={() => applyHeading(1)} type="button" className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">H1</button>
                        <button onClick={() => applyHeading(2)} type="button" className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">H2</button>
                        <button onClick={() => applyHeading(3)} type="button" className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">H3</button>
                        <button onClick={insertChecklistItem} type="button" className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">Checklist</button>
                      </div>
                      <textarea
                        ref={editInputRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="w-full p-2 text-xs sm:text-sm bg-white/50 dark:bg-slate-700/50 border border-yellow-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-[var(--accent-color-500)] focus:outline-none resize-y text-gray-800 dark:text-gray-200"
                        rows={3}
                      />
                      <div className="flex gap-2 mt-2">
                         <button onClick={handleSaveEdit} className="px-2 sm:px-3 py-1 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700">{t('common.save','Save')}</button>
                         <button onClick={handleCancelEdit} className="px-2 sm:px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('common.cancel','Cancel')}</button>
                      </div>
                    </div>
                  ) : (
                      <div>
                       {renderNoteContent(note)}
                       <p className="text-right text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3">
                            {new Date(note.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                  )}
                </div>
            </div>
        ))}
      </div>

      <form onSubmit={handleFormSubmit} className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="bg-white/60 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/60 rounded-lg focus-within:ring-2 focus-within:ring-[var(--accent-color-500)] transition-all relative">
         {(newNoteImagePreview || newNoteImageDataUrl) && (
             <div className="relative p-2">
                <img src={newNoteImagePreview || newNoteImageDataUrl || ''} alt={t('notepad.newNotePreview','New note preview')} className="max-h-28 w-auto rounded-md"/>
                 <button type="button" onClick={() => { if (newNoteImagePreview) URL.revokeObjectURL(newNoteImagePreview); setNewNoteImagePreview(null); setNewNoteImageDataUrl(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 m-1 shadow-md">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                 </button>
              </div>
          )}
        <textarea
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          onPaste={handlePaste}
          placeholder={t('notepad.newNotePlaceholder','Add a new note or paste an image...')}
          className="w-full p-3 sm:p-4 pb-12 bg-transparent focus:outline-none resize-none text-base sm:text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400 min-h-[100px] sm:min-h-[120px]"
          rows={4}
        />
        {/* İkonlar textarea içinde */}
        <div className="absolute bottom-2 left-2 flex gap-1">
            <input type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} className="hidden"/>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 transition-colors" aria-label={t('notepad.addImage','Add Image')} title={t('notepad.addImage','Add Image')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
            </button>
            {onAnalyzePdf && (
              <>
                <input type="file" accept="application/pdf" onChange={handlePdfChange} ref={pdfInputRef} className="hidden"/>
                <button type="button" onClick={() => pdfInputRef.current?.click()} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 transition-colors" aria-label={t('notepad.addPdf','Add PDF')} title={t('notepad.pdfAnalyze','Upload and Analyze PDF')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                </button>
              </>
            )}
             {hasSupport && (
                <button type="button" onClick={isListening ? stopListening : startListening} className={`p-1.5 rounded-full transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'}`} aria-label={isListening ? t('notepad.stopListening','Stop Listening') : t('notepad.voiceNote','Add Voice Note')} title={isListening ? t('notepad.stopListening','Stop Listening') : t('notepad.voiceNote','Add Voice Note')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
            )}
        </div>
        </div>
        <div className="flex justify-between items-center mt-2">
            {/* Profesyonel Şifreli Not Toggle */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input 
                  type="checkbox" 
                  id="encrypt-toggle"
                  checked={encryptNew} 
                  onChange={(e) => {
                    if (e.target.checked && !encryptNew) {
                      setShowEncryptWarning(true);
                    } else {
                      setEncryptNew(e.target.checked);
                    }
                  }}
                  className="sr-only"
                />
                <label 
                  htmlFor="encrypt-toggle" 
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 cursor-pointer ${
                    encryptNew 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30' 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                    encryptNew ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-200 ${
                  encryptNew 
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50' 
                    : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                }`}>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-4 w-4 transition-colors ${
                      encryptNew 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className={`text-sm font-medium transition-colors ${
                    encryptNew 
                      ? 'text-amber-700 dark:text-amber-300' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {encryptNew ? t('notepad.encrypted','🔐 Şifreli') : t('notepad.encryptNew','🔓 Şifrele')}
                  </span>
                </div>
                {encryptNew && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium">{t('notepad.secureMode','Güvenli Mod')}</span>
                  </div>
                )}
              </div>
            </div>
            <button type="submit" className="px-4 py-1.5 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50 text-sm font-semibold shadow-sm hover:shadow-md transition-all" disabled={!newNoteText.trim() && !newNoteImageDataUrl}>
{t('common.add','Add')}
            </button>
        </div>
      </form>
      {/* Undo snackbar */}
      {undoState && (
        <div className="fixed bottom-4 right-4 z-40 bg-gray-900 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
          <span>{undoState.type === 'delete' ? t('notepad.notesDeleted','Notes deleted.') : t('notepad.notesArchived','Notes archived.')}</span>
<button onClick={handleUndo} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded">{t('common.undo','Undo')}</button>
        </div>
      )}

      {/* Encrypted Vault Modal */}
      {isVaultOpen && (<>
        <div className="fixed inset-0 z-[10010] bg-black/70 flex items-center justify-center p-2 sm:p-4" onClick={() => { setIsVaultOpen(false); setVaultUnlocked(false); setVaultError(''); }}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-3xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">🔒 {t('notepad.encryptedArea','Encrypted Area')}</h3>
              <button onClick={() => { setIsVaultOpen(false); setVaultUnlocked(false); setVaultError(''); }} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {!vaultUnlocked ? (
              <div className="p-4 sm:p-6">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t('notepad.enterPassword','Lütfen şifreli alana erişmek için parolanızı girin.')}</p>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setVaultError('');
                  const input = (e.currentTarget.elements.namedItem('vault-pass') as HTMLInputElement);
                  const pass = input?.value || '';
                  if (!pass.trim()) { setVaultError(t('common.required','Zorunlu')); return; }
                  try {
                    encryptedNotesService.setPassphrase(pass.trim());
                    // validate if exists any encrypted note
                    const encList = notes.filter(n => n.isEncrypted);
                    if (encList.length > 0 && encList[0].ciphertext && encList[0].iv && encList[0].salt) {
                      await encryptedNotesService.decrypt({ ciphertext: encList[0].ciphertext as any, iv: encList[0].iv as any, salt: encList[0].salt as any });
                    }
                    setVaultUnlocked(true);
                    // start auto-lock timer (5 min)
                    if (vaultTimerRef.current) window.clearTimeout(vaultTimerRef.current);
                    vaultTimerRef.current = window.setTimeout(() => { setVaultUnlocked(false); encryptedNotesService.clear(); }, 5 * 60 * 1000);
                  } catch {
                    setVaultError(t('notepad.wrongPassword','Parola yanlış.'));
                    encryptedNotesService.clear();
                  }
                }} className="space-y-3">
                  <input name="vault-pass" type="password" autoFocus className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" placeholder={t('notepad.password','Parola')} />
                  {vaultError && <div className="text-red-600 text-sm">{vaultError}</div>}
                  <div className="flex justify-end">
                    <button type="submit" className="px-3 py-1.5 bg-[var(--accent-color-600)] text-white rounded hover:bg-[var(--accent-color-700)]">{t('common.unlock','Kilit Aç')}</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600 dark:text-gray-300">{t('notepad.encryptedNotes','Şifreli notlar')}</div>
                  <button onClick={() => { setVaultUnlocked(false); encryptedNotesService.clear(); }} className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{t('common.lock','Kilitle')}</button>
                </div>
                <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                  {notes.filter(n => n.isEncrypted).length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-10">{t('notepad.noEncryptedNotes','Henüz şifreli not yok.')}</div>
                  )}
                  {notes.filter(n => n.isEncrypted).map(note => (
                    <div key={note.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-2 sm:p-3 cursor-pointer hover:shadow" onClick={() => setVaultDetailNote(note)}>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(note.createdAt).toLocaleString('tr-TR')}</div>
                        {!decryptedTexts[note.id] && (
                          <button onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const plain = await encryptedNotesService.decrypt({ ciphertext: note.ciphertext as any, iv: note.iv as any, salt: note.salt as any });
                              setDecryptedTexts(prev => ({ ...prev, [note.id]: plain }));
                              if (vaultTimerRef.current) { window.clearTimeout(vaultTimerRef.current); vaultTimerRef.current = window.setTimeout(() => { setVaultUnlocked(false); encryptedNotesService.clear(); }, 5*60*1000); }
                            } catch { setVaultError(t('notepad.wrongPassword','Parola yanlış.')); }
                          }} className="text-xs px-2 py-1 rounded bg-[var(--accent-color-600)] text-white">{t('common.unlock','Kilit Aç')}</button>
                        )}
                      </div>
                      {note.imageUrl && (
                        <div className="mt-2 rounded overflow-hidden">
                          <img src={note.imageUrl} alt={t('notepad.noteImage','Note image')} className="w-full h-28 object-cover" />
                        </div>
                      )}
                      <div className="mt-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                        {decryptedTexts[note.id] ? decryptedTexts[note.id] : '🔒 ' + t('notepad.locked','Kilitli')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
      )}
      
      {/* Vault detail modal */}
      {vaultDetailNote && (
          <div className="fixed inset-0 z-[10030] bg-black/60 flex items-center justify-center p-2 sm:p-4" onClick={() => setVaultDetailNote(null)}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] rounded-lg shadow-2xl overflow-auto" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">🔒 {t('notepad.encryptedNoteDetail','Şifreli Not')}</h4>
                <button onClick={() => setVaultDetailNote(null)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-3 sm:p-4 space-y-3">
                {vaultDetailNote.imageUrl && (
                  <img src={vaultDetailNote.imageUrl} alt={t('notepad.noteImage','Note image')} className="w-full max-h-[50vh] object-contain rounded" />
                )}
                <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                  {decryptedTexts[vaultDetailNote.id] ? (
                    decryptedTexts[vaultDetailNote.id]
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>🔒 {t('notepad.locked','Kilitli')}</span>
                      <button onClick={async () => {
                        try {
                          const plain = await encryptedNotesService.decrypt({ ciphertext: vaultDetailNote.ciphertext as any, iv: vaultDetailNote.iv as any, salt: vaultDetailNote.salt as any });
                          setDecryptedTexts(prev => ({ ...prev, [vaultDetailNote.id]: plain }));
                          if (vaultTimerRef.current) { window.clearTimeout(vaultTimerRef.current); vaultTimerRef.current = window.setTimeout(() => { setVaultUnlocked(false); encryptedNotesService.clear(); }, 5*60*1000); }
                        } catch { setVaultError(t('notepad.wrongPassword','Parola yanlış.')); }
                      }} className="px-2 py-1 text-xs rounded bg-[var(--accent-color-600)] text-white">{t('common.unlock','Kilit Aç')}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Encryption Warning Modal */}
      {showEncryptWarning && (
        <div className="fixed inset-0 z-[10050] bg-black/70 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowEncryptWarning(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('notepad.encryptionWarningTitle','Şifreleme Uyarısı')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('notepad.securityFeature','Güvenlik özelliği')}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                  <div className="flex-shrink-0 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">{t('notepad.encryptionInfo','Şifreleme hakkında:')}</p>
                    <p className="text-amber-700 dark:text-amber-300">{t('notepad.encryptionDescription','Notunuz yerel olarak şifrelenir ve yalnızca parolanızla açılabilir. Parolanızı unutursanız notunuza erişemezsiniz.')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">{t('notepad.securityBenefit','Güvenlik faydası:')}</p>
                    <p className="text-blue-700 dark:text-blue-300">{t('notepad.securityDescription','Hassas bilgileriniz güvenli bir şekilde saklanır ve yetkisiz erişimden korunur.')}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowEncryptWarning(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('common.cancel','İptal')}
                </button>
                <button 
                  onClick={() => {
                    setEncryptNew(true);
                    setShowEncryptWarning(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25 transition-all"
                >
                  {t('notepad.enableEncryption','Şifrelemeyi Etkinleştir')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyNotepad;
