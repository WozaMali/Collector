// Woza Mali Collector App Database Types
// TypeScript types for the unified schema - Collector App specific

export type UserRole = 'resident' | 'collector' | 'office';
export type CollectionStatus = 'pending' | 'approved' | 'rejected';
export type TransactionType = 'collection' | 'withdrawal' | 'bonus' | 'penalty';

export interface Area {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  phone: string | null;
  area_id: string | null;
  role: UserRole;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  address_type: 'primary' | 'secondary' | 'pickup' | 'billing';
  address_line1: string;
  address_line2: string | null;
  city: string;
  province: string;
  postal_code: string | null;
  country: string;
  coordinates: string | null; // POINT as string
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  collector_id: string | null;
  pickup_address_id: string | null;
  material_type: string;
  weight_kg: number;
  photo_url: string | null;
  status: CollectionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  collection_id: string | null;
  points: number;
  transaction_type: TransactionType;
  description: string | null;
  created_at: string;
}

// Extended types with relationships for Collector App
export interface UserWithArea extends User {
  area?: Area;
  addresses?: UserAddress[];
}

export interface CollectionWithDetails extends Collection {
  user?: User;
  collector?: User;
  pickup_address?: UserAddress;
  transactions?: Transaction[];
  pickup_items?: PickupItemWithMaterial[];
  pickup_photos?: PickupPhoto[];
}

// Material types
export interface Material {
  id: string;
  name: string;
  category: string;
  unit_price: number;
  unit: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Pickup Item types
export interface PickupItem {
  id: string;
  pickup_id: string;
  material_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  quality_rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PickupItemWithMaterial extends PickupItem {
  material?: Material;
}

// Pickup Photo types
export interface PickupPhoto {
  id: string;
  pickup_id: string;
  photo_url: string;
  photo_type: 'before' | 'after' | 'general' | 'verification';
  taken_at: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface TransactionWithDetails extends Transaction {
  user?: User;
  collection?: Collection;
}

// Database view types
export interface UserCollectionsSummary {
  user_id: string;
  user_name: string;
  role: UserRole;
  area_name: string | null;
  total_collections: number;
  total_weight: number;
  approved_collections: number;
  pending_collections: number;
}

export interface UserPointsSummary {
  user_id: string;
  user_name: string;
  total_points: number;
  total_transactions: number;
}

// Update types for Collector App (collectors can update assigned collections)
export interface CollectionUpdate {
  collector_id?: string | null;
  pickup_address_id?: string | null;
  material_type?: string;
  weight_kg?: number;
  photo_url?: string | null;
  status?: CollectionStatus;
  notes?: string | null;
}

// Update types for Collector App (collectors can update their own profile)
export interface UserUpdate {
  name?: string;
  phone?: string | null;
  email?: string | null;
}

// Collector App specific filter types
export interface CollectorCollectionFilters {
  user_id?: string;
  status?: CollectionStatus;
  material_type?: string;
  date_from?: string;
  date_to?: string;
}

export interface CollectorUserFilters {
  area_id?: string;
  search?: string;
}

// Pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

// Sorting
export interface SortOptions {
  column: string;
  ascending?: boolean;
}

// Collector App specific response types
export interface CollectorAppResponse<T> {
  data: T | null;
  error: any | null;
}

export interface CollectorAppListResponse<T> {
  data: T[] | null;
  error: any | null;
  count?: number;
}

// Collector App specific types
export interface CollectorStats {
  total_collections: number;
  pending_collections: number;
  completed_collections: number;
  total_weight_collected: number;
  area_name: string;
}

export interface CollectionAssignment {
  collection: CollectionWithDetails;
  user: UserWithArea;
  distance?: number;
  priority?: 'high' | 'medium' | 'low';
}
