// Debug script for Supabase connection and RLS issues
// Run this in browser console to debug the 403 error

async function debugSupabase() {
    console.log('🔍 Starting Supabase Debug...');
    
    try {
        // Import Supabase client
        const { supabase } = await import('./src/services/supabaseClient.js');
        
        if (!supabase) {
            console.error('❌ Supabase client not configured');
            return;
        }
        
        console.log('✅ Supabase client loaded');
        
        // Check authentication
        console.log('\n📋 Checking Authentication...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            console.error('❌ Auth error:', authError);
            return;
        }
        
        if (!user) {
            console.error('❌ No authenticated user');
            return;
        }
        
        console.log('✅ User authenticated:', user.id);
        console.log('👤 User details:', {
            id: user.id,
            email: user.email,
            created_at: user.created_at
        });
        
        // Test basic select query
        console.log('\n📋 Testing SELECT permissions...');
        const { data: todos, error: selectError } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', user.id)
            .limit(5);
            
        if (selectError) {
            console.error('❌ SELECT error:', selectError);
        } else {
            console.log('✅ SELECT successful:', todos?.length || 0, 'todos found');
        }
        
        // Test insert (upsert) permissions
        console.log('\n📋 Testing INSERT/UPSERT permissions...');
        const testTodo = {
            id: 'debug-test-' + Date.now(),
            user_id: user.id,
            text: 'Debug test todo - can be deleted',
            priority: 'medium',
            completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('todos')
            .upsert(testTodo)
            .select();
            
        if (insertError) {
            console.error('❌ INSERT/UPSERT error:', insertError);
        } else {
            console.log('✅ INSERT/UPSERT successful:', insertData);
            
            // Test update permissions
            console.log('\n📋 Testing UPDATE permissions...');
            const { data: updateData, error: updateError } = await supabase
                .from('todos')
                .update({ 
                    completed: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', testTodo.id)
                .eq('user_id', user.id)
                .select();
                
            if (updateError) {
                console.error('❌ UPDATE error:', updateError);
                console.error('💡 This might be the cause of your 403 error!');
            } else {
                console.log('✅ UPDATE successful:', updateData);
            }
            
            // Clean up test todo
            console.log('\n📋 Cleaning up test data...');
            const { error: deleteError } = await supabase
                .from('todos')
                .delete()
                .eq('id', testTodo.id)
                .eq('user_id', user.id);
                
            if (deleteError) {
                console.error('❌ DELETE error:', deleteError);
            } else {
                console.log('✅ DELETE successful');
            }
        }
        
        // Test RLS policies by trying to access another user's data
        console.log('\n📋 Testing RLS isolation...');
        const { data: otherUserData, error: rlsError } = await supabase
            .from('todos')
            .select('*')
            .neq('user_id', user.id)  // Try to access other users' data
            .limit(1);
            
        if (rlsError) {
            console.log('✅ RLS working - got error when trying to access other users data:', rlsError.message);
        } else if (!otherUserData || otherUserData.length === 0) {
            console.log('✅ RLS working - no data returned for other users');
        } else {
            console.warn('⚠️ RLS might not be working correctly - got other users data:', otherUserData);
        }
        
        console.log('\n✅ Debug completed!');
        console.log('\n💡 If UPDATE failed above, this explains your 403 error.');
        console.log('💡 Check your Supabase RLS policies for the todos table.');
        
    } catch (error) {
        console.error('❌ Debug script failed:', error);
    }
}

// Also export a function to check current RLS policies (requires admin access)
async function checkRLSPolicies() {
    console.log('📋 Checking RLS Policies (requires admin access)...');
    
    try {
        const { supabase } = await import('./src/services/supabaseClient.js');
        
        const { data, error } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'todos');
            
        if (error) {
            console.error('❌ Could not fetch RLS policies (normal if not admin):', error.message);
        } else {
            console.log('📋 RLS Policies for todos table:', data);
        }
    } catch (error) {
        console.error('❌ Error checking RLS policies:', error);
    }
}

// Auto-run the debug
debugSupabase();

// Make functions available globally for manual testing
window.debugSupabase = debugSupabase;
window.checkRLSPolicies = checkRLSPolicies;

console.log('🚀 Debug functions loaded. You can also call:');
console.log('  debugSupabase() - Full debug test');
console.log('  checkRLSPolicies() - Check RLS policies (admin only)');