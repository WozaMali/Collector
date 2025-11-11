"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('LandingPage: Loading timeout, forcing redirect');
        // Force redirect after timeout
        if (!user) {
          router.replace('/login');
        } else {
          router.replace('/dashboard');
        }
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(loadingTimeout);
  }, [isLoading, user, router]);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      // If user is authenticated, redirect to dashboard
      router.replace('/dashboard');
    } else {
      // If user is not authenticated, redirect to login
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <img 
            src="/w%20yellow.png" 
            alt="WozaMali Logo" 
            className="h-16 w-auto"
          />
        </div>
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500 mr-2" />
          <p className="text-gray-300">Loading...</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">If this takes too long, please refresh the page</p>
      </div>
    </div>
  );
}