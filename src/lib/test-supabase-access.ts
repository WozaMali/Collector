// Test Supabase access to user_addresses table
import { supabase } from './supabase';

export const testSupabaseAccess = {
  async testUserAddressesAccess() {
    try {
      console.log('🧪 Testing Supabase access to user_addresses table...');
      
      // Test 1: Try to get all addresses
      const { data: allAddresses, error: allError } = await supabase
        .from('user_addresses')
        .select('*')
        .limit(5);

      if (allError) {
        console.error('❌ Error accessing user_addresses table:', allError);
        return false;
      }

      console.log('✅ Successfully accessed user_addresses table');
      console.log('🔍 Sample addresses:', allAddresses);

      // Test 2: Try to get addresses for a specific user
      if (allAddresses && allAddresses.length > 0) {
        const testUserId = allAddresses[0].user_id;
        console.log(`🧪 Testing access for user ID: ${testUserId}`);
        
        const { data: userAddresses, error: userError } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', testUserId)
          .eq('is_active', true);

        if (userError) {
          console.error('❌ Error accessing user addresses:', userError);
          return false;
        }

        console.log('✅ Successfully accessed user addresses:', userAddresses);
      }

      return true;
    } catch (error) {
      console.error('❌ Error in testSupabaseAccess:', error);
      return false;
    }
  },

  async testProfilesAccess() {
    try {
      console.log('🧪 Testing Supabase access to profiles table...');
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active')
        .eq('role', 'member')
        .eq('is_active', true)
        .limit(5);

      if (profilesError) {
        console.error('❌ Error accessing profiles table:', profilesError);
        return false;
      }

      console.log('✅ Successfully accessed profiles table');
      console.log('🔍 Sample profiles:', profiles);

      return true;
    } catch (error) {
      console.error('❌ Error in testProfilesAccess:', error);
      return false;
    }
  }
};
