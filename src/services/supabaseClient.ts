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
  // Map app fields (camelCase) to DB columns (snake_case) and whitelist known columns only
  const payload = todos.map((t) => {
    const {
      id,
      text,
      priority,
      datetime,
      completed,
      createdAt,
      aiMetadata,
      recurrence,
      parentId,
      reminders,
      // Strip fields not stored in DB
      userId: _userId,
      pdfSource: _pdfSource,
      updatedAt: _updatedAt,
    } = t;

    return {
      id,
      text,
      priority,
      datetime,
      completed: completed ?? false,
      created_at: createdAt || now,
      updated_at: now,
      user_id: userId,
      ai_metadata: aiMetadata || null,
      recurrence: recurrence || null,
      parent_id: parentId || null,
      reminders: reminders || null,
    };
  });

  const { data, error } = await supabase.from('todos').upsert(payload);
  if (error) {
    console.error('Supabase upsertTodos error:', error);
    throw error;
  }
  return data;
}

export async function upsertNotes(userId: string, notes: any[]) {
  if (!supabase) return;
  const now = new Date().toISOString();
  // Map to actual DB columns - after adding id and user_id columns to notes table
  const payload = notes.map((n) => {
    const {
      id,
      text,
      imageUrl,
      createdAt,
      // Strip fields that don't exist in DB
      userId: _userId,
      pdfSource: _pdfSource,
      updatedAt: _updatedAt,
      pinned: _pinned,
      favorite: _favorite,
      tags: _tags,
      color: _color,
    } = n;

    return {
      id: id || undefined, // Let DB generate if not provided
      text: text || '',
      image_url: imageUrl || null,
      audio_url: null,
      created_at: createdAt || now,
      updated_at: now,
      user_id: userId, // Add user_id for multi-user support
    };
  });

  const { data, error } = await supabase.from('notes').upsert(payload);
  if (error) {
    console.error('Supabase upsertNotes error:', error);
    throw error;
  }
  return data;
}

export async function fetchAll(userId: string) {
  if (!supabase) return { todos: [], notes: [] };
  const [tRes, nRes] = await Promise.all([
    supabase.from('todos').select('*').eq('user_id', userId),
    supabase.from('notes').select('*').eq('user_id', userId)
  ]);

  const todos = (tRes.data || []).map((row: any) => ({
    ...row,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    userId: row.user_id ?? row.userId,
    aiMetadata: row.ai_metadata ?? row.aiMetadata,
  }));

  const notes = (nRes.data || []).map((row: any) => ({
    ...row,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    userId: row.user_id ?? row.userId,
    imageUrl: row.image_url ?? row.imageUrl,
  }));

  return { todos, notes };
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
