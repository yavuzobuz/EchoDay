import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../services/supabaseClient';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

interface Metric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}

interface TopUser {
  name: string;
  email: string;
  tasks: number;
  completed: number;
  rate: number;
  lastActivity: string;
}


export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [weeklyUserGrowth, setWeeklyUserGrowth] = useState<number[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Tarih aralığını hesapla
      const now = new Date();
      const daysAgo = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : dateRange === '90days' ? 90 : 365;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const previousStartDate = new Date(startDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Paralel sorgular
      const [
        currentUsers,
        previousUsers,
        currentTasks,
        previousTasks,
        allTasks,
        completedTasks,
        usersWithTasks,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', previousStartDate.toISOString()).lt('created_at', startDate.toISOString()),
        supabase.from('todos').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
        supabase.from('todos').select('*', { count: 'exact', head: true }).gte('created_at', previousStartDate.toISOString()).lt('created_at', startDate.toISOString()),
        supabase.from('todos').select('*', { count: 'exact', head: true }),
        supabase.from('todos').select('*', { count: 'exact', head: true }).eq('completed', true),
        supabase.from('todos').select('user_id, completed').gte('created_at', startDate.toISOString()),
      ]);

      const currentUserCount = currentUsers.count || 0;
      const previousUserCount = previousUsers.count || 0;
      const userChange = previousUserCount > 0 ? ((currentUserCount - previousUserCount) / previousUserCount * 100) : 0;

      const currentTaskCount = currentTasks.count || 0;
      const previousTaskCount = previousTasks.count || 0;
      const taskChange = previousTaskCount > 0 ? ((currentTaskCount - previousTaskCount) / previousTaskCount * 100) : 0;

      const totalTasks = allTasks.count || 1;
      const totalCompleted = completedTasks.count || 0;
      const completionPercentage = Math.round((totalCompleted / totalTasks) * 100);
      setCompletionRate(completionPercentage);

      // Aktif kullanıcılar (görev oluşturanlar)
      const activeUsersSet = new Set((usersWithTasks.data || []).map((t: any) => t.user_id));
      const activeUserCount = activeUsersSet.size;

      // Haftalık kullanıcı büyümesi (son 7 gün)
      const weeklyGrowth = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
          date.setHours(0, 0, 0, 0);
          const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', date.toISOString())
            .lt('created_at', nextDate.toISOString());
          return count || 0;
        })
      );
      
      const maxGrowth = Math.max(...weeklyGrowth, 1);
      setWeeklyUserGrowth(weeklyGrowth.map(v => (v / maxGrowth) * 100));

      // En aktif kullanıcılar
      const { data: userTasksData } = await supabase
        .from('todos')
        .select('user_id, completed')
        .gte('created_at', startDate.toISOString());

      const userStats: { [key: string]: { total: number; completed: number } } = {};
      (userTasksData || []).forEach((task: any) => {
        if (!userStats[task.user_id]) {
          userStats[task.user_id] = { total: 0, completed: 0 };
        }
        userStats[task.user_id].total++;
        if (task.completed) {
          userStats[task.user_id].completed++;
        }
      });

      const topUsersList: TopUser[] = [];
      for (const [userId, stats] of Object.entries(userStats)) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, created_at')
          .eq('id', userId)
          .single();

        if (profileData) {
          const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
          const daysSinceCreation = Math.floor((now.getTime() - new Date(profileData.created_at).getTime()) / (1000 * 60 * 60 * 24));
          topUsersList.push({
            name: profileData.email.split('@')[0],
            email: profileData.email,
            tasks: stats.total,
            completed: stats.completed,
            rate,
            lastActivity: daysSinceCreation === 0 ? 'Bugün' : `${daysSinceCreation} gün önce`,
          });
        }
      }

      topUsersList.sort((a, b) => b.tasks - a.tasks);
      setTopUsers(topUsersList.slice(0, 10));

      // Metrikleri güncelle
      setMetrics([
        {
          label: 'Yeni Kullanıcılar',
          value: currentUserCount.toLocaleString(),
          change: `${userChange >= 0 ? '+' : ''}${userChange.toFixed(1)}%`,
          trend: userChange >= 0 ? 'up' : 'down',
        },
        {
          label: 'Aktif Kullanıcılar',
          value: activeUserCount.toLocaleString(),
          change: `${activeUserCount} kişi`,
          trend: 'up',
        },
        {
          label: 'Tamamlanan Görev',
          value: totalCompleted.toLocaleString(),
          change: `${taskChange >= 0 ? '+' : ''}${taskChange.toFixed(1)}%`,
          trend: taskChange >= 0 ? 'up' : 'down',
        },
        {
          label: 'Başarı Oranı',
          value: `${completionPercentage}%`,
          change: `${totalTasks} toplam`,
          trend: completionPercentage >= 50 ? 'up' : 'down',
        },
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Analytics & Raporlar
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Detaylı sistem analizleri ve raporlar
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="7days">Son 7 Gün</option>
              <option value="30days">Son 30 Gün</option>
              <option value="90days">Son 90 Gün</option>
              <option value="1year">Son 1 Yıl</option>
            </select>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <DocumentArrowDownIcon className="w-5 h-5" />
              <span>Rapor İndir</span>
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            ))
          ) : (
            metrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {metric.label}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {metric.value}
              </p>
              <div className="flex items-center mt-2">
                <ArrowTrendingUpIcon
                  className={`w-4 h-4 mr-1 ${
                    metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}
                  style={{ transform: metric.trend === 'down' ? 'rotate(180deg)' : 'none' }}
                />
                <span
                  className={`text-sm font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {metric.change}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  vs önceki dönem
                </span>
              </div>
            </div>
          ))
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Kullanıcı Büyümesi
              </h3>
              <ChartBarIcon className="w-6 h-6 text-gray-400" />
            </div>
            <div className="h-64 flex items-end justify-between space-x-2">
              {loading ? (
                Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg animate-pulse" style={{ height: '60%' }}></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][index]}
                    </span>
                  </div>
                ))
              ) : (
                weeklyUserGrowth.map((height, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-purple-600 rounded-t-lg transition-all duration-500 hover:opacity-80"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][index]}
                  </span>
                </div>
              ))
              )}
            </div>
          </div>

          {/* Task Completion Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Görev Tamamlama Oranı
              </h3>
              <CalendarIcon className="w-6 h-6 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="url(#gradient)"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80 * (completionRate / 100)} ${2 * Math.PI * 80}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#9333EA" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">
                      {loading ? '...' : `${completionRate}%`}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Tamamlanma
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              En Aktif Kullanıcılar
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Görevler
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Tamamlanan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Başarı Oranı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Son Aktivite
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={5} className="px-6 py-4">
                        <div className="animate-pulse flex space-x-4">
                          <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-10 w-10"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : topUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Henüz aktivite yok
                    </td>
                  </tr>
                ) : (
                  topUsers.map((user, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.tasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
                            style={{ width: `${user.rate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.lastActivity}
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
