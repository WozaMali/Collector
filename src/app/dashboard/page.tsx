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
        
        // Total customers count - active users with customer-facing roles
        fetchWithTimeout(
          UsersService.getActiveCustomers(),
          10000 // 10 second timeout
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
      const totalCustomers = (totalCustomersData?.data?.length || totalCustomersData?.length || 0);
      
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

  // User search function - Same as Pickups page
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
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img 
                src="/W Green.png.png" 
                alt="WozaMali Logo" 
                className="h-14 sm:h-16 w-auto"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Woza Collector</h1>
                <p className="text-gray-400 text-sm">Welcome back, {displayName}!</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            <span className="text-gray-300 text-sm">
              {(user as any)?.areas?.name ?? "Area not assigned"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Evenly distributed */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
          {statsData.map((stat, index) => {
            const isImageIcon = typeof stat.icon === 'string';
            const Icon = isImageIcon ? null : stat.icon;
            return (
              <div key={index} className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-gray-400 text-xs sm:text-sm">{stat.title}</p>
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {loading ? (
                        <div className="animate-pulse bg-gray-600 h-8 w-16 rounded"></div>
                      ) : (
                        stat.value
                      )}
                    </div>
                    <p className="text-green-400 text-[11px] sm:text-xs">{stat.change}</p>
                  </div>
                  {isImageIcon ? (
                    <img 
                      src={stat.icon} 
                      alt={stat.title}
                      style={{
                        filter: stat.iconColor === 'blue' 
                          ? 'brightness(0) saturate(100%) invert(39%) sepia(96%) saturate(1352%) hue-rotate(200deg) brightness(1.1) contrast(1.1)'
                          : stat.iconColor === 'orange'
                          ? 'brightness(0) saturate(100%) invert(65%) sepia(96%) saturate(1352%) hue-rotate(0deg) brightness(1.1) contrast(1.1)'
                          : 'brightness(0) saturate(100%) invert(27%) sepia(96%) saturate(1352%) hue-rotate(95deg) brightness(98%) contrast(89%)'
                      }}
                      className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                    />
                  ) : (
                    Icon && <Icon className={`h-8 w-8 sm:h-10 sm:w-10 ${stat.color} flex-shrink-0`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Collection Section - Same as Pickups page */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6">
          <div className="p-3 sm:p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img 
                  src="/delivery.png" 
                  alt="Live Collection"
                  style={{
                    filter: 'brightness(0) saturate(100%) invert(27%) sepia(96%) saturate(1352%) hue-rotate(95deg) brightness(98%) contrast(89%)'
                  }}
                  className="h-8 w-8 sm:h-10 sm:w-10"
                />
                <h2 className="text-base sm:text-lg font-semibold text-white">Live Collection</h2>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300 text-sm font-medium">{stats.totalCustomers} users</span>
              </div>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Search for a customer to begin collection</p>
          </div>
          <div className="p-3 sm:p-4">
            {/* Search Input */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by first name or last name..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-green-500/50 text-sm"
                />
              </div>

              {/* Search Results */}
              {searchingUsers && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-green-400" />
                  <span className="ml-2 text-gray-300">Searching...</span>
                </div>
              )}

              {!searchingUsers && userSearchTerm.length >= 2 && searchedUsers.length === 0 && (
                <div className="text-center py-4">
                  <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No customers found</p>
                  <p className="text-xs text-gray-500">Try a different search term</p>
                </div>
              )}

              {!searchingUsers && userSearchTerm.length < 2 && (
                <div className="text-center py-4">
                  <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Start typing to search customers</p>
                  <p className="text-xs text-gray-500">Enter at least 2 characters</p>
                </div>
              )}

              {searchedUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-gray-400">
                    Found {searchedUsers.length} customer{searchedUsers.length !== 1 ? 's' : ''}
                  </p>
                  {searchedUsers.map((user) => (
                    <div 
                      key={user.id}
                      className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-700/60 transition-colors bg-gray-700/30 rounded-lg border border-gray-600/50 cursor-pointer"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-white text-sm sm:text-base truncate">
                            {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Unknown User'}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserSelect(user);
                          }}
                          className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white px-3 py-2 text-xs sm:text-sm"
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

        {/* Recent Pickups - Collapsible */}
        <Collapsible open={isRecentPickupsOpen} onOpenChange={setIsRecentPickupsOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Card className="bg-gray-800 border-gray-700 text-white cursor-pointer hover:bg-gray-750 transition-colors">
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-blue-400" />
                    <div>
                      <CardTitle className="text-base sm:text-lg font-semibold text-white">Recent Pickups</CardTitle>
                      <CardDescription className="text-gray-300 text-xs sm:text-sm">
                        {recentPickups.length} recent pickup{recentPickups.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  {isRecentPickupsOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="divide-y divide-gray-700">
                {recentPickups.length === 0 ? (
                  <div className="p-4 text-center">
                    <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No recent pickups</p>
                  </div>
                ) : (
                  recentPickups.map((pickup) => (
                    <div key={pickup.id} className="p-3 sm:p-4 flex items-center justify-between">
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

        {/* Pickup Requests Card - Collapsible */}
        <Collapsible open={isPickupRequestsOpen} onOpenChange={setIsPickupRequestsOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Card className="bg-gray-800 border-gray-700 text-white cursor-pointer hover:bg-gray-750 transition-colors">
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-400" />
                    <div>
                      <CardTitle className="text-base sm:text-lg font-semibold text-white">Pickup Requests</CardTitle>
                      <CardDescription className="text-gray-300 text-xs sm:text-sm">
                        {pickupRequests.length} pending request{pickupRequests.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  {isPickupRequestsOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="divide-y divide-gray-700">
                {pickupRequests.length === 0 ? (
                  <div className="p-4 text-center">
                    <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No pickup requests</p>
                    <p className="text-xs text-gray-500">All requests have been processed</p>
                  </div>
                ) : (
                  pickupRequests.map((request) => (
                    <div key={request.id} className="p-3 sm:p-4 flex items-center justify-between">
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
