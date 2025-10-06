import React from 'react';
import { CategoryStats } from '../types';

interface CategoryChartProps {
  data: CategoryStats[];
}

const CategoryChart: React.FC<CategoryChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8 px-4">
        <div className="text-4xl mb-2">📈</div>
        <p className="text-sm md:text-base">Henüz kategori verisi yok</p>
      </div>
    );
  }

  // Renk paleti
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500'
  ];

  const maxTasks = Math.max(...data.map(d => d.totalTasks), 1);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Bar Chart */}
      <div>
        <h4 className="text-base md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 md:mb-4 px-1">
          Kategorilere Göre Görev Dağılımı
        </h4>
        <div className="space-y-4 md:space-y-3">
          {data.slice(0, 10).map((category, index) => {
            const percentage = (category.totalTasks / maxTasks) * 100;
            const completionPercentage = category.completionRate * 100;

            return (
              <div key={category.category} className="group px-1">
                <div className="flex items-center justify-between text-sm md:text-xs mb-2 md:mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate flex-1 text-base md:text-sm">
                    {category.category}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0 text-sm md:text-xs">
                    {category.completedTasks}/{category.totalTasks}
                  </span>
                </div>
                <div className="flex gap-2 md:gap-2 items-center">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8 md:h-6 overflow-hidden relative touch-none">
                    {/* Total bar */}
                    <div
                      className={`${colors[index % colors.length]} h-full opacity-30 transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                    {/* Completed bar */}
                    <div
                      className={`${colors[index % colors.length]} h-full absolute top-0 left-0 transition-all duration-500`}
                      style={{ width: `${(percentage * category.completionRate)}%` }}
                    />
                    {/* Percentage text */}
                    <span className="absolute inset-0 flex items-center justify-center text-sm md:text-xs font-semibold text-gray-800 dark:text-white">
                      %{completionPercentage.toFixed(0)}
                    </span>
                  </div>
                  <span className="text-xs md:text-xs text-gray-500 dark:text-gray-400 w-20 md:w-16 text-right flex-shrink-0">
                    {category.totalTasks} görev
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Cards */}
      <div>
        <h4 className="text-base md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 md:mb-4 px-1">
          Detaylı Kategori İstatistikleri
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-3">
          {data.slice(0, 6).map((category, index) => (
            <div
              key={category.category}
              className="
                bg-gradient-to-br from-gray-50 to-gray-100 
                dark:from-gray-700 dark:to-gray-800 
                rounded-xl md:rounded-lg 
                p-5 md:p-4 
                border border-gray-200 dark:border-gray-600 
                hover:shadow-lg active:scale-[0.98] md:active:scale-100
                transition-all duration-300
                touch-none
              "
            >
              <div className="flex items-center justify-between mb-3 md:mb-2">
                <h5 className="font-semibold text-gray-800 dark:text-white text-base md:text-sm truncate flex-1">
                  {category.category}
                </h5>
                <div
                  className={`w-4 h-4 md:w-3 md:h-3 rounded-full ${colors[index % colors.length]} flex-shrink-0 ml-2`}
                />
              </div>
              
              <div className="space-y-2.5 md:space-y-2 text-sm md:text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Toplam Görev:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {category.totalTasks}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Tamamlanan:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {category.completedTasks}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Başarı Oranı:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    %{(category.completionRate * 100).toFixed(0)}
                  </span>
                </div>
                
                {category.averageCompletionTime > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Ort. Süre:</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {category.averageCompletionTime < 60
                        ? `${Math.round(category.averageCompletionTime)}dk`
                        : `${(category.averageCompletionTime / 60).toFixed(1)}s`}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Progress bar */}
              <div className="mt-4 md:mt-3 w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2.5 md:h-2 overflow-hidden">
                <div
                  className={`${colors[index % colors.length]} h-full transition-all duration-500`}
                  style={{ width: `${category.completionRate * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryChart;
