export type ConversationType = 'direct' | 'group';

export interface Profile {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  is_online?: boolean | null;
  last_seen?: string | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  created_by?: string | null;
  created_at?: string;
}

export type MessageType = 'text' | 'file';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  type: MessageType;
  body?: string | null;
  attachment_path?: string | null;
  mime_type?: string | null;
  size?: number | null;
  created_at: string;
  edited_at?: string | null;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  // Populated from join
  friend_profile?: Profile;
}
