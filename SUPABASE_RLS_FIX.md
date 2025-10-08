# Supabase RLS 403 Error Fix

## Problem
Getting `403 (Forbidden)` error when trying to update todos:
```
PATCH https://sdtntnqcdyjhzlhgbofp.supabase.co/rest/v1/todos?id=eq.7201397a-6608-40db-a872-a25105a42d2d&user_id=eq.69304938-4019-4822-bd57-5378f044c528 403 (Forbidden)
```

## Root Cause
The issue is likely with Row Level Security (RLS) policies on your `todos` table. The policies might not be correctly configured to allow updates.

## Quick Debug Steps

1. **Run Debug Script**: Use the `debug_supabase.js` script in your browser console to test permissions.

2. **Check RLS Policies**: In your Supabase dashboard, go to:
   - Authentication → Policies
   - Find the `todos` table policies
   - Check if UPDATE policies exist and are correct

## Most Likely RLS Policy Issues

### Issue 1: Missing UPDATE Policy
You might have SELECT and INSERT policies but no UPDATE policy.

**Solution**: Add an UPDATE policy in Supabase dashboard:
```sql
CREATE POLICY "Users can update their own todos" ON "public"."todos"
AS PERMISSIVE FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Issue 2: Incorrect Policy Conditions
Your UPDATE policy might have wrong conditions.

**Check**: Make sure your policy uses `auth.uid() = user_id` not just `user_id = auth.uid()`.

### Issue 3: Policy Conflicts
Multiple policies might be conflicting.

**Solution**: Temporarily disable all policies, test, then re-enable one by one.

## Complete RLS Policy Set

Here are the policies you should have for the `todos` table:

### SELECT Policy
```sql
CREATE POLICY "Users can view their own todos" ON "public"."todos"
AS PERMISSIVE FOR SELECT
TO public
USING (auth.uid() = user_id);
```

### INSERT Policy
```sql
CREATE POLICY "Users can insert their own todos" ON "public"."todos"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);
```

### UPDATE Policy
```sql
CREATE POLICY "Users can update their own todos" ON "public"."todos"
AS PERMISSIVE FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### DELETE Policy
```sql
CREATE POLICY "Users can delete their own todos" ON "public"."todos"
AS PERMISSIVE FOR DELETE
TO public
USING (auth.uid() = user_id);
```

## Alternative: Temporary Workaround

If you need a quick fix, you can temporarily disable RLS and test:

1. In Supabase SQL Editor, run:
```sql
ALTER TABLE "public"."todos" DISABLE ROW LEVEL SECURITY;
```

2. Test if the 403 error goes away
3. If it works, re-enable RLS and fix the policies:
```sql
ALTER TABLE "public"."todos" ENABLE ROW LEVEL SECURITY;
```

## Code-Level Fix

You can also modify your `supabaseClient.ts` to use a different update approach. Instead of relying on auto-sync, use explicit updates:

```typescript
export async function updateTodo(userId: string, todoId: string, updates: Partial<Todo>) {
  if (!supabase || !isUuid(userId)) return;
  
  const ok = await ensureSessionFor(userId);
  if (!ok) {
    console.warn('[Supabase] Session invalid - update skipped');
    return;
  }

  const { data, error } = await supabase
    .from('todos')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', todoId)
    .eq('user_id', userId)
    .select();

  if (error) {
    console.error('Supabase updateTodo error:', error);
    throw error;
  }
  
  return data;
}
```

Then modify your `handleToggleTodo` function to use this:

```typescript
const handleToggleTodo = async (id: string) => {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  
  const newCompleted = !todo.completed;
  
  // Update local state immediately for good UX
  setTodos(prev => prev.map(t => 
    t.id === id ? { ...t, completed: newCompleted } : t
  ));
  
  // Sync to Supabase
  try {
    if (userId !== 'guest') {
      await updateTodo(userId, id, { completed: newCompleted });
    }
  } catch (error) {
    console.error('Failed to sync todo update:', error);
    // Revert local state on error
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !newCompleted } : t
    ));
    setNotification({ 
      message: 'Güncelleme başarısız oldu. İnternet bağlantınızı kontrol edin.', 
      type: 'error' 
    });
  }
};
```

## Testing

After implementing the fix:

1. Try toggling a todo completion
2. Check browser console for any remaining errors
3. Verify the change is saved in Supabase dashboard
4. Refresh the page to confirm persistence

## Prevention

To avoid this issue in the future:
1. Always test RLS policies when setting up new tables
2. Use the debug script when adding new operations
3. Monitor Supabase logs for permission errors