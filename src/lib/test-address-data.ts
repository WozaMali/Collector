// Test script to create sample address data for testing
// This helps ensure the collector app can display addresses properly

import { supabase } from './supabase';

export const testAddressData = {
  // Create a test address for a customer by updating their profile
  async createTestAddressForCustomer(customerId: string) {
    try {
      console.log('🧪 Creating test address for customer:', customerId);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          street_address: '123 Test Street',
          suburb: 'Test Suburb',
          city: 'Cape Town',
          postal_code: '8001',
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating test address:', error);
        return null;
      }

      console.log('✅ Test address created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in createTestAddressForCustomer:', error);
      return null;
    }
  },

  // Get all customers without addresses
  async getCustomersWithoutAddresses() {
    try {
      console.log('🔍 Finding customers without addresses...');
      
      // Get all customer profiles and check their address fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, username, street_address, suburb, city')
        .eq('role', 'member')
        .eq('is_active', true);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        return [];
      }

      if (!profiles || profiles.length === 0) {
        console.log('⚠️ No customer profiles found');
        return [];
      }

      // Filter customers who don't have address information
      const customersWithoutAddresses = profiles.filter(profile => 
        !profile.street_address && !profile.suburb && !profile.city
      );

      console.log(`📊 Found ${customersWithoutAddresses.length} customers without addresses`);
      return customersWithoutAddresses;
    } catch (error) {
      console.error('❌ Error in getCustomersWithoutAddresses:', error);
      return [];
    }
  },

  // Create test addresses for all customers without addresses
  async createTestAddressesForAllCustomers() {
    try {
      console.log('🚀 Creating test addresses for all customers without addresses...');
      
      const customersWithoutAddresses = await this.getCustomersWithoutAddresses();
      
      if (customersWithoutAddresses.length === 0) {
        console.log('✅ All customers already have addresses');
        return [];
      }

      const results = [];
      for (const customer of customersWithoutAddresses) {
        const result = await this.createTestAddressForCustomer(customer.id);
        if (result) {
          results.push({
            customer: customer,
            address: result
          });
        }
      }

      console.log(`✅ Created ${results.length} test addresses`);
      return results;
    } catch (error) {
      console.error('❌ Error in createTestAddressesForAllCustomers:', error);
      return [];
    }
  },

  // Debug function to check current state
  async debugCurrentState() {
    try {
      console.log('🔍 Debugging current address state...');
      
      // Check profiles with address fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, is_active, street_address, suburb, city, postal_code')
        .eq('role', 'member')
        .eq('is_active', true);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        return;
      }

      console.log(`📊 Found ${profiles?.length || 0} active customer profiles`);

      // Show sample data
      if (profiles && profiles.length > 0) {
        console.log('👤 Sample profile:', profiles[0]);
      }

      // Check how many profiles have address information
      if (profiles) {
        const profilesWithAddresses = profiles.filter(profile => 
          profile.street_address || profile.suburb || profile.city
        );
        console.log(`🔗 ${profilesWithAddresses.length} profiles have address information`);
        
        // Show address details for profiles that have them
        profilesWithAddresses.slice(0, 3).forEach(profile => {
          console.log(`📍 Profile ${profile.email}: ${profile.street_address}, ${profile.suburb}, ${profile.city}`);
        });
      }

    } catch (error) {
      console.error('❌ Error in debugCurrentState:', error);
    }
  }
};

// Export for use in browser console or components
if (typeof window !== 'undefined') {
  (window as any).testAddressData = testAddressData;
}
