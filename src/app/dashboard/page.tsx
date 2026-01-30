"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import { 
  Package, 
  Users, 
  TrendingUp, 
  Calendar,
  MapPin,
  History,
  BarChart3,
  Search,
  User,
  Mail,
  Phone,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import CollectionModal from "@/components/CollectionModal";
import LiveCollectionModal from "@/components/LiveCollectionModal";
import { UsersService } from "@/lib/users-service";

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [collectorName, setCollectorName] = useState<{ firstName: string; lastName: string } | null>(null);

  // Fetch collector's first and last name from database
  useEffect(() => {
    const fetchCollectorName = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setCollectorName({
            firstName: data.first_name || '',
            lastName: data.last_name || ''
          });
        }
      } catch (error) {
        console.error('Error fetching collector name:', error);
      }
    };

    fetchCollectorName();
  }, [user?.id]);

  const displayName = useMemo(() => {
    if (collectorName?.firstName && collectorName?.lastName) {
      return `${collectorName.firstName} ${collectorName.lastName}`;
    } else if (collectorName?.firstName) {
      return collectorName.firstName;
    } else if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }, [collectorName, user?.email]);
  const [recentPickups, setRecentPickups] = useState<Array<{
    id: string;
    customer: string;
    address: string;
    time: string;
    status: string;
    totalKg?: number;
  }>>([]);

  const [stats, setStats] = useState({
    todayPickups: 0,
    totalCustomers: 0,
    collectionRate: 0,
    walletBalance: 0,
    totalWeight: 0
  });

  const [loading, setLoading] = useState(true);
  
  // User search state
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [allCustomers, setAllCustomers] = useState<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    full_name?: string;
    status: string;
    role_id: string;
    created_at: string;
    street_addr?: string;
    township_id?: string;
    subdivision?: string;
    suburb?: string;
    city?: string;
    postal_code?: string;
    area_id?: string;
  }>>([]);
  const [searchedUsers, setSearchedUsers] = useState<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    full_name?: string;
    status: string;
    role_id: string;
    created_at: string;
    street_addr?: string;
    township_id?: string;
    subdivision?: string;
    suburb?: string;
    city?: string;
    postal_code?: string;
    area_id?: string;
  }>>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [showLiveCollection, setShowLiveCollection] = useState(false);
  const [isRecentPickupsOpen, setIsRecentPickupsOpen] = useState(false);
  const [isPickupRequestsOpen, setIsPickupRequestsOpen] = useState(false);
  const [pickupRequests, setPickupRequests] = useState<Array<{
    id: string;
    customer: string;
    address: string;
    time: string;
    status: string;
    totalKg?: number;
  }>>([]);

  const formatTime = (isoOrTime?: string | null) => {
    if (!isoOrTime) return "";
    try {
      // If only time provided (HH:mm:ss), show HH:mm
      if (/^\d{2}:\d{2}/.test(isoOrTime)) {
        return isoOrTime.slice(0, 5);
      }
      const d = new Date(isoOrTime);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  const formatAddress = (user: any) => {
    const addressParts = [];
    
    if (user.street_addr) addressParts.push(user.street_addr);
    if (user.subdivision) addressParts.push(user.subdivision);
    if (user.suburb) addressParts.push(user.suburb);
    if (user.city) addressParts.push(user.city);
    if (user.postal_code) addressParts.push(user.postal_code);
    
    return addressParts.length > 0 ? addressParts.join(', ') : 'Address not provided';
  };

  const statsData = useMemo(() => ([
    {
      title: "Today's Pickups",
      value: stats.todayPickups.toString(),
      change: "",
      icon: "/delivery.png",
      color: "text-blue-500",
      iconColor: "blue"
    },
    {
      title: "Total Weight",
      value: `${stats.totalWeight.toFixed(1)}kg`,
      change: "",
      icon: "/weight-scale.png",
      color: "text-orange-500",
      iconColor: "orange"
    },
    {
      title: "Collection Rate",
      value: `${stats.collectionRate.toFixed(1)}%`,
      change: "",
      icon: BarChart3,
      color: "text-yellow-500"
    }
  ]), [stats]);

  // Load dashboard data with timeout protection
  const loadDashboardData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Fetch stats data with timeout protection
      const fetchWithTimeout = async (promise: Promise<any>, timeoutMs: number) => {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Fetch timeout')), timeoutMs)
        );
        return Promise.race([promise, timeout]);
      };

      const [
        { data: todayPickupsData, error: todayPickupsError },
        { data: totalCustomersData, error: totalCustomersError },
        { data: recentPickupsData, error: recentPickupsError },
        { data: walletData, error: walletError }
      ] = await Promise.all([
        // Today's pickups count
        fetchWithTimeout(
          supabase
            .from('unified_collections')
            .select('id', { count: 'exact' })
            .gte('created_at', startOfDay.toISOString())
            .lt('created_at', endOfDay.toISOString())
            .eq('collector_id', user.id),
          10000 // 10 second timeout
        ).catch(() => ({ data: null, error: { message: 'Timeout' } })),
        
        // Same as Users page: active customers count + first 50 for Live Collection list
        fetchWithTimeout(
          Promise.all([
            UsersService.getActiveCustomersCount(),
            UsersService.getActiveCustomersLimited(50),
          ]).then(([countRes, listRes]) => ({
            data: { count: countRes.count, list: listRes.data || [] },
            error: countRes.error || listRes.error || null,
          })),
          10000
        ).catch(() => ({ data: null, error: { message: 'Timeout' } })),
        
        // Recent pickups
        fetchWithTimeout(
          supabase
            .from('unified_collections')
            .select('id, customer_name, pickup_address, actual_time, status, total_weight_kg, created_at, collector_id, created_by')
            .eq('collector_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          10000 // 10 second timeout
        ).catch(() => ({ data: null, error: { message: 'Timeout' } })),
        
        // Wallet balance and total weight from approved/completed collections
        fetchWithTimeout(
          supabase
            .from('unified_collections')
            .select('status, total_weight_kg, total_value')
            .eq('collector_id', user.id)
            .in('status', ['approved', 'completed']),
          10000 // 10 second timeout
        ).catch(() => ({ data: null, error: { message: 'Timeout' } }))
      ]);

      // Calculate stats (handle errors gracefully)
      const todayPickups = todayPickupsData?.length || 0;
      const totalCustomers = totalCustomersData?.data?.count ?? totalCustomersData?.data?.list?.length ?? 0;
      
      // Store first 50 customers for Live Collection (same role normalization as Users page)
      const rawCustomers = totalCustomersData?.data?.list || [];
      const mappedCustomers = (rawCustomers || []).map((u: any) => {
        const roleFromRelation = (u.roles && typeof u.roles === 'object' && u.roles.name) ? { name: u.roles.name } : undefined;
        return roleFromRelation ? { ...u, role: roleFromRelation } : u;
      });
      setAllCustomers(mappedCustomers);
      
      // Calculate wallet balance and total weight from approved/completed collections
      const walletBalance = (walletData || []).reduce((sum, c) => sum + (Number(c.total_value) || 0), 0);
      const totalWeight = (walletData || []).reduce((sum, c) => sum + (Number(c.total_weight_kg) || 0), 0);
      
      // Calculate collection rate based on all collections (approved + completed vs total)
      let collectionRate = 0;
      try {
        // Get all collections for this collector to calculate success rate
        const { data: allCollectionsData } = await fetchWithTimeout(
          supabase
            .from('unified_collections')
            .select('status')
            .eq('collector_id', user.id),
          10000 // 10 second timeout
        ).catch(() => ({ data: null }));
        
        const totalCollections = allCollectionsData?.length || 0;
        // Count both approved and completed as successful collections
        const successfulCollections = allCollectionsData?.filter((item: any) => 
          item.status === 'approved' || item.status === 'completed'
        ).length || 0;
        
        collectionRate = totalCollections > 0 ? (successfulCollections / totalCollections) * 100 : 0;
      } catch (error) {
        console.warn('Error calculating collection rate:', error);
        // Fallback: calculate from walletData if available
        const totalFromWallet = (walletData || []).length;
        const allCollectionsCount = totalFromWallet; // This is only approved/completed
        // We can't get total from walletData alone, so keep rate at 0 if error
      }

      setStats({
        todayPickups,
        totalCustomers,
        collectionRate,
        walletBalance,
        totalWeight
      });

      // Map recent pickups
      const mapped = (recentPickupsData || []).map((row: any) => ({
        id: row.id,
        customer: row.customer_name || 'Customer',
        address: row.pickup_address || '',
        time: formatTime(row.actual_time || row.created_at),
        status: (row.status || '').replace('_', ' ').replace(/^./, (s: string) => s.toUpperCase()),
        totalKg: typeof row.total_weight_kg === 'number' ? row.total_weight_kg : (row.total_weight_kg ? Number(row.total_weight_kg) : undefined),
      }));
      setRecentPickups(mapped);

      // Load pickup requests (pending/submitted status)
      try {
        const { data: requestsData } = await fetchWithTimeout(
          supabase
            .from('unified_collections')
            .select('id, customer_name, pickup_address, actual_time, status, total_weight_kg, created_at, collector_id, created_by')
            .or(`collector_id.eq.${user.id},created_by.eq.${user.id}`)
            .in('status', ['pending', 'submitted'])
            .order('created_at', { ascending: false })
            .limit(10),
          10000
        ).catch(() => ({ data: null }));

        const mappedRequests = (requestsData || []).map((row: any) => ({
          id: row.id,
          customer: row.customer_name || 'Customer',
          address: row.pickup_address || '',
          time: formatTime(row.actual_time || row.created_at),
          status: (row.status || '').replace('_', ' ').replace(/^./, (s: string) => s.toUpperCase()),
          totalKg: typeof row.total_weight_kg === 'number' ? row.total_weight_kg : (row.total_weight_kg ? Number(row.total_weight_kg) : undefined),
        }));
        setPickupRequests(mappedRequests);
      } catch (error) {
        console.warn('Error loading pickup requests:', error);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Don't block app if data loading fails
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load data on mount and when user changes
  useEffect(() => {
    let loadingTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;
    
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    // Add timeout to prevent infinite loading
    loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Dashboard: Data loading timeout, clearing loading state');
        setLoading(false);
      }
    }, 15000); // 15 second timeout
    
    loadDashboardData().finally(() => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    });

    return () => {
      isMounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [user?.id, loadDashboardData]);

  // Realtime subscription disabled to prevent loading loops
  // Can be re-enabled later with proper debouncing if needed

  // User search for Live Collection (same as Users page)
  const handleUserSearch = async () => {
    if (!userSearchTerm.trim()) {
      setSearchedUsers([]);
      return;
    }

    if (userSearchTerm.length < 2) {
      setSearchedUsers([]);
      return;
    }

    try {
      setSearchingUsers(true);

      const { data, error } = await UsersService.searchActiveCustomers(
        userSearchTerm,
        undefined,
        'active',
        100
      );

      if (error) {
        console.error('Error searching users:', error);
        setSearchedUsers([]);
        return;
      }

      const mapped = (data || []).map((u: any) => {
        const roleFromRelation = (u.roles && typeof u.roles === 'object' && u.roles.name) ? { name: u.roles.name } : undefined;
        return roleFromRelation ? { ...u, role: roleFromRelation } : u;
      });
      setSearchedUsers(mapped);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (user: any) => {
    console.log('🎯 User selected:', user);
    setSelectedUser(user);
    setShowCollectionForm(true);
  };

  // Handle collection form close
  const handleCollectionClose = () => {
    setShowCollectionForm(false);
    setSelectedUser(null);
  };

  // Handle collection success
  const handleCollectionSuccess = () => {
    setShowCollectionForm(false);
    setSelectedUser(null);
    // Refresh dashboard data by triggering useEffect
    window.location.reload();
  };

  // Search users when search term changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchTerm.length >= 2) {
        handleUserSearch();
      } else {
        setSearchedUsers([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchTerm]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/w yellow.png" 
              alt="WozaMali Logo" 
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen pb-28">
      {/* Header */}
      <header className="app-header px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/W Green.png.png" alt="WozaMali" className="h-12 sm:h-14 w-auto" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Woza Collector</h1>
              <p className="text-gray-400 text-sm">Welcome back, {displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <MapPin className="h-4 w-4 text-emerald-400" />
            <span className="text-gray-300 text-sm font-medium">
              {(user as any)?.areas?.name ?? "Area not assigned"}
            </span>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          {statsData.map((stat, index) => {
            const isImageIcon = typeof stat.icon === 'string';
            const Icon = isImageIcon ? null : stat.icon;
            return (
              <div key={index} className="app-stat-card p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-xs sm:text-sm font-medium">{stat.title}</p>
                    <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                      {loading ? (
                        <div className="animate-pulse h-8 w-16 rounded bg-gray-600/50" />
                      ) : (
                        stat.value
                      )}
                    </div>
                    {stat.change ? <p className="text-emerald-400/90 text-[11px] sm:text-xs mt-0.5">{stat.change}</p> : null}
                  </div>
                  {isImageIcon ? (
                    <img
                      src={stat.icon}
                      alt={stat.title}
                      className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 opacity-90"
                      style={{
                        filter: stat.iconColor === 'blue'
                          ? 'brightness(0) saturate(100%) invert(50%) sepia(90%) saturate(1200%) hue-rotate(190deg)'
                          : stat.iconColor === 'orange'
                          ? 'brightness(0) saturate(100%) invert(60%) sepia(90%) saturate(1200%) hue-rotate(0deg)'
                          : 'brightness(0) saturate(100%) invert(60%) sepia(70%) saturate(800%) hue-rotate(120deg)',
                      }}
                    />
                  ) : (
                    Icon && <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-400/90 flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Collection */}
        <div className="app-card mb-6 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[var(--app-border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                  <img src="/delivery.png" alt="" className="h-6 w-6 opacity-90" style={{ filter: 'brightness(0) saturate(100%) invert(60%) sepia(70%) saturate(800%) hue-rotate(120deg)' }} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white">Live Collection</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Search for a customer to begin collection</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="text-gray-300 text-sm font-medium">{stats.totalCustomers} users</span>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -trangray-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by first name or last name..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10 app-input-bg text-white placeholder-gray-400 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl text-sm border"
                />
              </div>

              {/* Search Results */}
              {searchingUsers && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                  <span className="ml-2 text-gray-400">Searching...</span>
                </div>
              )}

              {!searchingUsers && userSearchTerm.length >= 2 && searchedUsers.length === 0 && (
                <div className="text-center py-8 rounded-xl app-card-inner-subtle">
                  <User className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300 text-sm font-medium">No customers found</p>
                  <p className="text-xs text-gray-500 mt-1">Try a different search term</p>
                </div>
              )}

              {!searchingUsers && userSearchTerm.length < 2 && allCustomers.length === 0 && (
                <div className="text-center py-8 rounded-xl app-card-inner-subtle">
                  <Search className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-300 text-sm font-medium">Start typing to search customers</p>
                  <p className="text-xs text-gray-500 mt-1">Enter at least 2 characters</p>
                </div>
              )}

              {!searchingUsers && userSearchTerm.length < 2 && allCustomers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-gray-400">
                    {stats.totalCustomers > allCustomers.length
                      ? `Showing first ${allCustomers.length} of ${stats.totalCustomers} customers — search by name to find more`
                      : `${allCustomers.length} customer${allCustomers.length !== 1 ? 's' : ''} — tap one to start collection, or search by name`}
                  </p>
                  {allCustomers.map((user) => (
                    <div 
                      key={user.id}
                      className="p-3 sm:p-4 flex items-center justify-between rounded-xl app-card-inner hover:brightness-110 transition-all cursor-pointer"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-white text-sm sm:text-base truncate">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}`.trim()
                              : user.full_name || user.email?.split('@')[0] || 'Unknown User'}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400 truncate">
                            {user.email ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : ''}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-400 truncate">
                            <MapPin className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                            <span className="truncate" title="Address hidden for privacy">
                              {user.street_addr ? user.street_addr.replace(/[A-Za-z0-9]/g, '*') : 'Address not provided'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserSelect(user);
                          }}
                          className="app-btn-primary px-4 py-2 text-xs sm:text-sm flex-shrink-0"
                        >
                          Collect
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchedUsers.length > 0 && userSearchTerm.length >= 2 && (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-gray-400">
                    Found {searchedUsers.length} customer{searchedUsers.length !== 1 ? 's' : ''}
                  </p>
                  {searchedUsers.map((user) => (
                    <div 
                      key={user.id}
                      className="p-3 sm:p-4 flex items-center justify-between rounded-xl app-card-inner hover:brightness-110 transition-all cursor-pointer"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-emerald-400" />
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
                            <MapPin className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                            <span className="truncate" title="Address hidden for privacy">
                              {user.street_addr ? user.street_addr.replace(/[A-Za-z0-9]/g, '*') : 'Address not provided'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserSelect(user);
                          }}
                          className="app-btn-primary px-4 py-2 text-xs sm:text-sm flex-shrink-0"
                        >
                          Collect
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Pickups */}
        <Collapsible open={isRecentPickupsOpen} onOpenChange={setIsRecentPickupsOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Card className="app-card text-white cursor-pointer hover:brightness-110 transition-all">
              <CardHeader className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                      <History className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg font-semibold text-white">Recent Pickups</CardTitle>
                      <CardDescription className="text-gray-400 text-xs sm:text-sm">
                        {recentPickups.length} recent pickup{recentPickups.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  {isRecentPickupsOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="app-card overflow-hidden mt-2">
              <div className="divide-y divide-[var(--app-border)]">
                {recentPickups.length === 0 ? (
                  <div className="p-6 text-center">
                    <History className="h-10 w-10 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No recent pickups</p>
                  </div>
                ) : (
                  recentPickups.map((pickup) => (
                    <div key={pickup.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm sm:text-base">{pickup.customer}</p>
                        <p className="text-gray-400 text-xs sm:text-sm">{pickup.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-300 text-xs sm:text-sm">{pickup.time}</p>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          pickup.status.toLowerCase().includes('complete')
                            ? 'bg-green-100 text-green-800'
                            : pickup.status.toLowerCase().includes('progress')
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {pickup.status}
                        </span>
                        {typeof pickup.totalKg === 'number' && (
                          <p className="text-blue-400 text-xs sm:text-sm mt-1 font-medium">{pickup.totalKg.toFixed(2)} kg</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Pickup Requests */}
        <Collapsible open={isPickupRequestsOpen} onOpenChange={setIsPickupRequestsOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Card className="app-card text-white cursor-pointer hover:brightness-110 transition-all">
              <CardHeader className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                      <Clock className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg font-semibold text-white">Pickup Requests</CardTitle>
                      <CardDescription className="text-gray-400 text-xs sm:text-sm">
                        {pickupRequests.length} pending request{pickupRequests.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  {isPickupRequestsOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="app-card overflow-hidden mt-2">
              <div className="divide-y divide-[var(--app-border)]">
                {pickupRequests.length === 0 ? (
                  <div className="p-6 text-center">
                    <Clock className="h-10 w-10 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No pickup requests</p>
                    <p className="text-xs text-gray-500 mt-1">All requests have been processed</p>
                  </div>
                ) : (
                  pickupRequests.map((request) => (
                    <div key={request.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm sm:text-base">{request.customer}</p>
                        <p className="text-gray-400 text-xs sm:text-sm">{request.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-300 text-xs sm:text-sm">{request.time}</p>
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {request.status}
                        </span>
                        {typeof request.totalKg === 'number' && (
                          <p className="text-yellow-400 text-xs sm:text-sm mt-1 font-medium">{request.totalKg.toFixed(2)} kg</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Navigation */}
      <Navigation />

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showCollectionForm}
        onClose={handleCollectionClose}
        user={selectedUser}
        onSuccess={handleCollectionSuccess}
      />

      {/* Live Collection Modal */}
      <LiveCollectionModal
        isOpen={showLiveCollection}
        onClose={() => setShowLiveCollection(false)}
        onSuccess={() => {
          setShowLiveCollection(false);
          // Refresh dashboard data
          loadDashboardData();
        }}
      />
    </div>
  );
}
