"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { testAddressData } from '@/lib/test-address-data';
import { addressIntegrationService } from '@/lib/address-integration';

export function AddressDebugPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  const runDebugCheck = async () => {
    setIsLoading(true);
    try {
      await testAddressData.debugCurrentState();
      const customerData = await addressIntegrationService.getCustomerProfilesWithAddresses();
      setCustomers(customerData);
      setDebugInfo({
        timestamp: new Date().toISOString(),
        customerCount: customerData.length,
        customersWithAddresses: customerData.filter(c => c.addresses.length > 0).length
      });
    } catch (error) {
      console.error('Debug check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTestAddresses = async () => {
    setIsLoading(true);
    try {
      const results = await testAddressData.createTestAddressesForAllCustomers();
      console.log('Test addresses created:', results);
      await runDebugCheck(); // Refresh the data
    } catch (error) {
      console.error('Failed to create test addresses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Address Integration Debug Panel
        </CardTitle>
        <CardDescription>
          Debug and test the address integration between Main App and Collector App
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runDebugCheck} 
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Running...' : '🔍 Debug Current State'}
          </Button>
          <Button 
            onClick={createTestAddresses} 
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? 'Creating...' : '🧪 Create Test Addresses'}
          </Button>
        </div>

        {debugInfo && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Debug Results</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Timestamp:</strong> {debugInfo.timestamp}
              </div>
              <div>
                <strong>Total Customers:</strong> {debugInfo.customerCount}
              </div>
              <div>
                <strong>Customers with Addresses:</strong> {debugInfo.customersWithAddresses}
              </div>
              <div>
                <strong>Customers without Addresses:</strong> {debugInfo.customerCount - debugInfo.customersWithAddresses}
              </div>
            </div>
          </div>
        )}

        {customers.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Customer Address Status</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {customers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{customer.displayName}</div>
                    <div className="text-sm text-gray-600">{customer.email}</div>
                    <div className="text-sm">
                      <strong>Address:</strong> {customer.displayAddress}
                    </div>
                    <div className="text-sm">
                      <strong>City:</strong> {customer.displayCity}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={customer.addresses.length > 0 ? "default" : "destructive"}>
                      {customer.addresses.length > 0 ? 'Has Address' : 'No Address'}
                    </Badge>
                    <Badge variant="outline">
                      {customer.addresses.length} address{customer.addresses.length !== 1 ? 'es' : ''}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 p-4 bg-blue-50 rounded">
          <strong>Instructions:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Click "Debug Current State" to check the current address data</li>
            <li>Click "Create Test Addresses" to add sample addresses for customers without them</li>
            <li>Check the browser console for detailed debug information</li>
            <li>This panel helps ensure the collector app can properly display user addresses from the main app</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
