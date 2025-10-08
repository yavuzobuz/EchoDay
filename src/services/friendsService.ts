import { supabase } from './supabaseClient';
import type { Friend, Profile } from '../types/chat';

function ensureClient() {
  if (!supabase) throw new Error('Supabase not configured.');
}

/**
 * Get all friends of the current user
 */
export async function listFriends(): Promise<Friend[]> {
  ensureClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error('No authenticated user.');

  // Get friends list
  const { data: friendsData, error } = await supabase
    .from('friends')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!friendsData || friendsData.length === 0) return [];

  // Get friend profiles separately
  const friendIds = friendsData.map(f => f.friend_id);
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', friendIds);

  if (profileError) throw profileError;

  // Combine data
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  return friendsData.map(f => ({
    ...f,
    friend_profile: profileMap.get(f.friend_id)
  })) as Friend[];
}

/**
 * Add a friend by email
 */
export async function addFriendByEmail(friendEmail: string): Promise<Friend> {
  ensureClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error('No authenticated user.');

  // Find the friend's profile
  const { data: friendProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', friendEmail)
    .single();

  if (profileError || !friendProfile) {
    throw new Error('Kullanıcı bulunamadı. Lütfen geçerli bir e-posta adresi girin.');
  }

  if (friendProfile.id === user.id) {
    throw new Error('Kendinizi arkadaş olarak ekleyemezsiniz.');
  }

  // Check if already friends
  const { data: existing } = await supabase
    .from('friends')
    .select('*')
    .eq('user_id', user.id)
    .eq('friend_id', friendProfile.id)
    .maybeSingle();

  if (existing) {
    throw new Error('Bu kullanıcı zaten arkadaş listenizde.');
  }

  // Add friend - insert single direction, trigger will handle mutual friendship
  const { data, error } = await supabase
    .from('friends')
    .insert({
      user_id: user.id,
      friend_id: friendProfile.id,
    })
    .select('*')
    .single();

  if (error) throw error;
  
  // Return with profile attached
  return {
    ...data,
    friend_profile: friendProfile
  } as Friend;
}

/**
 * Remove a friend (trigger will automatically handle mutual deletion)
 */
export async function removeFriend(friendshipId: string): Promise<void> {
  ensureClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error('No authenticated user.');

  // Delete the friendship record (trigger will handle mutual deletion)
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendshipId)
    .eq('user_id', user.id); // Only allow deleting own friendships

  if (error) throw error;
}

/**
 * Search users by email (for adding friends)
 */
export async function searchUsersByEmail(query: string): Promise<Profile[]> {
  ensureClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error('No authenticated user.');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', `%${query}%`)
    .neq('id', user.id) // Exclude self
    .limit(10);

  if (error) throw error;
  return (data || []) as Profile[];
}
