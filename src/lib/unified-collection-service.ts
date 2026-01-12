import { supabase } from './supabase';

export interface UnifiedCollection {
  id: string;
  collection_code: string;
  collection_type: 'pickup' | 'dropoff' | 'scheduled' | 'emergency';
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  pickup_address_id?: string;
  pickup_address: string;
  pickup_coordinates?: { lat: number; lng: number };
  collector_id: string;
  collector_name?: string;
  collector_phone?: string;
  total_weight_kg: number;
  total_value: number;
  material_count: number;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'approved' | 'rejected' | 'cancelled' | 'no_show';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduled_date?: string;
  scheduled_time?: string;
  actual_date?: string;
  actual_time?: string;
  completed_at?: string;
  customer_notes?: string;
  collector_notes?: string;
  admin_notes?: string;
  quality_rating?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface CollectionMaterial {
  id: string;
  collection_id: string;
  material_id?: string;
  material_name: string;
  material_category?: string;
  quantity: number;
  unit: 'kg' | 'g' | 'pieces' | 'liters';
  unit_price: number;
  total_price: number;
  quality_rating?: number;
  contamination_pct: number;
  condition_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionData {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  pickup_address_id?: string;
  pickup_address: string;
  pickup_coordinates?: { lat: number; lng: number };
  collector_id: string;
  collector_name?: string;
  collector_phone?: string;
  materials: Array<{
    material_name: string;
    material_category?: string;
    quantity: number;
    unit: 'kg' | 'g' | 'pieces' | 'liters';
    unit_price: number;
    quality_rating?: number;
    contamination_pct?: number;
    condition_notes?: string;
  }>;
  customer_notes?: string;
  collector_notes?: string;
  status?: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'approved' | 'rejected' | 'cancelled' | 'no_show';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export const unifiedCollectionService = {
  // Create a new collection with materials
  async createCollection(data: CreateCollectionData): Promise<UnifiedCollection | null> {
    const startTime = Date.now();
    const TIMEOUT_MS = 25000; // 25 seconds timeout
    
    try {
      console.log('🚀 Creating unified collection with data:', data);
      
      // Set up timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Save operation timed out. Please try again.'));
        }, TIMEOUT_MS);
      });
      
      // Validate required fields
      if (!data.customer_id) {
        throw new Error('Customer ID is required');
      }
      if (!data.customer_name) {
        throw new Error('Customer name is required');
      }
      if (!data.collector_id) {
        throw new Error('Collector ID is required');
      }
      if (!data.pickup_address) {
        throw new Error('Pickup address is required');
      }
      if (!data.materials || data.materials.length === 0) {
        throw new Error('At least one material is required');
      }
      
      // Clean customer ID (remove "profile-" prefix if present)
      const cleanCustomerId = data.customer_id.startsWith('profile-') 
        ? data.customer_id.replace('profile-', '') 
        : data.customer_id;
      
      // Clean collector ID (remove "profile-" prefix if present)
      const cleanCollectorId = data.collector_id.startsWith('profile-') 
        ? data.collector_id.replace('profile-', '') 
        : data.collector_id;
      
      console.log('🔍 Original customer ID:', data.customer_id);
      console.log('🔍 Clean customer ID:', cleanCustomerId);
      console.log('🔍 Original collector ID:', data.collector_id);
      console.log('🔍 Clean collector ID:', cleanCollectorId);
      
      // Check if collector exists in user_profiles to avoid foreign key constraint
      let finalCollectorId = cleanCollectorId;
      let finalCreatedById = cleanCollectorId;
      
      if (cleanCollectorId) {
        const { data: collectorProfile, error: collectorError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', cleanCollectorId)
          .single();
        
        if (collectorError || !collectorProfile) {
          console.warn('⚠️ Collector ID not found in user_profiles, attempting to create profile:', cleanCollectorId);
          
          // Try to create a basic collector profile
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: cleanCollectorId,
              user_id: cleanCollectorId,
              email: 'collector@wozamali.com', // Placeholder email
              full_name: 'Collector', // Placeholder name
              role: 'collector',
              status: 'active'
            })
            .select('id')
            .single();
          
          if (createError || !newProfile) {
            console.warn('⚠️ Failed to create collector profile, setting to null:', createError);
            finalCollectorId = null;
            finalCreatedById = null;
          } else {
            console.log('✅ Collector profile created successfully:', cleanCollectorId);
            finalCollectorId = cleanCollectorId;
            finalCreatedById = cleanCollectorId;
          }
        } else {
          console.log('✅ Collector ID found in user_profiles:', cleanCollectorId);
        }
      }
      
      // Validate materials data and look up material_id from materials table
      // First, fetch all active materials to map names to IDs
      // Try modern schema first (with is_active and rate_per_kg)
      let allMaterials: any[] | null = null;
      let materialsFetchError: any = null;
      
      let query = supabase
        .from('materials')
        .select('id, name, rate_per_kg, is_active')
        .eq('is_active', true);
      
      let { data, error } = await query;
      
      // If column names differ, fall back to legacy schema (current_rate/no is_active)
      if (error && (String(error.message).includes('rate_per_kg') || String(error.message).includes('is_active') || error.code === '42703')) {
        console.warn('↩️ Falling back to legacy materials schema (current_rate/no is_active)');
        const alt = await supabase
          .from('materials')
          .select('id, name, current_rate')
          .order('name');
        data = alt.data as any[] | null;
        error = alt.error as any;
      }
      
      allMaterials = data;
      materialsFetchError = error;
      
      if (materialsFetchError) {
        console.warn('⚠️ Could not fetch materials for ID lookup:', materialsFetchError);
      }
      
      // Create a map of material name (lowercase) to material ID
      const materialNameToIdMap = new Map<string, string>();
      if (allMaterials) {
        allMaterials.forEach(m => {
          if (m.name) {
            materialNameToIdMap.set(m.name.toLowerCase().trim(), m.id);
          }
        });
      }
      
      // Validate materials data and ensure material_id can be found
      for (let i = 0; i < data.materials.length; i++) {
        const material = data.materials[i];
        if (!material.material_name) {
          throw new Error(`Material ${i + 1}: Material name is required`);
        }
        if (!material.quantity || material.quantity <= 0) {
          throw new Error(`Material ${i + 1}: Quantity must be greater than 0`);
        }
        if (material.unit_price === undefined || material.unit_price === null || material.unit_price < 0) {
          throw new Error(`Material ${i + 1}: Unit price must be 0 or greater`);
        }
        // Validate that material exists in materials table
        const materialId = materialNameToIdMap.get(material.material_name.toLowerCase().trim());
        if (!materialId) {
          throw new Error(`Material ${i + 1}: Material "${material.material_name}" not found in materials table. Please use a valid material name.`);
        }
      }
      
      // Calculate totals
      const totalWeight = data.materials.reduce((sum, material) => {
        return sum + (material.unit === 'kg' ? material.quantity : material.quantity / 1000);
      }, 0);
      
      const totalValue = data.materials.reduce((sum, material) => {
        return sum + (material.quantity * material.unit_price);
      }, 0);
      
      console.log('🔍 Calculated totals - Weight:', totalWeight, 'Value:', totalValue);
      
      // Generate collection code on client side to avoid database trigger issues
      const year = new Date().getFullYear();
      const collectionCode = `COL-${year}-${Date.now().toString().slice(-4)}`;
      
      // Prepare collection data
      const collectionData = {
        collection_code: collectionCode,
        collection_type: 'pickup',
        customer_id: cleanCustomerId,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        pickup_address_id: data.pickup_address_id,
        pickup_address: data.pickup_address,
        pickup_coordinates: data.pickup_coordinates ? 
          `(${data.pickup_coordinates.lat},${data.pickup_coordinates.lng})` : null,
        collector_id: finalCollectorId,
        collector_name: data.collector_name,
        collector_phone: data.collector_phone,
        total_weight_kg: totalWeight,
        total_value: totalValue,
        material_count: data.materials.length,
        status: data.status || 'pending',
        priority: data.priority || 'normal',
        customer_notes: data.customer_notes,
        collector_notes: data.collector_notes,
        created_by: finalCreatedById, // Use validated ID for created_by
        updated_by: finalCreatedById  // Use validated ID for updated_by
      };
      
      console.log('🔍 Collection data being sent to Supabase:', collectionData);
      
      // Use Promise.race to implement timeout
      const createCollectionPromise = async () => {
        // Create the collection
        const { data: collection, error: collectionError } = await supabase
          .from('unified_collections')
          .insert(collectionData)
          .select('*')
          .single();
        
        if (collectionError) {
          console.error('❌ Error creating unified collection:', collectionError);
          throw collectionError;
        }
        
        console.log('✅ Unified collection created:', collection);
        
        // Create material entries in batch to reduce database calls
        // Include material_id (required) - look it up from the map we created earlier
        if (data.materials.length > 0) {
          const materialInserts = data.materials.map(material => {
            const materialId = materialNameToIdMap.get(material.material_name.toLowerCase().trim());
            if (!materialId) {
              throw new Error(`Material "${material.material_name}" not found in materials table. This should have been caught during validation.`);
            }
            return {
              collection_id: collection.id,
              material_id: materialId, // Required - must exist
              material_name: material.material_name,
              material_category: material.material_category || 'general',
              quantity: material.quantity,
              unit: material.unit,
              unit_price: material.unit_price,
              quality_rating: material.quality_rating,
              contamination_pct: material.contamination_pct || 0,
              condition_notes: material.condition_notes
            };
          });
          
          const { data: materials, error: materialsError } = await supabase
            .from('collection_materials')
            .insert(materialInserts)
            .select('*');
          
          if (materialsError) {
            console.error('❌ Error creating collection materials:', materialsError);
            throw materialsError; // Throw error since material_id is required
          } else {
            console.log('✅ Collection materials created with material_id:', materials);
          }
        }
        
        return collection;
      };
      
      // Race between the operation and timeout
      const collection = await Promise.race([
        createCollectionPromise(),
        timeoutPromise
      ]);
      
      const endTime = Date.now();
      console.log(`⏱️ Collection creation completed in ${endTime - startTime}ms`);
      
      return collection;
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error('❌ Error in createCollection:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error stringified:', JSON.stringify(error, null, 2));
      console.error(`⏱️ Operation failed after ${duration}ms`);
      
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        // Check if it's a timeout error
        if (error.message.includes('timed out') || duration >= TIMEOUT_MS) {
          throw new Error('Save operation timed out. Please check your internet connection and try again.');
        }
        
        // Check if it's a network error
        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw new Error('Network error occurred. Please check your internet connection and try again.');
        }
        
        // Check if it's a database constraint error
        if (error.message.includes('constraint') || error.message.includes('foreign key')) {
          if (error.message.includes('collector_id') && error.message.includes('user_profiles')) {
            throw new Error('Collector profile not found. Please contact support to set up your collector account.');
          } else if (error.message.includes('customer_id') && error.message.includes('user_profiles')) {
            throw new Error('Customer profile not found. Please ensure the customer has a valid account.');
          } else {
            throw new Error('Database error occurred. Please contact support if this persists.');
          }
        }
      }
      
      throw error;
    }
  },
  
  // Get collections for a collector
  async getCollectorCollections(collectorId: string): Promise<UnifiedCollection[]> {
    try {
      const { data, error } = await supabase
        .from('unified_collections')
        .select('*')
        .eq('collector_id', collectorId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching collector collections:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error in getCollectorCollections:', error);
      throw error;
    }
  },
  
  // Get collections for a customer
  async getCustomerCollections(customerId: string): Promise<UnifiedCollection[]> {
    try {
      const { data, error } = await supabase
        .from('unified_collections')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching customer collections:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error in getCustomerCollections:', error);
      throw error;
    }
  },
  
  // Get collection with materials
  async getCollectionWithMaterials(collectionId: string): Promise<{
    collection: UnifiedCollection;
    materials: CollectionMaterial[];
  } | null> {
    try {
      const { data: collection, error: collectionError } = await supabase
        .from('unified_collections')
        .select('*')
        .eq('id', collectionId)
        .single();
      
      if (collectionError) {
        console.error('❌ Error fetching collection:', collectionError);
        throw collectionError;
      }
      
      const { data: materials, error: materialsError } = await supabase
        .from('collection_materials')
        .select('*')
        .eq('collection_id', collectionId);
      
      if (materialsError) {
        console.error('❌ Error fetching collection materials:', materialsError);
        throw materialsError;
      }
      
      return {
        collection,
        materials: materials || []
      };
    } catch (error) {
      console.error('❌ Error in getCollectionWithMaterials:', error);
      throw error;
    }
  },
  
  // Update collection status
  async updateCollectionStatus(
    collectionId: string, 
    status: UnifiedCollection['status'], 
    notes?: string
  ): Promise<UnifiedCollection | null> {
    try {
      const { data, error } = await supabase
        .from('unified_collections')
        .update({
          status,
          collector_notes: notes,
          updated_at: new Date().toISOString(),
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', collectionId)
        .select('*')
        .single();
      
      if (error) {
        console.error('❌ Error updating collection status:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error in updateCollectionStatus:', error);
      throw error;
    }
  },
  
  // Get all collections (for admin/office view)
  async getAllCollections(): Promise<UnifiedCollection[]> {
    try {
      const { data, error } = await supabase
        .from('unified_collections')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching all collections:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error in getAllCollections:', error);
      throw error;
    }
  }
};
