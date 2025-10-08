import React, { useEffect, useState } from 'react';
import { UserContext } from '../types';
import { contextMemoryService } from '../services/contextMemoryService';

interface ContextInsightsPanelProps {
  userContext: UserContext;
  onClose?: () => void;
  inline?: boolean;
}

const ContextInsightsPanel: React.FC<ContextInsightsPanelProps> = ({ userContext, onClose, inline = false }) => {
  const [insights, setInsights] = useState<string[]>([]);
  
  useEffect(() => {
    const contextInsights = contextMemoryService.getContextualInsights(userContext);
    setInsights(contextInsights);
  }, [userContext]);
  
  const { completionStats, workingHours, patterns, preferences } = userContext;
  
  if (inline) {
    // Inline (embedded) variant without modal overlay
    return (
      <div className="mt-6 bg-white/80 dark:bg-gray-800/70 rounded-xl shadow p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">📊 Bağlamsal İçgörüler</h2>
              <p className="text-xs sm:text-sm opacity-90 mt-1">AI destekli alışkanlık analizi</p>
            </div>
          </div>
        </div>
        {/* Content (reuse same content section classes) */}
        <div className="p-4 sm:p-6 space-y-6">
        
        {/* Completion Stats */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 dark:bg-opacity-30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
              <span className="text-2xl mr-2">✅</span>
              Tamamlama İstatistikleri
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Toplam Görev</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionStats.totalTasksCreated}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Tamamlanan</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completionStats.totalTasksCompleted}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Tamamlama Oranı</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${completionStats.completionRate * 100}%` }}
                  />
                </div>
                <p className="text-right text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                  %{(completionStats.completionRate * 100).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Working Hours */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 dark:bg-opacity-30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
              <span className="text-2xl mr-2">⏰</span>
              Çalışma Saatleri
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Hafta İçi:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {workingHours.weekdayStart} - {workingHours.weekdayEnd}
                </span>
              </div>
              {workingHours.mostProductiveHours.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">En Üretken Saatler:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {workingHours.mostProductiveHours.slice(0, 3).map(h => `${h}:00`).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Patterns */}
          {patterns.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 dark:bg-opacity-30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">🔁</span>
                Tespit Edilen Rutinler ({patterns.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {patterns.slice(0, 5).map((pattern, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 bg-opacity-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{pattern.pattern}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {pattern.dayOfWeek !== undefined && ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][pattern.dayOfWeek]}
                          {pattern.timeOfDay && ` • ${pattern.timeOfDay}`}
                        </p>
                      </div>
                      <span className="bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 text-xs px-2 py-1 rounded-full">
                        {pattern.frequency}x
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full"
                        style={{ width: `${pattern.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Preferences */}
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900 dark:to-yellow-900 dark:bg-opacity-30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
              <span className="text-2xl mr-2">⭐</span>
              Tercihleriniz
            </h3>
            <div className="space-y-2">
              {preferences.favoriteCategories.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Favori Kategoriler:</p>
                  <div className="flex flex-wrap gap-2">
                    {preferences.favoriteCategories.map((cat, idx) => (
                      <span 
                        key={idx}
                        className="bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-100 text-xs px-3 py-1 rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-600 dark:text-gray-300">Ortalama Günlük Görev:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {preferences.averageTasksPerDay.toFixed(1)} görev/gün
                </span>
              </div>
            </div>
          </div>
          
          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900 dark:to-teal-900 dark:bg-opacity-30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">💡</span>
                AI Önerileri
              </h3>
              <div className="space-y-2">
                {insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="text-cyan-600 dark:text-cyan-400 mt-1">•</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-2">
            <p className="text-xs text-right text-gray-500 dark:text-gray-400">
              Son güncelleme: {new Date(userContext.lastUpdated).toLocaleString('tr-TR')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">📊 Bağlamsal İçgörüler</h2>
              <p className="text-sm opacity-90 mt-1">AI destekli alışkanlık analizi</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Completion Stats */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 dark:bg-opacity-30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
              <span className="text-2xl mr-2">✅</span>
              Tamamlama İstatistikleri
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Toplam Görev</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionStats.totalTasksCreated}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Tamamlanan</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completionStats.totalTasksCompleted}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Tamamlama Oranı</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${completionStats.completionRate * 100}%` }}
                  />
                </div>
                <p className="text-right text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                  %{(completionStats.completionRate * 100).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Working Hours */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 dark:bg-opacity-30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
              <span className="text-2xl mr-2">⏰</span>
              Çalışma Saatleri
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Hafta İçi:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {workingHours.weekdayStart} - {workingHours.weekdayEnd}
                </span>
              </div>
              {workingHours.mostProductiveHours.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">En Üretken Saatler:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {workingHours.mostProductiveHours.slice(0, 3).map(h => `${h}:00`).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Patterns */}
          {patterns.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 dark:bg-opacity-30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">🔁</span>
                Tespit Edilen Rutinler ({patterns.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {patterns.slice(0, 5).map((pattern, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 bg-opacity-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{pattern.pattern}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {pattern.dayOfWeek !== undefined && ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][pattern.dayOfWeek]}
                          {pattern.timeOfDay && ` • ${pattern.timeOfDay}`}
                        </p>
                      </div>
                      <span className="bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 text-xs px-2 py-1 rounded-full">
                        {pattern.frequency}x
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full"
                        style={{ width: `${pattern.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Preferences */}
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900 dark:to-yellow-900 dark:bg-opacity-30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
              <span className="text-2xl mr-2">⭐</span>
              Tercihleriniz
            </h3>
            <div className="space-y-2">
              {preferences.favoriteCategories.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Favori Kategoriler:</p>
                  <div className="flex flex-wrap gap-2">
                    {preferences.favoriteCategories.map((cat, idx) => (
                      <span 
                        key={idx}
                        className="bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-100 text-xs px-3 py-1 rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-600 dark:text-gray-300">Ortalama Günlük Görev:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {preferences.averageTasksPerDay.toFixed(1)} görev/gün
                </span>
              </div>
            </div>
          </div>
          
          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900 dark:to-teal-900 dark:bg-opacity-30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">💡</span>
                AI Önerileri
              </h3>
              <div className="space-y-2">
                {insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="text-cyan-600 dark:text-cyan-400 mt-1">•</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 p-4 rounded-b-xl border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Son güncelleme: {new Date(userContext.lastUpdated).toLocaleString('tr-TR')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ContextInsightsPanel;
