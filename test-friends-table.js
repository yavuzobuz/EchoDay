// Test friends table in browser
console.log('Testing friends table...');

// This script should be run in browser console when the app is loaded
if (typeof window !== 'undefined' && window.supa) {
  const supabase = window.supa;
  
  // Test 1: Try to select from friends table
  supabase.from('friends').select('*').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('Friends table error:', error);
        if (error.code === 'PGRST116') {
          console.log('Friends table does not exist - need to create it');
        } else if (error.code === '42501' || error.message.includes('permission denied')) {
          console.log('Friends table exists but RLS policies are missing');
        }
      } else {
        console.log('Friends table is accessible:', data);
      }
    });

  // Test 2: Check current user
  supabase.auth.getUser()
    .then(({ data, error }) => {
      console.log('Current user:', data?.user?.email || 'Not logged in');
    });

} else {
  console.log('Supabase client not found. Make sure app is loaded and supabase is configured.');
}