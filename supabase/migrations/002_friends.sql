-- Friends table and RLS policies migration
-- This creates the friends table for managing user friendships

-- Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate friendships
  UNIQUE(user_id, friend_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);

-- Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friends table

-- Users can view their own friendships (both directions)
CREATE POLICY "users_can_view_own_friendships"
  ON public.friends
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Users can add friendships where they are the user_id
CREATE POLICY "users_can_add_friendships"
  ON public.friends
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own friendships
CREATE POLICY "users_can_delete_own_friendships"
  ON public.friends
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.friends TO authenticated;

-- Add helpful comment
COMMENT ON TABLE public.friends IS 'Table for managing user friendships - supports bidirectional relationships';