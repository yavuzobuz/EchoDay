// Script to check if friends table exists in Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sdtntnqcdyjhzlhgbofp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdG50bnFjZHlqaHpsaGdib2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgzNzMwODMsImV4cCI6MjA0Mzk0OTA4M30.gSfWz1QMtcvJZwQvzJsrjXsW3oZLqMBDLDt-YkFjPEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  try {
    console.log('Checking Supabase connection...')
    
    // Try to get current user
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('User data:', userData?.user?.email || 'No user logged in')
    
    // Try to access friends table
    console.log('\nTrying to access friends table...')
    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Friends table error:', error)
    } else {
      console.log('Friends table accessible:', data)
    }
    
    // Try to access profiles table for comparison
    console.log('\nTrying to access profiles table...')
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (profilesError) {
      console.error('Profiles table error:', profilesError)
    } else {
      console.log('Profiles table accessible:', profilesData?.length || 0, 'records')
    }
    
  } catch (err) {
    console.error('General error:', err)
  }
}

checkTables()