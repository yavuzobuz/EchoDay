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
    <div className="space-y-6 md:space-y-8">
      {/* Genel Özet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl md:rounded-lg p-5 md:p-4 border border-blue-200 dark:border-blue-700 active:scale-[0.98] md:active:scale-100 transition-transform touch-none">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-base md:text-sm text-blue-600 dark:text-blue-300 font-medium">
                Ortalama Süre
              </p>
              <p className="text-3xl md:text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2 md:mt-1 truncate">
                {formatTime(data.averageCompletionTime)}
              </p>
            </div>
            <div className="text-5xl md:text-4xl flex-shrink-0 ml-2">⏱️</div>
          </div>
        </div>

        {data.fastestTask && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl md:rounded-lg p-5 md:p-4 border border-green-200 dark:border-green-700 active:scale-[0.98] md:active:scale-100 transition-transform touch-none">
            <div className="flex items-center justify-between mb-3 md:mb-2">
              <p className="text-base md:text-sm text-green-600 dark:text-green-300 font-medium">
                En Hızlı
              </p>
              <div className="text-3xl md:text-2xl flex-shrink-0">⚡</div>
            </div>
            <p className="text-sm md:text-xs text-green-700 dark:text-green-200 truncate mb-2 md:mb-1">
              {data.fastestTask.text}
            </p>
            <p className="text-xl md:text-lg font-bold text-green-900 dark:text-green-100">
              {formatTime(data.fastestTask.completionTime)}
            </p>
          </div>
        )}

        {data.slowestTask && (
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-xl md:rounded-lg p-5 md:p-4 border border-orange-200 dark:border-orange-700 active:scale-[0.98] md:active:scale-100 transition-transform touch-none">
            <div className="flex items-center justify-between mb-3 md:mb-2">
              <p className="text-base md:text-sm text-orange-600 dark:text-orange-300 font-medium">
                En Yavaş
              </p>
              <div className="text-3xl md:text-2xl flex-shrink-0">🐌</div>
            </div>
            <p className="text-sm md:text-xs text-orange-700 dark:text-orange-200 truncate mb-2 md:mb-1">
              {data.slowestTask.text}
            </p>
            <p className="text-xl md:text-lg font-bold text-orange-900 dark:text-orange-100">
              {formatTime(data.slowestTask.completionTime)}
            </p>
          </div>
        )}
      </div>

      {/* Zaman Dağılımı */}
      {totalDistribution > 0 && (
        <div>
          <h4 className="text-base md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 md:mb-4 px-1">
            Tamamlanma Süresi Dağılımı
          </h4>

          {/* Stacked bar */}
          <div className="h-14 md:h-12 bg-gray-200 dark:bg-gray-700 rounded-xl md:rounded-lg overflow-hidden flex mb-4 touch-none">
            {distributionData.map((item, index) =>
              item.percentage > 0 ? (
                <div
                  key={index}
                  className={`${item.color} flex items-center justify-center transition-all duration-500 active:opacity-80 md:hover:opacity-80 cursor-pointer group relative`}
                  style={{ width: `${item.percentage}%` }}
                  title={`${item.label}: ${item.count} görev (%${item.percentage.toFixed(1)})`}
                >
                  {item.percentage > 10 && (
                    <span className="text-white text-sm md:text-xs font-semibold">
                      %{Math.round(item.percentage)}
                    </span>
                  )}
                </div>
              ) : null
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-3 px-1">
            {distributionData.map((item, index) => (
              <div key={index} className="flex items-center gap-2.5 md:gap-2">
                <div className={`w-5 h-5 md:w-4 md:h-4 rounded-md md:rounded ${item.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm md:text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {item.label}
                  </p>
                  <p className="text-xs md:text-xs text-gray-500 dark:text-gray-400">
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
          <h4 className="text-base md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 md:mb-4 px-1">
            Kategorilere Göre Ortalama Süre
          </h4>
          <div className="space-y-3 md:space-y-2">
            {Object.entries(data.categoryAverages)
              .sort(([, a], [, b]) => a - b)
              .slice(0, 8)
              .map(([category, avgTime]) => (
                <div key={category} className="flex items-center gap-3 px-1">
                  <span className="text-base md:text-sm text-gray-700 dark:text-gray-300 flex-1 truncate min-w-0">
                    {category}
                  </span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 md:h-4 overflow-hidden touch-none">
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
                        <span className="text-xs md:text-xs text-white font-medium px-2 whitespace-nowrap">
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
      <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900 dark:to-teal-900 dark:bg-opacity-30 rounded-xl md:rounded-lg p-5 md:p-4 border border-cyan-200 dark:border-cyan-700">
        <h4 className="text-base md:text-sm font-semibold text-cyan-800 dark:text-cyan-200 mb-3 md:mb-2 flex items-center gap-2">
          <span className="text-xl md:text-base">💡</span>
          <span>Verimlilik İpuçları</span>
        </h4>
        <div className="space-y-2 md:space-y-1 text-sm md:text-xs text-cyan-700 dark:text-cyan-300">
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
