import { supabase } from './supabase';
import { Profile } from './supabase';
import { User, UserRole } from './auth-schema';

export interface CreateUserData {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserData {
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  phone?: string;
  isActive?: boolean;
}

export class UserService {
  // Create a new user with Supabase Auth and profile
  static async createUser(userData: CreateUserData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user' };
      }

      // Create profile in users table (unified schema)
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
          role: userData.role,
          phone: userData.phone || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        // If profile creation fails, delete the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: `Failed to create profile: ${profileError.message}` };
      }

      const user: User = {
        id: profile.id,
        username: profile.name || profile.email,
        email: profile.email,
        role: profile.role as UserRole,
        firstName: profile.name?.split(' ')[0] || '',
        lastName: profile.name?.split(' ').slice(1).join(' ') || '',
        isActive: true, // Default to true in unified schema
        lastLogin: undefined, // Not tracked in unified schema
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      };

      return { success: true, user };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Get user by ID
  static async getUserById(id: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!profile) {
        return { success: false, error: 'User not found' };
      }

      const user: User = {
        id: profile.id,
        username: profile.name || profile.email,
        email: profile.email,
        role: profile.role as UserRole,
        firstName: profile.name?.split(' ')[0] || '',
        lastName: profile.name?.split(' ').slice(1).join(' ') || '',
        isActive: true, // Default to true in unified schema
        lastLogin: undefined, // Not tracked in unified schema
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      };

      return { success: true, user };
    } catch (error) {
      console.error('Error getting user:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!profile) {
        return { success: false, error: 'User not found' };
      }

      const user: User = {
        id: profile.id,
        username: profile.name || profile.email,
        email: profile.email,
        role: profile.role as UserRole,
        firstName: profile.name?.split(' ')[0] || '',
        lastName: profile.name?.split(' ').slice(1).join(' ') || '',
        isActive: true, // Default to true in unified schema
        lastLogin: undefined, // Not tracked in unified schema
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      };

      return { success: true, user };
    } catch (error) {
      console.error('Error getting user by email:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Update user profile
  static async updateUser(id: string, updateData: UpdateUserData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const updateFields: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateData.username !== undefined) updateFields.name = updateData.username;
      if (updateData.firstName !== undefined || updateData.lastName !== undefined) {
        const firstName = updateData.firstName || '';
        const lastName = updateData.lastName || '';
        updateFields.name = `${firstName} ${lastName}`.trim();
      }
      if (updateData.role !== undefined) updateFields.role = updateData.role;
      if (updateData.phone !== undefined) updateFields.phone = updateData.phone;

      const { data: profile, error } = await supabase
        .from('users')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const user: User = {
        id: profile.id,
        username: profile.name || profile.email,
        email: profile.email,
        role: profile.role as UserRole,
        firstName: profile.name?.split(' ')[0] || '',
        lastName: profile.name?.split(' ').slice(1).join(' ') || '',
        isActive: true, // Default to true in unified schema
        lastLogin: undefined, // Not tracked in unified schema
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      };

      return { success: true, user };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Get all users (for admin)
  static async getAllUsers(): Promise<{ success: boolean; users?: User[]; error?: string }> {
    try {
      console.log('Fetching users from Supabase...');
      
      const { data: profiles, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return { success: false, error: error.message };
      }

      console.log('Profiles fetched:', profiles);

      if (!profiles || profiles.length === 0) {
        console.log('No profiles found, returning empty array');
        return { success: true, users: [] };
      }

      const users: User[] = profiles.map(profile => ({
        id: profile.id,
        username: profile.username || profile.email,
        email: profile.email,
        role: profile.role as UserRole,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        isActive: profile.is_active,
        lastLogin: profile.last_login ? new Date(profile.last_login) : undefined,
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      }));

      console.log('Users mapped:', users);
      return { success: true, users };
    } catch (error) {
      console.error('Error getting all users:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Update last login
  static async updateLastLogin(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating last login:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}
