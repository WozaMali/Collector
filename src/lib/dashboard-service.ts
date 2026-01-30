import { supabase } from './supabase';

export interface DashboardStats {
  totalCollections: number;
  totalWeight: number;
  totalValue: number;
  pendingCollections: number;
  todayCollections: number;
  weeklyCollections: number;
  monthlyCollections: number;
}

export interface CollectionSummary {
  id: string;
  customer_name: string;
  weight_kg: number;
  status: string;
  collection_date: string;
  created_at: string;
}

export class DashboardService {
  // Get dashboard statistics for a collector
  static async getCollectorStats(collectorId: string): Promise<{ data: DashboardStats | null; error: any }> {
    try {
      console.log('📊 Fetching dashboard stats for collector:', collectorId);

      // Get total collections from unified_collections
      const { data: totalCollections, error: totalError } = await supabase
        .from('unified_collections')
        .select('id, total_weight_kg, status, created_at')
        .eq('collector_id', collectorId);

      if (totalError) {
        console.error('❌ Error fetching total collections:', totalError);
        return { data: null, error: totalError };
      }

      const collections = totalCollections || [];
      
      // Calculate statistics
      const stats: DashboardStats = {
        totalCollections: collections.length,
        totalWeight: collections.reduce((sum, c) => sum + (c.total_weight_kg || 0), 0),
        totalValue: collections.reduce((sum, c) => sum + (c.total_weight_kg || 0) * 5, 0), // Assuming R5/kg average
        pendingCollections: collections.filter(c => c.status === 'pending').length,
        todayCollections: collections.filter(c => {
          const today = new Date().toISOString().split('T')[0];
          return c.created_at?.split('T')[0] === today;
        }).length,
        weeklyCollections: collections.filter(c => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(c.created_at) >= weekAgo;
        }).length,
        monthlyCollections: collections.filter(c => {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return new Date(c.created_at) >= monthAgo;
        }).length
      };

      console.log('✅ Dashboard stats calculated:', stats);
      return { data: stats, error: null };

    } catch (error) {
      console.error('❌ Error in getCollectorStats:', error);
      return { data: null, error };
    }
  }

  // Get recent collections for a collector
  static async getRecentCollections(collectorId: string, limit: number = 10): Promise<{ data: CollectionSummary[] | null; error: any }> {
    try {
      console.log('📋 Fetching recent collections for collector:', collectorId);

      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          weight_kg,
          status,
          collection_date,
          created_at,
          notes,
          users!collections_user_id_fkey(
            full_name,
            email
          )
        `)
        .eq('collector_id', collectorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching recent collections:', error);
        return { data: null, error };
      }

      const collections: CollectionSummary[] = (data || []).map(collection => ({
        id: collection.id,
        customer_name: collection.users?.full_name || collection.users?.email || 'Unknown Customer',
        weight_kg: collection.weight_kg || 0,
        status: collection.status,
        collection_date: collection.collection_date,
        created_at: collection.created_at
      }));

      console.log('✅ Recent collections fetched:', collections.length);
      return { data: collections, error: null };

    } catch (error) {
      console.error('❌ Error in getRecentCollections:', error);
      return { data: null, error };
    }
  }

  // Update dashboard cache (if using caching)
  static async refreshDashboardCache(collectorId: string): Promise<{ success: boolean; error: any }> {
    try {
      console.log('🔄 Refreshing dashboard cache for collector:', collectorId);
      
      // Force refresh by fetching latest data
      const [statsResult, collectionsResult] = await Promise.all([
        this.getCollectorStats(collectorId),
        this.getRecentCollections(collectorId, 5)
      ]);

      if (statsResult.error || collectionsResult.error) {
        console.error('❌ Error refreshing dashboard cache:', statsResult.error || collectionsResult.error);
        return { success: false, error: statsResult.error || collectionsResult.error };
      }

      console.log('✅ Dashboard cache refreshed successfully');
      return { success: true, error: null };

    } catch (error) {
      console.error('❌ Error in refreshDashboardCache:', error);
      return { success: false, error };
    }
  }

  // Get collection analytics for a collector
  static async getCollectionAnalytics(collectorId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<{ data: any[] | null; error: any }> {
    try {
      console.log('📈 Fetching collection analytics for collector:', collectorId, 'period:', period);

      let dateFilter = '';
      const now = new Date();
      
      switch (period) {
        case 'day':
          const today = now.toISOString().split('T')[0];
          dateFilter = `collection_date.eq.${today}`;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          dateFilter = `collection_date.gte.${weekAgo}`;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
          dateFilter = `collection_date.gte.${monthAgo}`;
          break;
      }

      const { data, error } = await supabase
        .from('collections')
        .select('collection_date, weight_kg, status')
        .eq('collector_id', collectorId)
        .gte('collection_date', dateFilter.split('.')[2] || '')
        .order('collection_date', { ascending: true });

      if (error) {
        console.error('❌ Error fetching collection analytics:', error);
        return { data: null, error };
      }

      // Group by date
      const analytics = (data || []).reduce((acc: any, collection) => {
        const date = collection.collection_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            total_weight: 0,
            total_collections: 0,
            pending_collections: 0
          };
        }
        acc[date].total_weight += collection.weight_kg || 0;
        acc[date].total_collections += 1;
        if (collection.status === 'pending') {
          acc[date].pending_collections += 1;
        }
        return acc;
      }, {});

      const analyticsArray = Object.values(analytics);
      console.log('✅ Collection analytics fetched:', analyticsArray.length, 'data points');
      return { data: analyticsArray, error: null };

    } catch (error) {
      console.error('❌ Error in getCollectionAnalytics:', error);
      return { data: null, error };
    }
  }
}
