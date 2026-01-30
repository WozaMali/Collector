// Woza Mali Collector App Supabase Queries
// CRUD operations for the unified schema - Collector App specific

import { supabase } from '@/lib/supabase';
import type {
  User,
  Collection,
  Transaction,
  UserWithArea,
  CollectionWithDetails,
  TransactionWithDetails,
  CollectionUpdate,
  UserUpdate,
  CollectorCollectionFilters,
  CollectorUserFilters,
  PaginationOptions,
  SortOptions,
  CollectionStatus,
  CollectorStats,
  CollectionAssignment,
  Material,
  PickupItem,
  PickupItemWithMaterial,
  PickupPhoto
} from '../types/database.types';

// ============================================================================
// USER OPERATIONS (Collector App)
// ============================================================================

export const userQueries = {
  // Get current collector profile
  async getCurrentCollector(): Promise<UserWithArea | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        area:areas(*)
      `)
      .eq('id', user.id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update current collector profile
  async updateCurrentCollector(updates: UserUpdate): Promise<User> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get users in collector's area with addresses
  async getUsersInMyArea(filters?: CollectorUserFilters, pagination?: PaginationOptions): Promise<UserWithArea[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // First get collector's area
    const collector = await this.getCurrentCollector();
    if (!collector?.area_id) throw new Error('Collector not assigned to an area');

    let query = supabase
      .from('users')
      .select(`
        *,
        area:areas(*),
        addresses:user_addresses(*)
      `)
      .eq('area_id', collector.area_id);

    // Apply filters
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }

    // Apply pagination
    if (pagination?.limit) {
      const offset = pagination.offset || (pagination.page || 0) * pagination.limit;
      query = query.range(offset, offset + pagination.limit - 1);
    }

    query = query.order('name');

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
};

// ============================================================================
// MATERIAL OPERATIONS (Collector App)
// ============================================================================

export const materialQueries = {
  // Get all active materials for collector
  async getAllActive(): Promise<Material[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active materials:', error);
      return [];
    }
  },

  // Get materials by category
  async getByCategory(category: string): Promise<Material[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching materials by category:', error);
      return [];
    }
  },

  // Get material by ID
  async getById(id: string): Promise<Material | null> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching material by ID:', error);
      return null;
    }
  },

  // Get unique categories
  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('category')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      
      // Extract unique categories
      const categories = [...new Set(data?.map(item => item.category) || [])];
      return categories;
    } catch (error) {
      console.error('Error fetching material categories:', error);
      return [];
    }
  }
};

// ============================================================================
// PICKUP ITEM OPERATIONS (Collector App)
// ============================================================================

export const pickupItemQueries = {
  // Add pickup items to a collection
  async addItems(collectionId: string, items: Omit<PickupItem, 'id' | 'pickup_id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
    try {
      const itemsWithCollectionId = items.map(item => ({
        ...item,
        pickup_id: collectionId
      }));

      const { error } = await supabase
        .from('pickup_items')
        .insert(itemsWithCollectionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding pickup items:', error);
      return false;
    }
  },

  // Get pickup items for a collection
  async getByCollectionId(collectionId: string): Promise<PickupItemWithMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('pickup_items')
        .select(`
          *,
          material:materials(*)
        `)
        .eq('pickup_id', collectionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pickup items:', error);
      return [];
    }
  },

  // Update pickup item
  async updateItem(itemId: string, updates: Partial<PickupItem>): Promise<PickupItem | null> {
    try {
      const { data, error } = await supabase
        .from('pickup_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating pickup item:', error);
      return null;
    }
  },

  // Delete pickup item
  async deleteItem(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickup_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting pickup item:', error);
      return false;
    }
  }
};

// ============================================================================
// PICKUP PHOTO OPERATIONS (Collector App)
// ============================================================================

export const pickupPhotoQueries = {
  // Add photos to a collection
  async addPhotos(collectionId: string, photos: Omit<PickupPhoto, 'id' | 'pickup_id' | 'created_at'>[]): Promise<boolean> {
    try {
      const photosWithCollectionId = photos.map(photo => ({
        ...photo,
        pickup_id: collectionId,
        taken_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('pickup_photos')
        .insert(photosWithCollectionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding pickup photos:', error);
      return false;
    }
  },

  // Get photos for a collection
  async getByCollectionId(collectionId: string): Promise<PickupPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('pickup_photos')
        .select('*')
        .eq('pickup_id', collectionId)
        .order('taken_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pickup photos:', error);
      return [];
    }
  },

  // Delete photo
  async deletePhoto(photoId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickup_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting pickup photo:', error);
      return false;
    }
  }
};

// ============================================================================
// COLLECTION OPERATIONS (Collector App)
// ============================================================================

export const collectionQueries = {
  // Get collections in collector's area with addresses
  async getCollectionsInMyArea(filters?: CollectorCollectionFilters, pagination?: PaginationOptions, sort?: SortOptions): Promise<CollectionWithDetails[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // First get collector's area
    const collector = await userQueries.getCurrentCollector();
    if (!collector?.area_id) throw new Error('Collector not assigned to an area');

    let query = supabase
      .from('collections')
      .select(`
        *,
        user:users!collections_user_id_fkey(*),
        collector:users!collections_collector_id_fkey(*),
        pickup_address:user_addresses!collections_pickup_address_id_fkey(*),
        transactions(*),
        pickup_items(*),
        pickup_photos(*)
      `)
      .eq('user.area_id', collector.area_id);

    // Apply filters
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.material_type) {
      query = query.eq('material_type', filters.material_type);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    // Apply pagination
    if (pagination?.limit) {
      const offset = pagination.offset || (pagination.page || 0) * pagination.limit;
      query = query.range(offset, offset + pagination.limit - 1);
    }

    // Apply sorting
    const sortColumn = sort?.column || 'created_at';
    const ascending = sort?.ascending !== false;
    query = query.order(sortColumn, { ascending });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get collector's assigned collections with addresses
  async getMyAssignedCollections(filters?: CollectorCollectionFilters, pagination?: PaginationOptions): Promise<CollectionWithDetails[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    let query = supabase
      .from('collections')
      .select(`
        *,
        user:users!collections_user_id_fkey(*),
        collector:users!collections_collector_id_fkey(*),
        pickup_address:user_addresses!collections_pickup_address_id_fkey(*),
        transactions(*),
        pickup_items(*),
        pickup_photos(*)
      `)
      .eq('collector_id', user.id);

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.material_type) {
      query = query.eq('material_type', filters.material_type);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    // Apply pagination
    if (pagination?.limit) {
      const offset = pagination.offset || (pagination.page || 0) * pagination.limit;
      query = query.range(offset, offset + pagination.limit - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get collection by ID (if in collector's area)
  async getCollectionById(id: string): Promise<CollectionWithDetails | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // First get collector's area
    const collector = await userQueries.getCurrentCollector();
    if (!collector?.area_id) throw new Error('Collector not assigned to an area');

    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        user:users!collections_user_id_fkey(*),
        collector:users!collections_collector_id_fkey(*),
        transactions(*),
        pickup_items(*),
        pickup_photos(*)
      `)
      .eq('id', id)
      .eq('user.area_id', collector.area_id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Assign collection to collector
  async assignCollectionToMe(collectionId: string): Promise<Collection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('collections')
      .update({ collector_id: user.id })
      .eq('id', collectionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update collection (collector can update assigned collections)
  async updateCollection(id: string, updates: CollectionUpdate): Promise<Collection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Verify collector is assigned to this collection
    const collection = await this.getCollectionById(id);
    if (!collection || collection.collector_id !== user.id) {
      throw new Error('Not authorized to update this collection');
    }

    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// ANALYTICS AND STATS (Collector App)
// ============================================================================

export const analyticsQueries = {
  // Get collector's statistics
  async getMyStats(): Promise<CollectorStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const collector = await userQueries.getCurrentCollector();
    if (!collector?.area_id) throw new Error('Collector not assigned to an area');

    // Get collection statistics
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('status, weight_kg')
      .eq('collector_id', user.id);

    if (collectionsError) throw collectionsError;

    const stats: CollectorStats = {
      total_collections: collections?.length || 0,
      pending_collections: collections?.filter(c => c.status === 'pending').length || 0,
      completed_collections: collections?.filter(c => c.status === 'approved').length || 0,
      total_weight_collected: collections?.reduce((sum, c) => sum + (c.weight_kg || 0), 0) || 0,
      area_name: collector.area?.name || 'Unknown'
    };

    return stats;
  },

  // Get collections summary for collector's area
  async getAreaCollectionsSummary(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const collector = await userQueries.getCurrentCollector();
    if (!collector?.area_id) throw new Error('Collector not assigned to an area');

    const { data, error } = await supabase
      .from('user_collections_summary')
      .select('*')
      .eq('area_name', collector.area?.name);
    
    if (error) throw error;
    return data || [];
  }
};

// ============================================================================
// UTILITY FUNCTIONS (Collector App)
// ============================================================================

export const utilityQueries = {
  // Get pending collections in area (for assignment)
  async getPendingCollectionsInArea(): Promise<CollectionAssignment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const collector = await userQueries.getCurrentCollector();
    if (!collector?.area_id) throw new Error('Collector not assigned to an area');

    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        user:users!collections_user_id_fkey(*),
        collector:users!collections_collector_id_fkey(*),
        transactions(*),
        pickup_items(*),
        pickup_photos(*)
      `)
      .eq('user.area_id', collector.area_id)
      .eq('status', 'pending')
      .is('collector_id', null)
      .order('created_at', { ascending: true });
    
    if (error) throw error;

    return (data || []).map(collection => ({
      collection,
      user: collection.user,
      priority: 'medium' as const
    }));
  },

  // Get collector's recent activity
  async getMyRecentActivity(limit: number = 10): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('collections')
      .select(`
        id, created_at, updated_at, material_type, weight_kg, status,
        user:users!collections_user_id_fkey(name, phone)
      `)
      .eq('collector_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  // Search users in area
  async searchUsersInArea(searchTerm: string): Promise<UserWithArea[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const collector = await userQueries.getCurrentCollector();
    if (!collector?.area_id) throw new Error('Collector not assigned to an area');

    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        area:areas(*)
      `)
      .eq('area_id', collector.area_id)
      .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(20);
    
    if (error) throw error;
    return data || [];
  }
};

// Export all queries for Collector App
export const collectorAppQueries = {
  users: userQueries,
  collections: collectionQueries,
  analytics: analyticsQueries,
  utility: utilityQueries
};
