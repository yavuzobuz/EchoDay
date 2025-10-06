import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = (url && key) ? createClient(url, key) : null;

export async function upsertTodos(userId: string, todos: any[]) {
  if (!supabase) return;
  await supabase.from('todos').upsert(
    todos.map(t => ({ ...t, user_id: userId }))
  );
}

export async function upsertNotes(userId: string, notes: any[]) {
  if (!supabase) return;
  await supabase.from('notes').upsert(
    notes.map(n => ({ ...n, user_id: userId }))
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
