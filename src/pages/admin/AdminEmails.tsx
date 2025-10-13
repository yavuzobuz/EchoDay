import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../services/supabaseClient';
import {
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface EmailLog {
  id: string;
  user_id: string;
  email_type: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  sent_at: string;
  error_message?: string;
  profiles?: {
    email: string;
  };
}

interface EmailStats {
  totalEmails: number;
  sentEmails: number;
  failedEmails: number;
  pendingEmails: number;
  todayEmails: number;
}

export default function AdminEmails() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    totalEmails: 0,
    sentEmails: 0,
    failedEmails: 0,
    pendingEmails: 0,
    todayEmails: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [emailTypes, setEmailTypes] = useState<string[]>([]);

  // Verileri çek
  const fetchEmails = async () => {
    try {
      setLoading(true);

      // Email logs tablosu var mı kontrol et - foreign key olmadan
      const { data: emailsData, error: emailsError } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(500);

      // Eğer email_logs tablosu yoksa veya başka hata varsa, simülasyon verisi göster
      if (emailsError) {
        console.log('email_logs hatası:', emailsError);
        
        if (emailsError.code === '42P01' || emailsError.code === 'PGRST116') {
          console.log('email_logs tablosu bulunamadı, simülasyon verisi gösteriliyor');
          
          // Demo verisi
          const demoEmails: EmailLog[] = [
            {
              id: '1',
              user_id: 'demo',
              email_type: 'welcome',
              recipient: 'demo@example.com',
              subject: 'Hoş Geldiniz!',
              status: 'sent',
              sent_at: new Date().toISOString(),
            },
            {
              id: '2',
              user_id: 'demo',
              email_type: 'reminder',
              recipient: 'user@example.com',
              subject: 'Görev Hatırlatması',
              status: 'sent',
              sent_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: '3',
              user_id: 'demo',
              email_type: 'notification',
              recipient: 'test@example.com',
              subject: 'Sistem Bildirimi',
              status: 'pending',
              sent_at: new Date(Date.now() - 7200000).toISOString(),
            },
          ];

          setEmails(demoEmails);
          setStats({
            totalEmails: 3,
            sentEmails: 2,
            failedEmails: 0,
            pendingEmails: 1,
            todayEmails: 3,
          });
          setEmailTypes(['welcome', 'reminder', 'notification']);
          setLoading(false);
          return;
        }
      }

      // Başarılı veri varsa işle
      setEmails(emailsData || []);

      // İstatistikler
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();

      const totalEmails = emailsData?.length || 0;
      const sentEmails = emailsData?.filter((e: any) => e.status === 'sent').length || 0;
      const failedEmails = emailsData?.filter((e: any) => e.status === 'failed').length || 0;
      const pendingEmails = emailsData?.filter((e: any) => e.status === 'pending').length || 0;
      const todayEmails = emailsData?.filter((e: any) => e.sent_at >= todayStart).length || 0;

      setStats({
        totalEmails,
        sentEmails,
        failedEmails,
        pendingEmails,
        todayEmails,
      });

      // Email tiplerini çıkar
      const types = Array.from(new Set(emailsData?.map((e: any) => e.email_type) || [])) as string[];
      setEmailTypes(types);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  // Filtreleme
  useEffect(() => {
    let filtered = [...emails];

    // Arama
    if (searchTerm) {
      filtered = filtered.filter(
        (email) =>
          email.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.email_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Durum filtresi
    if (filterStatus !== 'all') {
      filtered = filtered.filter((email) => email.status === filterStatus);
    }

    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter((email) => email.email_type === filterType);
    }

    setFilteredEmails(filtered);
  }, [emails, searchTerm, filterStatus, filterType]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-email-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_logs' },
        () => {
          fetchEmails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircleIcon className="h-4 w-4 mr-1" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 mr-1" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Gönderildi';
      case 'failed':
        return 'Başarısız';
      case 'pending':
        return 'Bekliyor';
      default:
        return status;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Yönetimi</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Email gönderim istatistikleri ve logları</p>
          </div>
          <button
            onClick={fetchEmails}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Yenile
          </button>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Email</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalEmails}</p>
              </div>
              <EnvelopeIcon className="h-12 w-12 text-blue-500 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Gönderildi</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.sentEmails}</p>
              </div>
              <CheckCircleIcon className="h-12 w-12 text-green-500 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Başarısız</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{stats.failedEmails}</p>
              </div>
              <XCircleIcon className="h-12 w-12 text-red-500 dark:text-red-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bekliyor</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{stats.pendingEmails}</p>
              </div>
              <ClockIcon className="h-12 w-12 text-yellow-500 dark:text-yellow-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bugün</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{stats.todayEmails}</p>
              </div>
              <EnvelopeIcon className="h-12 w-12 text-purple-500 dark:text-purple-400" />
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
                placeholder="Email ara..."
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
                <option value="sent">Gönderildi</option>
                <option value="failed">Başarısız</option>
                <option value="pending">Bekliyor</option>
              </select>
            </div>

            {/* Tip Filtresi */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Tüm Tipler</option>
                {emailTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Email Listesi */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Yüklüyor...</div>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <EnvelopeIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Email bulunamadı</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Not: Email logs tablosu henüz oluşturulmamış olabilir
              </p>
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
                      Alıcı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Konu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Gönderim Zamanı
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredEmails.map((email) => (
                    <tr key={email.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            email.status
                          )}`}
                        >
                          {getStatusIcon(email.status)}
                          {getStatusLabel(email.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-900 dark:text-white break-all">{email.recipient}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{email.subject}</div>
                        {email.error_message && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">{email.error_message}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {email.email_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(email.sent_at).toLocaleString('tr-TR')}
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
