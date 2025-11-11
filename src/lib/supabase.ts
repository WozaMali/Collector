import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Trim to remove stray whitespace/CRLF that can break websocket apikey param
const supabaseUrl = rawUrl?.trim()
const supabaseAnonKey = rawAnonKey?.trim()

// Lazy initialization to allow build-time execution without env vars
// During build, Next.js may execute this code without env vars set
// We'll create a stub client during build and throw at runtime if missing

let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  // If client already initialized, return it
  if (supabaseClient) {
    return supabaseClient
  }

  // Check if we're in a build environment (no window, and not production runtime)
  const isBuildTime = typeof window === 'undefined' && process.env.NEXT_PHASE !== 'production-server'

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isBuildTime) {
      // During build, create a stub client to prevent build errors
      // This will fail at runtime if env vars aren't set
      supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
      return supabaseClient
    } else {
      // At runtime, throw error if env vars are missing
      throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
    }
  }

  // Debug logging (only at runtime)
  console.log('🔌 Creating Supabase client with:')
  console.log('🔌 URL:', supabaseUrl)
  console.log('🔌 Key length:', supabaseAnonKey.length)

  // Create real client with actual env vars
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      redirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || 'http://localhost:8082'
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'collector-app'
      }
    },
    // Add timeout configuration to prevent save operation timeouts
    realtime: {
      timeout: 30000, // 30 seconds
      heartbeatIntervalMs: 30000
    }
  })
  console.log('✅ Supabase client created successfully with timeout configuration')
  return supabaseClient
}

// Export a Proxy that lazily initializes the client on first access
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

// Database types matching your new schema
export interface Profile {
  id: string
  email: string
  username?: string
  first_name?: string
  last_name?: string
  phone?: string
  role: 'member' | 'collector' | 'admin'
  active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Address {
  id: string
  user_id: string
  address_type: 'primary' | 'secondary' | 'pickup' | 'billing'
  address_line1: string
  address_line2?: string
  city: string
  province: string
  postal_code?: string
  country: string
  coordinates?: { x: number; y: number }
  is_default: boolean
  active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  name: string
  unit: string
  rate_per_kg: number
  active: boolean
}

export interface Pickup {
  id: string
  customer_id: string
  collector_id: string
  pickup_address_id?: string
  started_at: string
  submitted_at?: string
  lat?: number
  lng?: number
  status: 'submitted' | 'approved' | 'rejected'
  approval_note?: string
  total_kg?: number
  total_value?: number
  payment_status?: 'pending' | 'paid' | 'failed'
  payment_method?: string
  customer_name?: string
  collector_name?: string
  pickup_date?: string
}

export interface PickupItem {
  id: string
  pickup_id: string
  material_id: string
  quantity: number
  unit_price: number
  quality_rating?: number
  notes?: string
}

export interface PickupPhoto {
  id: string
  pickup_id: string
  url: string
  taken_at: string
  lat?: number
  lng?: number
  type?: 'scale' | 'bags' | 'other'
}

export interface Payment {
  id: string
  pickup_id: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'rejected'
  processed_at?: string
  method?: string
}

// Extended types for UI convenience
export interface PickupWithDetails extends Pickup {
  customer?: Profile
  collector?: Profile
  pickup_address?: Address
  items?: PickupItemWithMaterial[]
  photos?: PickupPhoto[]
  payment?: Payment
}

export interface PickupItemWithMaterial extends PickupItem {
  material?: Material
}

export interface ProfileWithAddresses extends Profile {
  addresses?: Address[]
}

// NEW: Dashboard View Types
export interface CustomerDashboardView {
  pickup_id: string
  status: string
  started_at: string
  submitted_at?: string
  total_kg: number
  total_value: number
  environmental_impact: {
    co2_saved: number
    water_saved: number
    landfill_saved: number
    trees_equivalent: number
  }
  fund_allocation: {
    green_scholar_fund: number
    user_wallet: number
    total_value: number
  }
  total_points: number
  materials_breakdown: Array<{
    material_name: string
    weight_kg: number
    rate_per_kg: number
    value: number
    points: number
    impact: {
      co2_saved: number
      water_saved: number
      landfill_saved: number
      trees_equivalent: number
    }
  }>
  photo_count: number
  collector_name?: string
  collector_phone?: string
  address_line1?: string
  address_line2?: string
  city?: string
  province?: string
  postal_code?: string
}

export interface CollectorDashboardView {
  pickup_id: string
  status: string
  started_at: string
  submitted_at?: string
  total_kg: number
  total_value: number
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  address_line1?: string
  address_line2?: string
  city?: string
  province?: string
  postal_code?: string
  environmental_impact: {
    co2_saved: number
    water_saved: number
    landfill_saved: number
    trees_equivalent: number
  }
  fund_allocation: {
    green_scholar_fund: number
    user_wallet: number
    total_value: number
  }
  total_points: number
  materials_breakdown: Array<{
    material_name: string
    weight_kg: number
    rate_per_kg: number
    value: number
    points: number
    impact: {
      co2_saved: number
      water_saved: number
      landfill_saved: number
      trees_equivalent: number
    }
  }>
  photo_count: number
  payment_status?: string
  payment_amount?: number
  payment_method?: string
}

export interface AdminDashboardView {
  pickup_id: string
  status: string
  started_at: string
  submitted_at?: string
  total_kg: number
  total_value: number
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  collector_name?: string
  collector_phone?: string
  address_line1?: string
  address_line2?: string
  city?: string
  province?: string
  postal_code?: string
  environmental_impact: {
    co2_saved: number
    water_saved: number
    landfill_saved: number
    trees_equivalent: number
  }
  fund_allocation: {
    green_scholar_fund: number
    user_wallet: number
    total_value: number
  }
  total_points: number
  materials_breakdown: Array<{
    material_name: string
    weight_kg: number
    rate_per_kg: number
    value: number
    points: number
    impact: {
      co2_saved: number
      water_saved: number
      landfill_saved: number
      trees_equivalent: number
    }
  }>
  photo_count: number
  payment_status?: string
  payment_amount?: number
  payment_method?: string
  payment_processed_at?: string
  approval_note?: string
}

// NEW: Analytics Types
export interface SystemImpactView {
  total_pickups: number
  unique_customers: number
  unique_collectors: number
  total_kg_collected: number
  total_value_generated: number
  total_co2_saved: number
  total_water_saved: number
  total_landfill_saved: number
  total_trees_equivalent: number
  total_green_scholar_fund: number
  total_user_wallet_fund: number
  total_points_generated: number
  pending_pickups: number
  approved_pickups: number
  rejected_pickups: number
}

export interface MaterialPerformanceView {
  material_name: string
  category: string
  rate_per_kg: number
  pickup_count: number
  total_kg_collected: number
  total_value_generated: number
  avg_kg_per_pickup: number
  total_co2_saved: number
  total_water_saved: number
  total_landfill_saved: number
  total_points_generated: number
}

export interface CollectorPerformanceView {
  collector_id: string
  collector_name: string
  collector_email: string
  collector_phone: string
  total_pickups: number
  total_kg_collected: number
  total_value_generated: number
  total_co2_saved: number
  total_water_saved: number
  total_points_generated: number
  pending_pickups: number
  approved_pickups: number
  rejected_pickups: number
  last_pickup_date?: string
}

export interface CustomerPerformanceView {
  customer_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  total_pickups: number
  total_kg_recycled: number
  total_value_earned: number
  total_co2_saved: number
  total_water_saved: number
  total_points_earned: number
  total_green_scholar_contribution: number
  total_wallet_balance: number
  last_recycling_date?: string
}

// ============================================================================
// UNIFIED SCHEMA TYPES
// ============================================================================

// User types
export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  date_of_birth?: string;
  phone?: string;
  email: string;
  role_id: string;
  area_id?: string;
  street_addr?: string;
  township_id?: string;
  subdivision?: string;
  city: string;
  postal_code?: string;
  suburb?: string; // Legacy field
  status: 'active' | 'suspended' | 'deleted';
  last_login?: string;
  login_count: number;
  created_at: string;
  updated_at: string;
}

// Role types
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: any;
  created_at: string;
  updated_at: string;
}

// Area types
export interface Area {
  id: string;
  name: string;
  description?: string;
  city: string;
  province?: string;
  postal_code: string;
  subdivisions?: string[];
  boundaries?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Township dropdown types
export interface TownshipDropdown {
  id: string;
  township_name: string;
  postal_code: string;
  city: string;
  subdivisions: string[];
}

// Subdivision dropdown types
export interface SubdivisionDropdown {
  area_id: string;
  township_name: string;
  postal_code: string;
  subdivision: string;
}

// Residents view types
export interface Resident {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  street_addr?: string;
  township_id?: string;
  township_name?: string;
  subdivision?: string;
  suburb?: string; // Legacy field
  city: string;
  postal_code?: string;
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
  address_status: 'complete' | 'legacy' | 'incomplete';
}

// Extended types with relationships
export interface UserWithRole extends User {
  role?: Role;
}

export interface UserWithArea extends User {
  area?: Area;
}

export interface UserWithTownship extends User {
  township?: Area;
}

export interface UserComplete extends User {
  role?: Role;
  area?: Area;
  township?: Area;
}