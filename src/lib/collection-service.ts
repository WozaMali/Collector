import { supabase } from './supabase';

export interface Collection {
  id: string;
  resident_id: string;
  collector_id: string;
  area_id: string;
  material_id: string;
  weight_kg: number;
  photo_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  collection_date: string;
  contributes_to_green_scholar_fund: boolean;
  green_scholar_fund_amount: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithDetails extends Collection {
  resident_name: string;
  resident_phone?: string;
  resident_email?: string;
  collector_name: string;
  collector_phone?: string;
  collector_email?: string;
  area_name: string;
  material_name: string;
  material_unit_price: number;
  estimated_value: number;
}

export interface CreateCollectionData {
  resident_id: string;
  collector_id: string;
  area_id: string;
  material_id: string;
  weight_kg: number;
  photo_url?: string;
  notes?: string;
  collection_date?: string;
}

export class CollectionService {
  // Create a new collection
  static async createCollection(data: CreateCollectionData): Promise<Collection | null> {
    try {
      console.log('🚀 Creating collection with data:', data);
      
      const { data: collection, error } = await supabase
        .from('collections')
        .insert({
          ...data,
          collection_date: data.collection_date || new Date().toISOString().split('T')[0]
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error creating collection:', error);
        throw error;
      }

      console.log('✅ Collection created successfully:', collection);
      return collection;
    } catch (error) {
      console.error('❌ Error in createCollection:', error);
      throw error;
    }
  }

  // Get collections for a collector
  static async getCollectorCollections(collectorId: string): Promise<CollectionWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('collection_details')
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
  }

  // Get collections for a resident
  static async getResidentCollections(residentId: string): Promise<CollectionWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('collection_details')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching resident collections:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getResidentCollections:', error);
      throw error;
    }
  }

  // Get all collections (for admin/office view)
  static async getAllCollections(): Promise<CollectionWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('collection_details')
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

  // Update collection status
  static async updateCollectionStatus(
    collectionId: string, 
    status: 'pending' | 'approved' | 'rejected',
    notes?: string
  ): Promise<Collection | null> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .update({
          status,
          notes: notes || null,
          updated_at: new Date().toISOString()
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
  }

  // Get collector statistics
  static async getCollectorStats(collectorId: string): Promise<{
    total_collections: number;
    approved_collections: number;
    pending_collections: number;
    rejected_collections: number;
    total_weight_kg: number;
    total_estimated_value: number;
    total_green_scholar_fund_contribution: number;
    avg_weight_per_collection: number;
    last_collection_date: string | null;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('collector_stats')
        .select('*')
        .eq('collector_id', collectorId)
        .single();

      if (error) {
        console.error('❌ Error fetching collector stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in getCollectorStats:', error);
      return null;
    }
  }

  // Get Green Scholar Fund summary
  static async getGreenScholarFundSummary(): Promise<{
    month: string;
    total_fund_amount: number;
    unique_residents_contributing: number;
    unique_collectors_contributing: number;
    total_pet_collections: number;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('green_scholar_fund_summary')
        .select('*')
        .order('month', { ascending: false });

      if (error) {
        console.error('❌ Error fetching Green Scholar Fund summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getGreenScholarFundSummary:', error);
      return [];
    }
  }
}
