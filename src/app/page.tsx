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

  // Show elegant loading screen with black background
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Elegant background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1)_0%,transparent_70%)] animate-pulse"></div>
      
      <div className="text-center relative z-10">
        {/* Logo with elegant glow effect */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <img 
              src="/w yellow.png" 
              alt="WozaMali Logo" 
              className="h-24 w-auto relative z-10 drop-shadow-2xl"
            />
          </div>
        </div>
        
        {/* App name with gradient text */}
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent animate-gradient">
          Woza Mali Collector
        </h1>
        
        {/* Elegant loading spinner */}
        <div className="flex items-center justify-center mt-8">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-gray-800 border-t-orange-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-yellow-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
          </div>
        </div>
        
        <p className="text-gray-400 mt-4 text-sm">Initializing...</p>
      </div>
    </div>
  );
}