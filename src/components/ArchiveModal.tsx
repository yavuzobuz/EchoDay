import React, { useState, useEffect, useMemo } from 'react';
import { Todo, Note, Priority, DashboardStats } from '../types';
import { archiveService } from '../services/archiveService';
import PeriodicReportView from './PeriodicReportView';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTodos: Todo[];
  currentNotes?: Note[]; // Optional for backward compatibility
}

type ArchiveView = 'search' | 'stats' | 'reports';

const BarChart: React.FC<{ data: DashboardStats['last7Days'] }> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.count), 1);
  const weekdays = ['Paz', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <div className="w-full h-48 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg flex justify-around items-end gap-2">
      {data.map((day, _index) => {
        const barHeight = (day.count / maxValue) * 100;
        const dayOfWeek = weekdays[new Date(day.date).getDay()];
        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="text-xs text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity font-bold">{day.count}</div>
            <div
              className="w-full bg-[var(--accent-color-600)] bg-opacity-40 hover:bg-opacity-100 rounded-t-md transition-all duration-300"
              style={{ height: `${barHeight}%` }}
              title={`${day.count} görev`}
            ></div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{dayOfWeek}</div>
          </div>
        );
      })}
    </div>
  );
};

const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose, currentTodos, currentNotes = [] }) => {
  const [results, setResults] = useState<{ todos: Todo[]; notes: Note[] }>({ todos: [], notes: [] });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchMode, setSearchMode] = useState<'date' | 'query' | 'all'>('date');
  const [view, setView] = useState<ArchiveView>('search');
  // DB health status
  const [dbHealthy, setDbHealthy] = useState<boolean>(true);
  const [_dbErrors, setDbErrors] = useState<string[]>([]);
  
  // Delete mode state
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Detail view state
  const [detailView, setDetailView] = useState<{ type: 'todo' | 'note'; item: Todo | Note } | null>(null);

  useEffect(() => {
    if (isOpen) {
        // Check DB health when modal opens
        archiveService.checkDatabaseHealth().then(h => {
          setDbHealthy(h.isHealthy);
          setDbErrors(h.errors || []);
        }).catch(() => {
          setDbHealthy(false);
        });
        if (view === 'search' && searchMode === 'date') {
            fetchByDate(selectedDate);
        } else if (view === 'stats' && !stats) {
            fetchStats();
        }
    } else {
      // Reset state on close
      setSearchQuery('');
      setResults({ todos: [], notes: [] });
      setStats(null);
      setSearchMode('date');
      setView('search');
      setDeleteMode(false);
      setSelectedTodoIds([]);
      setSelectedNoteIds([]);
      setNotification(null);
      setDetailView(null);
      setDbHealthy(true);
      setDbErrors([]);
    }
  }, [isOpen, selectedDate, searchMode, view]);

  const fetchByDate = async (date: string) => {
    setIsLoading(true);
    const data = await archiveService.getArchivedItemsForDate(date);
    setResults(data);
    setIsLoading(false);
  };
  
  const handleRepairDatabase = async () => {
    if (!window.confirm('Veritabanını onarmak tüm arşiv verilerini silecektir. Devam etmek istiyor musunuz?')) return;
    setIsLoading(true);
    const ok = await archiveService.resetArchiveDatabase();
    setIsLoading(false);
    if (ok) {
      setDbHealthy(true);
      setDbErrors([]);
      // Refresh current view
      if (searchMode === 'date') await fetchByDate(selectedDate);
      else if (searchMode === 'all') await fetchAllArchived();
      else setResults({ todos: [], notes: [] });
      setStats(null);
      alert('Veritabanı sıfırlandı. Arşiv temizlendi ve yeniden oluşturuldu.');
    } else {
      alert('Veritabanı onarılamadı. Lütfen uygulamayı yeniden başlatın.');
    }
  };
  
  const fetchAllArchived = async () => {
    setIsLoading(true);
    setSearchMode('all');
    const data = await archiveService.getAllArchivedItems();
    setResults(data);
    setIsLoading(false);
  };
  
  const handleManualArchive = async () => {
    const completedTodos = currentTodos.filter(t => t.completed);
    const notesToArchive = currentNotes || [];
    
    if (completedTodos.length === 0 && notesToArchive.length === 0) {
      setNotification({ 
        message: 'Arşivlenecek tamamlanmış görev veya not bulunamadı.', 
        type: 'error' 
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    const message = completedTodos.length > 0 && notesToArchive.length > 0
      ? `${completedTodos.length} tamamlanmış görev ve ${notesToArchive.length} not arşivlenecek.`
      : completedTodos.length > 0
      ? `${completedTodos.length} tamamlanmış görev arşivlenecek.`
      : `${notesToArchive.length} not arşivlenecek.`;
    
    if (!window.confirm(`${message} Devam etmek istiyor musunuz?`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      await archiveService.archiveItems(completedTodos, notesToArchive);
      
      const successMessage = completedTodos.length > 0 && notesToArchive.length > 0
        ? `${completedTodos.length} görev ve ${notesToArchive.length} not başarıyla arşivlendi!`
        : completedTodos.length > 0
        ? `${completedTodos.length} görev başarıyla arşivlendi!`
        : `${notesToArchive.length} not başarıyla arşivlendi!`;
      
      setNotification({ 
        message: successMessage, 
        type: 'success' 
      });
      setTimeout(() => setNotification(null), 3000);
      
      // Refresh search if in date mode
      if (searchMode === 'date') {
        await fetchByDate(selectedDate);
      } else if (searchMode === 'all') {
        await fetchAllArchived();
      }
    } catch (error: any) {
      setNotification({ 
        message: error.message || 'Arşivleme başarısız oldu.', 
        type: 'error' 
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchStats = async () => {
    setIsLoading(true);
    const data = await archiveService.getDashboardStats(currentTodos);
    setStats(data);
    setIsLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchMode('query');
    setIsLoading(true);
    const data = await archiveService.searchArchive(searchQuery);
    setResults(data);
    setIsLoading(false);
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchMode('date');
    setSelectedDate(e.target.value);
  }
  
  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setSelectedTodoIds([]);
    setSelectedNoteIds([]);
  };
  
  const toggleTodoSelection = (id: string) => {
    setSelectedTodoIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  
  const toggleNoteSelection = (id: string) => {
    setSelectedNoteIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  
  const handleDeleteSelected = async () => {
    if (selectedTodoIds.length === 0 && selectedNoteIds.length === 0) {
      setNotification({ message: 'Lütfen silmek için en az bir öğe seçin.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    if (!window.confirm(`${selectedTodoIds.length} görev ve ${selectedNoteIds.length} not kalıcı olarak silinecek. Emin misiniz?`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      const result = await archiveService.deleteArchivedItems(selectedTodoIds, selectedNoteIds);
      
      // Remove deleted items from current results
      setResults(prev => ({
        todos: prev.todos.filter(t => !selectedTodoIds.includes(t.id)),
        notes: prev.notes.filter(n => !selectedNoteIds.includes(n.id))
      }));
      
      setSelectedTodoIds([]);
      setSelectedNoteIds([]);
      setDeleteMode(false);
      
      setNotification({ 
        message: `${result.todosDeleted} görev ve ${result.notesDeleted} not arşivden silindi.`, 
        type: 'success' 
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ 
        message: error.message || 'Silme işlemi başarısız oldu.', 
        type: 'error' 
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteSingle = async (type: 'todo' | 'note', id: string) => {
    if (!window.confirm('Bu öğe kalıcı olarak silinecek. Emin misiniz?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      const todoIds = type === 'todo' ? [id] : [];
      const noteIds = type === 'note' ? [id] : [];
      
      await archiveService.deleteArchivedItems(todoIds, noteIds);
      
      // Remove from results
      setResults(prev => ({
        todos: type === 'todo' ? prev.todos.filter(t => t.id !== id) : prev.todos,
        notes: type === 'note' ? prev.notes.filter(n => n.id !== id) : prev.notes
      }));
      
      setNotification({ message: 'Öğe arşivden silindi.', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ message: error.message || 'Silme başarısız.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedTodos = useMemo(() => 
    [...results.todos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [results.todos]
  );
  
  const sortedNotes = useMemo(() => 
    [...results.notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [results.notes]
  );

  const handleItemClick = (type: 'todo' | 'note', item: Todo | Note) => {
    if (!deleteMode) {
      setDetailView({ type, item });
    }
  };
  
  if (!isOpen) return null;
  
  // Detail View Modal Component
  const DetailModal = () => {
    if (!detailView) return null;
    
    const { type, item } = detailView;
    const isTodo = type === 'todo';
    const todo = isTodo ? (item as Todo) : null;
    const note = !isTodo ? (item as Note) : null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[70] p-2 sm:p-4" onClick={() => setDetailView(null)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[var(--accent-color-600)] to-[var(--accent-color-700)] p-3 sm:p-4 flex justify-between items-center rounded-t-lg sm:rounded-t-xl">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 min-w-0">
              {isTodo ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                  <span className="truncate">Görev Detayı</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                  <span className="truncate">Not Detayı</span>
                </>
              )}
            </h3>
            <button 
              onClick={() => setDetailView(null)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
            {isTodo && todo ? (
              <>
                {/* Todo Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Görev</label>
                    <p className="mt-1 text-base sm:text-lg font-medium text-gray-900 dark:text-white break-words">{todo.text}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Öncelik</label>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          todo.priority === Priority.High ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          todo.priority === Priority.Medium ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {todo.priority === Priority.High ? '🔴 Yüksek' :
                           todo.priority === Priority.Medium ? '🟡 Orta' : '🟢 Düşük'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Durum</label>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          todo.completed ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {todo.completed ? '✅ Tamamlandı' : '⏳ Bekliyor'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {todo.datetime && (
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tarih & Saat</label>
                      <p className="mt-1 text-gray-900 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--accent-color-600)]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        {new Date(todo.datetime).toLocaleString('tr-TR', { 
                          dateStyle: 'full', 
                          timeStyle: 'short' 
                        })}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Oluşturulma Tarihi</label>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">
                      {new Date(todo.createdAt).toLocaleString('tr-TR', { 
                        dateStyle: 'long', 
                        timeStyle: 'medium' 
                      })}
                    </p>
                  </div>
                  
                  {todo.aiMetadata && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <label className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" /></svg>
                        AI Analizi
                      </label>
                      <div className="mt-2 space-y-2 text-sm">
                        {todo.aiMetadata.category && (
                          <p><span className="font-medium">Kategori:</span> {todo.aiMetadata.category}</p>
                        )}
                        {todo.aiMetadata.estimatedDuration && (
                          <p><span className="font-medium">Tahmini Süre:</span> {todo.aiMetadata.estimatedDuration}</p>
                        )}
                        {todo.aiMetadata.tags && todo.aiMetadata.tags.length > 0 && (
                          <div>
                            <span className="font-medium">Etiketler:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {todo.aiMetadata.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 rounded-full text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : note ? (
              <>
                {/* Note Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Not İçeriği</label>
                    <div className="mt-2 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed break-words overflow-wrap-anywhere">{note.text}</p>
                    </div>
                  </div>
                  
                  {note.imageUrl && (
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Görsel</label>
                      <div className="mt-2">
                        <img 
                          src={note.imageUrl} 
                          alt="Not görseli" 
                          className="w-full rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(note.imageUrl, '_blank');
                          }}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          🔍 Büyütmek için tıklayın
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {note.tags && note.tags.length > 0 && (
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Etiketler</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {note.tags.map((tag, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Oluşturulma</label>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(note.createdAt).toLocaleString('tr-TR', { 
                          dateStyle: 'long', 
                          timeStyle: 'short' 
                        })}
                      </p>
                    </div>
                    {note.updatedAt && (
                      <div>
                        <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Güncelleme</label>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {new Date(note.updatedAt).toLocaleString('tr-TR', { 
                            dateStyle: 'long', 
                            timeStyle: 'short' 
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {(note.pinned || note.favorite) && (
                    <div className="flex gap-3">
                      {note.pinned && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium">
                          📌 Sabitlenmiş
                        </span>
                      )}
                      {note.favorite && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm font-medium">
                          ❤️ Favori
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
          
          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 rounded-b-lg sm:rounded-b-xl border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
            <button
              onClick={async () => {
                await handleDeleteSingle(detailView.type, item.id);
                setDetailView(null);
              }}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              Sil
            </button>
            <button
              onClick={() => setDetailView(null)}
              className="px-4 sm:px-6 py-2 bg-[var(--accent-color-600)] text-white rounded-lg hover:bg-[var(--accent-color-700)] font-medium transition-colors text-sm sm:text-base"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSearchView = () => (
    <>
      <div className="p-2 sm:p-4 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
               <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full p-1.5 sm:p-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                />
                <button 
                  onClick={fetchAllArchived}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium text-xs sm:text-sm whitespace-nowrap"
                >
                  <span className="hidden sm:inline">📁 Tüm Arşiv</span>
                  <span className="sm:hidden">📁 Tümü</span>
                </button>
                <button 
                  onClick={handleManualArchive}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1"
                  title="Tamamlanmış görevleri arşivle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                  <span className="hidden md:inline">Arşivle</span>
                </button>
              <form onSubmit={handleSearch} className="flex gap-2 sm:col-span-1 lg:col-span-2">
                  <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ara..."
                      className="flex-grow p-1.5 sm:p-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none min-w-0"
                  />
                  <button type="submit" className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] text-xs sm:text-sm whitespace-nowrap">Ara</button>
              </form>
          </div>
          <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            {searchMode === 'all' && (
              <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">
                ℹ️ Tüm arşiv görüntüleniyor
              </div>
            )}
            <div className="flex gap-2 ml-auto w-full sm:w-auto justify-end">
              {!deleteMode ? (
                <button 
                  onClick={toggleDeleteMode}
                  className="px-2 sm:px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs sm:text-sm font-medium flex items-center gap-1 whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Sil
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleDeleteSelected}
                    disabled={(selectedTodoIds.length + selectedNoteIds.length) === 0}
                    className="px-2 sm:px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Seçilenleri Sil ({selectedTodoIds.length + selectedNoteIds.length})</span>
                    <span className="sm:hidden">Sil ({selectedTodoIds.length + selectedNoteIds.length})</span>
                  </button>
                  <button 
                    onClick={toggleDeleteMode}
                    className="px-2 sm:px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    İptal
                  </button>
                </>
              )}
            </div>
          </div>
      </div>
      {(results.todos.length === 0 && results.notes.length === 0) ? (
        <div className="text-center py-16">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Arşivde Kayıt Bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchMode === 'date' 
              ? `${new Date(selectedDate).toLocaleDateString('tr-TR')} tarihi için kayıt yok.` 
              : searchMode === 'all'
              ? 'Henüz hiçbir öğe arşivlenmemiş.'
              : `'${searchQuery}' için sonuç bulunamadı.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 p-2 sm:p-4">
          <div className="flex flex-col h-full">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 pb-2 border-b-2 border-[var(--accent-color-500)] text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--accent-color-600)] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
              <span className="truncate">Arşivlenmiş Görevler</span>
              <span className="ml-auto text-xs sm:text-sm font-normal bg-[var(--accent-color-100)] dark:bg-[var(--accent-color-900)] text-[var(--accent-color-700)] dark:text-[var(--accent-color-300)] px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">{results.todos.length}</span>
            </h3>
            <div className="space-y-2 overflow-y-auto flex-1">
              {sortedTodos.map(todo => (
                <div 
                  key={todo.id} 
                  className={`bg-white dark:bg-gray-700 p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-600 text-sm relative group transition-all ${
                    selectedTodoIds.includes(todo.id) ? 'ring-2 ring-red-500 border-red-500' : ''
                  } ${!deleteMode ? 'cursor-pointer hover:shadow-lg hover:border-[var(--accent-color-400)] hover:-translate-y-0.5' : ''}`}
                  onClick={() => handleItemClick('todo', todo)}
                >
                    {deleteMode && (
                      <input
                        type="checkbox"
                        checked={selectedTodoIds.includes(todo.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleTodoSelection(todo.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-2 right-2 h-5 w-5 text-red-600 rounded focus:ring-red-500"
                      />
                    )}
                    {!deleteMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSingle('todo', todo.id);
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-100 dark:bg-red-900 rounded hover:bg-red-200 dark:hover:bg-red-800"
                        title="Sil"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      </button>
                    )}
                    <div className="flex items-start gap-2 pr-8">
                      <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                        todo.priority === Priority.High ? 'bg-red-500' :
                        todo.priority === Priority.Medium ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium line-clamp-2 break-words overflow-hidden ${
                          todo.priority === Priority.High ? 'text-red-700 dark:text-red-400' : 
                          'text-gray-800 dark:text-gray-200'
                        }`}>{todo.text}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(todo.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                          {todo.completed && (
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                              ✓ Tamamlandı
                            </span>
                          )}
                          {todo.datetime && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                              {new Date(todo.datetime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col h-full">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 pb-2 border-b-2 border-purple-500 text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
              <span className="truncate">Arşivlenmiş Notlar</span>
              <span className="ml-auto text-xs sm:text-sm font-normal bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">{results.notes.length}</span>
            </h3>
            <div className="space-y-2 overflow-y-auto flex-1">
                {sortedNotes.map(note => (
                    <div 
                      key={note.id} 
                      className={`bg-white dark:bg-gray-700 p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-600 text-sm relative group transition-all ${
                        selectedNoteIds.includes(note.id) ? 'ring-2 ring-red-500 border-red-500' : ''
                      } ${!deleteMode ? 'cursor-pointer hover:shadow-lg hover:border-purple-400 hover:-translate-y-0.5' : ''}`}
                      onClick={() => handleItemClick('note', note)}
                    >
                        {deleteMode && (
                          <input
                            type="checkbox"
                            checked={selectedNoteIds.includes(note.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleNoteSelection(note.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 h-5 w-5 text-red-600 rounded focus:ring-red-500"
                          />
                        )}
                        {!deleteMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingle('note', note.id);
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-100 dark:bg-red-900 rounded hover:bg-red-200 dark:hover:bg-red-800"
                            title="Sil"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          </button>
                        )}
                        <p className="text-gray-800 dark:text-gray-200 pr-8 line-clamp-3 break-words overflow-hidden">{note.text}</p>
                        {note.imageUrl && (
                          <div className="mt-2 relative overflow-hidden rounded-md group/img">
                            <img 
                              src={note.imageUrl} 
                              className="w-full h-32 object-cover rounded-md transition-transform group-hover/img:scale-105"
                              alt="Not görseli"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(note.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                          {(note.tags && note.tags.length > 0) && (
                            <span className="text-xs text-purple-600 dark:text-purple-400">{note.tags.length} etiket</span>
                          )}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
  
  const renderStatsView = () => (
    <div className="p-6">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Verimlilik Paneli</h3>
      {stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-600 dark:text-gray-300">Toplam Tamamlanan Görev</h4>
                  <p className="text-4xl font-bold text-[var(--accent-color-600)]">{stats.totalCompleted}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-600 dark:text-gray-300">Görev Serisi</h4>
                  <p className="text-4xl font-bold text-[var(--accent-color-600)] flex items-center gap-2">{stats.currentStreak} gün <span className="text-3xl">🔥</span></p>
              </div>
          </div>
          <div>
              <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-2">Son 7 Gün Aktivitesi</h4>
              <BarChart data={stats.last7Days} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-4 transition-opacity">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-slide-in-right ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-7xl h-[98vh] sm:h-[95vh] flex flex-col overflow-hidden">
        <header className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Arşiv & Raporlar</h2>
              <div className="hidden sm:flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <button onClick={() => setView('search')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === 'search' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Arama</button>
                <button onClick={() => setView('stats')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === 'stats' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>İstatistikler</button>
                <button onClick={() => setView('reports')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === 'reports' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Raporlar</button>
              </div>
              {!dbHealthy && (
                <div className="ml-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                  <span className="text-xs">Veritabanı sorunu</span>
                  <button onClick={handleRepairDatabase} className="text-xs font-semibold underline">Onar</button>
                </div>
              )}
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="flex-grow overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
            </div>
          ) : view === 'search' ? renderSearchView() : view === 'stats' ? renderStatsView() : <PeriodicReportView currentTodos={currentTodos} />}
        </main>
      </div>
      
      {/* Detail View Modal */}
      <DetailModal />
    </div>
  );
};

export default ArchiveModal;
