import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../services/supabaseClient';
import {
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  CalendarIcon,
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
}

interface ActivityLog {
  id: string;
  type: 'user' | 'task' | 'email';
  description: string;
  timestamp: string;
  user?: string;
}

export default function AdminDashboard() {
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
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Hızlı işlem handler fonksiyonları
  const handleNewUser = () => {
    navigate('/admin/users');
  };

  const handleSendEmail = () => {
    navigate('/admin/emails');
  };

  const handleCreateReport = () => {
    // Rapor sayfası yoksa dashboard'a geri dön ve console'da bilgi ver
    console.log('Rapor oluşturma özelliği yakında eklenecek');
    alert('Rapor oluşturma özelliği yakında eklenecek!');
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch active users (logged in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', sevenDaysAgo.toISOString());

      // Fetch new users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Fetch tasks stats
      const { count: totalTasks } = await supabase
        .from('todos')
        .select('*', { count: 'exact', head: true });

      const { count: completedTasks } = await supabase
        .from('todos')
        .select('*', { count: 'exact', head: true })
        .eq('completed', true);

      const { count: tasksCreatedToday } = await supabase
        .from('todos')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Calculate user growth - gerçek veri: önceki güne göre yüzde artış
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const { count: newUsersYesterday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());
      
      const userGrowth = newUsersYesterday && newUsersYesterday > 0
        ? ((((newUsersToday || 0) - newUsersYesterday) / newUsersYesterday) * 100)
        : (newUsersToday || 0) > 0 ? 100 : 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        totalEmails: 0, // Can be fetched from email table
        newUsersToday: newUsersToday || 0,
        tasksCreatedToday: tasksCreatedToday || 0,
        userGrowth,
      });

      // Gerçek aktivite logları - son kullanıcılar ve görevlerden
      const recentActivityLogs: ActivityLog[] = [];

      // Son kaydolan kullanıcıları al
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentUsers) {
        recentUsers.forEach((user: any) => {
          recentActivityLogs.push({
            id: `user-${user.id}`,
            type: 'user',
            description: 'Yeni kullanıcı kaydı',
            timestamp: user.created_at,
            user: user.email,
          });
        });
      }

      // Son oluşturulan görevleri al
      const { data: recentTasks } = await supabase
        .from('todos')
        .select('id, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentTasks && recentTasks.length > 0) {
        const task = recentTasks[0];
        recentActivityLogs.push({
          id: `task-${task.id}`,
          type: 'task',
          description: `Yeni görev oluşturuldu`,
          timestamp: task.created_at,
        });
      }

      // Zaman sırasına göre sırala
      recentActivityLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivityLogs(recentActivityLogs.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
      name: 'Aktif Kullanıcı',
      value: stats.activeUsers,
      change: `${Math.round((stats.activeUsers / stats.totalUsers) * 100) || 0}% oranı`,
      changeType: 'positive',
      icon: CheckCircleIcon,
      color: 'green',
    },
    {
      name: 'Toplam Görev',
      value: stats.totalTasks,
      change: `+${stats.tasksCreatedToday} bugün`,
      changeType: 'positive',
      icon: ClockIcon,
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
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Hoş Geldiniz! 👋</h1>
          <p className="text-blue-100">
            Sisteminizdeki tüm metriklere ve aktivitelere buradan ulaşabilirsiniz.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.name}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {card.name}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                      {card.value.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-lg bg-${card.color}-100 dark:bg-${card.color}-900/30 flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 text-${card.color}-600 dark:text-${card.color}-400`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  {card.changeType === 'positive' ? (
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span
                    className={`${
                      card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    } font-medium`}
                  >
                    {card.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Son Aktiviteler
              </h2>
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Tümünü Gör
              </button>
            </div>
            <div className="space-y-4">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      log.type === 'user'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : log.type === 'task'
                        ? 'bg-purple-100 dark:bg-purple-900/30'
                        : 'bg-green-100 dark:bg-green-900/30'
                    }`}
                  >
                    {log.type === 'user' ? (
                      <UsersIcon
                        className={`w-5 h-5 ${
                          log.type === 'user'
                            ? 'text-blue-600 dark:text-blue-400'
                            : log.type === 'task'
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      />
                    ) : log.type === 'task' ? (
                      <ClockIcon
                        className={`w-5 h-5 ${
                          log.type === 'task'
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      />
                    ) : (
                      <EnvelopeIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    )}
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
              ))}
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

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Hızlı İşlemler</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={handleNewUser}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors transform hover:scale-105 active:scale-95"
            >
              <UsersIcon className="w-5 h-5" />
              <span>Yeni Kullanıcı Ekle</span>
            </button>
            <button 
              onClick={handleSendEmail}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors transform hover:scale-105 active:scale-95"
            >
              <EnvelopeIcon className="w-5 h-5" />
              <span>Toplu E-posta Gönder</span>
            </button>
            <button 
              onClick={handleCreateReport}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors transform hover:scale-105 active:scale-95"
            >
              <ChartBarIcon className="w-5 h-5" />
              <span>Rapor Oluştur</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
