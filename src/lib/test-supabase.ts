// Test Supabase connection and permissions
import { supabase } from './supabase';

export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...');
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('1. Testing basic connection...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    console.log('Session check result:', { session: !!session, error: sessionError });
    
    // Test 2: Try to read from collectors table
    console.log('2. Testing collectors table read...');
    const { data: collectors, error: readError } = await supabase
      .from('collectors')
      .select('id, email, full_name')
      .limit(1);
    console.log('Read test result:', { 
      data: collectors, 
      error: readError,
      errorMessage: readError?.message,
      errorCode: readError?.code,
      errorDetails: readError?.details
    });
    
    // Test 3: Try to insert a test record
    console.log('3. Testing collectors table insert...');
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      email: 'test-connection@example.com',
      full_name: 'Test Connection',
      first_name: 'Test',
      last_name: 'Connection',
      phone: '+27123456789',
      status: 'active'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('collectors')
      .insert(testData);
    
    console.log('Insert test result:', { 
      data: insertData, 
      error: insertError,
      errorMessage: insertError?.message,
      errorCode: insertError?.code,
      errorDetails: insertError?.details,
      errorHint: insertError?.hint
    });
    
    // Clean up test data
    if (!insertError) {
      await supabase
        .from('collectors')
        .delete()
        .eq('email', 'test-connection@example.com');
    }
    
    return {
      session: !!session,
      canRead: !readError,
      canInsert: !insertError,
      errors: {
        session: sessionError,
        read: readError,
        insert: insertError
      }
    };
    
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return {
      session: false,
      canRead: false,
      canInsert: false,
      errors: { general: error }
    };
  }
}
