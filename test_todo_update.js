// Test script to verify todo update fix is working
// Run this in browser console after making the changes

async function testTodoUpdate() {
    console.log('🧪 Testing todo update functionality...');
    
    try {
        // Import the new updateTodo function
        const { updateTodo } = await import('./src/services/supabaseClient.js');
        
        console.log('✅ updateTodo function imported successfully');
        
        // Get current user
        const { supabase } = await import('./src/services/supabaseClient.js');
        if (!supabase) {
            console.error('❌ Supabase not configured');
            return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('❌ No authenticated user');
            return;
        }
        
        console.log('✅ User authenticated:', user.id);
        
        // Find a test todo from existing todos
        const { data: todos, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);
            
        if (error) {
            console.error('❌ Failed to fetch existing todos:', error);
            return;
        }
        
        if (!todos || todos.length === 0) {
            console.log('⚠️ No existing todos found to test with');
            console.log('💡 Create a todo first, then run this test');
            return;
        }
        
        const testTodo = todos[0];
        const originalCompleted = testTodo.completed;
        const newCompleted = !originalCompleted;
        
        console.log('📝 Testing with todo:', testTodo.text);
        console.log('🔄 Toggling completed status:', originalCompleted, '->', newCompleted);
        
        // Test the updateTodo function
        await updateTodo(user.id, testTodo.id, { completed: newCompleted });
        
        console.log('✅ updateTodo call completed without errors');
        
        // Verify the update worked
        const { data: updatedTodos, error: fetchError } = await supabase
            .from('todos')
            .select('*')
            .eq('id', testTodo.id)
            .single();
            
        if (fetchError) {
            console.error('❌ Failed to fetch updated todo:', fetchError);
            return;
        }
        
        if (updatedTodos.completed === newCompleted) {
            console.log('🎉 SUCCESS! Todo update worked correctly');
            console.log('✅ Todo completed status changed to:', newCompleted);
        } else {
            console.error('❌ FAILED! Todo was not updated');
            console.error('Expected:', newCompleted, 'Actual:', updatedTodos.completed);
        }
        
        // Revert the change for clean testing
        await updateTodo(user.id, testTodo.id, { completed: originalCompleted });
        console.log('🔄 Reverted todo back to original state');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Auto-run the test
testTodoUpdate();

// Make it available globally
window.testTodoUpdate = testTodoUpdate;

console.log('🚀 Test function loaded. You can also run: testTodoUpdate()');