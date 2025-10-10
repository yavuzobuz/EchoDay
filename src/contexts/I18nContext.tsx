import React, { createContext, useContext, useMemo, useState } from 'react';

export type Lang = 'tr' | 'en';

// Minimal translation dictionary. You can extend safely.
const dict: Record<Lang, Record<string, string>> = {
  tr: {
    'title.myItems': 'Görevlerim & Notlarım',
    'nav.list': 'Liste',
    'nav.timeline': 'Zaman Çizelgesi',
    'filter.content.all': 'Tümü',
    'filter.content.tasks': 'Görevler',
    'filter.content.notes': 'Notlar',
    'filter.status.all': 'Tüm Görevler',
    'filter.status.active': 'Aktif',
    'filter.status.completed': 'Tamamlanan',
    'filter.range.day': 'Gün',
    'filter.range.week': 'Hafta',
    'filter.range.month': 'Ay',
    'filter.range.year': 'Yıl',
    'filter.range.all': 'Tümü',
    'timeline.unscheduled': 'Zamansız Görevler',
    'timeline.noTasks': 'Görev yok',
    'common.today': 'Bugün',
  },
  en: {
    'title.myItems': 'My Tasks & Notes',
    'nav.list': 'List',
    'nav.timeline': 'Timeline',
    'filter.content.all': 'All',
    'filter.content.tasks': 'Tasks',
    'filter.content.notes': 'Notes',
    'filter.status.all': 'All Tasks',
    'filter.status.active': 'Active',
    'filter.status.completed': 'Completed',
    'filter.range.day': 'Day',
    'filter.range.week': 'Week',
    'filter.range.month': 'Month',
    'filter.range.year': 'Year',
    'filter.range.all': 'All',
    'timeline.unscheduled': 'Unscheduled Tasks',
    'timeline.noTasks': 'No tasks',
    'common.today': 'Today',
  },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitial = (): Lang => {
    const saved = localStorage.getItem('appLang') as Lang | null;
    if (saved === 'en' || saved === 'tr') return saved;
    // default Turkish for existing users
    return 'tr';
  };
  const [lang, setLangState] = useState<Lang>(getInitial());

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('appLang', l); } catch {}
  };

  const t = (key: string, fallback?: string) => {
    const table = dict[lang] || {};
    if (key in table) return table[key];
    // Allow nested fallback to TR if missing in EN
    if (lang !== 'tr' && dict.tr[key]) return dict.tr[key];
    return fallback ?? key;
  };

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
