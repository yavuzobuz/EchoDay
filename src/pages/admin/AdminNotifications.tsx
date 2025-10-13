import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../services/supabaseClient';
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  action_url?: string;
  created_at: string;
  profiles?: {
    email: string;
  };
}

interface NotificationStats {
  total: number;
  unread: number;
  info: number;
  success: number;
  warning: number;
  error: number;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    info: 0,
    success: 0,
    warning: 0,
    error: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all');

  // Verileri çek
  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Notifications tablosu kontrolü
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      // Tablo yoksa demo data göster
      if (error && (error.code === '42P01' || error.code === 'PGRST116')) {
        console.log('Notifications tablosu bulunamadı, demo data gösteriliyor');
        const demoData: Notification[] = [
          {
            id: '1',
            user_id: 'demo',
            type: 'info',
            title: 'Sistem Güncellendi',
            message: 'Sistem başarıyla v2.0 sürümüne güncellendi.',
            read: false,
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            user_id: 'demo',
            type: 'success',
            title: 'Yedekleme Tamamlandı',
            message: 'Günlük veritabanı yedeği başarıyla alındı.',
            read: true,
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '3',
            user_id: 'demo',
            type: 'warning',
            title: 'Disk Alanı Uyarısı',
            message: 'Disk kullanımı %85 seviyesine ulaştı.',
            read: false,
            created_at: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: '4',
            user_id: 'demo',
            type: 'error',
            title: 'E-posta Gönderim Hatası',
            message: 'Son 10 e-posta gönderilemedi. SMTP ayarlarını kontrol edin.',
            read: false,
            created_at: new Date(Date.now() - 10800000).toISOString(),
          },
        ];

        setNotifications(demoData);
        setStats({
          total: 4,
          unread: 3,
          info: 1,
          success: 1,
          warning: 1,
          error: 1,
        });
        setLoading(false);
        return;
      }

      if (error) throw error;

      // Kullanıcı bilgilerini çek
      if (notificationsData && notificationsData.length > 0) {
        const userIds = [...new Set(notificationsData.map((n: any) => n.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);
        notificationsData.forEach((notification: any) => {
          const profile: any = profilesMap.get(notification.user_id);
          if (profile) {
            notification.profiles = { email: profile.email };
          }
        });
      }

      setNotifications(notificationsData || []);

      // İstatistikler
      const total = notificationsData?.length || 0;
      const unread = notificationsData?.filter((n: any) => !n.read).length || 0;
      const info = notificationsData?.filter((n: any) => n.type === 'info').length || 0;
      const success = notificationsData?.filter((n: any) => n.type === 'success').length || 0;
      const warning = notificationsData?.filter((n: any) => n.type === 'warning').length || 0;
      const errorCount = notificationsData?.filter((n: any) => n.type === 'error').length || 0;

      setStats({ total, unread, info, success, warning, error: errorCount });
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Filtreleme
  useEffect(() => {
    let filtered = [...notifications];

    // Arama
    if (searchTerm) {
      filtered = filtered.filter(
        n =>
          n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // Durum filtresi
    if (filterStatus !== 'all') {
      filtered = filtered.filter(n =>
        filterStatus === 'read' ? n.read : !n.read
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, filterType, filterStatus]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Bildirimi sil
  const handleDelete = async (id: string) => {
    if (!confirm('Bu bildirimi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      fetchNotifications();
    } catch (err) {
      console.error('Error deleting notification:', err);
      alert('Silme işlemi başarısız!');
    }
  };

  // Bildirimi okundu olarak işaretle
  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
      fetchNotifications();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Tip badge'i
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <InformationCircleIcon className="h-5 w-5" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5" />;
      default:
        return <BellIcon className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'info':
        return 'Bilgi';
      case 'success':
        return 'Başarılı';
      case 'warning':
        return 'Uyarı';
      case 'error':
        return 'Hata';
      default:
        return type;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bildirimler</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Sistem bildirimleri ve uyarılar
          </p>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <BellIcon className="h-10 w-10 text-gray-500 dark:text-gray-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Okunmamış</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {stats.unread}
                </p>
              </div>
              <BellIcon className="h-10 w-10 text-orange-500 dark:text-orange-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bilgi</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {stats.info}
                </p>
              </div>
              <InformationCircleIcon className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Başarılı</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.success}
                </p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-green-500 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uyarı</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {stats.warning}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500 dark:text-yellow-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Hata</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {stats.error}
                </p>
              </div>
              <XCircleIcon className="h-10 w-10 text-red-500 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Bildirim ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Tüm Tipler</option>
                <option value="info">Bilgi</option>
                <option value="success">Başarılı</option>
                <option value="warning">Uyarı</option>
                <option value="error">Hata</option>
              </select>
            </div>

            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="unread">Okunmamış</option>
                <option value="read">Okunmuş</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bildirimler Listesi */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Yükleniyor...</div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <BellIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Bildirim bulunamadı</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Not: Notifications tablosu henüz oluşturulmamış olabilir
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getTypeColor(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                                Yeni
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {notification.message}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                            notification.type
                          )}`}
                        >
                          {getTypeLabel(notification.type)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(notification.created_at).toLocaleString('tr-TR')}
                        </span>

                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                              title="Okundu olarak işaretle"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                            title="Sil"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
