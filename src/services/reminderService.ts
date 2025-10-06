import { Todo } from '../types';

export interface ActiveReminder {
  taskId: string;
  reminderId: string;
  message: string;
  priority: 'high' | 'medium';
  timestamp: number;
}

class ReminderService {
  private notifiedReminders: Set<string> = new Set();
  
  /**
   * Check all todos for reminders that should be triggered
   */
  checkReminders(todos: Todo[]): ActiveReminder[] {
    const now = new Date();
    const activeReminders: ActiveReminder[] = [];
    
    console.log('[ReminderService] Checking reminders at:', now.toISOString());
    console.log('[ReminderService] Local time:', now.toLocaleString('tr-TR'));
    console.log('[ReminderService] Timezone offset (minutes):', now.getTimezoneOffset());
    console.log('[ReminderService] Total todos:', todos.length);
    
    todos.forEach(todo => {
      if (todo.completed || !todo.datetime) return;
      
      const taskTime = new Date(todo.datetime);
      
      // Debug: log task time details
      console.log(`[ReminderService] Task: ${todo.text}`);
      console.log(`[ReminderService] Task datetime (UTC): ${todo.datetime}`);
      console.log(`[ReminderService] Task time (local): ${taskTime.toLocaleString('tr-TR')}`);
      
      // Check built-in reminder (for backward compatibility - 15 mins before)
      const diffMinutes = (taskTime.getTime() - now.getTime()) / (1000 * 60);
      const builtInReminderId = `${todo.id}_builtin`;
      
      if (diffMinutes > 0 && diffMinutes <= 15 && !this.notifiedReminders.has(builtInReminderId)) {
        console.log('[ReminderService] Built-in reminder triggered for:', todo.text);
        activeReminders.push({
          taskId: todo.id,
          reminderId: builtInReminderId,
          message: `Yaklaşan Görev: ${todo.text}`,
          priority: todo.priority === 'high' ? 'high' : 'medium',
          timestamp: now.getTime()
        });
        this.notifiedReminders.add(builtInReminderId);
      }
      
      // Check custom reminders
      if (todo.reminders && todo.reminders.length > 0) {
        todo.reminders.forEach(reminder => {
          // Skip if already triggered
          if (reminder.triggered) return;
          
          const reminderKey = `${todo.id}_${reminder.id}`;
          if (this.notifiedReminders.has(reminderKey)) return;
          
          let shouldTrigger = false;
          
          // Check if reminder is snoozed
          if (reminder.snoozedUntil) {
            const snoozeTime = new Date(reminder.snoozedUntil);
            if (now >= snoozeTime) {
              console.log('[ReminderService] Snoozed reminder time reached:', todo.text);
              shouldTrigger = true;
            }
          } else {
            // Check if it's time to trigger based on type
            if (reminder.type === 'relative' && reminder.minutesBefore) {
              const reminderTime = new Date(taskTime.getTime() - reminder.minutesBefore * 60 * 1000);
              const diffMs = reminderTime.getTime() - now.getTime();
              // Trigger if within 1 minute window
              if (diffMs <= 60000 && diffMs > -60000) {
                console.log('[ReminderService] Relative reminder triggered:', reminder.minutesBefore, 'mins before');
                shouldTrigger = true;
              }
            } else if (reminder.type === 'absolute' && reminder.absoluteTime) {
              const reminderTime = new Date(reminder.absoluteTime);
              const diffMs = reminderTime.getTime() - now.getTime();
              // Trigger if within 1 minute window
              if (diffMs <= 60000 && diffMs > -60000) {
                console.log('[ReminderService] Absolute reminder triggered at:', reminder.absoluteTime);
                shouldTrigger = true;
              }
            }
          }
          
          if (shouldTrigger) {
            activeReminders.push({
              taskId: todo.id,
              reminderId: reminder.id,
              message: `Hatırlatma: ${todo.text}`,
              priority: todo.priority === 'high' ? 'high' : 'medium',
              timestamp: now.getTime()
            });
            this.notifiedReminders.add(reminderKey);
          }
        });
      }
    });
    
    console.log('[ReminderService] Active reminders found:', activeReminders.length);
    return activeReminders;
  }
  
  /**
   * Mark a reminder as triggered in the todo
   */
  markReminderTriggered(todos: Todo[], taskId: string, reminderId: string): Todo[] {
    return todos.map(todo => {
      if (todo.id !== taskId) return todo;
      
      if (!todo.reminders) return todo;
      
      return {
        ...todo,
        reminders: todo.reminders.map(r => 
          r.id === reminderId ? { ...r, triggered: true, snoozedUntil: undefined } : r
        )
      };
    });
  }
  
  /**
   * Snooze a reminder for the specified number of minutes
   */
  snoozeReminder(todos: Todo[], taskId: string, reminderId: string, minutes: number): Todo[] {
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
    
    return todos.map(todo => {
      if (todo.id !== taskId) return todo;
      
      if (!todo.reminders) return todo;
      
      return {
        ...todo,
        reminders: todo.reminders.map(r => 
          r.id === reminderId 
            ? { 
                ...r, 
                triggered: false, 
                snoozedUntil: snoozeUntil.toISOString(),
                snoozedCount: (r.snoozedCount || 0) + 1
              } 
            : r
        )
      };
    });
  }
  
  /**
   * Clear notification tracking for a specific reminder
   */
  clearNotification(taskId: string, reminderId: string) {
    const key = `${taskId}_${reminderId}`;
    this.notifiedReminders.delete(key);
  }
  
  /**
   * Reset all notification tracking (useful for testing or after app restart)
   */
  resetNotifications() {
    this.notifiedReminders.clear();
  }
  
  /**
   * Send browser notification if permission granted
   */
  sendBrowserNotification(reminder: ActiveReminder) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const options: NotificationOptions = {
        body: reminder.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `${reminder.taskId}_${reminder.reminderId}`,
        requireInteraction: reminder.priority === 'high',
        // vibrate: reminder.priority === 'high' ? [200, 100, 200] : [200] // Not supported in all browsers
      };
      
      try {
        new Notification('EchoDay Hatırlatma', options);
      } catch (error) {
        console.error('[ReminderService] Failed to send notification:', error);
      }
    }
  }
}

export const reminderService = new ReminderService();
