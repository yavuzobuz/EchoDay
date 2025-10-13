import React, { useState, useEffect } from 'react';
import { PeriodicReport, Todo } from '../types';
import { archiveService } from '../services/archiveService';
import { useI18n } from '../contexts/I18nContext';
import CategoryChart from './CategoryChart';
import TimeAnalysisChart from './TimeAnalysisChart';

interface PeriodicReportViewProps {
  currentTodos: Todo[];
}

const PeriodicReportView: React.FC<PeriodicReportViewProps> = ({ currentTodos }) => {
  const { t, lang } = useI18n();
  const locale = lang === 'en' ? 'en-US' : 'tr-TR';
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [report, setReport] = useState<PeriodicReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [period, currentTodos]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const reportData = await archiveService.getPeriodicReport(period, currentTodos);
      setReport(reportData);
    } catch (error) {
      console.error('[PeriodicReport] Failed to load report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!report) return;

    const exportData = {
      report: t('reports.exportTitle'),
      period: t(`reports.period.${period === 'week' ? 'weekly' : 'monthly'}`),
      dateRange: `${new Date(report.startDate).toLocaleDateString(locale)} - ${new Date(report.endDate).toLocaleDateString(locale)}`,
      summary: {
        totalTasks: report.totalTasks,
        completedTasks: report.completedTasks,
        completionRate: `%${(report.completionRate * 100).toFixed(1)}`,
        productivityScore: report.productivityScore
      },
      topCategories: report.topCategories,
      insights: report.insights,
      categoryBreakdown: report.categoryBreakdown.map(cat => ({
        category: cat.category,
        totalTasks: cat.totalTasks,
        completedTasks: cat.completedTasks,
        completionRate: `%${(cat.completionRate * 100).toFixed(1)}`
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echoday-report-${period}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        {t('reports.loadFailed')}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t(`reports.period.${period === 'week' ? 'weekly' : 'monthly'}`)} {t('reports.title')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date(report.startDate).toLocaleDateString(locale)} -{' '}
            {new Date(report.endDate).toLocaleDateString(locale)}
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                period === 'week'
                  ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {t('reports.period.weekly')}
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                period === 'month'
                  ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {t('reports.period.monthly')}
            </button>
          </div>

          <button
            onClick={handleExportReport}
            className="px-4 py-1.5 bg-[var(--accent-color-600)] text-white rounded-lg hover:bg-[var(--accent-color-700)] transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {t('reports.export')}
          </button>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
              {t('reports.summary.totalTasks')}
            </p>
            <div className="text-2xl">📊</div>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {report.totalTasks}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-green-600 dark:text-green-300">
              {t('reports.summary.completed')}
            </p>
            <div className="text-2xl">✅</div>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {report.completedTasks}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-600 dark:text-purple-300">
              {t('reports.summary.completionRate')}
            </p>
            <div className="text-2xl">📈</div>
          </div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            %{(report.completionRate * 100).toFixed(0)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-orange-600 dark:text-orange-300">
              {t('reports.summary.productivityScore')}
            </p>
            <div className="text-2xl">🎯</div>
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {report.productivityScore}/100
          </p>
        </div>
      </div>

      {/* AI Öngörüleri */}
      {report.insights.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900 dark:bg-opacity-30 rounded-lg p-6 border border-indigo-200 dark:border-indigo-700">
          <h4 className="text-lg font-semibold text-indigo-800 dark:text-indigo-200 mb-4 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span>{t('reports.insights.title')}</span>
          </h4>
          <div className="space-y-2">
            {report.insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-3 text-indigo-700 dark:text-indigo-300"
              >
                <span className="text-lg flex-shrink-0 mt-0.5">•</span>
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* En Çok Kullanılan Kategoriler */}
      {report.topCategories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {t('reports.topCategories')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {report.topCategories.map((category, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-gradient-to-r from-[var(--accent-color-100)] to-[var(--accent-color-200)] dark:from-[var(--accent-color-800)] dark:to-[var(--accent-color-900)] text-[var(--accent-color-700)] dark:text-[var(--accent-color-200)] rounded-full text-sm font-medium"
              >
                #{index + 1} {category}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Kategori Analizi */}
      {report.categoryBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {t('reports.categoryAnalysis')}
          </h4>
          <CategoryChart data={report.categoryBreakdown} />
        </div>
      )}

      {/* Zaman Analizi */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          {t('reports.timeAnalysis')}
        </h4>
        <TimeAnalysisChart data={report.timeAnalysis} />
      </div>

      {/* Footer - Rapor Bilgisi */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p>
          {t('reports.footer.generated').replace('{date}', new Date().toLocaleString(locale))}
        </p>
        <p className="mt-1">{t('reports.footer.app')}</p>
      </div>
    </div>
  );
};

export default PeriodicReportView;
