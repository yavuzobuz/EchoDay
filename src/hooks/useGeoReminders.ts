import { useEffect, useRef } from 'react';
import { Todo } from '../types';
import { getCurrentCoords, isWithinRadius } from '../services/locationService';
import { NotificationService } from '../services/notificationService';

interface Options {
  intervalMs?: number; // default 180000 (3 min)
}

export function useGeoReminders(todos: Todo[], onFired: (todoId: string) => void, options: Options = {}) {
  const { intervalMs = 180000 } = options;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any existing timer when dependencies change or unmount
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Start interval only if there is at least one active geo reminder
    const active = todos.filter(t => !t.completed && t.locationReminder?.enabled && t.locationReminder.lat && t.locationReminder.lng);
    if (active.length === 0) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const tick = async () => {
      const coords = await getCurrentCoords();
      if (!coords) return;

      const now = Date.now();
      for (const t of active) {
        const lr = t.locationReminder!;
        const distOk = isWithinRadius(coords, { lat: lr.lat, lng: lr.lng }, lr.radius || 200);

        // Basic trigger logic: support 'near' + 'enter' via same distance rule for MVP
        if (distOk) {
          // Debounce: do not trigger if fired in last 30 minutes
          const last = lr.lastTriggeredAt ? new Date(lr.lastTriggeredAt).getTime() : 0;
          if (now - last < 30 * 60 * 1000) continue;

          // Fire notification
          await NotificationService.notify('Konum Yakınında Görev', t.text);
          onFired(t.id);
        }
      }
    };

    // Run immediately and then on interval
    tick();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(tick, intervalMs) as unknown as number;

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [todos, intervalMs, onFired]);
}
