// Address Integration Service for Collector App
// This service ensures proper integration with Main App user addresses

import { supabase } from './supabase';

export interface UserAddress {
  id: string;
  user_id: string;
  address_type: 'primary' | 'secondary' | 'pickup' | 'billing';
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code?: string;
  country: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithAddress {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  full_name?: string;
  phone?: string;
  role: string;
  is_active: boolean;
  addresses: UserAddress[];
  primaryAddress?: UserAddress;
  displayName: string;
  displayAddress: string;
  displayCity: string;
}

export const addressIntegrationService = {
  // Get all customer profiles with their addresses
  async getCustomerProfilesWithAddresses(): Promise<ProfileWithAddress[]> {
    try {
      console.log('🔍 Address Integration: Fetching customer profiles with addresses from user_addresses table...');
      
      // First, get all customer profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'member')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        console.log('⚠️ No customer profiles found');
        return [];
      }

      console.log(`✅ Found ${profiles.length} customer profiles`);
      console.log('🔍 Profile IDs:', profiles.map(p => ({ id: p.id, email: p.email })));

      // Check if profiles have address fields directly
      console.log('🔍 Checking if profiles have address fields...');
      const sampleProfile = profiles[0];
      const hasAddressFields = sampleProfile && (
        'address_line1' in sampleProfile || 
        'street_address' in sampleProfile || 
        'city' in sampleProfile
      );
      
      console.log('🔍 Profile sample fields:', Object.keys(sampleProfile || {}));
      console.log('🔍 Has address fields:', hasAddressFields);

      let addresses: any[] = [];
      
      if (hasAddressFields) {
        console.log('✅ Profiles have address fields - using direct address data');
        // Create address objects from profile data
        addresses = profiles.map(profile => ({
          id: `profile-${profile.id}`,
          user_id: profile.id,
          address_type: 'primary',
          address_line1: profile.address_line1 || profile.street_address || '',
          address_line2: profile.address_line2 || profile.suburb || '',
          city: profile.city || '',
          province: profile.province || 'Gauteng',
          postal_code: profile.postal_code || '',
          country: profile.country || 'South Africa',
          is_default: true,
          is_active: true,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }));
        console.log('✅ Created addresses from profile data:', addresses.length);
      } else {
        console.log('⚠️ Profiles do not have address fields - trying user_addresses table...');
        
        // Try to get addresses from user_addresses table
        const userIds = profiles.map(p => p.id);
        const { data: userAddresses, error: addressesError } = await supabase
          .from('user_addresses')
          .select('*')
          .in('user_id', userIds)
          .eq('is_active', true);

        if (addressesError) {
          console.error('❌ Error fetching addresses from user_addresses:', addressesError);
        } else {
          addresses = userAddresses || [];
          console.log(`✅ Found ${addresses.length} addresses from user_addresses table`);
        }
      }

      // Create a map of user_id to addresses for easy lookup
      const addressMap = new Map();
      if (addresses) {
        addresses.forEach(addr => {
          if (!addressMap.has(addr.user_id)) {
            addressMap.set(addr.user_id, []);
          }
          addressMap.get(addr.user_id).push(addr);
        });
      }
      
      console.log('🔍 Address map created:', Array.from(addressMap.entries()).map(([userId, addrs]) => ({
        userId,
        addressCount: addrs.length
      })));

      const processedProfiles: ProfileWithAddress[] = profiles.map(profile => {
        // Build display name
        let displayName = 'Unknown Customer';
        if (profile.first_name && profile.last_name) {
          displayName = `${profile.first_name} ${profile.last_name}`;
        } else if (profile.first_name) {
          displayName = profile.first_name;
        } else if (profile.last_name) {
          displayName = profile.last_name;
        } else if (profile.username) {
          displayName = profile.username;
        } else if (profile.full_name) {
          displayName = profile.full_name;
        } else if (profile.email) {
          const emailName = profile.email.split('@')[0];
          displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }

        // Process addresses from user_addresses table using the address map
        const addresses: UserAddress[] = addressMap.get(profile.id) || [];
        const primaryAddress = addresses.find(addr => addr.is_default) || addresses[0] || null;

        console.log(`🔍 Profile ${profile.email} (${profile.id}): Found ${addresses.length} addresses`, addresses);

        let displayAddress = 'No address registered';
        let displayCity = 'Unknown city';

        if (primaryAddress) {
          const addressParts = [primaryAddress.address_line1, primaryAddress.address_line2].filter(Boolean);
          displayAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Address not specified';
          
          const cityParts = [primaryAddress.city, primaryAddress.postal_code].filter(Boolean);
          displayCity = cityParts.length > 0 ? cityParts.join(', ') : 'Unknown city';
          
          console.log(`✅ Found address for ${profile.email}: "${displayAddress}" - City: "${displayCity}"`);
        } else {
          console.log(`❌ No address found for ${profile.email} in user_addresses table`);
        }

        return {
          ...profile,
          id: profile.id, // Ensure profile ID is preserved (not address ID)
          addresses,
          primaryAddress,
          displayName,
          displayAddress,
          displayCity
        };
      });

      console.log(`✅ Successfully processed ${processedProfiles.length} profiles with addresses`);
      
      // Log some examples for debugging
      processedProfiles.slice(0, 3).forEach(profile => {
        console.log(`📋 Profile: ${profile.displayName} - Address: ${profile.displayAddress} - City: ${profile.displayCity}`);
      });

      return processedProfiles;
    } catch (error) {
      console.error('❌ Error in address integration service:', error);
      return [];
    }
  },

  // Get a specific customer's address
  async getCustomerAddress(customerId: string): Promise<UserAddress | null> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', customerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching customer address:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in getCustomerAddress:', error);
      return null;
    }
  },

  // Check if a customer has an address
  async hasCustomerAddress(customerId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('user_id', customerId)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('❌ Error checking customer address:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Error in hasCustomerAddress:', error);
      return false;
    }
  },

  // Create a test address for a customer (for testing purposes)
  async createTestAddress(customerId: string, addressData: Partial<UserAddress>): Promise<UserAddress | null> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: customerId,
          address_type: 'primary',
          address_line1: addressData.address_line1 || '123 Test Street',
          address_line2: addressData.address_line2 || 'Test Suburb',
          city: addressData.city || 'Cape Town',
          province: addressData.province || 'Western Cape',
          postal_code: addressData.postal_code || '8001',
          country: 'South Africa',
          is_default: true,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating test address:', error);
        return null;
      }

      console.log('✅ Test address created successfully');
      return data;
    } catch (error) {
      console.error('❌ Error in createTestAddress:', error);
      return null;
    }
  }
};
