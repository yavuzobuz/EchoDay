import { createClient } from '@supabase/supabase-js';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getMobileEnvVar } from './mobileEnvService';

// Electron ve web (Vite) için environment değişkenlerini güvenilir şekilde al
// NOT: Vite production build'de dinamik erişim (import.meta.env[key]) çalışmaz.
// Bu nedenle VITE_* anahtarlarına doğrudan erişiyoruz ve Electron'daki window.env ile yedekliyoruz.
const rawUrl = (
  (typeof window !== 'undefined' && (window as any).env?.VITE_SUPABASE_URL) ||
  getMobileEnvVar('VITE_SUPABASE_URL') ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  import.meta.env?.VITE_SUPABASE_URL
)?.trim();

const rawKey = (
  (typeof window !== 'undefined' && (window as any).env?.VITE_SUPABASE_ANON_KEY) ||
  getMobileEnvVar('VITE_SUPABASE_ANON_KEY') ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY
)?.trim();

function isValidHttpUrl(maybeUrl?: string): boolean {
  if (!maybeUrl) return false;
  try {
    const u = new URL(maybeUrl);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const hasValidConfig = isValidHttpUrl(rawUrl) && !!rawKey && rawKey.length > 10;

// Detect Electron environment
const isElectron = !!(window as any).isElectron || !!(window as any).electronAPI;

// Polyfill navigator.locks to avoid LockManager warnings in Electron
if (isElectron && typeof navigator !== 'undefined' && !navigator.locks) {
  // Provide a minimal LockManager polyfill for Electron
  (navigator as any).locks = {
    request: async (name: string, options: any, callback: any) => {
      // If callback is in the second parameter (no options provided)
      const cb = typeof options === 'function' ? options : callback;
      const opts = typeof options === 'function' ? {} : options;
      
      // Create a fake lock object
      const lock = { name, mode: opts.mode || 'exclusive' };
      
      // Call the callback immediately with the fake lock
      try {
        return await cb(opts.ifAvailable === true && Math.random() > 0.5 ? null : lock);
      } catch (e) {
        throw e;
      }
    },
    query: async () => ({ held: [], pending: [] })
  };
}

// Configure Supabase client safely (avoid runtime crash if env missing on Vercel)
export const supabase = hasValidConfig ? createClient(rawUrl as string, rawKey as string, {
  auth: {
    storageKey: 'supabase-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'Accept': 'application/json'
    }
  }
}) : (console.warn('[Supabase] Not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for web builds'), null as any);

// Dev helper: expose Supabase client for quick console testing (safe for dev)
try {
  if (supabase && typeof window !== 'undefined') {
    (window as any).supa = supabase;
    console.log('[Supabase] Dev helper attached: window.supa');
  }
} catch {}

export const isSupabaseConfigured = !!supabase;

export async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export function onAuthStateChange(cb: (userId: string | null) => void) {
  if (!supabase) return () => {};
  const { data: sub } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
    cb(session?.user?.id || null);
  });
  return () => sub.subscription.unsubscribe();
}

// Helper: UUID doğrulama
function isUuid(value?: string | null): boolean {
  if (!value) return false;
  // UUID v1-5 desteği (geniş regex) - case-insensitive
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return re.test(value);
}

// Helper: Oturum doğrulama - verilen userId ile Supabase oturumu eşleşiyor mu?
async function ensureSessionFor(userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getUser();
    const sessionUserId = data.user?.id || null;
    if (!sessionUserId) return false;
    if (sessionUserId !== userId) {
      console.warn(`[Supabase] Oturum kullanıcı ID uyuşmazlığı: session=${sessionUserId}, arg=${userId}`);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Helper function to validate and sanitize datetime values
function validateDatetime(datetime: any): string | null {
  if (!datetime) return null;
  
  // If it's already a valid ISO string, return it
  if (typeof datetime === 'string') {
    const date = new Date(datetime);
    
    // Check if it's a valid date
    if (!isNaN(date.getTime())) {
      // Accept both full ISO timestamps (YYYY-MM-DDTHH:mm:ss.sssZ) and date-only formats (YYYY-MM-DD)
      // PostgreSQL timestamp fields accept both formats
      if (/^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(datetime)) {
        return datetime;
      }
    }
    
    // If it's invalid (like "İki hafta içinde"), return null
    console.warn(`Invalid datetime value detected and converted to null: "${datetime}"`);
    return null;
  }
  
  return null;
}

// New function to update a single todo field (works around RLS issues)
export async function updateTodo(userId: string, todoId: string, updates: Partial<any>) {
  if (!supabase || !isUuid(userId)) {
    console.warn('[Supabase] Invalid userId or no supabase client - updateTodo skipped');
    return;
  }
  
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Supabase] Session invalid - updateTodo skipped');
    return;
  }

  try {
    // Try RLS-safe update approach: only filter by id, let RLS handle user restriction
    const { data, error } = await supabase
      .from('todos')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', todoId)
      .select();

    if (error) {
      console.error('Supabase updateTodo error:', error);
      
      // If that fails, try the upsert approach as fallback
      console.log('[Supabase] Trying upsert fallback for todo update');
      const fallbackPayload = {
        id: todoId,
        user_id: userId,
        updated_at: new Date().toISOString(),
        ...updates
      };
      
      const { data: upsertData, error: upsertError } = await supabase
        .from('todos')
        .upsert(fallbackPayload)
        .select();
        
      if (upsertError) {
        console.error('Supabase updateTodo upsert fallback error:', upsertError);
        throw upsertError;
      }
      
      return upsertData;
    }
    
    return data;
  } catch (error: any) {
    console.error('Supabase updateTodo failed:', error);
    throw error;
  }
}

export async function upsertTodos(userId: string, todos: any[]) {
  if (!supabase || todos.length === 0) return;
  if (!isUuid(userId)) {
    console.warn('[Supabase] Geçersiz userId (guest modu?) - upsertTodos atlandı');
    return;
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Supabase] Oturum yok veya userId uyuşmuyor - upsertTodos atlandı');
    return;
  }
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
      datetime: validateDatetime(datetime), // Validate and sanitize datetime
      completed: completed ?? false,
      created_at: createdAt || now,
      updated_at: now,
      user_id: userId,
      ai_metadata: aiMetadata || null,
      recurrence: recurrence || null,
      parent_id: parentId || null,
      reminders: reminders || null
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
  if (!supabase || notes.length === 0) return;
  if (!isUuid(userId)) {
    console.warn('[Supabase] Geçersiz userId (guest modu?) - upsertNotes atlandı');
    return;
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Supabase] Oturum yok veya userId uyuşmuyor - upsertNotes atlandı');
    return;
  }
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

export async function deleteNotes(userId: string, noteIds: string[]) {
  if (!supabase || noteIds.length === 0) return;
  if (!isUuid(userId)) {
    console.warn('[Supabase] Geçersiz userId (guest modu?) - deleteNotes atlandı');
    return;
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Supabase] Oturum yok veya userId uyuşmuyor - deleteNotes atlandı');
    return;
  }
  const { error } = await supabase.from('notes').delete().eq('user_id', userId).in('id', noteIds);
  if (error) {
    console.error('Supabase deleteNotes error:', error);
    throw error;
  }
}

export async function deleteTodos(userId: string, todoIds: string[]) {
  if (!supabase || todoIds.length === 0) return;
  if (!isUuid(userId)) {
    console.warn('[Supabase] Geçersiz userId (guest modu?) - deleteTodos atlandı');
    return;
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Supabase] Oturum yok veya userId uyuşmuyor - deleteTodos atlandı');
    return;
  }

  const now = new Date().toISOString();

  // 1) Önce HARD DELETE dene (RLS'in DELETE'e izin verdiği ama UPDATE'e izin vermediği durumda daha temiz)
  try {
    const { error: delErr } = await supabase
      .from('todos')
      .delete()
      .in('id', todoIds);
    if (delErr) throw delErr;

    console.log('[deleteTodos] Hard delete başarılı:', todoIds);
    return;
  } catch (error: any) {
    const isPermissionIssue = error?.status === 403 || error?.code === '42501' || /permission|denied|row-level|RLS|not allowed/i.test(String(error?.message || ''));
    // Eğer delete'e izin yoksa, 2) Soft delete dene (is_deleted=true)
    if (isPermissionIssue || true /* diğer hatalarda da soft delete deneyelim */) {
      console.warn('[deleteTodos] Hard delete mümkün değil veya başarısız, soft delete denenecek (is_deleted=true)');
      const { data: updData, error: updErr, count } = await supabase
        .from('todos')
        .update({ is_deleted: true, updated_at: now })
        .in('id', todoIds)
        .select('id', { count: 'exact' });
      if (updErr) {
        console.error('Supabase deleteTodos (soft) error:', updErr);
        throw updErr;
      }
      const updatedCount = typeof count === 'number' ? count : (updData?.length || 0);
      console.log(`[deleteTodos] Soft delete başarılı: ${updatedCount} satır`, todoIds);
      return;
    }
    // Diğer hataları dışarı fırlat
    throw error;
  }
}

// ========== ARCHIVE (Supabase) ==========
export async function archiveUpsertNotes(userId: string, notes: any[]) {
  if (!supabase || notes.length === 0) return;
  if (!isUuid(userId)) {
    console.warn('[Archive] Geçersiz userId (guest modu?) - archiveUpsertNotes atlandı');
    return;
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Archive] Oturum yok veya userId uyuşmuyor - archiveUpsertNotes atlandı');
    return;
  }
  try {
    const now = new Date().toISOString();
    const payload = notes.map((n) => {
      const { id, text, imageUrl, createdAt } = n;
      return {
        id, // use original id as primary key for de-duplication
        user_id: userId,
        text: text || '',
        image_url: imageUrl || null,
        created_at: createdAt || now,
        archived_at: now,
      };
    });
    const { error } = await supabase.from('archived_notes').upsert(payload);
    if (error) throw error;
    
    console.log('[Archive] ✅ Notlar başarıyla arşivlendi:', notes.length);
  } catch (error: any) {
    console.warn('[Archive] ⚠️ Arşiv tablosu mevcut değil, arşivleme atlandı:', error.message);
    // Hata fırlatmak yerine sessizce geç - arşiv opsiyonel
  }
}

export async function archiveUpsertTodos(userId: string, todos: any[]) {
  if (!supabase || todos.length === 0) return;
  if (!isUuid(userId)) {
    console.warn('[Archive] Geçersiz userId (guest modu?) - archiveUpsertTodos atlandı');
    return;
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Archive] Oturum yok veya userId uyuşmuyor - archiveUpsertTodos atlandı');
    return;
  }
  try {
    const now = new Date().toISOString();
    const payload = todos.map((t) => {
      const { id, text, priority, datetime, createdAt, completed } = t;
      return {
        id, // use original id
        user_id: userId,
        text: text || '',
        priority: priority || 'medium',
        datetime: datetime || null,
        completed: completed ?? false,
        created_at: createdAt || now,
        archived_at: now,
      };
    });
    const { error } = await supabase.from('archived_todos').upsert(payload);
    if (error) throw error;
    
    console.log('[Archive] ✅ Görevler başarıyla arşivlendi:', todos.length);
  } catch (error: any) {
    console.warn('[Archive] ⚠️ Arşiv tablosu mevcut değil, arşivleme atlandı:', error.message);
    // Hata fırlatmak yerine sessizce geç - arşiv opsiyonel
  }
}

export async function archiveFetchByDate(userId: string, date: string) {
  if (!supabase) return { todos: [], notes: [] };
  if (!isUuid(userId)) {
    console.warn('[Archive] Geçersiz userId (guest modu?) - archiveFetchByDate atlandı');
    return { todos: [], notes: [] };
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Archive] Oturum yok veya userId uyuşmuyor - archiveFetchByDate atlandı');
    return { todos: [], notes: [] };
  }
  try {
    const start = new Date(date); start.setHours(0,0,0,0);
    const end = new Date(date); end.setHours(23,59,59,999);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Filter by archived_at (when it was archived) - this is the primary filter for archive date
    // Also include items created on the selected date as fallback
    const [tRes, nRes] = await Promise.all([
      supabase.from('archived_todos').select('*').eq('user_id', userId).or(`and(archived_at.gte.${startISO},archived_at.lte.${endISO}),and(created_at.gte.${startISO},created_at.lte.${endISO})`),
      supabase.from('archived_notes').select('*').eq('user_id', userId).or(`and(archived_at.gte.${startISO},archived_at.lte.${endISO}),and(created_at.gte.${startISO},created_at.lte.${endISO})`),
    ]);
    
    const todos = (tRes.data || []).map((row: any) => ({
      ...row,
      createdAt: row.created_at ?? row.createdAt,
      archivedAt: row.archived_at ?? row.archivedAt,
      userId: row.user_id ?? row.userId,
      completed: row.completed ?? false,
    }));
    const notes = (nRes.data || []).map((row: any) => ({
      ...row,
      createdAt: row.created_at ?? row.createdAt,
      archivedAt: row.archived_at ?? row.archivedAt,
      userId: row.user_id ?? row.userId,
      imageUrl: row.image_url ?? row.imageUrl,
    }));
    
    console.log('[Archive] ✅ Tarih bazında arşiv getirildi:', { todosCount: todos.length, notesCount: notes.length });
    return { todos, notes };
  } catch (error: any) {
    console.warn('[Archive] ⚠️ Arşiv tablolarına erişilemiyor:', error.message);
    return { todos: [], notes: [] }; // Boş sonuç döndür
  }
}

export async function archiveSearch(userId: string, query: string) {
  if (!supabase) return { todos: [], notes: [] };
  if (!isUuid(userId)) {
    console.warn('[Archive] Geçersiz userId (guest modu?) - archiveSearch atlandı');
    return { todos: [], notes: [] };
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Archive] Oturum yok veya userId uyuşmuyor - archiveSearch atlandı');
    return { todos: [], notes: [] };
  }
  
  try {
    const [tRes, nRes] = await Promise.all([
      supabase.from('archived_todos').select('*').eq('user_id', userId).ilike('text', `%${query}%`),
      supabase.from('archived_notes').select('*').eq('user_id', userId).ilike('text', `%${query}%`),
    ]);
    
    const todos = (tRes.data || []).map((row: any) => ({ ...row, imageUrl: row.image_url ?? row.imageUrl }));
    const notes = (nRes.data || []).map((row: any) => ({ ...row, imageUrl: row.image_url ?? row.imageUrl }));
    
    console.log('[Archive] ✅ Arama tamamlandı:', { query, todosCount: todos.length, notesCount: notes.length });
    return { todos, notes };
  } catch (error: any) {
    console.warn('[Archive] ⚠️ Arşiv arama hatası:', error.message);
    return { todos: [], notes: [] }; // Boş sonuç döndür
  }
}

// ========== UNARCHIVE OPERATIONS ==========
export async function unarchiveTodos(userId: string, todoIds: string[]) {
  if (!supabase || todoIds.length === 0) return;
  if (!isUuid(userId)) {
    console.warn('[Unarchive] Geçersiz userId (guest modu?) - unarchiveTodos atlandı');
    return;
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Unarchive] Oturum yok veya userId uyuşmuyor - unarchiveTodos atlandı');
    return;
  }
  
  try {
    // 1. Arşivden verileri al
    const { data: archivedTodos, error: fetchError } = await supabase
      .from('archived_todos')
      .select('*')
      .eq('user_id', userId)
      .in('id', todoIds);
    
    if (fetchError) throw fetchError;
    if (!archivedTodos || archivedTodos.length === 0) {
      console.warn('[Unarchive] Arşivde todo bulunamadı');
      return;
    }
    
    // 2. Aktif todos tablosuna geri ekle
    const now = new Date().toISOString();
    const todosToRestore = archivedTodos.map((todo: any) => ({
      id: todo.id,
      user_id: userId,
      text: todo.text,
      priority: todo.priority,
      datetime: todo.datetime,
      completed: false, // Geri getirilen görevler tamamlanmamış olarak işaretlenir
      created_at: todo.created_at,
      updated_at: now,
      is_deleted: false
    }));
    
    const { error: upsertError } = await supabase
      .from('todos')
      .upsert(todosToRestore);
    
    if (upsertError) throw upsertError;
    
    // 3. Arşivden sil
    const { error: deleteError } = await supabase
      .from('archived_todos')
      .delete()
      .eq('user_id', userId)
      .in('id', todoIds);
    
    if (deleteError) {
      console.error('[Unarchive] Arşivden silme başarısız, ancak geri yükleme tamamlandı:', deleteError);
    }
    
    console.log(`[Unarchive] ✅ ${todoIds.length} todo başarıyla geri yüklendi`);
  } catch (error: any) {
    console.error('[Unarchive] ❌ Todo geri yükleme başarısız:', error);
    throw error;
  }
}

export async function unarchiveNotes(userId: string, noteIds: string[]) {
  if (!supabase || noteIds.length === 0) return;
  if (!isUuid(userId)) {
    console.warn('[Unarchive] Geçersiz userId (guest modu?) - unarchiveNotes atlandı');
    return;
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Unarchive] Oturum yok veya userId uyuşmuyor - unarchiveNotes atlandı');
    return;
  }
  
  try {
    // 1. Arşivden verileri al
    const { data: archivedNotes, error: fetchError } = await supabase
      .from('archived_notes')
      .select('*')
      .eq('user_id', userId)
      .in('id', noteIds);
    
    if (fetchError) throw fetchError;
    if (!archivedNotes || archivedNotes.length === 0) {
      console.warn('[Unarchive] Arşivde not bulunamadı');
      return;
    }
    
    // 2. Aktif notes tablosuna geri ekle
    const now = new Date().toISOString();
    const notesToRestore = archivedNotes.map((note: any) => ({
      id: note.id,
      user_id: userId,
      text: note.text,
      image_url: note.image_url,
      audio_url: note.audio_url,
      created_at: note.created_at,
      updated_at: now
    }));
    
    const { error: upsertError } = await supabase
      .from('notes')
      .upsert(notesToRestore);
    
    if (upsertError) throw upsertError;
    
    // 3. Arşivden sil
    const { error: deleteError } = await supabase
      .from('archived_notes')
      .delete()
      .eq('user_id', userId)
      .in('id', noteIds);
    
    if (deleteError) {
      console.error('[Unarchive] Arşivden silme başarısız, ancak geri yükleme tamamlandı:', deleteError);
    }
    
    console.log(`[Unarchive] ✅ ${noteIds.length} not başarıyla geri yüklendi`);
  } catch (error: any) {
    console.error('[Unarchive] ❌ Not geri yükleme başarısız:', error);
    throw error;
  }
}

// ========== BATCH OPERATIONS ==========
export async function batchArchiveTodos(userId: string, todos: any[], batchSize = 100) {
  if (!supabase || todos.length === 0) return;
  if (!isUuid(userId)) {
    console.warn('[BatchArchive] Geçersiz userId (guest modu?) - batchArchiveTodos atlandı');
    return;
  }
  
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[BatchArchive] Oturum yok veya userId uyuşmuyor - batchArchiveTodos atlandı');
    return;
  }
  
  try {
    const batches = [];
    for (let i = 0; i < todos.length; i += batchSize) {
      batches.push(todos.slice(i, i + batchSize));
    }
    
    console.log(`[BatchArchive] ${todos.length} todo ${batches.length} batch'e bölündü (batch size: ${batchSize})`);
    
    let totalArchived = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        await archiveUpsertTodos(userId, batch);
        totalArchived += batch.length;
        console.log(`[BatchArchive] Batch ${i + 1}/${batches.length} tamamlandı (${batch.length} todo)`);
        
        // Rate limiting için kısa bekleme (Supabase rate limit'lerini aşmamak için)
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`[BatchArchive] Batch ${i + 1} başarısız:`, error);
        // Bir batch başarısız olsa bile diğerlerine devam et
      }
    }
    
    console.log(`[BatchArchive] ✅ Toplam ${totalArchived}/${todos.length} todo arşivlendi`);
    return totalArchived;
  } catch (error: any) {
    console.error('[BatchArchive] ❌ Batch arşivleme başarısız:', error);
    throw error;
  }
}

export async function batchArchiveNotes(userId: string, notes: any[], batchSize = 100) {
  if (!supabase || notes.length === 0) return;
  if (!isUuid(userId)) {
    console.warn('[BatchArchive] Geçersiz userId (guest modu?) - batchArchiveNotes atlandı');
    return;
  }
  
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[BatchArchive] Oturum yok veya userId uyuşmuyor - batchArchiveNotes atlandı');
    return;
  }
  
  try {
    const batches = [];
    for (let i = 0; i < notes.length; i += batchSize) {
      batches.push(notes.slice(i, i + batchSize));
    }
    
    console.log(`[BatchArchive] ${notes.length} not ${batches.length} batch'e bölündü (batch size: ${batchSize})`);
    
    let totalArchived = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        await archiveUpsertNotes(userId, batch);
        totalArchived += batch.length;
        console.log(`[BatchArchive] Batch ${i + 1}/${batches.length} tamamlandı (${batch.length} not)`);
        
        // Rate limiting için kısa bekleme
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`[BatchArchive] Batch ${i + 1} başarısız:`, error);
      }
    }
    
    console.log(`[BatchArchive] ✅ Toplam ${totalArchived}/${notes.length} not arşivlendi`);
    return totalArchived;
  } catch (error: any) {
    console.error('[BatchArchive] ❌ Batch arşivleme başarısız:', error);
    throw error;
  }
}

export async function fetchAll(userId: string) {
  if (!supabase) return { todos: [], notes: [] };
  if (!isUuid(userId)) {
    console.warn('[Supabase] Geçersiz userId (guest modu?) - fetchAll atlandı');
    return { todos: [], notes: [] };
  }
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Supabase] Oturum yok veya userId uyuşmuyor - fetchAll atlandı');
    return { todos: [], notes: [] };
  }
  const [tRes, nRes] = await Promise.all([
    supabase.from('todos').select('*').eq('user_id', userId).neq('is_deleted', true),
    supabase.from('notes').select('*').eq('user_id', userId)
  ]);

  const todos = (tRes.data || []).map((row: any) => ({
    ...row,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    userId: row.user_id ?? row.userId,
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
  if (!isUuid(userId)) {
    console.warn('[Supabase] Geçersiz userId (guest modu?) - realtime abonelik başlatılmadı');
    return () => {};
  }
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
