import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { Todo } from '../types';
import PeriodicReportView from '../components/PeriodicReportView';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const [todos, setTodos] = useState<Todo[]>([]);
  
  useEffect(() => {
    const storedTodos = localStorage.getItem(`todos_${userId}`);
    if (storedTodos) {
      try {
        setTodos(JSON.parse(storedTodos));
      } catch (e) {
        console.error('Failed to parse todos:', e);
      }
    }
  }, [userId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--gradient-from))] via-[hsl(var(--gradient-via))] to-[hsl(var(--gradient-to))]">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('common.home')}
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-black text-[hsl(var(--foreground))] mb-4">
            {t('reports.title')}
          </h1>
          <p className="text-xl text-[hsl(var(--muted-foreground))] max-w-3xl mx-auto">
            {t('reports.subtitle')}
          </p>
        </div>
      </div>

      {/* Reports Content */}
      <div className="container mx-auto px-4 pb-20">
        <div className="bg-[hsl(var(--card))] rounded-2xl shadow-xl overflow-hidden">
          <PeriodicReportView currentTodos={todos} />
        </div>
      </div>
    </div>
  );
};

export default Reports;