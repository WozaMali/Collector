// Address Discovery Service
// This service helps discover where address data is actually stored

import { supabase } from './supabase';

export const addressDiscoveryService = {
  // Discover what tables and columns exist for addresses
  async discoverAddressTables() {
    try {
      console.log('🔍 Discovering address tables and columns...');
      
      // First, let's see what tables exist
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (tablesError) {
        console.error('❌ Error fetching tables:', tablesError);
        return null;
      }

      console.log('📋 Available tables:', tables?.map(t => t.table_name));

      // Check profiles table structure
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (profilesError) {
        console.error('❌ Error fetching profiles sample:', profilesError);
      } else {
        console.log('👤 Profiles table columns:', profilesData?.[0] ? Object.keys(profilesData[0]) : 'No data');
      }

      // Try to check user_addresses table
      try {
        const { data: userAddressesData, error: userAddressesError } = await supabase
          .from('user_addresses')
          .select('*')
          .limit(1);

        if (userAddressesError) {
          console.log('❌ user_addresses table does not exist or is not accessible');
        } else {
          console.log('🏠 user_addresses table columns:', userAddressesData?.[0] ? Object.keys(userAddressesData[0]) : 'No data');
        }
      } catch (error) {
        console.log('❌ user_addresses table does not exist');
      }

      // Try to check addresses table
      try {
        const { data: addressesData, error: addressesError } = await supabase
          .from('addresses')
          .select('*')
          .limit(1);

        if (addressesError) {
          console.log('❌ addresses table does not exist or is not accessible');
        } else {
          console.log('🏠 addresses table columns:', addressesData?.[0] ? Object.keys(addressesData[0]) : 'No data');
        }
      } catch (error) {
        console.log('❌ addresses table does not exist');
      }

      return {
        tables: tables?.map(t => t.table_name) || [],
        profilesColumns: profilesData?.[0] ? Object.keys(profilesData[0]) : [],
        userAddressesExists: false, // Will be updated based on the checks above
        addressesExists: false // Will be updated based on the checks above
      };

    } catch (error) {
      console.error('❌ Error in discoverAddressTables:', error);
      return null;
    }
  },

  // Get customer profiles with whatever address data is available
  async getCustomerProfilesWithAvailableAddresses() {
    try {
      console.log('🔍 Getting customer profiles with available address data...');
      
      // First, get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'member')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        return [];
      }

      if (!profiles || profiles.length === 0) {
        console.log('⚠️ No customer profiles found');
        return [];
      }

      console.log(`✅ Found ${profiles.length} customer profiles`);
      
      // Show what columns are available
      if (profiles.length > 0) {
        console.log('🔍 Available columns in profiles table:', Object.keys(profiles[0]));
      }

      // Process profiles and try to extract any address-like information
      const profilesWithAddresses = profiles.map(profile => {
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

        // Try to find any address-like fields
        let displayAddress = 'No address registered';
        let displayCity = 'Unknown city';

        // Check for common address field names
        const possibleAddressFields = [
          'street_address', 'address', 'street', 'address_line1', 'line1',
          'suburb', 'area', 'district', 'neighborhood',
          'city', 'town', 'municipality',
          'postal_code', 'zip_code', 'postcode'
        ];

        const foundAddressFields: any = {};
        possibleAddressFields.forEach(field => {
          if (profile[field]) {
            foundAddressFields[field] = profile[field];
          }
        });

        console.log(`📍 Profile ${profile.email} address fields found:`, foundAddressFields);

        // If we found some address fields, try to build a display
        if (Object.keys(foundAddressFields).length > 0) {
          const addressParts = [];
          const cityParts = [];

          // Try to build address from available fields
          if (foundAddressFields.street_address || foundAddressFields.address || foundAddressFields.street || foundAddressFields.address_line1 || foundAddressFields.line1) {
            addressParts.push(foundAddressFields.street_address || foundAddressFields.address || foundAddressFields.street || foundAddressFields.address_line1 || foundAddressFields.line1);
          }
          if (foundAddressFields.suburb || foundAddressFields.area || foundAddressFields.district || foundAddressFields.neighborhood) {
            addressParts.push(foundAddressFields.suburb || foundAddressFields.area || foundAddressFields.district || foundAddressFields.neighborhood);
          }

          if (foundAddressFields.city || foundAddressFields.town || foundAddressFields.municipality) {
            cityParts.push(foundAddressFields.city || foundAddressFields.town || foundAddressFields.municipality);
          }
          if (foundAddressFields.postal_code || foundAddressFields.zip_code || foundAddressFields.postcode) {
            cityParts.push(foundAddressFields.postal_code || foundAddressFields.zip_code || foundAddressFields.postcode);
          }

          displayAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Address not specified';
          displayCity = cityParts.length > 0 ? cityParts.join(', ') : 'Unknown city';
        }

        return {
          ...profile,
          displayName,
          displayAddress,
          displayCity,
          foundAddressFields
        };
      });

      return profilesWithAddresses;

    } catch (error) {
      console.error('❌ Error in getCustomerProfilesWithAvailableAddresses:', error);
      return [];
    }
  }
};
