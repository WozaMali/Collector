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
  Settings
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

      // Insert collection materials
      const materialsRows = selectedMaterials.map((m) => ({
        collection_id: collectionId,
        material_id: m.materialId,
        quantity: Number(m.kg),
        unit_price: idToRate.get(String(m.materialId)) || 0
      }));

      if (materialsRows.length > 0) {
        const { error: itemsErr } = await supabase
          .from('collection_materials')
          .insert(materialsRows);
        if (itemsErr) {
          console.error('Insert materials error:', itemsErr);
          // Continue; collection exists
        }
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
            onClick={() => setShowLiveCollection(true)}
          >
            <Package className="h-4 w-4" />
            Live Collection
          </Button>
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

      {/* Pickups List */}
      <div className="grid gap-3 sm:gap-4">
        {pickups.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">No pickups yet</h3>
              <p className="text-gray-300 text-center mb-4">
                Create your first pickup to start collecting recyclables
              </p>
              <Button onClick={() => { setSelectedUserForCollection(null); setIsCollectionFormOpen(true); }} className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Pickup
              </Button>
            </CardContent>
          </Card>
        ) : (
          pickups.map((pickup) => (
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
          ))
        )}
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
