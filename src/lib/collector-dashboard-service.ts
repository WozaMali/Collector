import { supabase } from './supabase';

export interface CollectorStats {
  todayPickups: number;
  totalCustomers: number;
  monthlySalary: number;
  collectionRate: number;
  totalWeight: number;
}

export interface RecentPickup {
  id: string;
  pickup_code: string;
  customer_name: string;
  customer_address: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  total_value?: number;
}

export interface Township {
  id: string;
  name: string;
  city: string;
}

export interface CustomerByTownship {
  id: string;
  name: string;
  phone?: string;
  address: string;
  township: string;
}

export class CollectorDashboardService {
  static async getCollectorStats(collectorId: string): Promise<CollectorStats> {
    try {
      console.log('📊 Fetching collector stats from unified_collections...');
      
      // Get today's collections - use created_at if collection_date doesn't exist
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCollections, error: todayError } = await supabase
        .from('unified_collections')
        .select('id, total_weight_kg, status, created_at')
        .eq('collector_id', collectorId)
        .gte('created_at', today);

      if (todayError) {
        console.error('Error fetching today collections:', todayError);
      }

      // Get total collections and weight
      const { data: allCollections, error: allError } = await supabase
        .from('unified_collections')
        .select('id, total_weight_kg, status')
        .eq('collector_id', collectorId);

      if (allError) {
        console.error('Error fetching all collections:', allError);
      }

      // Get total customers (members) - simplified approach
      const { data: customers, error: customersError } = await supabase
        .from('users')
        .select('id')
        .eq('role_id', 'member');

      if (customersError) {
        console.error('Error fetching customers:', customersError);
      }

      const todayPickups = todayCollections?.length || 0;
      const totalWeight = allCollections?.reduce((sum, c) => sum + (c.total_weight_kg || 0), 0) || 0;
      const approvedCollections = allCollections?.filter(c => ['approved','completed'].includes(c.status)).length || 0;
      const totalCollections = allCollections?.length || 0;
      const collectionRate = totalCollections > 0 ? (approvedCollections / totalCollections) * 100 : 0;

      // Fallback: if we can't get customers count, use a reasonable default
      let totalCustomers = customers?.length || 0;
      if (totalCustomers === 0 && !customersError) {
        // Try to get total users as fallback
        try {
          const { data: allUsers } = await supabase
            .from('users')
            .select('id')
            .limit(1000); // Reasonable limit
          totalCustomers = allUsers?.length || 0;
          console.log(`📊 Using fallback customer count: ${totalCustomers}`);
        } catch (fallbackError) {
          console.log('📊 Using default customer count: 0');
          totalCustomers = 0;
        }
      }

      return {
        todayPickups,
        totalCustomers,
        monthlySalary: 0, // This would need to be calculated based on collections
        collectionRate,
        totalWeight
      };
    } catch (error) {
      console.error('Error fetching collector stats:', error);
      return {
        todayPickups: 0,
        totalCustomers: 0,
        monthlySalary: 0,
        collectionRate: 0,
        totalWeight: 0
      };
    }
  }

  // Helper method to get role ID - simplified approach
  static async getRoleId(roleName: string): Promise<string> {
    // For now, just return the role name directly since roles table seems to have issues
    console.log(`🔍 Using simplified role lookup for: ${roleName}`);
    return roleName;
  }

  static async getRecentPickups(collectorId: string, limit: number = 5): Promise<RecentPickup[]> {
    try {
      console.log('📋 Fetching recent pickups from unified_collections...');
      
      // First try to get collections with user data
      const { data, error } = await supabase
        .from('unified_collections')
        .select(`
          id,
          status,
          total_weight_kg,
          created_at,
          customer_id,
          customer_name,
          customer_email
        `)
        .eq('collector_id', collectorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent pickups:', error);
        
        // Fallback: try without the foreign key relationship
        console.log('🔄 Trying fallback query without foreign key...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('unified_collections')
          .select('id, status, total_weight_kg, created_at, customer_id, customer_name, customer_email')
          .eq('collector_id', collectorId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }

        // Get user data separately for fallback
        const userIds = fallbackData?.map(c => c.customer_id).filter(Boolean) || [];
        let userData: any[] = [];
        
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, full_name, phone, email')
            .in('id', userIds);
          userData = users || [];
        }

        return fallbackData?.map(collection => {
          const user = userData.find(u => u.id === collection.customer_id);
          return {
            id: collection.id,
            pickup_code: `COL-${collection.id.slice(-6)}`,
            customer_name: collection.customer_name || user?.full_name || 'Unknown Customer',
            customer_address: user?.phone ? `Phone: ${user.phone}` : 'Contact info not available',
            scheduled_date: collection.created_at?.split('T')[0] || '',
            status: (collection.status || 'completed') as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show',
            total_value: (collection.total_weight_kg || 0) * 1.5
          };
        }) || [];
      }

      return data?.map(collection => ({
        id: collection.id,
        pickup_code: `COL-${collection.id.slice(-6)}`,
        customer_name: collection.customer_name || 'Unknown Customer',
        customer_address: collection.customer_email ? `Email: ${collection.customer_email}` : 'Contact info not available',
        scheduled_date: collection.created_at?.split('T')[0] || '',
        status: (collection.status || 'completed') as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show',
        total_value: (collection.total_weight_kg || 0) * 1.5
      })) || [];
    } catch (error) {
      console.error('Error fetching recent pickups:', error);
      return [];
    }
  }

  static async getTownships(): Promise<Township[]> {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data?.map(area => ({
        id: area.id,
        name: area.name,
        city: 'Johannesburg' // Default city
      })) || [];
    } catch (error) {
      console.error('Error fetching townships:', error);
      return [];
    }
  }

  static async getCustomersByTownship(townshipId: string): Promise<CustomerByTownship[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          phone,
          area_id,
          areas!inner(name),
          user_addresses!left(
            id,
            address_line1,
            address_line2,
            city,
            province,
            postal_code,
            is_default
          )
        `)
        .eq('area_id', townshipId)
        .eq('role', 'member')
        .order('name');

      if (error) throw error;

      return data?.map(user => {
        const defaultAddress = user.user_addresses?.find(addr => addr.is_default) || user.user_addresses?.[0];
        const address = defaultAddress 
          ? `${defaultAddress.address_line1}${defaultAddress.address_line2 ? ', ' + defaultAddress.address_line2 : ''}, ${defaultAddress.city}, ${defaultAddress.province}${defaultAddress.postal_code ? ' ' + defaultAddress.postal_code : ''}`
          : 'No address on file';

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          address: address,
          township: user.areas?.name || 'Unknown Township'
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching customers by township:', error);
      return [];
    }
  }
}
