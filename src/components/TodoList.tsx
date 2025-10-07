import React from 'react';
import { Todo, ReminderConfig } from '../types';
import TodoItem from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onGetDirections: (todo: Todo) => void;
  onEdit: (id: string, newText: string) => void;
  onShare: (todo: Todo) => void;
  onUpdateReminders?: (id: string, reminders: ReminderConfig[]) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, onDelete, onGetDirections, onEdit, onShare, onUpdateReminders }) => {
  if (todos.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Henüz görev eklemediniz.</p>;
  }

  const sortedTodos = [...todos].sort((a, b) => (a.completed ? 1 : -1) - (b.completed ? 1 : -1) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-3">
      {sortedTodos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
          onGetDirections={onGetDirections}
          onEdit={onEdit}
          onShare={onShare}
          onUpdateReminders={onUpdateReminders}
        />
      ))}
    </div>
  );
};

export default TodoList;
