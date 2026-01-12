import { supabase } from './supabase'
import type { 
  User, 
  Role, 
  Area, 
  Resident,
  TownshipDropdown,
  SubdivisionDropdown,
  Material
} from './supabase'

// ============================================================================
// UNIFIED COLLECTOR SERVICE
// ============================================================================
// This service handles all collector operations using the unified schema

export interface CollectorResident extends Resident {
  collector_area_id?: string;
  collector_area_name?: string;
}

export interface CollectionData {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email: string;
  pickup_address_id: string;
  pickup_address: string;
  collector_id: string;
  collector_name: string;
  materials: Array<{
    material_name: string;
    material_category: string;
    quantity: number;
    unit: string;
    unit_price: number;
    contamination_pct: number;
  }>;
  customer_notes?: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
}

export class UnifiedCollectorService {
  // ============================================================================
  // GET COLLECTOR'S RESIDENTS
  // ============================================================================
  static async getCollectorResidents(collectorId: string): Promise<{ data: CollectorResident[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('collector_residents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching collector residents:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getCollectorResidents:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // GET ALL RESIDENTS (FOR ADMIN/COLLECTOR VIEW)
  // ============================================================================
  static async getAllResidents(): Promise<{ data: Resident[] | null; error: any }> {
    try {
      // Use the working ResidentService instead of non-existent residents_view
      const { ResidentService } = await import('./resident-service');
      const residents = await ResidentService.getAllResidents();
      
      console.log('🔍 UnifiedCollectorService: Fetched residents:', {
        count: residents.length,
        sample: residents[0]
      });

      return { data: residents, error: null };
    } catch (error) {
      console.error('Error in getAllResidents:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // GET TOWNSHIPS
  // ============================================================================
  static async getTownships(): Promise<{ data: TownshipDropdown[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('township_dropdown')
        .select('*')
        .order('township_name');

      if (error) {
        console.error('Error fetching townships:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getTownships:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // GET SUBDIVISIONS FOR TOWNSHIP
  // ============================================================================
  static async getSubdivisions(townshipId: string): Promise<{ data: SubdivisionDropdown[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('subdivision_dropdown')
        .select('*')
        .eq('area_id', townshipId)
        .order('subdivision');

      if (error) {
        console.error('Error fetching subdivisions:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getSubdivisions:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // GET MATERIALS
  // ============================================================================
  static async getMaterials(): Promise<{ data: Material[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching materials:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getMaterials:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // CREATE COLLECTION
  // ============================================================================
  static async createCollection(collectionData: CollectionData): Promise<{ data: any | null; error: any }> {
    try {
      // First, fetch all materials to map names to IDs
      const { data: allMaterials, error: materialsError } = await supabase
        .from('materials')
        .select('id, name');

      if (materialsError) {
        console.error('Error fetching materials:', materialsError);
        return { data: null, error: materialsError };
      }

      // Create a map of material names to IDs
      const materialMap = new Map<string, string>();
      (allMaterials || []).forEach((mat: { id: string; name: string }) => {
        materialMap.set(mat.name.toLowerCase().trim(), mat.id);
      });

      // Calculate total weight
      const totalWeight = collectionData.materials.reduce((sum, m) => sum + m.quantity, 0);
      const primaryMaterialName = (collectionData.materials?.[0]?.material_name || '').trim();

      // Build collection insert data
      const collectionInsert: any = {
        user_id: collectionData.customer_id,
        collector_id: collectionData.collector_id,
        pickup_address_id: collectionData.pickup_address_id,
        status: collectionData.status
      };

      // Add optional fields
      if (collectionData.customer_notes) {
        collectionInsert.notes = collectionData.customer_notes;
      }

      // Add material_type and weight_kg for backward compatibility with office app
      // These columns may exist in some schema versions
      collectionInsert.material_type = primaryMaterialName || null;
      collectionInsert.weight_kg = totalWeight;

      // Create the collection record
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .insert(collectionInsert)
        .select('id')
        .single();

      if (collectionError) {
        console.error('Error creating collection:', collectionError);
        return { data: null, error: collectionError };
      }

      // Then, create pickup items for each material with correct material IDs
      if (collection && collectionData.materials.length > 0) {
        const pickupItems = collectionData.materials
          .map(material => {
            const materialName = material.material_name.trim();
            const materialId = materialMap.get(materialName.toLowerCase());

            if (!materialId) {
              console.error(`Material not found: ${materialName}`);
              return null;
            }

            return {
              pickup_id: collection.id,
              material_id: materialId, // Now using the actual UUID
              quantity: material.quantity,
              unit_price: material.unit_price,
              total_price: material.quantity * material.unit_price,
              notes: null
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        if (pickupItems.length === 0) {
          console.error('No valid pickup items to insert - all materials were invalid');
          return { data: null, error: new Error('No valid materials found') };
        }

        const { error: itemsError } = await supabase
          .from('pickup_items')
          .insert(pickupItems);

        if (itemsError) {
          console.error('Error creating pickup items:', itemsError);
          return { data: null, error: itemsError };
        }
      }

      return { data: collection, error: null };
    } catch (error) {
      console.error('Error in createCollection:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // GET COLLECTOR'S COLLECTIONS
  // ============================================================================
  static async getCollectorCollections(collectorId: string): Promise<{ data: any[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          user:users!collections_user_id_fkey(
            id,
            first_name,
            last_name,
            full_name,
            email,
            phone
          ),
          pickup_address:user_addresses!collections_pickup_address_id_fkey(
            id,
            address_line1,
            address_line2,
            city,
            province,
            postal_code
          ),
          items:pickup_items(
            id,
            material_id,
            quantity,
            unit_price,
            total_price,
            quality_rating,
            notes
          )
        `)
        .eq('collector_id', collectorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching collector collections:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getCollectorCollections:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // UPDATE COLLECTION STATUS
  // ============================================================================
  static async updateCollectionStatus(collectionId: string, status: string, notes?: string): Promise<{ data: any | null; error: any }> {
    try {
      const updateData: any = { status };
      if (notes) updateData.notes = notes;

      const { data, error } = await supabase
        .from('collections')
        .update(updateData)
        .eq('id', collectionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating collection status:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in updateCollectionStatus:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // GET COLLECTOR PROFILE
  // ============================================================================
  static async getCollectorProfile(collectorId: string): Promise<{ data: User | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          role:roles(*),
          area:areas(*)
        `)
        .eq('id', collectorId)
        .single();

      if (error) {
        console.error('Error fetching collector profile:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getCollectorProfile:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // SEARCH RESIDENTS
  // ============================================================================
  static async searchResidents(searchTerm: string): Promise<{ data: Resident[] | null; error: any }> {
    try {
      // Use the working ResidentService instead of non-existent residents_view
      const { ResidentService } = await import('./resident-service');
      const residents = await ResidentService.searchResidents(searchTerm);
      
      console.log('🔍 UnifiedCollectorService: Searched residents:', {
        searchTerm,
        count: residents.length,
        sample: residents[0]
      });

      return { data: residents, error: null };
    } catch (error) {
      console.error('Error in searchResidents:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // GET RESIDENT BY ID
  // ============================================================================
  static async getResidentById(residentId: string): Promise<{ data: Resident | null; error: any }> {
    try {
      // Use the working ResidentService instead of non-existent residents_view
      const { ResidentService } = await import('./resident-service');
      const residents = await ResidentService.getAllResidents();
      const resident = residents.find(r => r.id === residentId);
      
      console.log('🔍 UnifiedCollectorService: Found resident by ID:', {
        residentId,
        found: !!resident,
        resident: resident
      });

      return { data: resident || null, error: null };
    } catch (error) {
      console.error('Error in getResidentById:', error);
      return { data: null, error };
    }
  }
}

// ============================================================================
// HOOKS FOR REACT COMPONENTS
// ============================================================================

import { useState, useEffect } from 'react';

export function useCollectorResidents(collectorId: string | null) {
  const [residents, setResidents] = useState<CollectorResident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!collectorId) {
      setResidents([]);
      setLoading(false);
      return;
    }

    const fetchResidents = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await UnifiedCollectorService.getCollectorResidents(collectorId);

      if (error) {
        setError(error);
      } else {
        setResidents(data || []);
      }

      setLoading(false);
    };

    fetchResidents();
  }, [collectorId]);

  return { residents, loading, error };
}

export function useAllResidents() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchResidents = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await UnifiedCollectorService.getAllResidents();

      if (error) {
        setError(error);
      } else {
        setResidents(data || []);
      }

      setLoading(false);
    };

    fetchResidents();
  }, []);

  return { residents, loading, error };
}

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await UnifiedCollectorService.getMaterials();

      if (error) {
        setError(error);
      } else {
        setMaterials(data || []);
      }

      setLoading(false);
    };

    fetchMaterials();
  }, []);

  return { materials, loading, error };
}

export function useTownships() {
  const [townships, setTownships] = useState<TownshipDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchTownships = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await UnifiedCollectorService.getTownships();

      if (error) {
        setError(error);
      } else {
        setTownships(data || []);
      }

      setLoading(false);
    };

    fetchTownships();
  }, []);

  return { townships, loading, error };
}

export function useSubdivisions(townshipId: string | null) {
  const [subdivisions, setSubdivisions] = useState<SubdivisionDropdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!townshipId) {
      setSubdivisions([]);
      return;
    }

    const fetchSubdivisions = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await UnifiedCollectorService.getSubdivisions(townshipId);

      if (error) {
        setError(error);
      } else {
        setSubdivisions(data || []);
      }

      setLoading(false);
    };

    fetchSubdivisions();
  }, [townshipId]);

  return { subdivisions, loading, error };
}
