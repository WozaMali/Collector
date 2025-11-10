"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function TestSupabaseConfigPage() {
  const [configInfo, setConfigInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkConfig = () => {
    setIsLoading(true);
    
    try {
      const info = {
        // Environment variables
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        supabaseKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        
        // Browser environment
        userAgent: navigator.userAgent,
        location: window.location.href,
        
        // Node environment (should be undefined in browser)
        nodeEnv: process.env.NODE_ENV,
        
        // Timestamp
        timestamp: new Date().toISOString()
      };
      
      setConfigInfo(info);
    } catch (error) {
      setConfigInfo({ error: error?.toString() || 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-800 border-gray-700 text-white mb-6">
          <CardHeader>
            <CardTitle>🔧 Supabase Configuration Test</CardTitle>
            <CardDescription>
              Check environment variables and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={checkConfig} 
              disabled={isLoading}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Configuration'
              )}
            </Button>
          </CardContent>
        </Card>

        {configInfo && (
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle>Configuration Information</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(configInfo, null, 2)}
              </pre>
              
              {configInfo.hasSupabaseUrl && configInfo.hasSupabaseKey ? (
                <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <h4 className="text-green-400 font-semibold mb-2">✅ Configuration Looks Good</h4>
                  <p className="text-green-300 text-sm">
                    Both Supabase URL and key are present. The issue might be with database permissions or table structure.
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <h4 className="text-red-400 font-semibold mb-2">❌ Configuration Issue</h4>
                  <p className="text-red-300 text-sm">
                    Missing Supabase environment variables. Check your .env.local file.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

