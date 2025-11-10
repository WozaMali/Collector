import { supabase } from './supabase';
import type { 
  Pickup, 
  PickupItem, 
  PickupPhoto, 
  PickupWithDetails,
  CollectorDashboardView,
  Material 
} from './supabase';

export interface CreatePickupData {
  customer_id: string;
  address_id: string | null;
  lat?: number;
  lng?: number;
  notes?: string;
  materials: Array<{
    material_id: string;
    kilograms: number;
    contamination_pct?: number;
  }>;
}

export interface PickupStats {
  totalCollections: number;
  totalKg: number;
  totalPoints: number;
  totalEarnings: number;
  monthlyCollections: number;
  monthlyKg: number;
  monthlyPoints: number;
  monthlyEarnings: number;
}

export class PickupService {
  static async getCollectorPickups(collectorId: string): Promise<CollectorDashboardView[]> {
    try {
      const { data, error } = await supabase
        .from('collector_dashboard_view')
        .select('*')
        .eq('collector_id', collectorId)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error fetching pickups from Supabase:', {
          error: error,
          errorType: typeof error,
          errorKeys: Object.keys(error),
          fullError: JSON.stringify(error, null, 2)
        });
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pickups:', error);
      return [];
    }
  }

  static async getPickupById(pickupId: string): Promise<PickupWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('unified_collections')
        .select(`
          *,
          items:collection_materials(*),
          photos:collection_photos(*)
        `)
        .eq('id', pickupId)
        .single();

      if (error) {
        console.error('Error fetching collection:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching collection:', error);
      return null;
    }
  }

  static async createPickup(pickupData: CreatePickupData, collectorId: string): Promise<string | null> {
    try {
      console.log('🚀 createPickup function called!');
      console.log('1. Pickup data:', pickupData);
      console.log('2. Collector ID:', collectorId);
      
      // Clean customer ID (remove "profile-" prefix if present)
      const cleanCustomerId = pickupData.customer_id.startsWith('profile-') 
        ? pickupData.customer_id.replace('profile-', '') 
        : pickupData.customer_id;
      
      console.log('🔍 Original customer ID:', pickupData.customer_id);
      console.log('🔍 Clean customer ID:', cleanCustomerId);
      
      // Start transaction
      console.log('4. Attempting to insert pickup with data:', {
        customer_id: cleanCustomerId,
        collector_id: collectorId,
        address_id: pickupData.address_id,
        started_at: new Date().toISOString(),
        status: 'submitted',
        lat: pickupData.lat,
        lng: pickupData.lng,
      });
      
      const totalKg = pickupData.materials.reduce((sum, m) => sum + m.kilograms, 0);
      const { data: collection, error: collectionError } = await supabase
        .from('unified_collections')
        .insert({
          customer_id: cleanCustomerId,
          collector_id: collectorId,
          pickup_address_id: pickupData.address_id,
          total_weight_kg: totalKg,
          status: 'submitted',
          admin_notes: pickupData.notes ?? null
        })
        .select('id')
        .single();

      console.log('5. Supabase response:', { collection, collectionError });

      if (collectionError) {
        console.error('🚨 COLLECTION ERROR DETECTED! 🚨');
        console.error('Raw collectionError:', collectionError);
        console.error('collectionError type:', typeof collectionError);
        console.error('collectionError === null:', collectionError === null);
        console.error('collectionError === undefined:', collectionError === undefined);
        console.error('collectionError === {}:', JSON.stringify(collectionError) === '{}');
        console.error('collectionError keys:', Object.keys(collectionError));
        console.error('collectionError length:', Object.keys(collectionError).length);
        console.error('collectionError stringified:', JSON.stringify(collectionError, null, 2));
        console.error('collectionError message:', collectionError?.message);
        console.error('collectionError code:', collectionError?.code);
        console.error('collectionError details:', collectionError?.details);
        console.error('collectionError hint:', collectionError?.hint);
        console.error('Full error object:', collectionError);
        return null;
      }

      // Fetch material rates
      const materialIds = Array.from(new Set(pickupData.materials.map(m => m.material_id)));
      const { data: mats } = await supabase
        .from('materials')
        .select('id, rate_per_kg, current_rate')
        .in('id', materialIds);
      const idToRate = new Map((mats || []).map((m: any) => [String(m.id), Number(m.current_rate ?? m.rate_per_kg) || 0]));

      // Create collection materials
      const items = pickupData.materials.map(material => ({
        collection_id: collection.id,
        material_id: material.material_id,
        quantity: material.kilograms,
        unit_price: idToRate.get(String(material.material_id)) || 0
      }));

      console.log('3. Pickup items to create:', pickupItems);

      const { error: itemsError } = await supabase
        .from('collection_materials')
        .insert(items);

      if (itemsError) {
        console.error('Error creating pickup items from Supabase:', {
          error: itemsError,
          errorType: typeof itemsError,
          errorKeys: Object.keys(itemsError),
          fullError: JSON.stringify(itemsError, null, 2),
          errorMessage: itemsError?.message || 'No message',
          errorCode: itemsError?.code || 'No code',
          errorDetails: itemsError?.details || 'No details',
          hint: itemsError?.hint || 'No hint'
        });
        // Rollback collection creation
        await supabase.from('unified_collections').delete().eq('id', collection.id);
        return null;
      }

      return collection.id;
    } catch (error) {
      console.error('Error creating pickup:', error);
      return null;
    }
  }

  static async updatePickupStatus(pickupId: string, status: 'submitted' | 'approved' | 'rejected', notes?: string): Promise<boolean> {
    try {
      if (status === 'approved' || status === 'rejected') {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user?.id) return false;
        if (status === 'approved') {
          const { error } = await supabase.rpc('approve_collection', {
            p_collection_id: pickupId,
            p_approver_id: authData.user.id,
            p_note: notes ?? null,
            p_idempotency_key: null
          });
          if (error) return false;
        } else {
          const { error } = await supabase.rpc('reject_collection', {
            p_collection_id: pickupId,
            p_approver_id: authData.user.id,
            p_note: notes ?? null
          });
          if (error) return false;
        }
        return true;
      }

      const { error } = await supabase
        .from('unified_collections')
        .update({ status, admin_notes: notes ?? null })
        .eq('id', pickupId);

      if (error) {
        console.error('Error updating collection status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating collection status:', error);
      return false;
    }
  }

  static async addPickupPhoto(pickupId: string, photoUrl: string, type: 'scale' | 'bags' | 'other', lat?: number, lng?: number): Promise<boolean> {
    try {
      const mappedType = type === 'other' ? 'general' : 'verification';
      const { error } = await supabase
        .from('collection_photos')
        .insert({
          collection_id: pickupId,
          photo_url: photoUrl,
          photo_type: mappedType,
          uploaded_at: new Date().toISOString(),
          uploaded_by: null
        });

      if (error) {
        console.error('Error adding photo:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error adding photo:', error);
      return false;
    }
  }

  static async getMaterials(): Promise<Material[]> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching materials:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching materials:', error);
      return [];
    }
  }

  static async getCollectorStats(collectorId: string): Promise<PickupStats> {
    try {
      const pickups = await this.getCollectorPickups(collectorId);
      
      const now = new Date();
      const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      
      const monthlyPickups = pickups.filter(p => p.started_at.startsWith(currentMonth));
      
      return {
        totalCollections: pickups.length,
        totalKg: pickups.reduce((sum, p) => sum + p.total_kg, 0),
        totalPoints: pickups.reduce((sum, p) => sum + p.total_points, 0),
        totalEarnings: pickups.reduce((sum, p) => sum + p.total_value, 0),
        monthlyCollections: monthlyPickups.length,
        monthlyKg: monthlyPickups.reduce((sum, p) => sum + p.total_kg, 0),
        monthlyPoints: monthlyPickups.reduce((sum, p) => sum + p.total_points, 0),
        monthlyEarnings: monthlyPickups.reduce((sum, p) => sum + p.total_value, 0),
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        totalCollections: 0,
        totalKg: 0,
        totalPoints: 0,
        totalEarnings: 0,
        monthlyCollections: 0,
        monthlyKg: 0,
        monthlyPoints: 0,
        monthlyEarnings: 0,
      };
    }
  }

  static async getUsers(): Promise<any[]> {
    try {
      console.log('=== STARTING getUsers() ===');
      console.log('1. Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('2. Supabase client exists:', !!supabase);
      
      // Test connection first
      console.log('3. Testing basic connection...');
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      console.log('4. Connection test result:', { testData, testError });
      
      console.log('5. Fetching member users...');
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          phone
        `)
        .eq('role', 'resident');

      console.log('6. Main query result:', { data, error });
      
      if (error) {
        console.error('Error fetching users from Supabase:', {
          error: error,
          errorType: typeof error,
          errorKeys: Object.keys(error),
          fullError: JSON.stringify(error, null, 2),
          errorMessage: error?.message || 'No message',
          errorCode: error?.code || 'No code',
          errorDetails: error?.details || 'No details'
        });
        return [];
      }

      console.log('Successfully fetched users:', data);
      return data || [];
    } catch (error) {
      console.error('Error fetching users (catch block):', error);
      return [];
    }
  }
}
