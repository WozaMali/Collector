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

/** Users table columns only (no areas join - no FK users→areas in schema). */
const USERS_RESIDENT_SELECT = `
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
  postal_code
`;

/** Customer-facing role names (case-insensitive). */
const CUSTOMER_ROLE_NAMES = ['resident', 'member', 'customer', 'user'];

/**
 * Get role IDs for resident/member/customer (case-insensitive) so we can query users by role_id.
 * Returns empty array if RLS or missing roles block the query.
 */
async function getCustomerRoleIds(): Promise<string[]> {
  const ids: string[] = [];
  for (const name of CUSTOMER_ROLE_NAMES) {
    const { data: row, error } = await supabase
      .from('roles')
      .select('id')
      .ilike('name', name)
      .maybeSingle();
    if (!error && row?.id) ids.push(row.id);
  }
  return ids;
}

/** Single resident role ID (for APIs that expect one). Prefer getCustomerRoleIds for lists. */
async function getResidentRoleId(): Promise<string | null> {
  const ids = await getCustomerRoleIds();
  return ids.length > 0 ? ids[0] : null;
}

function mapUserToResident(user: any): Resident {
  const address = user.street_addr && user.city
    ? `${user.street_addr}${user.subdivision ? ', ' + user.subdivision : ''}, ${user.areas?.[0]?.name || 'Unknown Township'}, ${user.city}${user.postal_code ? ' ' + user.postal_code : ''}`.replace(/,\s*,/g, ',').trim()
    : 'No address provided';
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const displayName = fullName || user.email || 'Resident';
  return {
    id: String(user.id),
    name: displayName,
    phone: user.phone,
    email: user.email || undefined,
    area_id: user.township_id || '',
    township: user.areas?.[0]?.name || 'Unknown Township',
    address,
    hasAddress: !!(user.street_addr && user.city),
    created_at: user.created_at || new Date().toISOString()
  };
}

export class ResidentService {
  /**
   * Get all residents: query roles for resident/member/customer IDs (case-insensitive), then users with those role_ids and status = active.
   */
  static async getAllResidents(): Promise<Resident[]> {
    try {
      const roleIds = await getCustomerRoleIds();
      if (roleIds.length === 0) return [];

      const { data, error } = await supabase
        .from('users')
        .select(USERS_RESIDENT_SELECT)
        .in('role_id', roleIds)
        .eq('status', 'active')
        .order('first_name', { ascending: true })
        .limit(1000);

      if (error) return [];
      return (data || []).map(mapUserToResident);
    } catch (error) {
      console.error('Error fetching residents:', error);
      return [];
    }
  }

  static async getResidentsByTownship(townshipId: string): Promise<Resident[]> {
    try {
      const roleIds = await getCustomerRoleIds();
      if (roleIds.length === 0) return [];

      const { data, error } = await supabase
        .from('users')
        .select(USERS_RESIDENT_SELECT)
        .in('role_id', roleIds)
        .eq('status', 'active')
        .eq('township_id', townshipId)
        .order('first_name', { ascending: true });

      if (error) return [];
      return (data || []).map(mapUserToResident);
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
      const roleIds = await getCustomerRoleIds();
      if (roleIds.length === 0) return [];

      const term = (query || '').trim();
      let q = supabase
        .from('users')
        .select(USERS_RESIDENT_SELECT)
        .in('role_id', roleIds)
        .eq('status', 'active')
        .order('first_name', { ascending: true })
        .limit(200);
      if (term) {
        q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
      }
      const { data, error } = await q;
      if (error) return [];
      return (data || []).map(mapUserToResident);
    } catch (error) {
      console.error('Error searching residents:', error);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Resident users as raw user rows (for Dashboard Live Collection card)
  // Same two-step pattern: get resident role ID, then query users by role_id + status = active.
  // ---------------------------------------------------------------------------

  /** Count of active resident/member/customer users (for Dashboard "X users" stat). */
  static async getResidentUsersCount(): Promise<{ count: number; error: string | null }> {
    try {
      const roleIds = await getCustomerRoleIds();
      if (roleIds.length === 0) return { count: 0, error: null };

      const { count, error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .in('role_id', roleIds)
        .eq('status', 'active');

      if (error) return { count: 0, error: error.message };
      return { count: count ?? 0, error: null };
    } catch (error) {
      console.error('Error fetching resident users count:', error);
      return { count: 0, error: 'An unexpected error occurred' };
    }
  }

  /** First N resident/member/customer users as raw rows for Live Collection list. */
  static async getResidentUsersLimited(limit: number = 50): Promise<{ data: any[]; error: string | null }> {
    try {
      const roleIds = await getCustomerRoleIds();
      if (roleIds.length === 0) return { data: [], error: null };

      const { data, error } = await supabase
        .from('users')
        .select(USERS_RESIDENT_SELECT)
        .in('role_id', roleIds)
        .eq('status', 'active')
        .order('first_name', { ascending: true })
        .limit(limit);

      if (error) return { data: [], error: error.message };
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching resident users limited:', error);
      return { data: [], error: 'An unexpected error occurred' };
    }
  }

  /** Search resident/member/customer users by name/email/phone; returns raw user rows for Live Collection. */
  static async searchResidentUsers(term: string, limit: number = 100): Promise<{ data: any[]; error: string | null }> {
    try {
      const roleIds = await getCustomerRoleIds();
      if (roleIds.length === 0) return { data: [], error: null };

      const t = (term || '').trim();
      let q = supabase
        .from('users')
        .select(USERS_RESIDENT_SELECT)
        .in('role_id', roleIds)
        .eq('status', 'active')
        .order('first_name', { ascending: true })
        .limit(limit);
      if (t) {
        q = q.or(`first_name.ilike.%${t}%,last_name.ilike.%${t}%,phone.ilike.%${t}%,email.ilike.%${t}%`);
      }
      const { data, error } = await q;
      if (error) return { data: [], error: error.message };
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error searching resident users:', error);
      return { data: [], error: 'An unexpected error occurred' };
    }
  }
}
