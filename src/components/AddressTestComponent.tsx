"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { addressDiscoveryService } from '@/lib/address-discovery';
import { testSupabaseAccess } from '@/lib/test-supabase-access';

export function AddressTestComponent() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testProfilesTable = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing profiles table and discovering address data...');
      
      // First, test basic Supabase access
      console.log('🧪 Testing basic Supabase access...');
      await testSupabaseAccess.testProfilesAccess();
      await testSupabaseAccess.testUserAddressesAccess();
      
      // Then, discover what address tables and columns exist
      await addressDiscoveryService.discoverAddressTables();
      
      // Then get profiles with available address data
      const profilesWithAddresses = await addressDiscoveryService.getCustomerProfilesWithAvailableAddresses();
      
      console.log('✅ Profiles with address data:', profilesWithAddresses);
      setProfiles(profilesWithAddresses);

    } catch (error) {
      console.error('❌ Error in testProfilesTable:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTestAddress = async (profileId: string) => {
    try {
      console.log('🧪 Creating test address for profile:', profileId);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          street_address: '123 Test Street',
          suburb: 'Test Suburb',
          city: 'Cape Town',
          postal_code: '8001',
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating test address:', error);
        return;
      }

      console.log('✅ Test address created:', data);
      await testProfilesTable(); // Refresh the data
    } catch (error) {
      console.error('❌ Error in createTestAddress:', error);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Direct Profiles Table Test
        </CardTitle>
        <CardDescription>
          Test the profiles table directly to see address data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testProfilesTable} 
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Testing...' : '🔍 Test Profiles Table'}
        </Button>

        {profiles.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Profiles with Address Data</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
                             {profiles.map((profile) => {
                 const hasAddress = !!(profile.displayAddress && profile.displayAddress !== 'No address registered');
                 
                 return (
                   <div key={profile.id} className="flex items-center justify-between p-2 border rounded">
                     <div className="flex-1">
                       <div className="font-medium">{profile.displayName || profile.email}</div>
                       <div className="text-sm text-gray-600">{profile.email}</div>
                       <div className="text-sm">
                         <strong>Address:</strong> {profile.displayAddress || 'No address'}
                       </div>
                       <div className="text-sm">
                         <strong>City:</strong> {profile.displayCity || 'Unknown city'}
                       </div>
                       {profile.foundAddressFields && Object.keys(profile.foundAddressFields).length > 0 && (
                         <div className="text-xs text-blue-600 mt-1">
                           <strong>Found fields:</strong> {Object.keys(profile.foundAddressFields).join(', ')}
                         </div>
                       )}
                     </div>
                     <div className="flex gap-2">
                       <Badge variant={hasAddress ? "default" : "destructive"}>
                         {hasAddress ? 'Has Address' : 'No Address'}
                       </Badge>
                       {!hasAddress && (
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => createTestAddress(profile.id)}
                         >
                           Add Test Address
                         </Button>
                       )}
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 p-4 bg-blue-50 rounded">
          <strong>Instructions:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Click "Test Profiles Table" to see raw data from the profiles table</li>
            <li>Check the browser console for detailed debug information</li>
            <li>If profiles don't have addresses, click "Add Test Address" to create sample data</li>
            <li>This tests the profiles table directly, bypassing the address integration service</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
