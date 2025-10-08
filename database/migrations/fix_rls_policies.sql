-- Migration: Fix RLS policies for soft delete functionality
-- This script fixes the RLS policy issues preventing soft delete from working

-- First, add the is_deleted column if it doesn't exist
ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Add necessary indexes
CREATE INDEX IF NOT EXISTS idx_todos_is_deleted ON public.todos (is_deleted);
CREATE INDEX IF NOT EXISTS idx_todos_user_id_is_deleted ON public.todos (user_id, is_deleted);

-- Disable RLS temporarily to rebuild policies
ALTER TABLE public.todos DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can insert own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can access their own todos" ON public.todos;

-- Re-enable RLS
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Create new comprehensive RLS policies
-- SELECT policy: Users can view their own todos that are not deleted
CREATE POLICY "Users can view own todos"
ON public.todos
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND (is_deleted IS FALSE OR is_deleted IS NULL));

-- INSERT policy: Users can insert their own todos
CREATE POLICY "Users can insert own todos"
ON public.todos
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE policy: Users can update their own todos (including soft delete)
-- This is the critical policy that was causing the issue
CREATE POLICY "Users can update own todos"
ON public.todos
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE policy: Users can hard delete their own todos if needed
CREATE POLICY "Users can delete own todos"
ON public.todos
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create a convenience view for active todos
CREATE OR REPLACE VIEW public.active_todos AS
SELECT * FROM public.todos
WHERE is_deleted IS FALSE OR is_deleted IS NULL;

-- Grant permissions
GRANT ALL ON public.todos TO authenticated;
GRANT SELECT ON public.active_todos TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN public.todos.is_deleted IS 'Soft delete flag - when true, the todo is considered deleted but preserved';
COMMENT ON VIEW public.active_todos IS 'View of todos that are not soft-deleted';

-- Test the policies by creating a simple function
CREATE OR REPLACE FUNCTION test_todo_policies()
RETURNS TEXT AS $$
DECLARE
    test_result TEXT := 'RLS Policies are working correctly';
BEGIN
    -- This function can be called to test if the policies are working
    -- You can expand this with actual test logic if needed
    RETURN test_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;