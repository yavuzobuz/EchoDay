import React from 'react';
import { Todo, Priority } from '../types';

interface TimelineViewProps {
  todos: Todo[];
}

const priorityClasses = {
  [Priority.High]: 'bg-red-500',
  [Priority.Medium]: 'bg-yellow-500',
};

const TimelineView: React.FC<TimelineViewProps> = ({ todos }) => {
  // Extend hours to cover from 8 AM to midnight (00:00)
  const hours = Array.from({ length: 17 }, (_, i) => i + 8); // 8 AM to 00:00

  
  const scheduledTodos = todos.filter(t => t.datetime && !t.completed);
  const unscheduledTodos = todos.filter(t => !t.datetime && !t.completed);

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
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      {unscheduledTodos.length > 0 && (
        <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">Zamansız Görevler</h3>
          <div className="flex flex-wrap gap-2">
            {unscheduledTodos.map(todo => (
              <div key={todo.id} className="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                <span className={`h-2 w-2 rounded-full ${priorityClasses[todo.priority]}`}></span>
                <span className="text-gray-700 dark:text-gray-300">{todo.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          const top = getTaskPosition(todo.datetime);
          const isConflict = todo.aiMetadata?.isConflict;

          return (
            <div
              key={todo.id}
              className={`absolute left-16 right-0 p-2 rounded-lg text-white shadow-lg ${priorityClasses[todo.priority]} ${isConflict ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-orange-500' : ''}`}
              style={{ top: `${top}%`, minHeight: '40px' }}
              title={`${todo.text} - ${new Date(todo.datetime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
            >
              <p className="font-bold text-sm truncate">{todo.text}</p>
              <p className="text-xs opacity-80">{new Date(todo.datetime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default TimelineView;
