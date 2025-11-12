import { supabase } from './supabase';

export interface Resident {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  area_id: string;
  township: string;
  address?: string;
  hasAddress: boolean;
  created_at: string;
}

export interface ResidentWithAddress extends Resident {
  address: string;
  hasAddress: true;
}

export interface ResidentWithoutAddress extends Resident {
  address: undefined;
  hasAddress: false;
}

export class ResidentService {
  static async getAllResidents(): Promise<Resident[]> {
    try {
      // Skip residents_view as it may not exist - go directly to users table fallback
      // 1) Preferred: users table (resident/member/customer roles)

      // 2) Fallback: users table (resident/member/customer roles)
      try {
        const { data: rolesData } = await supabase
          .from('roles')
          .select('id, name')
          .in('name', ['resident', 'member', 'customer']);

        const roleIds = (rolesData || []).map(r => r.id);
        
        // Use role_id IN filter instead of or() with non-existent columns
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, created_at')
          .in('role_id', roleIds.length > 0 ? roleIds : [])
          .eq('status', 'active')
          .order('first_name', { ascending: true })
          .limit(1000);

        if (!error && Array.isArray(data)) {
          return data.map((u: any) => ({
            id: String(u.id),
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Resident',
            phone: undefined,
            email: u.email || undefined,
            area_id: '',
            township: '',
            address: undefined,
            hasAddress: false,
            created_at: u.created_at || new Date().toISOString()
          }));
        }
      } catch (e) {
        // continue to final fallback
      }

      // 3) Final fallback: return empty list
      return [];
    } catch (error) {
      console.error('Error fetching residents:', error);
      return [];
    }
  }

  static async getResidentsByTownship(townshipId: string): Promise<Resident[]> {
    try {
      // Get both resident and member role IDs (support unified naming)
      const { data: rolesData } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', ['resident', 'member', 'customer']);

      const roleIds = (rolesData || []).map(r => r.id);
      
      // Use role_id IN filter instead of or() with non-existent columns
      let query = supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          township_id,
          created_at,
          street_addr,
          subdivision,
          city,
          postal_code,
          areas!township_id(name)
        `)
        .eq('township_id', townshipId)
        .eq('status', 'active');
      
      // Only add role filter if we have role IDs
      if (roleIds.length > 0) {
        query = query.in('role_id', roleIds);
      }

      const { data, error } = await query.order('first_name');

      if (error) throw error;

      console.log('🔍 ResidentService: Raw user data:', data?.slice(0, 2)); // Log first 2 users for debugging

      return data?.map(user => {
        // Use direct address fields from users table (same as Main App Dashboard)
        const address = user.street_addr && user.city ? 
          `${user.street_addr}${user.subdivision ? ', ' + user.subdivision : ''}, ${user.areas?.[0]?.name || 'Unknown Township'}, ${user.city}${user.postal_code ? ' ' + user.postal_code : ''}`.replace(/,\s*,/g, ',').trim() : 
          'No address provided';

        // Handle cases where first_name or last_name might be null/empty
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        // If no name available, use email as fallback
        const displayName = fullName || user.email || 'Unknown Resident';

        return {
          id: user.id,
          name: displayName,
          phone: user.phone,
          email: user.email,
          area_id: user.township_id,
          township: user.areas?.[0]?.name || 'Unknown Township',
          address,
          hasAddress: !!(user.street_addr && user.city),
          created_at: user.created_at
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching residents by township:', error);
      return [];
    }
  }

  static async getResidentsWithAddresses(): Promise<ResidentWithAddress[]> {
    const residents = await this.getAllResidents();
    return residents.filter((resident): resident is ResidentWithAddress => resident.hasAddress);
  }

  static async getResidentsWithoutAddresses(): Promise<ResidentWithoutAddress[]> {
    const residents = await this.getAllResidents();
    return residents.filter((resident): resident is ResidentWithoutAddress => !resident.hasAddress);
  }

  static async searchResidents(query: string): Promise<Resident[]> {
    try {
      // Get both resident and member role IDs (support unified naming)
      const { data: rolesData } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', ['resident', 'member', 'customer']);

      const roleIds = (rolesData || []).map(r => r.id);
      const orParts = [
        'role.eq.resident',
        'role.eq.member',
        'role.eq.customer',
        'role_name.eq.resident',
        'role_name.eq.member',
        'role_name.eq.customer',
        ...roleIds.map((id: string) => `role_id.eq.${id}`)
      ];

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          township_id,
          created_at,
          street_addr,
          subdivision,
          city,
          postal_code,
          areas!township_id(name)
        `)
        .or(orParts.join(','))
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .order('first_name');

      if (error) throw error;

      console.log('🔍 ResidentService: Raw user data:', data?.slice(0, 2)); // Log first 2 users for debugging

      return data?.map(user => {
        // Use direct address fields from users table (same as Main App Dashboard)
        const address = user.street_addr && user.city ? 
          `${user.street_addr}${user.subdivision ? ', ' + user.subdivision : ''}, ${user.areas?.[0]?.name || 'Unknown Township'}, ${user.city}${user.postal_code ? ' ' + user.postal_code : ''}`.replace(/,\s*,/g, ',').trim() : 
          'No address provided';

        // Handle cases where first_name or last_name might be null/empty
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        // If no name available, use email as fallback
        const displayName = fullName || user.email || 'Unknown Resident';

        return {
          id: user.id,
          name: displayName,
          phone: user.phone,
          email: user.email,
          area_id: user.township_id,
          township: user.areas?.[0]?.name || 'Unknown Township',
          address,
          hasAddress: !!(user.street_addr && user.city),
          created_at: user.created_at
        };
      }) || [];
    } catch (error) {
      console.error('Error searching residents:', error);
      return [];
    }
  }
}
