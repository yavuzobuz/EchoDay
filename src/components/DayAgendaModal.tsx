import React from 'react';
import { Todo, Priority } from '../types';

interface DayAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  todos: Todo[];
  onEditTodo: (id: string, newText: string) => void;
}

const priorityClasses = {
  [Priority.High]: 'bg-red-500',
  [Priority.Medium]: 'bg-yellow-500',
};

const DayAgendaModal: React.FC<DayAgendaModalProps> = ({ isOpen, onClose, date, todos }) => {
  if (!isOpen) return null;

  const formatDate = (d: Date) => d.toLocaleDateString('tr-TR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });

  const formatTime = (dt: Date) => dt.toLocaleTimeString('tr-TR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const dayTodos = todos
    .filter(t => t.datetime && !t.completed && !t.isDeleted)
    .filter(t => {
      const taskDate = new Date(t.datetime!);
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      );
    })
    .sort((a, b) => new Date(a.datetime!).getTime() - new Date(b.datetime!).getTime());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              📅 {formatDate(date)}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {dayTodos.length} görev planlandı
          </p>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-96">
          {dayTodos.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>Bu gün için planlanmış görev yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayTodos.map((todo) => (
                <div key={todo.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <span className={`h-3 w-3 rounded-full ${priorityClasses[todo.priority]}`}></span>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                      {formatTime(new Date(todo.datetime!))}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white break-words">
                      {todo.text}
                    </h4>
                    {todo.aiMetadata?.category && (
                      <span className="inline-block text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full mt-1">
                        {todo.aiMetadata.category}
                      </span>
                    )}
                    {todo.aiMetadata?.estimatedDuration && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ⏱️ {todo.aiMetadata.estimatedDuration} dakika
                      </div>
                    )}
                    {todo.aiMetadata?.destination && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        📍 {todo.aiMetadata.destination}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      todo.priority === Priority.High 
                        ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' 
                        : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {todo.priority === Priority.High ? 'Yüksek' : 'Orta'}
                    </span>
                    {todo.reminders && todo.reminders.length > 0 && (
                      <span className="text-xs text-blue-500 dark:text-blue-400">
                        🔔 {todo.reminders.length} hatırlatma
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayAgendaModal;