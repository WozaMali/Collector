"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Plus, 
  History, 
  Package,
  Clock,
  Loader2,
  Camera,
  Upload,
  Search,
  ArrowLeft,
  BarChart3,
  Users,
  TrendingUp,
  Settings,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/Navigation";
import { PickupService, type CreatePickupData } from "@/lib/pickup-service";
import type { CollectorDashboardView, Material } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import { addressIntegrationService, ProfileWithAddress } from "@/lib/address-integration";
import { ResidentService, type Resident } from "@/lib/resident-service";
import { UnifiedCollectorService } from "@/lib/unified-collector-service";
import CollectionModal from "@/components/CollectionModal";
import LiveCollectionModal from "@/components/LiveCollectionModal";
import { UsersService } from "@/lib/users-service";
import { formatUserDisplayName } from "@/lib/user-utils";

export default function CollectorPickupsPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [pickups, setPickups] = useState<CollectorDashboardView[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [residents, setResidents] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [residentSearch, setResidentSearch] = useState('');
  const [isNewPickupOpen, setIsNewPickupOpen] = useState(false);
  const [newPickupForm, setNewPickupForm] = useState({
    customerId: '',
    addressId: '',
    notes: '',
    materials: [{ materialId: '', kg: 0 }],
    photos: [] as string[],
    location: { lat: 0, lng: 0 },
    estimatedWeight: 0
  });

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isCollectionFormOpen, setIsCollectionFormOpen] = useState(false);
  const [selectedUserForCollection, setSelectedUserForCollection] = useState<any | null>(null);
  const [showLiveCollection, setShowLiveCollection] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isApprovedPickupsOpen, setIsApprovedPickupsOpen] = useState(false);
  const [isPendingPickupsOpen, setIsPendingPickupsOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  useEffect(() => {
    if (user) {
      loadPickupsData();
      // Load residents and materials for unified creation form
      (async () => {
        try {
          const [{ data: mats }] = await Promise.all([
            supabase.from('materials').select('id, name, unit_price, rate_per_kg, current_rate')
          ]);
          setMaterials((mats || []).map((m: any) => ({ 
            id: String(m.id), 
            name: m.name, 
            unit_price: Number(m.current_rate ?? m.unit_price ?? m.rate_per_kg ?? 0) 
          })) as any);
          // initial residents
          await loadResidents('');
        } catch {}
      })();
    }
  }, [user]);

  // Realtime updates for unified_collections: refresh pickups on insert/update/delete
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('realtime-unified-collections-pickups')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'unified_collections', filter: `collector_id=eq.${user.id}` },
        () => {
          loadPickupsData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'unified_collections', filter: `created_by=eq.${user.id}` },
        () => {
          loadPickupsData();
        }
      )
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch {}
    };
  }, [user?.id]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!user) {
      window.location.href = '/login';
    }
  }, [user]);

  // Redirect non-collectors to unauthorized page
  useEffect(() => {
    if (user && user.role && 
        user.role !== 'collector' && user.role !== 'admin' &&
        user.role !== 'COLLECTOR' && user.role !== 'ADMIN') {
      window.location.href = '/unauthorized';
    }
  }, [user]);

  const loadPickupsData = async () => {
    try {
      setIsLoading(true);
      
      if (!user) return;
      
      // Unified schema: load collector's collections (no revenue usage, show kg only)
      const { data: unifiedData, error: unifiedError } = await supabase
        .from('unified_collections')
        .select('id, status, created_at, actual_date, customer_name, customer_email, pickup_address, total_weight_kg, total_value, customer_id, collector_id, created_by')
        .or(`collector_id.eq.${user.id},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!unifiedError) {
        const transformedPickups: CollectorDashboardView[] = (unifiedData || []).map((c: any) => ({
          pickup_id: c.id,
          status: c.status,
          started_at: c.actual_date || c.created_at,
          total_kg: Number(c.total_weight_kg) || 0,
          total_value: Number(c.total_value) || 0,
          customer_name: c.customer_name || 'Unknown Customer',
          customer_email: c.customer_email || 'No email',
          customer_phone: '',
          address_line1: c.pickup_address || 'No address',
          address_line2: '',
          city: '',
          postal_code: '',
          environmental_impact: undefined,
          fund_allocation: undefined,
          total_points: Number(c.total_weight_kg) || 0, // 1kg = 1 point (used by Main/Office)
          materials_breakdown: [],
          photo_count: 0,
          customer_id: c.customer_id
        }));

        setPickups(transformedPickups);
        return; // Short-circuit legacy/fallback path
      }
      
      // Get collections data using the new database structure
      const { data: collectionsData, error } = await supabase
        .from('collections')
        .select(`
          *,
          users!collections_user_id_fkey(first_name, last_name, email, phone),
          materials(name, rate_per_kg)
        `)
        .eq('collector_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching collections:', error);
        // Fallback to collection_details view if collections table doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('collection_details')
          .select('*')
          .eq('collector_id', user.id)
          .order('created_at', { ascending: false });

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return;
        }
        
        // Use fallback data
        const transformedPickups = (fallbackData || []).map((collection: any) => {
          const totalKg = collection.weight_kg || 0;
          const co2_saved = totalKg * 0.5;
          const water_saved = totalKg * 3.5;
          const landfill_saved = totalKg;
          const trees_equivalent = totalKg * 0.045;
          const totalValue = collection.estimated_value || 0;
          const total_points = totalKg * 6;
          
          const materials_breakdown = [{
            material_name: collection.material_name || 'Unknown Material',
            weight_kg: totalKg,
            rate_per_kg: collection.material_unit_price || 0,
            value: totalValue,
            points: total_points,
            impact: { co2_saved, water_saved, landfill_saved, trees_equivalent }
          }];

          return {
            pickup_id: collection.id,
          status: collection.status,
          started_at: collection.created_at,
          total_kg: totalKg,
          total_value: totalValue,
          customer_name: collection.resident_name || 'Unknown Customer',
          customer_email: collection.resident_email || 'No email',
          customer_phone: collection.resident_phone || 'No phone',
          address_line1: collection.area_name || 'No address',
          address_line2: '',
          city: collection.area_name || '',
          postal_code: '',
          environmental_impact: {
            co2_saved,
            water_saved,
            landfill_saved,
            trees_equivalent
          },
          fund_allocation: {
            green_scholar_fund,
            user_wallet,
            total_value: totalValue
          },
          total_points,
          materials_breakdown,
          photo_count: 0 // TODO: Get from pickup_photos table
        };
      });

      setPickups(transformedPickups);
      }
    } catch (error) {
      console.error('Error loading pickups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSearch = async () => {
    if (!userSearchTerm.trim()) {
      setSearchedUsers([]);
      return;
    }

    try {
      setSearchingUsers(true);
      
      // Get ALL active customers first, then filter client-side to show all matches
      const { data: allCustomers, error: allError } = await UsersService.getActiveCustomers();
      
      if (allError) {
        console.error('Error fetching all customers:', allError);
        // Fallback to limited search
        const { data, error } = await UsersService.searchActiveCustomers(
          userSearchTerm,
          undefined,
          'active',
          100
        );
        
        if (error) {
          console.error('Error searching users:', error);
          return;
        }
        
        const mapped = (data || []).map((u: any) => {
          const roleFromRelation = (u.roles && typeof u.roles === 'object' && u.roles.name) ? { name: u.roles.name } : undefined;
          return roleFromRelation ? { ...u, role: roleFromRelation } : u;
        });
        
        const searchLower = userSearchTerm.toLowerCase().trim();
        const filtered = mapped.filter((user: any) => {
          const firstName = (user.first_name || '').toLowerCase().trim();
          const lastName = (user.last_name || '').toLowerCase().trim();
          const fullName = (user.full_name || '').toLowerCase().trim();
          
          return firstName.includes(searchLower) || 
                 lastName.includes(searchLower) || 
                 fullName.includes(searchLower);
        });
        
        setSearchedUsers(filtered);
        return;
      }

      // Normalize role field for all customers
      const mapped = (allCustomers || []).map((u: any) => {
        const roleFromRelation = (u.roles && typeof u.roles === 'object' && u.roles.name) ? { name: u.roles.name } : undefined;
        return roleFromRelation ? { ...u, role: roleFromRelation } : u;
      });

      // Filter to only name matches (not email) - search against actual database names
      const searchLower = userSearchTerm.toLowerCase().trim();
      const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
      
      const filtered = mapped.filter((user: any) => {
        // Search against actual database names
        const firstName = (user.first_name || '').toLowerCase().trim();
        const lastName = (user.last_name || '').toLowerCase().trim();
        const fullName = (user.full_name || '').toLowerCase().trim();
        
        // If single word search, match against first name or last name
        if (searchWords.length === 1) {
          const word = searchWords[0];
          return firstName === word || 
                 lastName === word ||
                 firstName.startsWith(word) ||
                 lastName.startsWith(word) ||
                 firstName.includes(word) ||
                 lastName.includes(word);
        }
        
        // If multiple words, try to match as first name + last name (in any order)
        if (searchWords.length >= 2) {
          const word1 = searchWords[0];
          const word2 = searchWords[1];
          return (firstName.includes(word1) && lastName.includes(word2)) ||
                 (firstName.includes(word2) && lastName.includes(word1)) ||
                 (firstName === word1 && lastName === word2) ||
                 (firstName === word2 && lastName === word1) ||
                 fullName.includes(searchLower);
        }
        
        // Fallback: match against any part of the name
        return firstName.includes(searchLower) || 
               lastName.includes(searchLower) || 
               fullName.includes(searchLower);
      });

      // Sort results: exact matches first, then by first name
      filtered.sort((a, b) => {
        const aFirstName = (a.first_name || '').toLowerCase().trim();
        const aLastName = (a.last_name || '').toLowerCase().trim();
        const bFirstName = (b.first_name || '').toLowerCase().trim();
        const bLastName = (b.last_name || '').toLowerCase().trim();
        
        // Exact matches first
        const aExact = aFirstName === searchLower || aLastName === searchLower;
        const bExact = bFirstName === searchLower || bLastName === searchLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then by first name
        return aFirstName.localeCompare(bFirstName);
      });

      setSearchedUsers(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const loadResidents = async (term: string) => {
    try {
      const { data } = await UnifiedCollectorService.getAllResidents();
      const all = (data || []).map((r: any) => {
        const fullName = (r.full_name && String(r.full_name).trim())
          || `${r.first_name || ''} ${r.last_name || ''}`.trim()
          || r.name
          || r.email
          || 'Resident';
        return { id: String(r.id), full_name: fullName, email: r.email || '' };
      });
      const t = (term || '').trim().toLowerCase();
      const filtered = t
        ? all.filter(x => x.full_name.toLowerCase().includes(t) || x.email.toLowerCase().includes(t))
        : all;
      setResidents(filtered.slice(0, 50));
    } catch (e) {
      // ignore
      setResidents([]);
    }
  };

  const handleCreatePickup = async () => {
    if (!user) return;
    const selectedMaterials = newPickupForm.materials.filter(m => m.materialId && m.kg > 0);
    if (!newPickupForm.customerId || selectedMaterials.length === 0) {
      toast.error('Please select a customer and add at least one material with weight.');
      return;
    }

    try {
      setIsLoading(true);
      // Compute totals from selected materials using loaded material rates
      const idToRate = new Map(materials.map((m: any) => [String(m.id), Number(m.unit_price) || 0]));
      const total_weight_kg = selectedMaterials.reduce((s, m) => s + (Number(m.kg) || 0), 0);
      const total_value = selectedMaterials.reduce((s, m) => s + (Number(m.kg) || 0) * (idToRate.get(String(m.materialId)) || 0), 0);

      // Insert unified collection
      const insertPayload: any = {
        customer_id: newPickupForm.customerId,
        collector_id: user.id,
        created_by: user.id,
        pickup_address_id: newPickupForm.addressId || null,
        pickup_address: null,
        total_weight_kg: Number(total_weight_kg.toFixed(2)),
        total_value: Number(total_value.toFixed(2)),
        material_count: selectedMaterials.length,
        status: 'pending',
        customer_notes: newPickupForm.notes || null,
        actual_date: null
      };

      const { data: collection, error: createErr } = await supabase
        .from('unified_collections')
        .insert(insertPayload)
        .select('id')
        .single();

      if (createErr || !collection?.id) {
        console.error('Create collection error:', createErr);
        toast.error('Failed to create collection');
        return;
      }

      const collectionId = collection.id;

      // Insert collection materials - ensure material_id is required
      const materialsRows = selectedMaterials
        .filter((m) => {
          if (!m.materialId) {
            console.error('Material missing material_id:', m);
            return false;
          }
          return true;
        })
        .map((m) => {
          if (!m.materialId) {
            throw new Error('Material ID is required for all materials');
          }
          return {
            collection_id: collectionId,
            material_id: m.materialId, // Required - must exist
            quantity: Number(m.kg),
            unit_price: idToRate.get(String(m.materialId)) || 0
          };
        });

      if (materialsRows.length > 0) {
        const { error: itemsErr } = await supabase
          .from('collection_materials')
          .insert(materialsRows);
        if (itemsErr) {
          console.error('Insert materials error:', itemsErr);
          toast.error(`Failed to save materials: ${itemsErr.message}`);
          // Continue; collection exists
        }
      } else {
        toast.error('No valid materials with material_id to save');
      }

      toast.success('Collection created');
      setIsNewPickupOpen(false);
      setNewPickupForm({
        customerId: '',
        addressId: '',
        notes: '',
        materials: [{ materialId: '', kg: 0 }],
        photos: [],
        location: { lat: 0, lng: 0 },
        estimatedWeight: 0
      });
      await loadPickupsData();
    } catch (e) {
      console.error('Create pickup exception:', e);
      toast.error('An error occurred creating the collection');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking authentication
  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-3 sm:p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Pickups</h1>
            <p className="text-gray-300 text-sm">Manage your collection pickups</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-col sm:flex-row">
          <Button 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg"
            onClick={() => {
              setSelectedUserForCollection(null);
              setIsCollectionFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Pickup
          </Button>
        </div>
      </div>

      {/* User Search - Same as Users page */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-orange-500" />
          <span className="text-white font-medium">Search Users</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Search</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by first name or last name..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleUserSearch();
                    }
                  }}
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <Button
                onClick={handleUserSearch}
                disabled={searchingUsers}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {searchingUsers ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
              {userSearchTerm && (
                <Button
                  onClick={() => {
                    setUserSearchTerm('');
                    setSearchedUsers([]);
                  }}
                  variant="outline"
                  className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Searched Users - Resident Cards */}
      {searchedUsers.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-4">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <span className="text-white font-medium">
                Search Results ({searchedUsers.length})
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Tap Collect to start a collection for that user
            </p>
          </div>
          <div className="divide-y divide-gray-700">
            {searchedUsers.map((user) => (
              <div key={user.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-700/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-white text-sm sm:text-base truncate">
                      {/* Always prioritize first_name and last_name from users table (saved during Sign Up/Profile Completion) */}
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`.trim()
                        : user.full_name || user.email?.split('@')[0] || 'Unknown User'}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400 truncate">
                      {user.email ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : ''}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-400 truncate">
                      <MapPin className="h-3 w-3 text-orange-400 flex-shrink-0" />
                      <span className="truncate" title="Address hidden for privacy">
                        {user.street_addr ? user.street_addr.replace(/[A-Za-z0-9]/g, '*') : 'Address not provided'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedUserForCollection(user);
                      setIsCollectionFormOpen(true);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white px-3 py-2 text-xs sm:text-sm"
                  >
                    Collect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Approval Pickups Dropdown Card */}
      {pickups.filter(p => p.status === 'pending' || p.status === 'submitted').length > 0 && (
        <Collapsible open={isPendingPickupsOpen} onOpenChange={setIsPendingPickupsOpen} className="mb-4">
          <CollapsibleTrigger asChild>
            <Card className="bg-gray-800 border-gray-700 text-white cursor-pointer hover:bg-gray-750 transition-colors">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-400" />
                    <div>
                      <CardTitle className="text-white text-sm sm:text-base">Pending Approval</CardTitle>
                      <CardDescription className="text-gray-300 text-xs">
                        {pickups.filter(p => p.status === 'pending' || p.status === 'submitted').length} pending pickups
                      </CardDescription>
                    </div>
                  </div>
                  {isPendingPickupsOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="grid gap-3 sm:gap-4">
                {(() => {
                  // Group pending pickups by date
                  const pendingPickups = pickups.filter(p => 
                    (p.status === 'pending' || p.status === 'submitted')
                  );
                  
                  // Sort by date (newest first)
                  pendingPickups.sort((a, b) => {
                    const dateA = new Date(a.started_at || a.created_at || 0).getTime();
                    const dateB = new Date(b.started_at || b.created_at || 0).getTime();
                    return dateB - dateA;
                  });

                  // Group by date
                  const groupedByDate = pendingPickups.reduce((acc, pickup) => {
                    const date = new Date(pickup.started_at || pickup.created_at || Date.now());
                    const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    if (!acc[dateKey]) {
                      acc[dateKey] = [];
                    }
                    acc[dateKey].push(pickup);
                    return acc;
                  }, {} as Record<string, typeof pendingPickups>);

                  return Object.entries(groupedByDate).map(([date, pickupsForDate]) => (
                    <div key={date} className="mb-4">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                        <Calendar className="h-4 w-4 text-yellow-400" />
                        <h3 className="text-sm font-semibold text-gray-300">{date}</h3>
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          {pickupsForDate.length} pickup{pickupsForDate.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {pickupsForDate.map((pickup) => (
                        <Card key={pickup.pickup_id} className="bg-gray-700/50 border-gray-600 text-white hover:shadow-lg transition-shadow duration-200 mb-2">
                          <CardContent className="p-2 sm:p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs sm:text-sm font-medium truncate">
                                  {pickup.customer_name}
                                </p>
                                <p className="text-gray-400 text-xs truncate">
                                  {pickup.total_kg} kg • C{pickup.total_value.toFixed(2)}
                                </p>
                              </div>
                              <Badge variant="default" className="bg-yellow-500 text-white text-xs shrink-0">
                                {pickup.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Approved Pickups Dropdown Card */}
      {pickups.filter(p => p.status === 'approved' || p.status === 'completed').length > 0 && (
        <Collapsible open={isApprovedPickupsOpen} onOpenChange={setIsApprovedPickupsOpen} className="mb-4">
          <CollapsibleTrigger asChild>
            <Card className="bg-gray-800 border-gray-700 text-white cursor-pointer hover:bg-gray-750 transition-colors">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-400" />
                    <div>
                      <CardTitle className="text-white text-sm sm:text-base">Approved Pickups</CardTitle>
                      <CardDescription className="text-gray-300 text-xs">
                        {pickups.filter(p => p.status === 'approved' || p.status === 'completed').length} approved/completed pickups
                      </CardDescription>
                    </div>
                  </div>
                  {isApprovedPickupsOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="grid gap-3 sm:gap-4">
                {(() => {
                  // Group approved pickups by date
                  const approvedPickups = pickups.filter(p => 
                    (p.status === 'approved' || p.status === 'completed')
                  );
                  
                  // Sort by date (newest first)
                  approvedPickups.sort((a, b) => {
                    const dateA = new Date(a.started_at || a.created_at || 0).getTime();
                    const dateB = new Date(b.started_at || b.created_at || 0).getTime();
                    return dateB - dateA;
                  });

                  // Group by date
                  const groupedByDate = approvedPickups.reduce((acc, pickup) => {
                    const date = new Date(pickup.started_at || pickup.created_at || Date.now());
                    const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    if (!acc[dateKey]) {
                      acc[dateKey] = [];
                    }
                    acc[dateKey].push(pickup);
                    return acc;
                  }, {} as Record<string, typeof approvedPickups>);

                  return Object.entries(groupedByDate).map(([date, pickupsForDate]) => (
                    <div key={date} className="mb-4">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                        <Calendar className="h-4 w-4 text-green-400" />
                        <h3 className="text-sm font-semibold text-gray-300">{date}</h3>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          {pickupsForDate.length} pickup{pickupsForDate.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {pickupsForDate.map((pickup) => (
                        <Card key={pickup.pickup_id} className="bg-gray-700/50 border-gray-600 text-white hover:shadow-lg transition-shadow duration-200 mb-2">
                          <CardContent className="p-2 sm:p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs sm:text-sm font-medium truncate">
                                  {pickup.customer_name}
                                </p>
                                <p className="text-gray-400 text-xs truncate">
                                  {pickup.total_kg} kg • C{pickup.total_value.toFixed(2)}
                                </p>
                              </div>
                              <Badge variant="default" className="bg-green-500 text-white text-xs shrink-0">
                                {pickup.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Other Pickups List */}
      <div className="grid gap-3 sm:gap-4">
        {(() => {
          // Filter pickups based on search and status, excluding approved/completed and pending
          const filteredPickups = pickups.filter(p => {
            const isApproved = p.status === 'approved' || p.status === 'completed';
            const isPending = p.status === 'pending' || p.status === 'submitted';
            if (isApproved || isPending) return false; // Exclude approved and pending from main list
            
            const matchesSearch = !searchTerm || 
              p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.address_line1 && p.address_line1.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            
            return matchesSearch && matchesStatus;
          });

          if (filteredPickups.length === 0) {
            return (
              <Card className="bg-gray-800 border-gray-700 text-white">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No pickups found</h3>
                  <p className="text-gray-300 text-center mb-4">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'Create your first pickup to start collecting recyclables'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button onClick={() => { setSelectedUserForCollection(null); setIsCollectionFormOpen(true); }} className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Pickup
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          }

          return filteredPickups.map((pickup) => (
            <Card key={pickup.pickup_id} className="bg-gray-800 border-gray-700 text-white hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="p-3 sm:p-4 pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
                      <MapPin className="h-4 w-4 text-orange-400" />
                      Pickup #{pickup.pickup_id}
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-xs sm:text-sm">
                      {pickup.customer_name} • {pickup.address_line1}, {pickup.address_line2}, {pickup.city}
                    </CardDescription>
                  </div>
                  <Badge variant={pickup.status === 'completed' ? 'default' : 'secondary'} className="bg-orange-500 text-white">
                    {pickup.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4">
                  <div>
                    <span className="font-medium text-gray-300">Date:</span> {pickup.started_at}
                  </div>
                  <div>
                    <span className="font-medium text-gray-300">Materials:</span> {pickup.materials_breakdown.length}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    onClick={() => {
                      setSelectedUserForCollection({
                        id: pickup.customer_id,
                        full_name: pickup.customer_name,
                        email: pickup.customer_email || "",
                        phone: pickup.customer_phone || "",
                        street_addr: pickup.customer_address || "",
                        city: "",
                        postal_code: "",
                        township_id: pickup.township_id || ""
                      });
                      setIsCollectionFormOpen(true);
                    }}
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Collect from {pickup.customer_name}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ));
        })()}
      </div>

      {/* Unified Users-page Collection Modal */}
      {isCollectionFormOpen && (
        <CollectionModal
          isOpen={isCollectionFormOpen}
          onClose={() => {
            setIsCollectionFormOpen(false);
            setSelectedUserForCollection(null);
          }}
          user={selectedUserForCollection}
          onSuccess={() => {
            setIsCollectionFormOpen(false);
            setSelectedUserForCollection(null);
            loadPickupsData();
          }}
        />
      )}

      {/* Live Collection Modal */}
      <LiveCollectionModal
        isOpen={showLiveCollection}
        onClose={() => setShowLiveCollection(false)}
        onSuccess={() => {
          setShowLiveCollection(false);
          loadPickupsData();
        }}
      />

      {/* Navigation */}
      <Navigation />
    </div>
  );
}
