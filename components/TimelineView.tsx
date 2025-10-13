import React, { useMemo, useState } from 'react';
import { Todo, Priority } from '../types';

import DayAgendaModal from './DayAgendaModal';

interface TimelineViewProps {
  todos: Todo[];
  onEditTodo?: (id: string, newText: string) => void;
}

type TimelineScale = 'day' | 'week' | 'month' | 'year';

const priorityClasses = {
  [Priority.High]: 'bg-red-500',
  [Priority.Medium]: 'bg-yellow-500',
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  // Monday as start of week (Turkish locale)
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun, 1=Mon
  const diff = (day === 0 ? -6 : 1 - day); // If Sunday, go back 6 days; else 1 - day
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeek(d: Date) {
  const start = startOfWeek(d);
  const x = new Date(start);
  x.setDate(x.getDate() + 7);
  x.setMilliseconds(-1);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

function endOfYear(d: Date) {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const TimelineView: React.FC<TimelineViewProps> = ({ todos, onEditTodo }) => {
  const [scale, setScale] = useState<TimelineScale>('day');
  const [anchor, setAnchor] = useState<Date>(new Date());

  // Extend hours to cover from 8 AM to midnight (00:00)
  const hours = Array.from({ length: 17 }, (_, i) => i + 8); // 8 AM to 00:00

  const allActiveTodos = useMemo(() => todos.filter(t => !t.completed), [todos]);

  const range = useMemo(() => {
    switch (scale) {
      case 'day':
        return { start: startOfDay(anchor), end: new Date(startOfDay(anchor).getTime() + 24 * 60 * 60 * 1000 - 1) };
      case 'week':
        return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
      case 'month':
        return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
      case 'year':
        return { start: startOfYear(anchor), end: endOfYear(anchor) };
    }
  }, [anchor, scale]);

  const scheduledTodos = useMemo(() => allActiveTodos.filter(t => t.datetime && new Date(t.datetime) >= range.start && new Date(t.datetime) <= range.end), [allActiveTodos, range.start, range.end]);
  const unscheduledTodos = useMemo(() => allActiveTodos.filter(t => !t.datetime), [allActiveTodos]);

  const getTaskPosition = (datetime: string) => {
    const date = new Date(datetime);
    let hour = date.getHours();
    const minutes = date.getMinutes();
    
    // Tasks scheduled for early morning (before 8 AM) are treated as being at the end of the previous day's timeline for this view.
    if (hour < 8) {
        hour += 24;
    }

    const totalMinutes = (hour - 8) * 60 + minutes;
    // The timeline now spans 17 hours (8 AM to 1 AM next day) to include the full 00:00 slot.
    const top = (totalMinutes / (17 * 60)) * 100;
    return top;
  };

  const goPrev = () => {
    const d = new Date(anchor);
    if (scale === 'day') d.setDate(d.getDate() - 1);
    if (scale === 'week') d.setDate(d.getDate() - 7);
    if (scale === 'month') d.setMonth(d.getMonth() - 1);
    if (scale === 'year') d.setFullYear(d.getFullYear() - 1);
    setAnchor(d);
  };
  const goNext = () => {
    const d = new Date(anchor);
    if (scale === 'day') d.setDate(d.getDate() + 1);
    if (scale === 'week') d.setDate(d.getDate() + 7);
    if (scale === 'month') d.setMonth(d.getMonth() + 1);
    if (scale === 'year') d.setFullYear(d.getFullYear() + 1);
    setAnchor(d);
  };
  const goToday = () => setAnchor(new Date());

  const dayLabel = useMemo(() => anchor.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), [anchor]);
  const weekLabel = useMemo(() => {
    const s = startOfWeek(anchor);
    const e = endOfWeek(anchor);
    return `${s.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} - ${e.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}`;
  }, [anchor]);
  const monthLabel = useMemo(() => anchor.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }), [anchor]);
  const yearLabel = useMemo(() => anchor.getFullYear(), [anchor]);

  const [isAgendaOpen, setAgendaOpen] = useState(false);
  const [agendaDate, setAgendaDate] = useState<Date>(new Date());
  const openAgenda = (d: Date) => { setAgendaDate(new Date(d)); setAgendaOpen(true); };
  const closeAgenda = () => setAgendaOpen(false);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="inline-flex items-center gap-2">
          <button onClick={goPrev} className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">◀</button>
          <button onClick={goToday} className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Bugün</button>
          <button onClick={goNext} className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">▶</button>
        </div>
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {scale === 'day' && dayLabel}
          {scale === 'week' && `Hafta: ${weekLabel}`}
          {scale === 'month' && monthLabel}
          {scale === 'year' && `${yearLabel}`}
        </div>
        <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button onClick={() => setScale('day')} className={`px-3 py-1 text-sm rounded-md ${scale === 'day' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Gün</button>
          <button onClick={() => setScale('week')} className={`px-3 py-1 text-sm rounded-md ${scale === 'week' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Hafta</button>
          <button onClick={() => setScale('month')} className={`px-3 py-1 text-sm rounded-md ${scale === 'month' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Ay</button>
          <button onClick={() => setScale('year')} className={`px-3 py-1 text-sm rounded-md ${scale === 'year' ? 'bg-white dark:bg-gray-800 text-[var(--accent-color-600)] shadow' : 'text-gray-600 dark:text-gray-300'}`}>Yıl</button>
        </div>
      </div>

{unscheduledTodos.length > 0 && (
        <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">Zamansız Görevler</h3>
          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
            {unscheduledTodos.map(todo => (
              <div key={todo.id} className="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full max-w-full">
                <span className={`h-2 w-2 rounded-full ${priorityClasses[todo.priority]}`}></span>
                <span className="text-gray-700 dark:text-gray-300 truncate">{todo.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Views by scale */}
      {scale === 'day' && (
        <div className="relative">
          {/* Hour markers */}
          {hours.map(hour => (
            <div key={hour} className="flex items-start h-20 border-t border-gray-200 dark:border-gray-700">
              <div className="w-16 text-right pr-4 text-sm text-gray-400 dark:text-gray-500 transform -translate-y-1/2">
                {hour === 24 ? '00' : hour}:00
              </div>
            </div>
          ))}

          {/* Task items */}
          {scheduledTodos.map(todo => {
            if (!todo.datetime) return null;
            const dt = new Date(todo.datetime);
            if (!isSameDay(dt, anchor)) return null; // safety filter
            const top = getTaskPosition(todo.datetime);
            const isConflict = todo.aiMetadata?.isConflict;

            return (
              <div
                key={todo.id}
                className={`absolute left-16 right-0 p-2 rounded-lg text-white shadow-lg ${priorityClasses[todo.priority]} ${isConflict ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-orange-500' : ''}`}
                style={{ top: `${top}%`, minHeight: '40px' }}
                title={`${todo.text} - ${dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
              >
                <p className="font-bold text-sm truncate">{todo.text}</p>
                <p className="text-xs opacity-80">{dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            );
          })}
        </div>
      )}

      {scale === 'week' && (() => {
        const days: Date[] = Array.from({ length: 7 }, (_, i) => {
          const d = startOfWeek(anchor);
          d.setDate(d.getDate() + i);
          return d;
        });
        return (
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            {days.map((d, idx) => {
              const dayTodos = scheduledTodos
                .filter(t => t.datetime && isSameDay(new Date(t.datetime!), d))
                .sort((a, b) => new Date(a.datetime!).getTime() - new Date(b.datetime!).getTime());
              return (
                <div key={idx} className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 border border-gray-200/60 dark:border-gray-700/60">
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {d.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </div>
                    <span className="text-xs text-gray-500">{dayTodos.length}</span>
                  </div>
                  <div className="space-y-2">
                    {dayTodos.length === 0 && (
                      <div className="text-xs text-gray-400">Görev yok</div>
                    )}
{dayTodos.map((todo) => (
                      <button onClick={() => openAgenda(d)} key={todo.id} className="flex items-start gap-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1 py-1 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer">
                        <span className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${priorityClasses[todo.priority]}`}></span>
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500">
                            {new Date(todo.datetime!).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-sm text-gray-800 dark:text-gray-200 truncate break-words" title={todo.text}>{todo.text}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {scale === 'month' && (() => {
        const first = startOfMonth(anchor);
        const last = endOfMonth(anchor);
        const firstWeekStart = startOfWeek(first);
        const weeks: Date[][] = [];
        let cursor = new Date(firstWeekStart);
        while (cursor <= last || weeks.length < 6) {
          const week: Date[] = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(cursor);
            d.setDate(cursor.getDate() + i);
            return d;
          });
          weeks.push(week);
          cursor.setDate(cursor.getDate() + 7);
          if (cursor > last && weeks.length >= 5) break;
        }
        return (
          <div className="grid grid-cols-7 gap-2">
            {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((w, i) => (
              <div key={i} className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">{w}</div>
            ))}
            {weeks.flat().map((d, idx) => {
              const inMonth = d.getMonth() === anchor.getMonth();
              const dayTodos = scheduledTodos.filter(t => t.datetime && isSameDay(new Date(t.datetime!), d));
              const top3 = dayTodos
                .sort((a, b) => new Date(a.datetime!).getTime() - new Date(b.datetime!).getTime())
                .slice(0, 3);
              return (
                <div key={idx} className={`min-h-[90px] border rounded-md p-2 ${inMonth ? 'border-gray-200/60 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/40' : 'border-transparent text-gray-400'}`}>
                  <div className={`text-xs font-semibold mb-1 ${inMonth ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-1">
{top3.map(todo => (
                      <button onClick={() => openAgenda(d)} key={todo.id} className="flex items-center gap-1 text-[11px] truncate w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-0.5 cursor-pointer">
                        <span className={`h-2 w-2 rounded-full ${priorityClasses[todo.priority]}`}></span>
                        <span className="opacity-70">{new Date(todo.datetime!).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="truncate" title={todo.text}>{todo.text}</span>
                      </button>
                    ))}
                    {dayTodos.length > 3 && (
                      <button onClick={() => openAgenda(d)} className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        +{dayTodos.length - 3} daha
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {scale === 'year' && (() => {
        const months = Array.from({ length: 12 }, (_, m) => new Date(anchor.getFullYear(), m, 1));
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {months.map((mDate, idx) => {
              const mStart = startOfMonth(mDate);
              const mEnd = endOfMonth(mDate);
              const monthTodos = allActiveTodos.filter(t => t.datetime && new Date(t.datetime) >= mStart && new Date(t.datetime) <= mEnd);
              return (
                <div key={idx} className="border border-gray-200/60 dark:border-gray-700/60 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/40">
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {mDate.toLocaleDateString('tr-TR', { month: 'long' })}
                    </div>
                    <span className="text-xs text-gray-500">{monthTodos.length} görev</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
{monthTodos.slice(0, 3).map(t => (
                      <button onClick={() => openAgenda(new Date(t.datetime!))} key={t.id} className="flex items-center gap-2 truncate w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1 py-0.5 cursor-pointer">
                        <span className={`h-2 w-2 rounded-full ${priorityClasses[t.priority]}`}></span>
                        <span>{new Date(t.datetime!).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}</span>
                        <span className="truncate" title={t.text}>{t.text}</span>
                      </button>
                    ))}
                    {monthTodos.length > 3 && <div className="mt-1 text-xs text-gray-500">Toplam {monthTodos.length} görev</div>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
<DayAgendaModal isOpen={isAgendaOpen} onClose={closeAgenda} date={agendaDate} todos={allActiveTodos} onEditTodo={(id, text) => onEditTodo && onEditTodo(id, text)} />
    </div>
  );
};

export default TimelineView;
