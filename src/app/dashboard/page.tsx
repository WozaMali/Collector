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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CollectionModal from "@/components/CollectionModal";

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const displayName = useMemo(() => {
    const anyUser = user as unknown as { first_name?: string; user_metadata?: { first_name?: string } ; email?: string } | null;
    return (
      anyUser?.first_name || anyUser?.user_metadata?.first_name || anyUser?.email?.split('@')[0] || 'User'
    );
  }, [user]);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchUsers, setSearchUsers] = useState<Array<{
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showCollectionForm, setShowCollectionForm] = useState(false);

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
      icon: Package,
      color: "text-blue-500"
    },
    {
      title: "Total Weight",
      value: `${stats.totalWeight.toFixed(1)}kg`,
      change: "",
      icon: TrendingUp,
      color: "text-orange-500"
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
        
        // Total customers count - active users only
        fetchWithTimeout(
          supabase
            .from('users')
            .select('id, first_name, last_name, email, phone, role_id, status, created_at')
            .eq('role_id', '8d5db8bb-52a3-4865-bb18-e1805249c4a2') // resident role
            .eq('status', 'active'), // only active users
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
      const totalCustomers = totalCustomersData?.length || 0;
      
      // Calculate wallet balance and total weight from approved/completed collections
      const walletBalance = (walletData || []).reduce((sum, c) => sum + (Number(c.total_value) || 0), 0);
      const totalWeight = (walletData || []).reduce((sum, c) => sum + (Number(c.total_weight_kg) || 0), 0);
      
      // Calculate collection rate based on recent activities (last 30 days)
      let collectionRate = 0;
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: recentActivitiesData } = await fetchWithTimeout(
          supabase
            .from('unified_collections')
            .select('status')
            .eq('collector_id', user.id)
            .gte('created_at', thirtyDaysAgo.toISOString()),
          10000 // 10 second timeout
        ).catch(() => ({ data: null }));
        
        const totalRecent = recentActivitiesData?.length || 0;
        const completedRecent = recentActivitiesData?.filter((item: any) => item.status === 'completed').length || 0;
        collectionRate = totalRecent > 0 ? (completedRecent / totalRecent) * 100 : 0;
      } catch (error) {
        console.warn('Error calculating collection rate:', error);
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

  // User search function
  const performUserSearch = async () => {
    if (searchTerm.length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      setSearchLoading(true);
      console.log('🔍 Searching users with term:', searchTerm);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, status, role_id, created_at, street_addr, township_id, subdivision, suburb, city, postal_code, area_id')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .eq('status', 'active')
        .in('role_id', ['resident', 'customer', 'member', 'user'])
        .order('first_name')
        .limit(10);

      if (error) {
        console.error('❌ Error searching users:', error);
        return;
      }

      console.log('📊 Search results:', data?.length || 0, 'users found');
      console.log('👥 Users data:', data);

      // Add full_name field for display
      const usersWithFullName = data?.map(user => ({
        ...user,
        full_name: `${user.first_name} ${user.last_name}`.trim()
      })) || [];

      setSearchUsers(usersWithFullName);
    } catch (error) {
      console.error('❌ Error searching users:', error);
    } finally {
      setSearchLoading(false);
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

  // Search users when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performUserSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/w%20yellow.png" 
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
                src="/w%20yellow.png" 
                alt="WozaMali Logo" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
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

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
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
                  <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* User Search Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6">
          <div className="p-3 sm:p-4 border-b border-gray-700">
            <h2 className="text-base sm:text-lg font-semibold text-white">Start Collection</h2>
            <p className="text-gray-400 text-xs sm:text-sm">Search for a customer to begin collection</p>
          </div>
          <div className="p-3 sm:p-4">
            {/* Search Input */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-green-500/50 text-sm"
                />
              </div>

              {/* Search Results */}
              {searchLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-green-400" />
                  <span className="ml-2 text-gray-300">Searching...</span>
                </div>
              )}

              {!searchLoading && searchTerm.length >= 2 && searchUsers.length === 0 && (
                <div className="text-center py-4">
                  <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No customers found</p>
                  <p className="text-xs text-gray-500">Try a different search term</p>
                </div>
              )}

              {!searchLoading && searchTerm.length < 2 && (
                <div className="text-center py-4">
                  <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Start typing to search customers</p>
                  <p className="text-xs text-gray-500">Enter at least 2 characters</p>
                </div>
              )}

              {searchUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-gray-400">
                    Found {searchUsers.length} customer{searchUsers.length !== 1 ? 's' : ''}
                  </p>
                  {searchUsers.map((user) => (
                    <Card 
                      key={user.id}
                      className="cursor-pointer transition-all duration-200 bg-gray-700/50 border-gray-600/50 hover:bg-gray-600/50 hover:border-green-500/50"
                      onClick={() => handleUserSelect(user)}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                              <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white text-sm sm:text-base">{user.full_name}</h3>
                              <div className="space-y-1 text-sm text-gray-400">
                                <div className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3" />
                                  <span className="text-xs sm:text-sm">{user.email}</span>
                                </div>
                                {user.phone && (
                                  <div className="flex items-center space-x-1">
                                    <Phone className="h-3 w-3" />
                                    <span className="text-xs sm:text-sm">{user.phone}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="text-xs">{formatAddress(user)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Pickups */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-3 sm:p-4 border-b border-gray-700">
            <h2 className="text-base sm:text-lg font-semibold text-white">Recent Pickups</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {recentPickups.map((pickup) => (
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
            ))}
          </div>
        </div>
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
    </div>
  );
}
