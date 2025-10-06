import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = (url && key) ? createClient(url, key) : null;

export async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export function onAuthStateChange(cb: (userId: string | null) => void) {
  if (!supabase) return () => {};
  const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
    cb(session?.user?.id || null);
  });
  return () => sub.subscription.unsubscribe();
}

export async function upsertTodos(userId: string, todos: any[]) {
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase.from('todos').upsert(
    todos.map(t => ({ ...t, user_id: userId, updated_at: now }))
  );
}

export async function upsertNotes(userId: string, notes: any[]) {
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase.from('notes').upsert(
    notes.map(n => ({ ...n, user_id: userId, updated_at: now }))
  );
}

export async function fetchAll(userId: string) {
  if (!supabase) return { todos: [], notes: [] };
  const [tRes, nRes] = await Promise.all([
    supabase.from('todos').select('*').eq('user_id', userId),
    supabase.from('notes').select('*').eq('user_id', userId)
  ]);
  return { todos: tRes.data || [], notes: nRes.data || [] };
}

export function subscribeToChanges(userId: string, onTodo: (record: any, type: string) => void, onNote: (record: any, type: string) => void) {
  if (!supabase) return () => {};
  const channel = supabase.channel('realtime:echoday');
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` }, (payload: any) => {
    onTodo(payload.new || payload.old, payload.eventType);
  });
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` }, (payload: any) => {
    onNote(payload.new || payload.old, payload.eventType);
  });
  channel.subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}
