import React from 'react';
import { TimeAnalysis } from '../types';

interface TimeAnalysisChartProps {
  data: TimeAnalysis;
}

const TimeAnalysisChart: React.FC<TimeAnalysisChartProps> = ({ data }) => {
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} dakika`;
    } else if (minutes < 1440) {
      return `${(minutes / 60).toFixed(1)} saat`;
    } else {
      return `${(minutes / 1440).toFixed(1)} gün`;
    }
  };

  // Zaman dağılımı toplam
  const totalDistribution =
    data.timeDistribution.under15min +
    data.timeDistribution.between15and60min +
    data.timeDistribution.between1and3hours +
    data.timeDistribution.over3hours;

  const distributionData = [
    {
      label: '< 15 dakika',
      count: data.timeDistribution.under15min,
      percentage:
        totalDistribution > 0
          ? (data.timeDistribution.under15min / totalDistribution) * 100
          : 0,
      color: 'bg-green-500'
    },
    {
      label: '15dk - 1 saat',
      count: data.timeDistribution.between15and60min,
      percentage:
        totalDistribution > 0
          ? (data.timeDistribution.between15and60min / totalDistribution) * 100
          : 0,
      color: 'bg-blue-500'
    },
    {
      label: '1 - 3 saat',
      count: data.timeDistribution.between1and3hours,
      percentage:
        totalDistribution > 0
          ? (data.timeDistribution.between1and3hours / totalDistribution) * 100
          : 0,
      color: 'bg-yellow-500'
    },
    {
      label: '> 3 saat',
      count: data.timeDistribution.over3hours,
      percentage:
        totalDistribution > 0
          ? (data.timeDistribution.over3hours / totalDistribution) * 100
          : 0,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Genel Özet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">
                Ortalama Süre
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                {formatTime(data.averageCompletionTime)}
              </p>
            </div>
            <div className="text-4xl">⏱️</div>
          </div>
        </div>

        {data.fastestTask && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-green-600 dark:text-green-300 font-medium">
                En Hızlı
              </p>
              <div className="text-2xl">⚡</div>
            </div>
            <p className="text-xs text-green-700 dark:text-green-200 truncate mb-1">
              {data.fastestTask.text}
            </p>
            <p className="text-lg font-bold text-green-900 dark:text-green-100">
              {formatTime(data.fastestTask.completionTime)}
            </p>
          </div>
        )}

        {data.slowestTask && (
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-orange-600 dark:text-orange-300 font-medium">
                En Yavaş
              </p>
              <div className="text-2xl">🐌</div>
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-200 truncate mb-1">
              {data.slowestTask.text}
            </p>
            <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
              {formatTime(data.slowestTask.completionTime)}
            </p>
          </div>
        )}
      </div>

      {/* Zaman Dağılımı */}
      {totalDistribution > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Tamamlanma Süresi Dağılımı
          </h4>

          {/* Stacked bar */}
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex mb-4">
            {distributionData.map((item, index) =>
              item.percentage > 0 ? (
                <div
                  key={index}
                  className={`${item.color} flex items-center justify-center transition-all duration-500 hover:opacity-80 cursor-pointer group relative`}
                  style={{ width: `${item.percentage}%` }}
                  title={`${item.label}: ${item.count} görev (%${item.percentage.toFixed(1)})`}
                >
                  {item.percentage > 10 && (
                    <span className="text-white text-xs font-semibold">
                      %{Math.round(item.percentage)}
                    </span>
                  )}
                </div>
              ) : null
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {distributionData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${item.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.count} görev
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kategori Ortalamaları */}
      {Object.keys(data.categoryAverages).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Kategorilere Göre Ortalama Süre
          </h4>
          <div className="space-y-2">
            {Object.entries(data.categoryAverages)
              .sort(([, a], [, b]) => a - b)
              .slice(0, 8)
              .map(([category, avgTime]) => (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                    {category}
                  </span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full flex items-center justify-center transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (avgTime / Math.max(...Object.values(data.categoryAverages))) *
                            100,
                          100
                        )}%`
                      }}
                    >
                      {avgTime > 0 && (
                        <span className="text-xs text-white font-medium px-2">
                          {formatTime(avgTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Verimlilik İpuçları */}
      <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900 dark:to-teal-900 dark:bg-opacity-30 rounded-lg p-4 border border-cyan-200 dark:border-cyan-700">
        <h4 className="text-sm font-semibold text-cyan-800 dark:text-cyan-200 mb-2 flex items-center gap-2">
          <span>💡</span>
          <span>Verimlilik İpuçları</span>
        </h4>
        <div className="space-y-1 text-xs text-cyan-700 dark:text-cyan-300">
          {data.averageCompletionTime < 30 && (
            <p>✨ Görevlerinizi çok hızlı tamamlıyorsunuz! Harika zaman yönetimi.</p>
          )}
          {data.averageCompletionTime > 180 && (
            <p>
              ⏰ Görevleriniz uzun sürüyor. Büyük görevleri daha küçük parçalara bölmeyi
              deneyin.
            </p>
          )}
          {data.timeDistribution.over3hours > 5 && (
            <p>
              📊 Çok uzun süren görevleriniz var. Bunları alt görevlere ayırmak
              motivasyonu artırabilir.
            </p>
          )}
          {data.timeDistribution.under15min > 10 && (
            <p>
              ⚡ Kısa görevlerde çok başarılısınız! Pomodoro tekniği denemeyi
              düşünebilirsiniz.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeAnalysisChart;
