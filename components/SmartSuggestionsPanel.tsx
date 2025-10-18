import React, { useState, useEffect } from 'react';
import { SmartSuggestion, SmartSuggestionsService } from '../src/services/smartSuggestionsService';
import { Todo } from '../src/types/todo';
import { UserContext } from '../src/types/userContext';

interface SmartSuggestionsPanelProps {
  todos: Todo[];
  userContext?: UserContext;
  onSuggestionAction?: (suggestion: SmartSuggestion) => void;
  className?: string;
}

const SmartSuggestionsPanel: React.FC<SmartSuggestionsPanelProps> = ({
  todos,
  userContext,
  onSuggestionAction,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const suggestionsService = SmartSuggestionsService.getInstance();

  useEffect(() => {
    loadSuggestions();
  }, [todos]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const newSuggestions = await suggestionsService.generateSuggestions(todos, userContext);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Öneriler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: SmartSuggestion) => {
    suggestionsService.addToHistory(suggestion);
    suggestionsService.updateUserActivity();
    
    if (onSuggestionAction) {
      onSuggestionAction(suggestion);
    }
  };

  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task': return '📋';
      case 'reminder': return '⏰';
      case 'optimization': return '⚡';
      case 'motivation': return '🎯';
      case 'break': return '☕';
      case 'planning': return '📅';
      default: return '💡';
    }
  };

  if (suggestions.length === 0 && !loading) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Akıllı Öneriler</h3>
          {suggestions.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
              {suggestions.length}
            </span>
          )}
        </div>
        <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Öneriler hazırlanıyor...</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`p-3 rounded-lg border-l-4 ${getPriorityColor(suggestion.priority)} relative group`}
                >
                  {/* Dismiss button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissSuggestion(suggestion.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                  >
                    ✕
                  </button>

                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {suggestion.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            suggestion.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                            suggestion.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                            'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          }`}>
                            {suggestion.priority === 'high' ? 'Yüksek' :
                             suggestion.priority === 'medium' ? 'Orta' : 'Düşük'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(suggestion.timestamp).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        {suggestion.actionable && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuggestionClick(suggestion);
                            }}
                            className="text-xs bg-[var(--accent-color-600)] text-white px-3 py-1 rounded hover:bg-[var(--accent-color-700)] transition-colors"
                          >
                            Uygula
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {suggestions.length === 0 && (
                <div className="text-center py-6">
                  <span className="text-4xl mb-2 block">🎉</span>
                  <p className="text-gray-600 dark:text-gray-400">Şu anda yeni öneriniz yok!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Harika iş çıkarıyorsunuz, böyle devam edin.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Refresh button */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={loadSuggestions}
              disabled={loading}
              className="w-full text-sm text-[var(--accent-color-600)] hover:text-[var(--accent-color-700)] disabled:text-gray-400 transition-colors"
            >
              {loading ? 'Yenileniyor...' : '🔄 Önerileri Yenile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSuggestionsPanel;