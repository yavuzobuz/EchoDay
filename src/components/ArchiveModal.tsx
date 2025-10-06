import React, { useState, useEffect, useMemo } from 'react';
import { Todo, Note, Priority, DashboardStats } from '../types';
import { archiveService } from '../services/archiveService';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTodos: Todo[];
}

type ArchiveView = 'search' | 'stats';

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

const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose, currentTodos }) => {
  const [results, setResults] = useState<{ todos: Todo[]; notes: Note[] }>({ todos: [], notes: [] });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchMode, setSearchMode] = useState<'date' | 'query' | 'all'>('date');
  const [view, setView] = useState<ArchiveView>('search');
  
  // Delete mode state
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen, selectedDate, searchMode, view]);

  const fetchByDate = async (date: string) => {
    setIsLoading(true);
    const data = await archiveService.getArchivedItemsForDate(date);
    setResults(data);
    setIsLoading(false);
  };
  
  const fetchAllArchived = async () => {
    setIsLoading(true);
    setSearchMode('all');
    const data = await archiveService.getAllArchivedItems();
    setResults(data);
    setIsLoading(false);
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

  if (!isOpen) return null;

  const renderSearchView = () => (
    <>
      <div className="p-4 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                />
                <button 
                  onClick={fetchAllArchived}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium text-sm"
                >
                  📁 Tüm Arşiv
                </button>
              <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Arşivde ara..."
                      className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
                  />
                  <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)]">Ara</button>
              </form>
          </div>
          <div className="mt-2 flex items-center justify-between">
            {searchMode === 'all' && (
              <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                ℹ️ Tüm arşiv görüntüleniyor
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              {!deleteMode ? (
                <button 
                  onClick={toggleDeleteMode}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Sil
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleDeleteSelected}
                    disabled={(selectedTodoIds.length + selectedNoteIds.length) === 0}
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Seçilenleri Sil ({selectedTodoIds.length + selectedNoteIds.length})
                  </button>
                  <button 
                    onClick={toggleDeleteMode}
                    className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2 dark:border-gray-600 text-gray-800 dark:text-gray-200">Arşivlenmiş Görevler ({results.todos.length})</h3>
            <div className="space-y-3">
              {sortedTodos.map(todo => (
                <div key={todo.id} className={`bg-gray-100 dark:bg-gray-700/50 p-3 rounded-md text-sm relative group ${selectedTodoIds.includes(todo.id) ? 'ring-2 ring-red-500' : ''}`}>
                    {deleteMode && (
                      <input
                        type="checkbox"
                        checked={selectedTodoIds.includes(todo.id)}
                        onChange={() => toggleTodoSelection(todo.id)}
                        className="absolute top-2 right-2 h-5 w-5 text-red-600 rounded focus:ring-red-500"
                      />
                    )}
                    {!deleteMode && (
                      <button
                        onClick={() => handleDeleteSingle('todo', todo.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-100 dark:bg-red-900 rounded hover:bg-red-200 dark:hover:bg-red-800"
                        title="Sil"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      </button>
                    )}
                    <p className={`font-medium pr-8 ${todo.priority === Priority.High ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>{todo.text}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(todo.createdAt).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2 dark:border-gray-600 text-gray-800 dark:text-gray-200">Arşivlenmiş Notlar ({results.notes.length})</h3>
            <div className="space-y-3">
                {sortedNotes.map(note => (
                    <div key={note.id} className={`bg-gray-100 dark:bg-gray-700/50 p-3 rounded-md text-sm relative group ${selectedNoteIds.includes(note.id) ? 'ring-2 ring-red-500' : ''}`}>
                        {deleteMode && (
                          <input
                            type="checkbox"
                            checked={selectedNoteIds.includes(note.id)}
                            onChange={() => toggleNoteSelection(note.id)}
                            className="absolute top-2 right-2 h-5 w-5 text-red-600 rounded focus:ring-red-500"
                          />
                        )}
                        {!deleteMode && (
                          <button
                            onClick={() => handleDeleteSingle('note', note.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-100 dark:bg-red-900 rounded hover:bg-red-200 dark:hover:bg-red-800"
                            title="Sil"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          </button>
                        )}
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap pr-8">{note.text}</p>
                        {note.imageUrl && <img src={note.imageUrl} className="mt-2 rounded max-h-24 w-auto"/>}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(note.createdAt).toLocaleString('tr-TR')}</p>
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-slide-in-right ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Arşiv & Raporlar</h2>
              <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <button onClick={() => setView('search')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === 'search' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Arama</button>
                <button onClick={() => setView('stats')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === 'stats' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>İstatistikler</button>
              </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="flex-grow overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
            </div>
          ) : view === 'search' ? renderSearchView() : renderStatsView()}
        </main>
      </div>
    </div>
  );
};

export default ArchiveModal;
