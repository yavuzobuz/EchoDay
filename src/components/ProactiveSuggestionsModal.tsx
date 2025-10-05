import React from 'react';
import { ProactiveSuggestion } from '../types';

interface ProactiveSuggestionsModalProps {
  suggestions: ProactiveSuggestion[];
  onClose: () => void;
  onAcceptSuggestion: (suggestion: ProactiveSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
}

const ProactiveSuggestionsModal: React.FC<ProactiveSuggestionsModalProps> = ({
  suggestions,
  onClose,
  onAcceptSuggestion,
  onDismissSuggestion
}) => {
  const getIconForType = (type: ProactiveSuggestion['type']) => {
    switch (type) {
      case 'task': return '📝';
      case 'reminder': return '⏰';
      case 'optimization': return '⚡';
      case 'warning': return '⚠️';
      case 'insight': return '💡';
      default: return '📌';
    }
  };

  const getColorForPriority = (priority: ProactiveSuggestion['priority']) => {
    switch (priority) {
      case 'high': return 'from-red-500 to-orange-500';
      case 'medium': return 'from-yellow-500 to-amber-500';
      case 'low': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getBorderColorForPriority = (priority: ProactiveSuggestion['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-300 dark:border-red-700';
      case 'medium': return 'border-yellow-300 dark:border-yellow-700';
      case 'low': return 'border-blue-300 dark:border-blue-700';
      default: return 'border-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <span className="mr-3">🤖</span>
                AI Önerileri
              </h2>
              <p className="text-sm opacity-90 mt-1">
                {suggestions.length} proaktif öneri mevcut
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {suggestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Harika Gidiyorsunuz!
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Şu anda hiç öneriniz yok. Her şey yolunda görünüyor!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`border-2 ${getBorderColorForPriority(suggestion.priority)} rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-3xl">{getIconForType(suggestion.type)}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                          {suggestion.title}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r ${getColorForPriority(suggestion.priority)} text-white`}>
                            {suggestion.priority === 'high' ? '🔥 Yüksek' : suggestion.priority === 'medium' ? '⚡ Orta' : '📌 Düşük'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {suggestion.type === 'task' ? 'Görev Önerisi' :
                             suggestion.type === 'reminder' ? 'Hatırlatma' :
                             suggestion.type === 'optimization' ? 'Optimizasyon' :
                             suggestion.type === 'warning' ? 'Uyarı' : 'İçgörü'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 dark:text-gray-300 mb-4 ml-12">
                    {suggestion.description}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between ml-12">
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(suggestion.createdAt).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="flex space-x-2">
                      {suggestion.actionable && (
                        <button
                          onClick={() => onAcceptSuggestion(suggestion)}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-sm hover:shadow-md"
                        >
                          ✅ Kabul Et
                        </button>
                      )}
                      <button
                        onClick={() => onDismissSuggestion(suggestion.id)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {suggestions.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Bu öneriler sizin alışkanlıklarınıza göre oluşturuldu
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProactiveSuggestionsModal;
