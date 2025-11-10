import { supabase } from './supabase'
import type { 
  Profile, 
  Address, 
  Material, 
  Pickup, 
  PickupItem, 
  PickupPhoto, 
  Payment,
  PickupWithDetails,
  PickupItemWithMaterial,
  ProfileWithAddresses,
  CustomerDashboardView,
  CollectorDashboardView,
  AdminDashboardView,
  SystemImpactView,
  MaterialPerformanceView,
  CollectorPerformanceView,
  CustomerPerformanceView
} from './supabase'

// Profile Services
export const profileServices = {
  // Get profile by ID
  async getProfile(profileId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  },

  // Get profile by email
  async getProfileByEmail(email: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching profile by email:', error)
      return null
    }
  },

  // Create or update profile
  async upsertProfile(profile: Partial<Profile>): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profile)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error upserting profile:', error)
      return null
    }
  },

  // Get profiles by role
  async getProfilesByRole(role: Profile['role']): Promise<Profile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .eq('active', true)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching profiles by role:', error)
      return []
    }
  },

  // Get customer profiles with their addresses using the same approach as Main App
  async getCustomerProfilesWithAddresses(): Promise<ProfileWithAddresses[]> {
    try {
      console.log('🔍 Debug - Starting getCustomerProfilesWithAddresses...');
      console.log('🔍 Debug - Service function called at:', new Date().toISOString());
      
      // First, get all customer profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'member')
        .eq('active', true);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        return [];
      }

      console.log('✅ Profiles fetched:', profiles?.length || 0);

      if (!profiles || profiles.length === 0) {
        console.log('⚠️ No profiles found');
        return [];
      }

      // Then, get all addresses for these profiles
      const profileIds = profiles.map(p => p.id);
      const { data: addresses, error: addressesError } = await supabase
        .from('user_addresses')
        .select('*')
        .in('user_id', profileIds)
        .eq('active', true);

      if (addressesError) {
        console.error('❌ Error fetching addresses:', addressesError);
        return [];
      }

      console.log('✅ Addresses fetched:', addresses?.length || 0);

      // Combine profiles with their addresses
      const profilesWithAddresses: ProfileWithAddresses[] = profiles.map(profile => {
        const profileAddresses = addresses?.filter(addr => addr.user_id === profile.id) || [];
        
        console.log(`Profile ${profile.email} has ${profileAddresses.length} addresses`);
        
        return {
          ...profile,
          addresses: profileAddresses
        };
      });

      console.log('✅ Profiles with addresses combined:', profilesWithAddresses.length);
      console.log('🔍 Debug - Service function completed at:', new Date().toISOString());
      
      return profilesWithAddresses;
    } catch (error) {
      console.error('❌ Error fetching customer profiles with addresses:', error)
      return [];
    }
  },

  // Fallback method: Get profiles and addresses separately, then combine
  async getCustomerProfilesWithAddressesFallback(): Promise<ProfileWithAddresses[]> {
    try {
      console.log('🔄 Fallback: Fetching profiles and user_addresses separately...');
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('⚠️ No authenticated session found in fallback, cannot fetch profiles');
        return [];
      }
      
      console.log('✅ User authenticated in fallback:', session.user.id);
      
      // Get all customer profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'member')
        .eq('active', true);

      if (profilesError) {
        console.error('❌ Error fetching profiles in fallback:', profilesError);
        return [];
      }

      if (!profiles || profiles.length === 0) {
        console.log('⚠️ No customer profiles found');
        return [];
      }

      console.log('✅ Found profiles:', profiles.length);

      // Get all user addresses
      const { data: userAddresses, error: addressesError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('active', true); // Only get active addresses

      if (addressesError) {
        console.error('❌ Error fetching user_addresses in fallback:', addressesError);
        return [];
      }

      console.log('✅ Found addresses:', userAddresses?.length || 0);

      // Combine profiles with their addresses in old format
      const profilesWithAddresses: ProfileWithAddresses[] = profiles.map(profile => {
        const memberAddresses = userAddresses?.filter(addr => addr.user_id === profile.id) || [];
        
        console.log(`Profile ${profile.email} has ${memberAddresses.length} addresses`);
        console.log(`Profile ${profile.email} ID: ${profile.id}`);
        console.log(`Available addresses:`, userAddresses?.map(addr => ({ id: addr.id, user_id: addr.user_id, address_line1: addr.address_line1 })));
        
        // Use new address format
        const formattedAddresses = memberAddresses.map(addr => ({
          id: addr.id,
          user_id: addr.user_id, // Use user_id directly
          address_type: addr.address_type,
          address_line1: addr.address_line1,
          address_line2: addr.address_line2,
          city: addr.city,
          province: addr.province,
          postal_code: addr.postal_code,
          country: addr.country,
          coordinates: addr.coordinates,
          is_default: addr.is_default,
          is_active: addr.is_active,
          notes: addr.notes,
          created_at: addr.created_at,
          updated_at: addr.updated_at
        }));
        
        return {
          ...profile,
          addresses: formattedAddresses
        };
      });

      console.log('✅ Fallback approach successful:', { 
        profilesCount: profiles.length, 
        addressesCount: userAddresses?.length || 0,
        combinedCount: profilesWithAddresses.length 
      });

      // Log detailed information about each profile
      profilesWithAddresses.forEach(profile => {
        console.log(`Profile ${profile.email}:`, {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          addressCount: profile.addresses?.length || 0,
          addresses: profile.addresses?.map(addr => ({
            id: addr.id,
            address_line1: addr.address_line1,
            city: addr.city,
            is_default: addr.is_default
          }))
        });
      });

      return profilesWithAddresses;
    } catch (error) {
      console.error('❌ Error in fallback approach:', error);
      return [];
    }
  }
}

// Address Services - Updated for new user_addresses schema
export const addressServices = {
  // Get addresses for a profile using user_addresses table
  async getAddressesByProfile(profileId: string): Promise<Address[]> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', profileId)
        .eq('active', true)
        .order('is_default', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching addresses:', error)
      return []
    }
  },

  // Create new address using user_addresses table
  async createAddress(address: Omit<Address, 'id'>): Promise<Address | null> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .insert([address])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating address:', error)
      return null
    }
  },

  // Update address using user_addresses table
  async updateAddress(addressId: string, updates: Partial<Address>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_addresses')
        .update(updates)
        .eq('id', addressId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating address:', error)
      return false
    }
  },

  // Get user addresses using the helper function
  async getUserAddresses(userId: string, requestingUserId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_addresses', {
          target_user_uuid: userId,
          requesting_user_uuid: requestingUserId
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching user addresses:', error)
      return null
    }
  },

  // Set default address using the helper function
  async setDefaultAddress(addressId: string, userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('set_default_address', {
          address_uuid: addressId,
          requesting_user_uuid: userId
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error setting default address:', error)
      return null
    }
  },

  // Get default address using the helper function
  async getDefaultAddress(userId: string, addressType?: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_default_address', {
          target_user_uuid: userId,
          address_type_filter: addressType
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching default address:', error)
      return null
    }
  }
}

// Material Services
export const materialServices = {
  // Get all active materials
  async getActiveMaterials(): Promise<Material[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching materials:', error)
      return []
    }
  },

  // Get material by ID
  async getMaterial(materialId: string): Promise<Material | null> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching material:', error)
      return null
    }
  }
}

// Pickup Services
export const pickupServices = {
  // Create a new pickup (collection)
  async createPickup(pickupData: Omit<Pickup, 'id' | 'started_at'>): Promise<Pickup | null> {
    try {
      console.log('Supabase createPickup called with:', pickupData);
      
      // Clean customer ID (remove "profile-" prefix if present)
      const cleanCustomerId = pickupData.customer_id.startsWith('profile-') 
        ? pickupData.customer_id.replace('profile-', '') 
        : pickupData.customer_id;
      
      const { data, error } = await supabase
        .from('collections')
        .insert([{
          user_id: cleanCustomerId,
          collector_id: pickupData.collector_id,
          pickup_address_id: pickupData.address_id,
          material_type: 'Aluminum Cans',
          weight_kg: 0, // Will be calculated from pickup items
          status: 'submitted',
          notes: pickupData.notes
        }])
        .select()
        .single()

      if (error) {
        console.error('Supabase error creating collection:', error);
        throw error;
      }
      
      console.log('Collection created successfully:', data);
      return data
    } catch (error) {
      console.error('Error creating collection:', error)
      throw error; // Re-throw to let the caller handle it
    }
  },

  // Get pickup with full details
  async getPickupWithDetails(pickupId: string): Promise<PickupWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          customer:users!collections_user_id_fkey(*),
          collector:users!collections_collector_id_fkey(*),
          pickup_address:user_addresses!collections_pickup_address_id_fkey(*),
          items:pickup_items(*),
          photos:pickup_photos(*)
        `)
        .eq('id', pickupId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching collection with details:', error)
      return null
    }
  },

  // Get pickups by customer
  async getPickupsByCustomer(customerId: string): Promise<Pickup[]> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching customer collections:', error)
      return []
    }
  },

  // Get pickups by collector
  async getPickupsByCollector(collectorId: string): Promise<Pickup[]> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('collector_id', collectorId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collector collections:', error)
      return []
    }
  },

  // Update pickup status
  async updatePickupStatus(pickupId: string, status: Pickup['status'], approvalNote?: string): Promise<boolean> {
    try {
      const updateData: any = { status }
      if (approvalNote) updateData.notes = approvalNote

      const { error } = await supabase
        .from('collections')
        .update(updateData)
        .eq('id', pickupId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating collection status:', error)
      return false
    }
  },

  // Submit pickup (set submitted_at)
  async submitPickup(pickupId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickups')
        .update({ status: 'submitted' })
        .eq('id', pickupId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error submitting collection:', error)
      return false
    }
  },

  // Update pickup payment status
  async updatePickupPaymentStatus(pickupId: string, paymentStatus: 'pending' | 'paid' | 'failed', paymentMethod?: string): Promise<boolean> {
    try {
      const updateData: any = { payment_status: paymentStatus }
      if (paymentMethod) updateData.payment_method = paymentMethod

      const { error } = await supabase
        .from('collections')
        .update(updateData)
        .eq('id', pickupId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating pickup payment status:', error)
      return false
    }
  }
}

// Pickup Item Services
export const pickupItemServices = {
  // Add items to a pickup
  async addPickupItems(pickupId: string, items: Omit<PickupItem, 'id'>[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickup_items')
        .insert(items.map(item => ({ ...item, pickup_id: pickupId })))

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error adding pickup items:', error)
      return false
    }
  },

  // Get items for a pickup with material details
  async getPickupItemsWithMaterials(pickupId: string): Promise<PickupItemWithMaterial[]> {
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

// Pickup Photo Services
export const pickupPhotoServices = {
  // Add photos to a pickup
  async addPickupPhotos(pickupId: string, photos: Omit<PickupPhoto, 'id' | 'pickup_id' | 'taken_at'>[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pickup_photos')
        .insert(photos.map(photo => ({
          ...photo,
          pickup_id: pickupId,
          taken_at: new Date().toISOString()
        })))

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error adding pickup photos:', error)
      return false
    }
  },

  // Get photos for a pickup
  async getPickupPhotos(pickupId: string): Promise<PickupPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('pickup_photos')
        .select('*')
        .eq('pickup_id', pickupId)
        .order('taken_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pickup photos:', error)
      return []
    }
  }
}

// Payment Services
export const paymentServices = {
  // Create payment for a pickup
  async createPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating payment:', error)
      return null
    }
  },

  // Update payment status
  async updatePaymentStatus(paymentId: string, status: Payment['status'], method?: string): Promise<boolean> {
    try {
      const updateData: any = { status }
      if (method) updateData.method = method
      if (status === 'approved') updateData.processed_at = new Date().toISOString()

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating payment status:', error)
      return false
    }
  },

  // Get payment by pickup ID
  async getPaymentByPickup(pickupId: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('pickup_id', pickupId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching payment:', error)
      return null
    }
  }
}

// Dashboard Services - NEW! Using the installed schema views
export const dashboardServices = {
  // Get collector dashboard data
  async getCollectorDashboard(): Promise<CollectorDashboardView[]> {
    try {
      const { data, error } = await supabase
        .from('collector_dashboard_view')
        .select('*')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collector dashboard:', error)
      return []
    }
  },

  // Get customer dashboard data
  async getCustomerDashboard(): Promise<CustomerDashboardView[]> {
    try {
      const { data, error } = await supabase
        .from('customer_dashboard_view')
        .select('*')
        .order('total_kg_recycled', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching customer dashboard:', error)
      return []
    }
  },

  // Get admin dashboard data
  async getAdminDashboard(): Promise<AdminDashboardView[]> {
    try {
      const { data, error } = await supabase
        .from('admin_dashboard_view')
        .select('*')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching admin dashboard:', error)
      return []
    }
  }
}

// Analytics Services - NEW! Using the installed schema views
export const analyticsServices = {
  // Get system impact overview
  async getSystemImpact(): Promise<SystemImpactView | null> {
    try {
      const { data, error } = await supabase
        .from('system_impact_view')
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching system impact:', error)
      return null
    }
  },

  // Get material performance analytics
  async getMaterialPerformance(): Promise<MaterialPerformanceView[]> {
    try {
      const { data, error } = await supabase
        .from('material_performance_view')
        .select('*')
        .order('total_kg_collected', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching material performance:', error)
      return []
    }
  },

  // Get collector performance analytics
  async getCollectorPerformance(): Promise<CollectorPerformanceView[]> {
    try {
      const { data, error } = await supabase
        .from('collector_performance_view')
        .select('*')
        .order('total_kg_collected', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching collector performance:', error)
      return []
    }
  },

}

// Customer Services
export const customerServices = {
  // Get customer profile
  async getCustomerProfile(profileId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching customer profile:', error)
      return null
    }
  },

  // Get customer dashboard data
  async getCustomerDashboard(): Promise<CustomerDashboardView[]> {
    try {
      const { data, error } = await supabase
        .from('customer_dashboard_view')
        .select('*')
        .order('total_kg_recycled', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching customer dashboard:', error)
      return []
    }
  },

  // Get customer performance analytics
  async getCustomerPerformance(): Promise<CustomerPerformanceView[]> {
    try {
      const { data, error } = await supabase
        .from('customer_performance_view')
        .select('*')
        .order('total_kg_recycled', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching customer performance:', error)
      return []
    }
  }
}

// Admin Services
export const adminServices = {
  // Get submitted pickups
  async getSubmittedPickups(): Promise<Pickup[]> {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*')
        .eq('status', 'submitted')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching submitted pickups:', error)
      return []
    }
  },

  // Get pending pickups (alias for submitted)
  async getPendingPickups(): Promise<Pickup[]> {
    return this.getSubmittedPickups();
  },

  // Get approved pickups
  async getApprovedPickups(): Promise<Pickup[]> {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*')
        .eq('status', 'approved')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching approved pickups:', error)
      return []
    }
  },

  // Get completed pickups (alias for approved)
  async getCompletedPickups(): Promise<Pickup[]> {
    return this.getApprovedPickups();
  },

  // Get rejected pickups
  async getRejectedPickups(): Promise<Pickup[]> {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*')
        .eq('status', 'rejected')
        .order('started_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching rejected pickups:', error)
      return []
    }
  },

  // Approve pickup
  async approvePickup(pickupId: string, approvalNote?: string): Promise<boolean> {
    return pickupServices.updatePickupStatus(pickupId, 'approved', approvalNote)
  },

  // Reject pickup
  async rejectPickup(pickupId: string, approvalNote: string): Promise<boolean> {
    return pickupServices.updatePickupStatus(pickupId, 'rejected', approvalNote)
  }
}

// Realtime Services
export const realtimeServices = {
  // Subscribe to pickup updates
  subscribeToPickups(callback: (payload: any) => void) {
    return supabase
      .channel('pickup_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, callback)
      .subscribe()
  },

  // Subscribe to payment updates
  subscribeToPayments(callback: (payload: any) => void) {
    return supabase
      .channel('payment_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, callback)
      .subscribe()
  }
}

// Enhanced Pickup Management Services
export const enhancedPickupServices = {
  // Compute totals for a pickup using the new function
  async computePickupTotals(pickupId: string) {
    try {
      const { data, error } = await supabase
        .rpc('compute_pickup_totals', { p_pickup_id: pickupId })

      if (error) throw error
      return data?.[0] || null
    } catch (error) {
      console.error('Error computing pickup totals:', error)
      return null
    }
  },

  // Finalize a pickup (collector function)
  async finalizePickup(pickupId: string) {
    try {
      const { data, error } = await supabase
        .rpc('finalize_pickup', { p_pickup_id: pickupId })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error finalizing pickup:', error)
      return null
    }
  },

  // Approve a pickup (admin function)
  async approvePickup(pickupId: string, adminId: string) {
    try {
      const { data, error } = await supabase
        .rpc('approve_pickup', { 
          p_pickup_id: pickupId, 
          p_admin_id: adminId 
        })

      if (error) throw error
      return data?.[0] || null
    } catch (error) {
      console.error('Error approving pickup:', error)
      return null
    }
  }
}
