import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  street_addr?: string;
  township_id?: string;
  subdivision?: string;
  suburb?: string;
  city?: string;
  postal_code?: string;
  area_id?: string;
  // Joined role (to align with Office app query: role:roles(*))
  role?: any;
}

export class UsersService {
  /**
   * Get registered users using auth-backed view (registered_users_with_roles)
   */
  static async getRegisteredUsers(): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('registered_users_with_roles')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) {
        console.error('Error fetching registered users:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Exception fetching registered users:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }
  /**
   * Get all users from the database
   */
  static async getAllUsers(): Promise<{ data: User[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          role:roles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Exception fetching users:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get active users only (aligns with Office app logic: status === 'active')
   */
  static async getActiveUsers(): Promise<{ data: User[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          role_id,
          status,
          created_at,
          updated_at,
          street_addr,
          township_id,
          subdivision,
          suburb,
          city,
          postal_code,
          area_id
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active users:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Exception fetching active users:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get active customers (customer-facing roles only), status = active
   */
  static async getActiveCustomers(): Promise<{ data: User[] | null; error: string | null }> {
    try {
      const allowedRoleNames = ['resident', 'customer', 'member', 'user'];

      // Primary approach: filter via related roles.name to avoid UUID casting issues
      let { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          role_id,
          status,
          created_at,
          updated_at,
          street_addr,
          township_id,
          subdivision,
          suburb,
          city,
          postal_code,
          area_id,
          roles!role_id(name)
        `)
        .eq('status', 'active')
        .in('roles.name', allowedRoleNames)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Primary active customers query failed, attempting fallback via roles table:', error);
        // Fallback: resolve role IDs by name, then filter users by role_id IN ids
        const { data: roleRows, error: roleErr } = await supabase
          .from('roles')
          .select('id, name')
          .in('name', allowedRoleNames);

        if (!roleErr && roleRows && roleRows.length > 0) {
          const allowedRoleIds = roleRows.map(r => r.id);
          const { data: usersByIds, error: usersErr } = await supabase
            .from('users')
            .select(`
              id,
              email,
              full_name,
              first_name,
              last_name,
              phone,
              role_id,
              status,
              created_at,
              updated_at,
              street_addr,
              township_id,
              subdivision,
              suburb,
              city,
              postal_code,
              area_id
            `)
            .eq('status', 'active')
            .in('role_id', allowedRoleIds)
            .order('created_at', { ascending: false });

          if (usersErr) {
            console.error('Fallback users by role IDs failed:', usersErr);
            return { data: null, error: usersErr.message };
          }

          return { data: usersByIds || [], error: null };
        }

        // Final fallback: return active users without role filtering
        const { data: activeOnly, error: activeErr } = await this.getActiveUsers();
        if (activeErr) {
          return { data: null, error: activeErr };
        }
        return { data: activeOnly || [], error: null };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Exception fetching active customers:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(roleId: string): Promise<{ data: User[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          role_id,
          status,
          created_at,
          updated_at
        `)
        .eq('role_id', roleId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users by role:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Exception fetching users by role:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<{ data: User | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          role_id,
          status,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching user by ID:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception fetching user by ID:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Search users by name, email, or phone
   */
  static async searchUsers(searchTerm: string): Promise<{ data: User[] | null; error: string | null }> {
    try {
      const term = (searchTerm || '').trim();
      const tokens = term.split(/\s+/).filter(Boolean);

      const baseSelect = supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          role_id,
          status,
          created_at,
          updated_at
        `);

      const orParts: string[] = [];
      if (term.length > 0) {
        // Single-field matches
        orParts.push(
          `full_name.ilike.%${term}%`,
          `first_name.ilike.%${term}%`,
          `last_name.ilike.%${term}%`,
          `email.ilike.%${term}%`,
          `phone.ilike.%${term}%`
        );
      }

      // If multi-word, try matching tokens across first_name/last_name (both orders)
      if (tokens.length >= 2) {
        const t1 = tokens[0];
        const t2 = tokens[1];
        orParts.push(
          `and(first_name.ilike.%${t1}%,last_name.ilike.%${t2}%)`,
          `and(first_name.ilike.%${t2}%,last_name.ilike.%${t1}%)`
        );
      }

      const query = orParts.length > 0 ? baseSelect.or(orParts.join(',')) : baseSelect;

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching users:', error);
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Exception searching users:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get users statistics
   */
  static async getUsersStats(): Promise<{ 
    data: { 
      total: number; 
      byRole: { [key: string]: number }; 
      byStatus: { [key: string]: number } 
    } | null; 
    error: string | null 
  }> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('role_id, status');

      if (error) {
        console.error('Error fetching users stats:', error);
        return { data: null, error: error.message };
      }

      const stats = {
        total: users?.length || 0,
        byRole: {} as { [key: string]: number },
        byStatus: {} as { [key: string]: number }
      };

      users?.forEach(user => {
        // Count by role
        stats.byRole[user.role_id] = (stats.byRole[user.role_id] || 0) + 1;
        
        // Count by status
        stats.byStatus[user.status] = (stats.byStatus[user.status] || 0) + 1;
      });

      return { data: stats, error: null };
    } catch (error) {
      console.error('Exception fetching users stats:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }
}


