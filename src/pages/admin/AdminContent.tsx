import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../services/supabaseClient';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
  };
}

interface ContentStats {
  totalTodos: number;
  completedTodos: number;
  pendingTodos: number;
  todosToday: number;
}

export default function AdminContent() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<ContentStats>({
    totalTodos: 0,
    completedTodos: 0,
    pendingTodos: 0,
    todosToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  // Verileri çek
  const fetchContent = async () => {
    try {
      setLoading(true);

      // Tüm todo'ları çek
      const { data: todosData, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      // Kullanıcı bilgilerini ayrı çek
      if (todosData && todosData.length > 0) {
        const userIds = [...new Set(todosData.map((t: any) => t.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        // Todo'lara user bilgilerini ekle
        const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);
        todosData.forEach((todo: any) => {
          const profile: any = profilesMap.get(todo.user_id);
          if (profile) {
            todo.profiles = { email: profile.email };
          }
        });
      }

      if (todosError) throw todosError;

      setTodos(todosData || []);

      // İstatistikler
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();

      const totalTodos = todosData?.length || 0;
      const completedTodos = todosData?.filter((t: any) => t.completed).length || 0;
      const pendingTodos = totalTodos - completedTodos;
      const todosToday = todosData?.filter((t: any) => t.created_at >= todayStart).length || 0;

      setStats({
        totalTodos,
        completedTodos,
        pendingTodos,
        todosToday,
      });
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  // Filtreleme
  useEffect(() => {
    let filtered = [...todos];

    // Arama
    if (searchTerm) {
      filtered = filtered.filter(
        (todo) =>
          todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          todo.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Durum filtresi
    if (filterStatus !== 'all') {
      filtered = filtered.filter((todo) =>
        filterStatus === 'completed' ? todo.completed : !todo.completed
      );
    }

    // Öncelik filtresi
    if (filterPriority !== 'all') {
      filtered = filtered.filter((todo) => todo.priority === filterPriority);
    }

    setFilteredTodos(filtered);
  }, [todos, searchTerm, filterStatus, filterPriority]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-content-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        () => {
          fetchContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Todo silme
  const handleDelete = async (id: string) => {
    if (!confirm('Bu içeriği silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
      fetchContent();
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('Silme işlemi başarısız!');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Yüksek';
      case 'medium':
        return 'Orta';
      case 'low':
        return 'Düşük';
      default:
        return priority;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">İçerik Yönetimi</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Tüm kullanıcı görevlerini ve içeriklerini yönetin</p>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Görev</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalTodos}</p>
              </div>
              <DocumentTextIcon className="h-12 w-12 text-blue-500 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tamamlanan</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.completedTodos}</p>
              </div>
              <CheckCircleIcon className="h-12 w-12 text-green-500 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bekleyen</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{stats.pendingTodos}</p>
              </div>
              <ClockIcon className="h-12 w-12 text-orange-500 dark:text-orange-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bugün Oluşturulan</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{stats.todosToday}</p>
              </div>
              <DocumentTextIcon className="h-12 w-12 text-purple-500 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filtreler ve Arama */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Arama */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Görev ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Durum Filtresi */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="completed">Tamamlanan</option>
                <option value="pending">Bekleyen</option>
              </select>
            </div>

            {/* Öncelik Filtresi */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Tüm Öncelikler</option>
                <option value="high">Yüksek</option>
                <option value="medium">Orta</option>
                <option value="low">Düşük</option>
              </select>
            </div>
          </div>
        </div>

        {/* İçerik Listesi */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Yüklüyor...</div>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <DocumentTextIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">İçerik bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Başlık
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Öncelik
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTodos.map((todo) => (
                    <tr key={todo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {todo.completed ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Tamamlandı
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            Bekliyor
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{todo.title}</div>
                        {todo.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                            {todo.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {todo.profiles?.email || 'Bilinmiyor'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                            todo.priority
                          )}`}
                        >
                          {getPriorityLabel(todo.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(todo.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                          title="Sil"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
