-- Migration: Add soft delete functionality to todos table
-- This script adds the is_deleted column and updates RLS policies to filter out deleted items

-- Add is_deleted column to todos table with default value false
ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Add index on is_deleted column for better query performance
CREATE INDEX IF NOT EXISTS idx_todos_is_deleted ON public.todos (is_deleted);

-- Add composite index on user_id and is_deleted for optimal filtering
CREATE INDEX IF NOT EXISTS idx_todos_user_id_is_deleted ON public.todos (user_id, is_deleted);

-- Update RLS policies to automatically filter out deleted items
-- First, drop existing policy
DROP POLICY IF EXISTS "Users can access their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can view own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can insert own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete own todos" ON public.todos;

-- Create new RLS policies that filter out deleted items for SELECT operations
CREATE POLICY "Users can view own todos"
ON public.todos
FOR SELECT
TO public
USING (user_id = auth.uid() AND (is_deleted IS FALSE OR is_deleted IS NULL));

-- Policy for inserting - no need to filter deleted items
CREATE POLICY "Users can insert own todos"
ON public.todos
FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());

-- Policy for updating - allow updates to own todos regardless of deleted status
-- This is important for the soft delete functionality to work
CREATE POLICY "Users can update own todos"
ON public.todos
FOR UPDATE
TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy for deleting - allow hard deletes if needed
CREATE POLICY "Users can delete own todos"
ON public.todos
FOR DELETE
TO public
USING (user_id = auth.uid());

-- Optional: Create a view that automatically filters out deleted todos
-- This can be used by applications that want a clean interface
CREATE OR REPLACE VIEW public.active_todos AS
SELECT * FROM public.todos
WHERE is_deleted IS FALSE OR is_deleted IS NULL;

-- Grant permissions on the view to authenticated users
GRANT SELECT ON public.active_todos TO authenticated;

COMMENT ON COLUMN public.todos.is_deleted IS 'Soft delete flag - when true, the todo is considered deleted but preserved for audit/recovery purposes';
COMMENT ON VIEW public.active_todos IS 'View of todos that are not soft-deleted - provides a clean interface for applications';