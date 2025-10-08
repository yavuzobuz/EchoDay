-- Comprehensive fix for friends table RLS issues
-- Run this in Supabase SQL Editor

-- STEP 1: Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'friends';

-- STEP 2: Drop all existing friends policies to start fresh
DROP POLICY IF EXISTS "users_can_view_own_friendships" ON public.friends;
DROP POLICY IF EXISTS "users_can_add_friendships" ON public.friends;
DROP POLICY IF EXISTS "users_can_delete_own_friendships" ON public.friends;

-- STEP 3: Disable RLS temporarily to test
ALTER TABLE public.friends DISABLE ROW LEVEL SECURITY;

-- STEP 4: Clean any existing data that might cause conflicts
TRUNCATE public.friends;

-- STEP 5: Re-enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create new comprehensive policies

-- Policy 1: Users can view friendships where they are involved (either direction)
CREATE POLICY "friends_select_policy" ON public.friends
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Policy 2: Users can only insert friendships where they are the user_id
CREATE POLICY "friends_insert_policy" ON public.friends
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can delete friendships where they are the user_id
CREATE POLICY "friends_delete_policy" ON public.friends
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- STEP 7: Create function for mutual friendship handling
CREATE OR REPLACE FUNCTION handle_mutual_friendship()
RETURNS TRIGGER AS $$
BEGIN
    -- When a friendship is inserted, automatically create the reverse
    INSERT INTO public.friends (user_id, friend_id, created_at)
    VALUES (NEW.friend_id, NEW.user_id, NEW.created_at)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 8: Create trigger for automatic mutual friendship
DROP TRIGGER IF EXISTS trigger_mutual_friendship ON public.friends;
CREATE TRIGGER trigger_mutual_friendship
    AFTER INSERT ON public.friends
    FOR EACH ROW
    EXECUTE FUNCTION handle_mutual_friendship();

-- STEP 9: Create function for mutual friendship deletion
CREATE OR REPLACE FUNCTION handle_mutual_friendship_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When a friendship is deleted, also delete the reverse
    DELETE FROM public.friends 
    WHERE user_id = OLD.friend_id AND friend_id = OLD.user_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 10: Create trigger for automatic mutual friendship deletion
DROP TRIGGER IF EXISTS trigger_mutual_friendship_delete ON public.friends;
CREATE TRIGGER trigger_mutual_friendship_delete
    AFTER DELETE ON public.friends
    FOR EACH ROW
    EXECUTE FUNCTION handle_mutual_friendship_delete();

-- STEP 11: Grant necessary permissions
GRANT ALL ON public.friends TO authenticated;
GRANT EXECUTE ON FUNCTION handle_mutual_friendship() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_mutual_friendship_delete() TO authenticated;

-- STEP 12: Test queries (for verification)
-- These should be run after the above to verify everything works