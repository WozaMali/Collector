"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  collector_id?: string;
  status?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: AuthUser | null; // Added profile to match main app interface
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  createCollectorProfile: (firstName: string, lastName: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await checkUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('🔍 Checking collector profile for user:', session.user.id);
        
        // Get user profile from unified users table (no FK joins to avoid 404s)
        const { data: userRow, error } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, phone, role_id, status')
          .eq('id', session.user.id)
          .single();

        if (userRow && !error) {
          console.log('✅ User profile found:', userRow.id);
          // Resolve role name: if role_id is a role name use it; else try roles lookup; fallback 'collector'
          let roleName = (userRow.role_id || '').toString();
          if (!roleName || roleName.includes('-')) {
            const { data: roleLookup } = await supabase.from('roles').select('id, name').limit(1000);
            const byId = new Map((roleLookup || []).map((r: any) => [String(r.id), String(r.name)]));
            roleName = byId.get(String(userRow.role_id)) || roleName || 'collector';
          }

          // Construct display name with better fallback
          let displayName = `${userRow.first_name || ''} ${userRow.last_name || ''}`.trim();
          if (!displayName) {
            // If no first/last name, try to extract from email
            const emailName = userRow.email.split('@')[0];
            displayName = emailName
              .split('.')
              .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
              .join(' ');
          }

          const userData = {
            id: userRow.id,
            email: userRow.email,
            name: displayName || 'Collector',
            role: roleName || 'collector',
            phone: userRow.phone,
            collector_id: userRow.id,
            status: userRow.status || 'active'
          };
          setUser(userData);
        } else {
          console.log('⚠️ No user profile found for authenticated user');
          console.log('Error details:', error);
          // Don't auto-create user - let them sign in manually
          setUser(null);
        }
      } else {
        console.log('ℹ️ No active session found');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Error checking user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      console.log('🔐 Starting login process for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('✅ Auth login successful:', data.user.id);
        await checkUser();
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, phone?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      console.log('🚀 Starting sign-up process for:', email);
      
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || '',
          }
        }
      });

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        console.error('❌ No user returned from signup');
        return { success: false, error: 'Failed to create account' };
      }

      console.log('✅ Auth user created:', authData.user.id);

      // Step 2: Wait for the auth user to be fully committed and try multiple times if needed
      let collectorCreated = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!collectorCreated && attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Attempt ${attempts} to create collector profile...`);
        
        // Wait longer on subsequent attempts
        await new Promise(resolve => setTimeout(resolve, attempts * 1000));

        // Step 3: Lookup collector role id dynamically
        const { data: collectorRole, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'collector')
          .single();

        if (roleError || !collectorRole) {
          console.error('❌ Collector role lookup error:', roleError);
          if (attempts === maxAttempts) {
            return { success: false, error: 'Failed to find collector role' };
          }
          continue;
        }

        // Step 4: Create collector profile in unified users table
        const { error: collectorError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            phone: phone || '',
            role_id: collectorRole.id,
            status: 'active'
          });

        if (collectorError) {
          console.error(`❌ Collector creation error (attempt ${attempts}):`, collectorError);
          console.error('Error details:', {
            message: collectorError.message,
            details: collectorError.details,
            hint: collectorError.hint,
            code: collectorError.code
          });
          
          // If it's the last attempt, return the error
          if (attempts === maxAttempts) {
            return { success: false, error: `Failed to create collector profile: ${collectorError.message || 'Unknown error'}` };
          }
          
          // Continue to next attempt
          continue;
        }

        console.log('✅ Collector profile created successfully!');
        collectorCreated = true;
      }

      if (!collectorCreated) {
        return { success: false, error: 'Failed to create collector profile after multiple attempts' };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Signup error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      console.log('🔐 Starting Google sign-in...');
      
      // Check if we're in a native environment (web builds won't have Capacitor)
      // Check for Capacitor at runtime via window object (no import needed)
      let isNative = false;
      if (typeof window !== 'undefined') {
        // Capacitor exposes itself on window.Capacitor in native apps
        const Capacitor = (window as any).Capacitor;
        if (Capacitor && typeof Capacitor.isNativePlatform === 'function') {
          isNative = Capacitor.isNativePlatform();
        }
      }
      
      const redirectTo = isNative
        ? 'com.wozamali.app://auth/callback'
        : `${window.location.origin}/login`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          flowType: 'pkce',
          redirectTo,
          skipBrowserRedirect: isNative,
        },
      });

      if (isNative && data?.url) {
        try {
          // Access Capacitor Browser plugin via window object (no import needed)
          const Browser = (window as any).Capacitor?.Plugins?.Browser;
          if (Browser && typeof Browser.open === 'function') {
            await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
            return { success: true };
          }
        } catch (e) {
          // Fallback to web redirect if Capacitor browser fails
          console.log('⚠️ Capacitor browser not available, using web redirect');
        }
        // Fallback to web redirect
        window.location.href = data.url;
        return { success: true };
      }

      if (error) {
        console.error('❌ Google sign-in error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Google OAuth initiated, redirecting...');
      // The OAuth flow will redirect, so we don't need to handle success here
      return { success: true };
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      return { success: false, error: 'An unexpected error occurred during Google sign-in.' };
    } finally {
      setIsLoading(false);
    }
  };

  const createCollectorProfile = async (firstName: string, lastName: string, phone?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { success: false, error: 'No authenticated user found' };
      }

      console.log('🔧 Creating collector profile for authenticated user:', session.user.id);

      // Lookup collector role id dynamically
      const { data: collectorRole, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'collector')
        .single();

      if (roleError || !collectorRole) {
        console.error('❌ Collector role lookup error:', roleError);
        return { success: false, error: 'Failed to find collector role' };
      }

      const { error: collectorError } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email || '',
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          phone: phone || '',
          role_id: collectorRole.id,
          status: 'active'
        });

      if (collectorError) {
        console.error('❌ Collector profile creation error:', collectorError);
        return { success: false, error: `Failed to create collector profile: ${collectorError.message || 'Unknown error'}` };
      }

      console.log('✅ Collector profile created successfully!');
      await checkUser(); // Refresh user data
      return { success: true };
    } catch (error) {
      console.error('❌ Create collector profile error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile: user, login, signUp, signInWithGoogle, createCollectorProfile, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
