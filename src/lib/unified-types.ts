// ============================================================================
// UNIFIED DATABASE TYPES FOR WOZAMALI COLLECTOR APP
// ============================================================================
// These types match the new unified schema structure
// Used by the Collector App for collection management

// ============================================================================
// 1. CORE USER MANAGEMENT
// ============================================================================

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name: string
  phone?: string
  role: 'member' | 'collector' | 'admin' | 'office_staff'
  status: 'active' | 'inactive' | 'suspended'
  avatar_url?: string
  date_of_birth?: string
  emergency_contact?: string
  created_at: string
  updated_at: string
  last_login?: string
  
  // Role-specific fields
  collector_id?: string
  admin_level?: number
  office_department?: string
}

export interface UserPermission {
  id: string
  user_id: string
  permission_name: string
  granted: boolean
  granted_by?: string
  granted_at: string
}

// ============================================================================
// 2. LOCATION & ZONE MANAGEMENT
// ============================================================================

export interface CollectionZone {
  id: string
  name: string
  description?: string
  city: string
  province: string
  country: string
  coordinates?: { x: number; y: number }
  radius_km: number
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  updated_at: string
}

export interface ZoneAssignment {
  id: string
  zone_id: string
  collector_id: string
  assigned_by?: string
  assigned_at: string
  status: 'active' | 'inactive' | 'temporary'
  notes?: string
}

// ============================================================================
// 3. MATERIALS & PRICING SYSTEM
// ============================================================================

export interface MaterialCategory {
  id: string
  name: string
  description?: string
  icon?: string
  color: string
  sort_order: number
  active: boolean
  created_at: string
}

export interface Material {
  id: string
  category_id: string
  name: string
  description?: string
  unit: 'kg' | 'g' | 'ton' | 'piece' | 'bottle' | 'box'
  base_price_per_unit: number
  current_price_per_unit: number
  min_quantity: number
  max_quantity_per_pickup?: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface PricingTier {
  id: string
  material_id: string
  tier_name: string
  min_quantity: number
  max_quantity?: number
  price_multiplier: number
  bonus_points_per_unit: number
  active: boolean
  created_at: string
}

// ============================================================================
// 4. COLLECTION OPERATIONS
// ============================================================================

export interface CollectionSchedule {
  id: string
  zone_id: string
  collector_id: string
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom'
  day_of_week?: number
  start_time?: string
  end_time?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface CollectionPickup {
  id: string
  pickup_code: string
  zone_id: string
  collector_id: string
  customer_name: string
  customer_phone?: string
  customer_address: string
  customer_coordinates?: { x: number; y: number }
  scheduled_date: string
  scheduled_time?: string
  actual_date?: string
  actual_time?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface PickupItem {
  id: string
  pickup_id: string
  material_id: string
  quantity: number
  unit_price: number
  total_price: number
  quality_rating?: number
  notes?: string
  created_at: string
}

export interface PickupPhoto {
  id: string
  pickup_id: string
  photo_url: string
  photo_type: 'before' | 'after' | 'general' | 'verification'
  uploaded_at: string
  uploaded_by?: string
}

// ============================================================================
// 5. REWARDS & POINTS SYSTEM
// ============================================================================

export interface UserWallet {
  id: string
  user_id: string
  current_points: number
  total_points_earned: number
  total_points_spent: number
  last_updated: string
}

export interface PointsTransaction {
  id: string
  wallet_id: string
  transaction_type: 'earned' | 'spent' | 'bonus' | 'deduction' | 'transfer' | 'reset' | 'adjustment'
  points: number
  balance_after: number
  source?: string
  reference_id?: string
  description?: string
  admin_notes?: string
  created_at: string
}

export interface RewardsCatalog {
  id: string
  name: string
  description?: string
  points_cost: number
  reward_type: 'physical' | 'digital' | 'voucher' | 'cash'
  active: boolean
  stock_quantity: number
  image_url?: string
  created_at: string
}

export interface RewardRedemption {
  id: string
  user_id: string
  reward_id: string
  points_spent: number
  status: 'pending' | 'approved' | 'fulfilled' | 'cancelled'
  redeemed_at: string
  fulfilled_at?: string
  notes?: string
}

// ============================================================================
// 6. ANALYTICS & REPORTING
// ============================================================================

export interface CollectionMetrics {
  id: string
  collector_id: string
  date: string
  total_pickups: number
  completed_pickups: number
  total_materials_kg: number
  total_value: number
  points_earned: number
  efficiency_score: number
  created_at: string
}

export interface ZoneAnalytics {
  id: string
  zone_id: string
  date: string
  total_pickups: number
  total_materials_kg: number
  total_value: number
  active_collectors: number
  created_at: string
}

// ============================================================================
// 7. NOTIFICATIONS & COMMUNICATIONS
// ============================================================================

export interface UserNotification {
  id: string
  user_id: string
  title: string
  message: string
  notification_type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  action_url?: string
  created_at: string
  read_at?: string
}

export interface SystemAnnouncement {
  id: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  target_roles: string[]
  active: boolean
  expires_at?: string
  created_by?: string
  created_at: string
}

// ============================================================================
// 8. AUDIT & LOGGING
// ============================================================================

export interface UserActivityLog {
  id: string
  user_id: string
  action: string
  details?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface SystemAuditLog {
  id: string
  action: string
  table_name?: string
  record_id?: string
  old_values?: any
  new_values?: any
  performed_by?: string
  performed_at: string
}

export interface AdminActionsLog {
  id: string
  admin_user_id: string
  action_type: 'wallet_reset' | 'metrics_reset' | 'user_suspension' | 'role_change' | 'points_adjustment' | 'data_export'
  target_user_id: string
  action_details: any
  reason?: string
  ip_address?: string
  created_at: string
}

// ============================================================================
// 9. EXTENDED TYPES FOR UI CONVENIENCE
// ============================================================================

export interface CollectionPickupWithDetails extends CollectionPickup {
  zone?: CollectionZone
  collector?: UserProfile
  items?: PickupItemWithMaterial[]
  photos?: PickupPhoto[]
  customer_wallet?: UserWallet
}

export interface PickupItemWithMaterial extends PickupItem {
  material?: Material
  material_category?: MaterialCategory
}

export interface UserProfileWithDetails extends UserProfile {
  wallet?: UserWallet
  zone_assignments?: ZoneAssignment[]
  collection_metrics?: CollectionMetrics[]
}

export interface MaterialWithCategory extends Material {
  category?: MaterialCategory
  pricing_tiers?: PricingTier[]
}

// ============================================================================
// 10. COLLECTOR-SPECIFIC TYPES
// ============================================================================

export interface CollectorDashboardData {
  profile: UserProfile
  wallet: UserWallet
  today_metrics: CollectionMetrics
  recent_pickups: CollectionPickupWithDetails[]
  assigned_zones: CollectionZone[]
  schedule: CollectionSchedule[]
}

export interface PickupFormData {
  customer_name: string
  customer_phone?: string
  customer_address: string
  scheduled_date: string
  scheduled_time?: string
  zone_id: string
  notes?: string
}

export interface PickupItemFormData {
  material_id: string
  quantity: number
  quality_rating?: number
  notes?: string
}

export interface PhotoUploadData {
  pickup_id: string
  photo_url: string
  photo_type: 'before' | 'after' | 'general' | 'verification'
}

// ============================================================================
// 11. LEGACY COMPATIBILITY TYPES
// ============================================================================
// These maintain backward compatibility with existing code

export interface Profile extends UserProfile {}
export interface Address {
  id: string
  profile_id: string
  line1: string
  suburb: string
  city: string
  postal_code?: string
  lat?: number
  lng?: number
  is_primary: boolean
}

export interface Pickup extends CollectionPickup {}
export interface Payment {
  id: string
  pickup_id: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'rejected'
  processed_at?: string
  method?: string
}

// ============================================================================
// 12. ENUM TYPES
// ============================================================================

export const UserRoles = {
  MEMBER: 'member',
  COLLECTOR: 'collector',
  ADMIN: 'admin',
  OFFICE_STAFF: 'office_staff'
} as const

export const PickupStatuses = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
} as const

export const MaterialUnits = {
  KG: 'kg',
  G: 'g',
  TON: 'ton',
  PIECE: 'piece',
  BOTTLE: 'bottle',
  BOX: 'box'
} as const

export const PhotoTypes = {
  BEFORE: 'before',
  AFTER: 'after',
  GENERAL: 'general',
  VERIFICATION: 'verification'
} as const

export const TransactionTypes = {
  EARNED: 'earned',
  SPENT: 'spent',
  BONUS: 'bonus',
  DEDUCTION: 'deduction',
  TRANSFER: 'transfer',
  RESET: 'reset',
  ADJUSTMENT: 'adjustment'
} as const

// ============================================================================
// 13. UTILITY TYPES
// ============================================================================

export type UserRole = typeof UserRoles[keyof typeof UserRoles]
export type PickupStatus = typeof PickupStatuses[keyof typeof PickupStatuses]
export type MaterialUnit = typeof MaterialUnits[keyof typeof MaterialUnits]
export type PhotoType = typeof PhotoTypes[keyof typeof PhotoTypes]
export type TransactionType = typeof TransactionTypes[keyof typeof TransactionTypes]

export type DatabaseTable = 
  | 'user_profiles'
  | 'collection_zones'
  | 'materials'
  | 'collection_pickups'
  | 'pickup_items'
  | 'user_wallets'
  | 'points_transactions'
  | 'admin_actions_log'

export type RealtimeChannel = 
  | 'user_profiles_changes'
  | 'collection_pickups_changes'
  | 'pickup_items_changes'
  | 'user_wallets_changes'
  | 'admin_actions_changes'

// ============================================================================
// 14. API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface CollectionStats {
  total_pickups: number
  completed_pickups: number
  scheduled_pickups: number
  in_progress_pickups: number
  total_materials_kg: number
  total_value: number
  efficiency_score: number
  points_earned: number
}

export interface ZoneStats {
  zone_id: string
  zone_name: string
  total_pickups: number
  total_materials_kg: number
  total_value: number
  completion_rate: number
}
