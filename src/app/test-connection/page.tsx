"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function TestConnectionPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (test: string, result: any, error?: any) => {
    setTestResults(prev => [...prev, {
      test,
      result,
      error,
      timestamp: new Date().toISOString()
    }]);
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);

    try {
      // Test 1: Check Supabase client
      addResult("Supabase Client", {
        exists: !!supabase,
        url: supabase.supabaseUrl,
        keyLength: supabase.supabaseKey?.length || 0
      });

      // Test 2: Check environment variables
      addResult("Environment Variables", {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
      });

      // Test 3: Basic profiles table access
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, role')
          .limit(1);

        addResult("Basic Profiles Access", {
          success: !error,
          dataCount: data?.length || 0,
          error: error
        });
      } catch (err) {
        addResult("Basic Profiles Access", {
          success: false,
          error: err
        });
      }

      // Test 4: Check for customer profiles
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('role', 'customer');

        addResult("Customer Profiles Query", {
          success: !error,
          dataCount: data?.length || 0,
          error: error
        });
      } catch (err) {
        addResult("Customer Profiles Query", {
          success: false,
          error: err
        });
      }

      // Test 5: Check for any profiles with any role
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .limit(10);

        if (data) {
          const roles = [...new Set(data.map(p => p.role))];
          addResult("Available Roles", {
            success: !error,
            roles: roles,
            totalProfiles: data.length,
            error: error
          });
        } else {
          addResult("Available Roles", {
            success: !error,
            roles: [],
            totalProfiles: 0,
            error: error
          });
        }
      } catch (err) {
        addResult("Available Roles", {
          success: false,
          error: err
        });
      }

    } catch (error) {
      addResult("Test Suite", {
        success: false,
        error: error
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-800 border-gray-700 text-white mb-6">
          <CardHeader>
            <CardTitle>🔌 Supabase Connection Test</CardTitle>
            <CardDescription>
              Test and debug Supabase database connectivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runTests} 
              disabled={isLoading}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run Connection Tests'
              )}
            </Button>
          </CardContent>
        </Card>

        {testResults.map((result, index) => (
          <Card key={index} className="bg-gray-800 border-gray-700 text-white mb-4">
            <CardHeader>
              <CardTitle className="text-lg">
                {result.success !== undefined ? (
                  result.success ? '✅ ' : '❌ '
                ) : '🔍 '}
                {result.test}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {result.timestamp}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(result.result, null, 2)}
              </pre>
              {result.error && (
                <div className="mt-4">
                  <h4 className="text-red-400 font-semibold mb-2">Error Details:</h4>
                  <pre className="bg-red-900/20 p-4 rounded-lg overflow-x-auto text-sm text-red-300">
                    {JSON.stringify(result.error, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
