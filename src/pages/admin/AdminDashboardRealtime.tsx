import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../services/supabaseClient';
import {
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  totalEmails: number;
  newUsersToday: number;
  tasksCreatedToday: number;
  userGrowth: number;
  // Abonelik metrikleri
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  trialUsers: number;
}

interface ActivityLog {
  id: string;
  type: 'user' | 'task' | 'email' | 'subscription';
  description: string;
  timestamp: string;
  user?: string;
}

interface ActiveUser {
  id: string;
  email: string;
  role: string;
  last_active: string;
  created_at: string;
}

interface SubscriptionStat {
  plan_type: string;
  count: number;
  revenue: number;
}

export default function AdminDashboardRealtime() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalEmails: 0,
    newUsersToday: 0,
    tasksCreatedToday: 0,
    userGrowth: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    trialUsers: 0,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStat[]>([]);
  const [activeUsersList, setActiveUsersList] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Veri çekme fonksiyonu
  const fetchDashboardData = useCallback(async () => {
    try {
      console.log('[Dashboard] Fetching data...');

      // Temel kullanıcı ve görev verileri
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Paralel olarak temel verileri çek
      const [usersRes, activeUsersRes, activeUsersDataRes, newUsersTodayRes, tasksRes, completedTasksRes, tasksCreatedTodayRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', last7Days),
        supabase.from('profiles').select('id, email, created_at').gte('created_at', last24Hours).order('created_at', { ascending: false }).limit(10),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('todos').select('*', { count: 'exact', head: true }),
        supabase.from('todos').select('*', { count: 'exact', head: true }).eq('completed', true),
        supabase.from('todos').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      ]);

      // Abonelik verileri (opsiyonel - tablo yoksa hata vermez)
      let subscriptions: any[] = [];
      try {
        const subscriptionsRes = await supabase.from('subscriptions').select('*');
        if (subscriptionsRes.data) {
          subscriptions = subscriptionsRes.data;
        }
      } catch (error) {
        console.log('[Dashboard] Subscriptions table not found, skipping...');
      }

      // Aktif kullanıcılar listesi
      const activeUsersData = activeUsersDataRes.data || [];
      setActiveUsersList(activeUsersData.map((user: any) => ({
        id: user.id,
        email: user.email,
        role: 'user',
        last_active: user.created_at,
        created_at: user.created_at,
      })));

      // Abonelik istatistikleri
      const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active');
      const trialUsers = subscriptions.filter((s: any) => s.status === 'trial');
      const monthlyRevenue = activeSubscriptions.reduce((sum: number, s: any) => sum + (parseFloat(s.amount) || 0), 0);

      setStats({
        totalUsers: usersRes.count || 0,
        activeUsers: activeUsersRes.count || 0,
        totalTasks: tasksRes.count || 0,
        completedTasks: completedTasksRes.count || 0,
        totalEmails: 0,
        newUsersToday: newUsersTodayRes.count || 0,
        tasksCreatedToday: tasksCreatedTodayRes.count || 0,
        userGrowth: newUsersTodayRes.count || 0,
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        monthlyRevenue,
        trialUsers: trialUsers.length,
      });

      // Abonelik istatistiklerini group by
      const statsMap: { [key: string]: SubscriptionStat } = {};
      subscriptions.forEach((sub: any) => {
        const key = sub.plan_type;
        if (!statsMap[key]) {
          statsMap[key] = { plan_type: key, count: 0, revenue: 0 };
        }
        statsMap[key].count++;
        if (sub.status === 'active') {
          statsMap[key].revenue += parseFloat(sub.amount) || 0;
        }
      });
      setSubscriptionStats(Object.values(statsMap));

      setLastUpdate(new Date());
      console.log('[Dashboard] Data updated successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // İlk yükleme
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Realtime subscription - profiles tablosu
  useEffect(() => {
    console.log('[Dashboard] Setting up realtime subscriptions...');

    const profilesChannel = supabase
      .channel('realtime:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
        console.log('[Dashboard] Profile change detected:', payload);
        fetchDashboardData(); // Veriyi yeniden çek
        
        // Activity log ekle
        if (payload.eventType === 'INSERT') {
          const newLog: ActivityLog = {
            id: Date.now().toString(),
            type: 'user',
            description: 'Yeni kullanıcı kaydı',
            timestamp: new Date().toISOString(),
            user: payload.new.email,
          };
          setActivityLogs((prev) => [newLog, ...prev].slice(0, 10));
        }
      })
      .subscribe();

    const todosChannel = supabase
      .channel('realtime:todos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload: any) => {
        console.log('[Dashboard] Todo change detected:', payload);
        fetchDashboardData();

        if (payload.eventType === 'INSERT') {
          const newLog: ActivityLog = {
            id: Date.now().toString(),
            type: 'task',
            description: 'Yeni görev oluşturuldu',
            timestamp: new Date().toISOString(),
          };
          setActivityLogs((prev) => [newLog, ...prev].slice(0, 10));
        }
      })
      .subscribe();

    // Cleanup
    return () => {
      console.log('[Dashboard] Cleaning up realtime subscriptions...');
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(todosChannel);
    };
  }, [fetchDashboardData]);

  // Otomatik yenileme (her 30 saniyede bir)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[Dashboard] Auto-refresh triggered');
      fetchDashboardData();
    }, 30000); // 30 saniye

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Hızlı işlem handler fonksiyonları
  const handleNewUser = () => {
    navigate('/admin/users');
  };

  const handleSendEmail = () => {
    navigate('/admin/emails');
  };

  const handleAddSubscription = () => {
    // Abonelik sayfası yoksa kullanıcılar sayfasına yönlendir
    navigate('/admin/users');
  };

  const statCards = [
    {
      name: 'Toplam Kullanıcı',
      value: stats.totalUsers,
      change: `+${stats.newUsersToday} bugün`,
      changeType: 'positive',
      icon: UsersIcon,
      color: 'blue',
    },
    {
      name: 'Aktif Abonelik',
      value: stats.activeSubscriptions,
      change: `${stats.trialUsers} deneme`,
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      color: 'green',
    },
    {
      name: 'Aylık Gelir',
      value: `$${stats.monthlyRevenue.toFixed(2)}`,
      change: `${stats.totalSubscriptions} toplam`,
      changeType: 'positive',
      icon: ChartBarIcon,
      color: 'purple',
    },
    {
      name: 'Tamamlanan Görev',
      value: stats.completedTasks,
      change: `${Math.round((stats.completedTasks / stats.totalTasks) * 100) || 0}% tamamlanma`,
      changeType: 'positive',
      icon: CheckCircleIcon,
      color: 'emerald',
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome banner with realtime indicator */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Hoş Geldiniz! 👋</h1>
                <p className="text-blue-100">
                  Sisteminizdeki tüm metriklere gerçek zamanlı erişim
                </p>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Canlı Veri</span>
              </div>
            </div>
            <p className="text-xs text-blue-200 mt-4">
              Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.name}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {card.name}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                      {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-lg bg-${card.color}-100 dark:bg-${card.color}-900/30 flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 text-${card.color}-600 dark:text-${card.color}-400`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600 font-medium">{card.change}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subscription breakdown */}
        {subscriptionStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Abonelik Dağılımı
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {subscriptionStats.map((stat) => (
                <div
                  key={stat.plan_type}
                  className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.count}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {stat.plan_type}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ${stat.revenue.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity - REALTIME */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Canlı Aktiviteler
                </h2>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <BellAlertIcon className="w-6 h-6 text-gray-400" />
            </div>
            <div className="space-y-4">
              {activityLogs.length > 0 ? (
                activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 animate-fade-in"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        log.type === 'user'
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : log.type === 'task'
                          ? 'bg-purple-100 dark:bg-purple-900/30'
                          : log.type === 'subscription'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-orange-100 dark:bg-orange-900/30'
                      }`}
                    >
                      {log.type === 'user' && <UsersIcon className="w-5 h-5 text-blue-600" />}
                      {log.type === 'task' && <ClockIcon className="w-5 h-5 text-purple-600" />}
                      {log.type === 'subscription' && <CurrencyDollarIcon className="w-5 h-5 text-green-600" />}
                      {log.type === 'email' && <EnvelopeIcon className="w-5 h-5 text-orange-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.description}
                      </p>
                      {log.user && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{log.user}</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(log.timestamp).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <BellAlertIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Henüz aktivite yok</p>
                  <p className="text-xs mt-1">Yeni aktiviteler burada görünecek</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Görev İstatistikleri</h2>
              <ChartBarIcon className="w-6 h-6 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tamamlanan Görevler
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {stats.completedTasks} / {stats.totalTasks}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((stats.completedTasks / stats.totalTasks) * 100) || 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Aktif Kullanıcı Oranı
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {stats.activeUsers} / {stats.totalUsers}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((stats.activeUsers / stats.totalUsers) * 100) || 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <CalendarIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.tasksCreatedToday}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Bugün Oluşturulan</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <UsersIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.newUsersToday}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Yeni Kullanıcı</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Users List - REALTIME */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Aktif Kullanıcılar (Son 24 Saat)
              </h2>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {activeUsersList.length} kullanıcı
            </span>
          </div>
          <div className="space-y-3">
            {activeUsersList.length > 0 ? (
              activeUsersList.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Son aktivite: {new Date(user.last_active).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'super_admin'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {user.role === 'super_admin'
                        ? 'Süper Admin'
                        : user.role === 'admin'
                        ? 'Admin'
                        : 'Kullanıcı'}
                    </span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <UsersIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Son 24 saatte aktif kullanıcı bulunamadı</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Hızlı İşlemler</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button 
              onClick={handleNewUser}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors transform hover:scale-105 active:scale-95"
            >
              <UsersIcon className="w-5 h-5" />
              <span>Yeni Kullanıcı</span>
            </button>
            <button 
              onClick={handleSendEmail}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors transform hover:scale-105 active:scale-95"
            >
              <EnvelopeIcon className="w-5 h-5" />
              <span>E-posta Gönder</span>
            </button>
            <button 
              onClick={handleAddSubscription}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors transform hover:scale-105 active:scale-95"
            >
              <CurrencyDollarIcon className="w-5 h-5" />
              <span>Abonelik Ekle</span>
            </button>
            <button 
              onClick={() => fetchDashboardData()}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors transform hover:scale-105 active:scale-95"
            >
              <ChartBarIcon className="w-5 h-5" />
              <span>Yenile</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </AdminLayout>
  );
}
