// Fix: Import React to make the React namespace available for type annotations.
import React, { useState, useEffect } from 'react';

function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      const parsed = item ? JSON.parse(item) : initialValue;
      
      // Debug for todos with reminders
      if (key.includes('todos_') && Array.isArray(parsed)) {
        const todosWithReminders = parsed.filter((todo: any) => todo.reminders && todo.reminders.length > 0);
        if (todosWithReminders.length > 0) {
          console.log(`[LocalStorage] Loaded ${todosWithReminders.length} todos with reminders from key: ${key}`);
          todosWithReminders.forEach((todo: any) => {
            console.log(`[LocalStorage] Loaded todo "${todo.text}" with ${todo.reminders.length} reminders:`, todo.reminders);
          });
        }
      }
      
      return parsed;
    } catch (error) {
      console.error('[LocalStorage] Failed to load from localStorage:', error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const serialized = JSON.stringify(storedValue);
      window.localStorage.setItem(key, serialized);
      
      // Debug for todos with reminders
      if (key.includes('todos_') && Array.isArray(storedValue)) {
        const todosWithReminders = storedValue.filter((todo: any) => todo.reminders && todo.reminders.length > 0);
        if (todosWithReminders.length > 0) {
          console.log(`[LocalStorage] Saved ${todosWithReminders.length} todos with reminders to key: ${key}`);
          todosWithReminders.forEach((todo: any) => {
            console.log(`[LocalStorage] Todo "${todo.text}" has ${todo.reminders.length} reminders:`, todo.reminders);
          });
        }
      }
    } catch (error) {
      console.error('[LocalStorage] Failed to save to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
