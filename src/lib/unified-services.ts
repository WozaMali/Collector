// ============================================================================
// UNIFIED SERVICES FOR WOZAMALI COLLECTOR APP
// ============================================================================
// These services work with the new unified database schema
// Provides collection management and real-time updates

import { supabase } from './supabase'
import {
  UserProfile,
  CollectionPickup,
  PickupItem,
  Material,
  UserWallet,
  CollectionZone,
  ZoneAssignment,
  CollectionPickupWithDetails,
  PickupItemWithMaterial,
  MaterialWithCategory
} from './unified-types'

// ============================================================================
// 1. COLLECTOR PROFILE SERVICES
// ============================================================================

export const collectorProfileServices = {
  // Get collector's own profile
  async getCollectorProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'collector')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching collector profile:', error)
      return null
    }
  },

  // Update collector profile
  async updateCollectorProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating collector profile:', error)
      return false
    }
  },

  // Get collector's wallet
  async getCollectorWallet(userId: string): Promise<UserWallet | null> {
    try {
      // Try unified table then fallback to legacy wallets
      let resp = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (resp.error && (resp.error.code === 'PGRST205' || resp.error.message?.includes("Could not find the table 'public.user_wallets'"))) {
        console.warn('⚠️ user_wallets not found, falling back to wallets')
        resp = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      }
      if (resp.error) throw resp.error
      return resp.data as any
    } catch (error) {
      console.error('Error fetching collector wallet:', error)
      return null
    }
  }
}

// ============================================================================
// 2. ZONE & ASSIGNMENT SERVICES
// ============================================================================

export const zoneServices = {
  // Get collector's assigned zones
  async getCollectorZones(collectorId: string): Promise<CollectionZone[]> {
    try {
      const { data, error } = await supabase
        .from('zone_assignments')
        .select(`
          *,
          zone:collection_zones(*)
        `)
        .eq('collector_id', collectorId)
        .eq('status', 'active')

      if (error) throw error
      return data?.map(assignment => assignment.zone).filter(Boolean) || []
    } catch (error) {
      console.error('Error fetching collector zones:', error)
      return []
    }
  },

  // Get zone details
  async getZoneDetails(zoneId: string): Promise<CollectionZone | null> {
    try {
      const { data, error } = await supabase
        .from('collection_zones')
        .select('*')
        .eq('id', zoneId)
        .eq('status', 'active')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching zone details:', error)
      return null
    }
  }
}

// ============================================================================
// 3. COLLECTION PICKUP SERVICES
// ============================================================================

export const collectionPickupServices = {
  // Get collector's pickups
  async getCollectorPickups(collectorId: string): Promise<CollectionPickupWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('collection_pickups')
        .select(`
          *,
          zone:collection_zones(*),
          items:pickup_items(
            *,
            material:materials(*)
          ),
          photos:pickup_photos(*)
        `)
        .eq('collector_id', collectorId)
        .order('scheduled_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collector pickups:', error)
      return []
    }
  },

  // Get pickup by ID
  async getPickupById(pickupId: string): Promise<CollectionPickupWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('collection_pickups')
        .select(`
          *,
          zone:collection_zones(*),
          items:pickup_items(
            *,
            material:materials(*)
          ),
          photos:pickup_photos(*)
        `)
        .eq('id', pickupId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching pickup:', error)
      return null
    }
  },

  // Create new pickup
  async createPickup(pickupData: Partial<CollectionPickup>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('collection_pickups')
        .insert([pickupData])
        .select('id')
        .single()

      if (error) throw error
      return data?.id || null
    } catch (error) {
      console.error('Error creating pickup:', error)
      return null
    }
  },

  // Update pickup status
  async updatePickupStatus(
    pickupId: string, 
    newStatus: string, 
    notes?: string,
    actualDate?: string,
    actualTime?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { status: newStatus }
      if (notes) updateData.notes = notes
      if (actualDate) updateData.actual_date = actualDate
      if (actualTime) updateData.actual_time = actualTime
      if (newStatus === 'completed') updateData.completed_at = new Date().toISOString()

      const { error } = await supabase
        .from('collection_pickups')
        .update(updateData)
        .eq('id', pickupId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating pickup status:', error)
      return false
    }
  },

  // Get pickups by status
  async getPickupsByStatus(collectorId: string, status: string): Promise<CollectionPickupWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('collection_pickups')
        .select(`
          *,
          zone:collection_zones(*),
          items:pickup_items(
            *,
            material:materials(*)
          ),
          photos:pickup_photos(*)
        `)
        .eq('collector_id', collectorId)
        .eq('status', status)
        .order('scheduled_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pickups by status:', error)
      return []
    }
  }
}

// ============================================================================
// 4. PICKUP ITEMS SERVICES
// ============================================================================

export const pickupItemServices = {
  // Add items to pickup
  async addPickupItems(pickupId: string, items: Partial<PickupItem>[]): Promise<boolean> {
    try {
      const itemsWithPickupId = items.map(item => ({
        ...item,
        pickup_id: pickupId
      }))

      const { error } = await supabase
        .from('pickup_items')
        .insert(itemsWithPickupId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error adding pickup items:', error)
      return false
    }
  },

  // Update pickup item
  async updatePickupItem(itemId: string, updates: Partial<PickupItem>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickup_items')
        .update(updates)
        .eq('id', itemId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating pickup item:', error)
      return false
    }
  },

  // Remove pickup item
  async removePickupItem(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickup_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error removing pickup item:', error)
      return false
    }
  },

  // Get pickup items with material details
  async getPickupItems(pickupId: string): Promise<PickupItemWithMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('pickup_items')
        .select(`
          *,
          material:materials(*)
        `)
        .eq('pickup_id', pickupId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pickup items:', error)
      return []
    }
  }
}

// ============================================================================
// 5. PHOTO MANAGEMENT SERVICES
// ============================================================================

export const photoServices = {
  // Upload pickup photo
  async uploadPickupPhoto(
    pickupId: string, 
    photoUrl: string, 
    photoType: string = 'general',
    uploadedBy?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('pickup_photos')
        .insert([{
          pickup_id: pickupId,
          photo_url: photoUrl,
          photo_type: photoType,
          uploaded_by: uploadedBy
        }])
        .select('id')
        .single()

      if (error) throw error
      return data?.id || null
    } catch (error) {
      console.error('Error uploading photo:', error)
      return null
    }
  },

  // Get pickup photos
  async getPickupPhotos(pickupId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('pickup_photos')
        .select('*')
        .eq('pickup_id', pickupId)
        .order('uploaded_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pickup photos:', error)
      return []
    }
  },

  // Delete pickup photo
  async deletePickupPhoto(photoId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickup_photos')
        .delete()
        .eq('id', photoId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting photo:', error)
      return false
    }
  }
}

// ============================================================================
// 6. MATERIALS & PRICING SERVICES
// ============================================================================

export const materialServices = {
  // Get all active materials
  async getAllMaterials(): Promise<MaterialWithCategory[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          category:materials(*)
        `)
        .eq('active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching materials:', error)
      return []
    }
  },

  // Get materials by category
  async getMaterialsByCategory(categoryId: string): Promise<Material[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('category_id', categoryId)
        .eq('active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching materials by category:', error)
      return []
    }
  },

  // Get material categories
  async getMaterialCategories(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('active', true)
        .order('sort_order')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching material categories:', error)
      return []
    }
  }
}

// ============================================================================
// 7. SCHEDULE MANAGEMENT SERVICES
// ============================================================================

export const scheduleServices = {
  // Get collector's schedule
  async getCollectorSchedule(collectorId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('collection_schedules')
        .select(`
          *,
          zone:collection_zones(*)
        `)
        .eq('collector_id', collectorId)
        .eq('active', true)
        .order('day_of_week')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collector schedule:', error)
      return []
    }
  },

  // Create or update schedule
  async upsertSchedule(scheduleData: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('collection_schedules')
        .upsert(scheduleData)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error upserting schedule:', error)
      return false
    }
  }
}

// ============================================================================
// 8. ANALYTICS & PERFORMANCE SERVICES
// ============================================================================

export const analyticsServices = {
  // Get collector's performance metrics
  async getCollectorMetrics(collectorId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('collection_metrics')
        .select('*')
        .eq('collector_id', collectorId)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collector metrics:', error)
      return []
    }
  },

  // Get today's metrics
  async getTodayMetrics(collectorId: string): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('collection_metrics')
        .select('*')
        .eq('collector_id', collectorId)
        .eq('date', today)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      return data || {
        total_pickups: 0,
        completed_pickups: 0,
        total_materials_kg: 0,
        total_value: 0,
        points_earned: 0,
        efficiency_score: 0
      }
    } catch (error) {
      console.error('Error fetching today\'s metrics:', error)
      return {
        total_pickups: 0,
        completed_pickups: 0,
        total_materials_kg: 0,
        total_value: 0,
        points_earned: 0,
        efficiency_score: 0
      }
    }
  },

  // Calculate pickup statistics
  async calculatePickupStats(collectorId: string): Promise<any> {
    try {
      const pickups = await collectionPickupServices.getCollectorPickups(collectorId)
      
      const stats = pickups.reduce((acc, pickup) => {
        acc.total_pickups++
        if (pickup.status === 'completed') acc.completed_pickups++
        if (pickup.status === 'scheduled') acc.scheduled_pickups++
        if (pickup.status === 'in_progress') acc.in_progress_pickups++
        
        // Calculate totals from items
        if (pickup.items) {
          pickup.items.forEach(item => {
            acc.total_materials_kg += item.quantity
            acc.total_value += item.total_price
          })
        }
        
        return acc
      }, {
        total_pickups: 0,
        completed_pickups: 0,
        scheduled_pickups: 0,
        in_progress_pickups: 0,
        total_materials_kg: 0,
        total_value: 0
      })

      return stats
    } catch (error) {
      console.error('Error calculating pickup stats:', error)
      return {
        total_pickups: 0,
        completed_pickups: 0,
        scheduled_pickups: 0,
        in_progress_pickups: 0,
        total_materials_kg: 0,
        total_value: 0
      }
    }
  }
}

// ============================================================================
// 9. REAL-TIME SUBSCRIPTION SERVICES
// ============================================================================

export const realtimeServices = {
  // Subscribe to collector's pickups
  subscribeToCollectorPickups(collectorId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`collector_pickups_${collectorId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'collection_pickups',
        filter: `collector_id=eq.${collectorId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to pickup items changes
  subscribeToPickupItems(pickupId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`pickup_items_${pickupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pickup_items',
        filter: `pickup_id=eq.${pickupId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to collector's wallet
  subscribeToCollectorWallet(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`collector_wallet_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_wallets',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to zone assignments
  subscribeToZoneAssignments(collectorId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`zone_assignments_${collectorId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'zone_assignments',
        filter: `collector_id=eq.${collectorId}`
      }, callback)
      .subscribe()
  }
}

// ============================================================================
// 10. LEGACY COMPATIBILITY SERVICES
// ============================================================================
// These maintain backward compatibility with existing code

export const legacyServices = {
  // Get collector pickups (legacy format)
  async getCollectorPickups(collectorId: string): Promise<any[]> {
    return collectionPickupServices.getCollectorPickups(collectorId)
  },

  // Get collector stats (legacy format)
  async getCollectorStats(collectorId: string): Promise<any> {
    return analyticsServices.calculatePickupStats(collectorId)
  },

  // Get users (legacy format - gets customers)
  async getUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, phone')
        .eq('role', 'member')
        .eq('status', 'active')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching users:', error)
      return []
    }
  }
}

// ============================================================================
// 11. EXPORT ALL SERVICES
// ============================================================================

export {
  collectorProfileServices,
  zoneServices,
  collectionPickupServices,
  pickupItemServices,
  photoServices,
  materialServices,
  scheduleServices,
  analyticsServices,
  realtimeServices,
  legacyServices
}
