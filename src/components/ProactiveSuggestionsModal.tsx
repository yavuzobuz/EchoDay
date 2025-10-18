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
      case 'high': return 'from-[hsl(var(--destructive))] to-red-500';
      case 'medium': return 'from-yellow-500 to-amber-500';
      case 'low': return 'from-[hsl(var(--primary))] to-[hsl(var(--accent))]';
      default: return 'from-[hsl(var(--muted))] to-[hsl(var(--muted-foreground))]';
    }
  };

  const getBorderColorForPriority = (priority: ProactiveSuggestion['priority']) => {
    switch (priority) {
      case 'high': return 'border-[hsl(var(--destructive))]';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-[hsl(var(--primary))]';
      default: return 'border-[hsl(var(--border))]';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-[hsl(var(--border))]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] p-6">
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
              className="text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-foreground))] hover:bg-opacity-20 rounded-lg p-2 transition-colors"
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
              <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
                Harika Gidiyorsunuz!
              </h3>
              <p className="text-[hsl(var(--muted-foreground))]">
                Şu anda hiç öneriniz yok. Her şey yolunda görünüyor!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`border-2 ${getBorderColorForPriority(suggestion.priority)} rounded-lg p-4 bg-[hsl(var(--card))] shadow-sm hover:shadow-md transition-shadow`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-3xl">{getIconForType(suggestion.type)}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[hsl(var(--card-foreground))] text-lg">
                          {suggestion.title}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r ${getColorForPriority(suggestion.priority)} text-white`}>
                            {suggestion.priority === 'high' ? '🔥 Yüksek' : suggestion.priority === 'medium' ? '⚡ Orta' : '📌 Düşük'}
                          </span>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
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
                  <p className="text-[hsl(var(--card-foreground))] mb-4 ml-12">
                    {suggestion.description}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between ml-12">
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
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
                        className="px-4 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] text-sm font-medium rounded-lg hover:bg-[hsl(var(--secondary))]/80 transition-colors"
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
          <div className="bg-[hsl(var(--muted))] p-4 border-t border-[hsl(var(--border))]">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                💡 Bu öneriler sizin alışkanlıklarınıza göre oluşturuldu
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] text-sm font-medium rounded-lg hover:bg-[hsl(var(--secondary))]/80 transition-colors"
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
