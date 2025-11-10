"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-red-600 rounded-full flex items-center justify-center shadow-lg">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Unauthorized Access</p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-1 pb-6">
            <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl text-red-600">Access Restricted</CardTitle>
            <CardDescription>
              This portal is exclusively for Woza Mali collectors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-3">
              <p className="text-gray-600 dark:text-gray-300">
                You don&apos;t have permission to access the collector portal. This area is restricted to authorized recycling collectors only.
              </p>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <h3 className="font-medium text-orange-800 dark:text-orange-200 mb-2">What you can do:</h3>
                <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 text-left">
                  <li>• Contact your supervisor for collector access</li>
                  <li>• Use the main Woza Mali office portal instead</li>
                  <li>• Check your user role and permissions</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Collector Login
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  Return to Main Portal
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            If you believe this is an error, please contact support
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            support@wozamali.com
          </p>
        </div>
      </div>
    </div>
  );
}
