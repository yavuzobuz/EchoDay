import React, { useEffect, useState } from 'react';
import { 
  getUserLimits, 
  getUserUsage, 
  PlanLimits, 
  UsageStats 
} from '../services/subscriptionLimitsService';

interface UsageLimitWidgetProps {
  userId: string;
}

const UsageLimitWidget: React.FC<UsageLimitWidgetProps> = ({ userId }) => {
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [limitsData, usageData] = await Promise.all([
        getUserLimits(userId),
        getUserUsage(userId),
      ]);
      setLimits(limitsData);
      setUsage(usageData);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (current: number, limit: number) => {
    if (limit === -1) return 'bg-green-500'; // Sınırsız
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getProgressPercentage = (current: number, limit: number) => {
    if (limit === -1) return 100;
    return Math.min((current / limit) * 100, 100);
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? '∞' : limit.toString();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!limits || !usage) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Kullanım Durumu
        </h3>
        <button
          onClick={loadData}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          🔄 Yenile
        </button>
      </div>

      <div className="space-y-4">
        {/* Görevler */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              📋 Görevler
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {usage.tasks_count} / {formatLimit(limits.max_tasks)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor(
                usage.tasks_count,
                limits.max_tasks
              )}`}
              style={{
                width: `${getProgressPercentage(usage.tasks_count, limits.max_tasks)}%`,
              }}
            ></div>
          </div>
          {limits.max_tasks !== -1 && usage.tasks_count >= limits.max_tasks && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              ⚠️ Görev limitine ulaştınız
            </p>
          )}
        </div>

        {/* Notlar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              📝 Notlar
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {usage.notes_count} / {formatLimit(limits.max_notes)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor(
                usage.notes_count,
                limits.max_notes
              )}`}
              style={{
                width: `${getProgressPercentage(usage.notes_count, limits.max_notes)}%`,
              }}
            ></div>
          </div>
          {limits.max_notes !== -1 && usage.notes_count >= limits.max_notes && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              ⚠️ Not limitine ulaştınız
            </p>
          )}
        </div>

        {/* AI İstekleri */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🤖 AI İstekleri (Bugün)
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {usage.ai_requests_today} / {formatLimit(limits.ai_requests_per_day)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor(
                usage.ai_requests_today,
                limits.ai_requests_per_day
              )}`}
              style={{
                width: `${getProgressPercentage(
                  usage.ai_requests_today,
                  limits.ai_requests_per_day
                )}%`,
              }}
            ></div>
          </div>
          {limits.ai_requests_per_day !== -1 &&
            usage.ai_requests_today >= limits.ai_requests_per_day && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                ⚠️ Günlük AI istek limitine ulaştınız
              </p>
            )}
        </div>
      </div>

      {/* Özellik Durumu */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Özellikler
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <FeatureStatus
            label="E-posta"
            enabled={limits.email_integration}
          />
          <FeatureStatus
            label="Analitik"
            enabled={limits.analytics}
          />
          <FeatureStatus
            label="Öncelikli Destek"
            enabled={limits.priority_support}
          />
          <FeatureStatus
            label="Özel Entegrasyon"
            enabled={limits.custom_integration}
          />
        </div>
      </div>

      {/* Upgrade Çağrısı */}
      {(limits.max_tasks !== -1 || limits.ai_requests_per_day !== -1) && (
        <div className="mt-6">
          <a
            href="/pricing"
            className="block w-full text-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
          >
            ⬆️ Planı Yükselt
          </a>
        </div>
      )}
    </div>
  );
};

// Yardımcı Komponent
const FeatureStatus: React.FC<{ label: string; enabled: boolean }> = ({
  label,
  enabled,
}) => (
  <div className="flex items-center space-x-2">
    <span className={`text-lg ${enabled ? 'text-green-500' : 'text-gray-400'}`}>
      {enabled ? '✓' : '✗'}
    </span>
    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
  </div>
);

export default UsageLimitWidget;
