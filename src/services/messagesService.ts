import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseClient';
import type { Conversation, Message, Profile } from '../types/chat';

function ensureClient() {
  if (!supabase) throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export async function ensureProfile(): Promise<Profile> {
  ensureClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error('No authenticated user.');
  const id = user.id;
  const email = user.email || 'unknown@example.com';

  // Check if profile exists
  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (existing && !selErr) return existing as Profile;

  // Insert own profile (allowed by policy)
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id, email, display_name: email.split('@')[0] })
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function findProfileByEmail(email: string): Promise<Profile | null> {
  ensureClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getOrCreateDirectConversationByEmail(recipientEmail: string): Promise<{ conversation: Conversation; other: Profile }>{
  ensureClient();
  const { data: meData } = await supabase.auth.getUser();
  const me = meData.user;
  if (!me) throw new Error('No authenticated user.');

  // Ensure my profile exists
  await ensureProfile();

  const other = await findProfileByEmail(recipientEmail);
  if (!other) throw new Error('Alıcı bulunamadı. Lütfen önce karşı tarafın kayıtlı olduğundan emin olun.');

  // Find existing direct conversation (intersection of participant conversation_ids)
  const [mine, theirs] = await Promise.all([
    supabase.from('participants').select('conversation_id').eq('user_id', me.id),
    supabase.from('participants').select('conversation_id').eq('user_id', other.id),
  ]);

  if (mine.error) throw mine.error;
  if (theirs.error) throw theirs.error;

  const mySet = new Set((mine.data || []).map((r: any) => r.conversation_id as string));
  const shared = (theirs.data || []).map((r: any) => r.conversation_id as string).find((id: string) => mySet.has(id));

  if (shared) {
    const { data: conv, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', shared)
      .single();
    if (error) throw error;
    return { conversation: conv as Conversation, other };
  }

  // Create a new conversation and both participants
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({ type: 'direct', created_by: me.id })
    .select('*')
    .single();
  if (convErr) throw convErr;

  const conversation = conv as Conversation;

  const { error: partErr } = await supabase
    .from('participants')
    .insert([
      { conversation_id: conversation.id, user_id: me.id },
      { conversation_id: conversation.id, user_id: other.id },
    ]);
  if (partErr) throw partErr;

  return { conversation, other };
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  ensureClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as Message[];
}

export function subscribeToMessages(conversationId: string, onInsert: (msg: Message) => void) {
  ensureClient();
  const channel = supabase
    .channel(`messages_conversation_${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
      onInsert(payload.new as Message);
    })
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}

/**
 * Subscribe globally to incoming messages for a user across all their conversations
 * Returns an unsubscribe function
 */
export async function subscribeToIncomingMessagesForUser(userId: string, onInsert: (msg: Message) => void): Promise<() => void> {
  ensureClient();
  // Fetch all conversation IDs where the user is a participant
  const { data, error } = await supabase
    .from('participants')
    .select('conversation_id')
    .eq('user_id', userId);
  if (error) throw error;
  const convIds = (data || []).map((r: any) => r.conversation_id as string);

  // Create a channel per conversation to receive new messages
  const channels = convIds.map((cid: string) => {
    return supabase
      .channel(`messages_user_${userId}_${cid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cid}` }, (payload: any) => {
        onInsert(payload.new as Message);
      })
      .subscribe();
  });

  // Return unsubscribe
  return () => {
    channels.forEach((ch: any) => {
      try { supabase.removeChannel(ch); } catch {}
    });
  };
}

export async function sendTextMessage(conversationId: string, text: string) {
  ensureClient();
  const { data: meData } = await supabase.auth.getUser();
  const me = meData.user;
  if (!me) throw new Error('No authenticated user.');
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: me.id, type: 'text', body: text });
  if (error) throw error;
}

export async function sendFileMessage(conversationId: string, file: File) {
  ensureClient();
  const { data: meData } = await supabase.auth.getUser();
  const me = meData.user;
  if (!me) throw new Error('No authenticated user.');

  const path = `${conversationId}/${uuidv4()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from('attachments').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: me.id,
      type: 'file',
      body: file.name,
      attachment_path: path,
      mime_type: file.type || 'application/octet-stream',
      size: file.size || null,
    });
  if (msgErr) throw msgErr;
}

export async function downloadAttachment(path: string): Promise<Blob> {
  ensureClient();
  const { data, error } = await supabase.storage.from('attachments').download(path);
  if (error) throw error;
  return data as Blob;
}
