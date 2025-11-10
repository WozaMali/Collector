import { supabase } from './supabase';
import type { Profile } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
}

export class AuthService {
  static async signIn(email: string, password: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return null;
      }

      if (data.user) {
        // Get profile data
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          return null;
        }

        return {
          id: profile.id,
          email: profile.email,
          name: profile.full_name || 'Unknown',
          role: profile.role,
          phone: profile.phone,
        };
      }

      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  static async signUp(email: string, password: string, firstName: string, lastName: string, phone?: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        return null;
      }

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            first_name: firstName,
            last_name: lastName,
            phone,
            role: 'COLLECTOR',
            is_active: true,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return null;
        }

        return {
          id: data.user.id,
          email: data.user.email!,
          name: `${firstName} ${lastName}`.trim(),
          role: 'COLLECTOR',
          phone,
        };
      }

      return null;
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  }

  static async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        name: profile.full_name || 'Unknown',
        role: profile.role,
        phone: profile.phone,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  static async resetPassword(email: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return !error;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }
}
