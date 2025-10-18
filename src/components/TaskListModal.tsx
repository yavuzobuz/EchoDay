import React from 'react';
import { Todo } from '../types';

interface TaskListModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Todo[];
  title: string;
  onTaskClick: (todo: Todo) => void;
}

const TaskListModal: React.FC<TaskListModalProps> = ({ 
  isOpen, 
  onClose, 
  tasks, 
  title,
  onTaskClick 
}) => {
  if (!isOpen) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'low': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
    }
  };

  const formatDateTime = (datetime?: string) => {
    if (!datetime) return null;
    const date = new Date(datetime);
    return date.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm px-2 py-1 rounded-full">
              {tasks.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Kapat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-[var(--accent-color-500)] dark:hover:border-[var(--accent-color-400)] transition-all cursor-pointer bg-white dark:bg-gray-900/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {task.text}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Priority Badge */}
                    <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'high' ? 'Yüksek' : 
                       task.priority === 'medium' ? 'Orta' : 'Düşük'}
                    </span>

                    {/* Date/Time */}
                    {task.datetime && (
                      <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {formatDateTime(task.datetime)}
                      </span>
                    )}

                    {/* Reminder Status */}
                    {task.reminders && task.reminders.length > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                        {task.reminders.length} Hatırlatıcı
                      </span>
                    )}

                    {/* No Reminder Badge */}
                    {task.datetime && (!task.reminders || task.reminders.length === 0) && (
                      <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                        </svg>
                        Hatırlatıcı Yok
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl mb-2 block">📋</span>
              <p className="text-gray-600 dark:text-gray-400">Görev bulunamadı</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Detayları görmek ve düzenlemek için bir göreve tıklayın
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaskListModal;
