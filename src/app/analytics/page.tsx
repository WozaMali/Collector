"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp,
  Calendar,
  Package,
  Leaf,
  Target,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Users,
  Settings,
  AlertCircle,
  X
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function CollectorAnalyticsPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [stats, setStats] = useState({
    totalCollections: 0,
    totalKg: 0,
    totalPoints: 0,
    totalEarnings: 0,
    monthlyCollections: 0,
    monthlyKg: 0,
    monthlyPoints: 0,
    monthlyEarnings: 0,
    weeklyCollections: 0,
    weeklyKg: 0,
    weeklyPoints: 0,
    weeklyEarnings: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [performanceRate, setPerformanceRate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [topMaterials, setTopMaterials] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState({
    totalCustomers: 0,
    repeatCustomers: 0,
    newCustomers: 0
  });

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user, timeRange]);

  // Realtime refresh: listen on unified_collections for this collector
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('realtime-unified-collections-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unified_collections', filter: `collector_id=eq.${user.id}` }, () => {
        loadAnalyticsData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unified_collections', filter: `created_by=eq.${user.id}` }, () => {
        loadAnalyticsData();
      })
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch {}
    };
  }, [user?.id, timeRange]);

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

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) return;
      
      // Get real analytics data from unified collections
      const { data: collections, error } = await supabase
        .from('unified_collections')
        .select('*')
        .or(`collector_id.eq.${user.id},and(collector_id.is.null,created_by.eq.${user.id})`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching collections:', error);
        setError('Failed to load analytics data');
        return;
      }

      // Calculate real statistics
      const now = new Date();
      const currentWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentYear = new Date(now.getFullYear(), 0, 1);

      // All collections (for performance calculation)
      const allCollections = collections || [];
      const completedCollections = allCollections.filter(c => c.status === 'approved' || c.status === 'completed');
      const pendingCollections = allCollections.filter(c => c.status === 'pending');
      
      // Calculate performance rate
      const totalCollections = allCollections.length;
      const performanceRate = totalCollections > 0 ? (completedCollections.length / totalCollections) * 100 : 0;

      const totalKg = completedCollections.reduce((sum, c) => sum + (c.total_weight_kg || 0), 0);
      const totalEarnings = totalKg * 5; // R5 per kg

      const monthlyCollections = completedCollections.filter(c => 
        new Date(c.created_at) >= currentMonth
      ).length;
      const monthlyKg = completedCollections
        .filter(c => new Date(c.created_at) >= currentMonth)
        .reduce((sum, c) => sum + (c.total_weight_kg || 0), 0);
      const monthlyEarnings = monthlyKg * 5;

      const weeklyCollections = completedCollections.filter(c => 
        new Date(c.created_at) >= currentWeek
      ).length;
      const weeklyKg = completedCollections
        .filter(c => new Date(c.created_at) >= currentWeek)
        .reduce((sum, c) => sum + (c.total_weight_kg || 0), 0);
      const weeklyEarnings = weeklyKg * 5;

      const realStats = {
        totalCollections: completedCollections.length,
        totalKg,
        totalPoints: totalKg, // 1kg = 1 point
        totalEarnings,
        monthlyCollections,
        monthlyKg,
        monthlyPoints: monthlyKg, // 1kg = 1 point
        monthlyEarnings,
        weeklyCollections,
        weeklyKg,
        weeklyPoints: weeklyKg, // 1kg = 1 point
        weeklyEarnings
      };

      // Get recent activity (last 10 collections)
      const recentActivityData = allCollections.slice(0, 10).map(collection => ({
        id: collection.id,
        type: 'collection',
        status: collection.status,
        weight: collection.total_weight_kg || 0,
        value: collection.total_value || 0,
        createdAt: collection.created_at,
        customerName: collection.customer_name || 'Unknown Customer'
      }));

      // Calculate top materials (simplified - would need collection_materials table for real data)
      const materialCounts: { [key: string]: number } = {};
      completedCollections.forEach(collection => {
        // This is a simplified version - in reality you'd query collection_materials
        const materials = ['Plastic', 'Glass', 'Paper', 'Metal', 'Organic'];
        materials.forEach(material => {
          materialCounts[material] = (materialCounts[material] || 0) + 1;
        });
      });
      
      const topMaterialsData = Object.entries(materialCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate customer statistics
      const uniqueCustomers = new Set(completedCollections.map(c => c.customer_id || c.customer_name));
      const customerCounts: { [key: string]: number } = {};
      completedCollections.forEach(collection => {
        const customerId = collection.customer_id || collection.customer_name;
        if (customerId) {
          customerCounts[customerId] = (customerCounts[customerId] || 0) + 1;
        }
      });
      
      const repeatCustomers = Object.values(customerCounts).filter(count => count > 1).length;
      const newCustomers = uniqueCustomers.size - repeatCustomers;

      setStats(realStats);
      setRecentActivity(recentActivityData);
      setPerformanceRate(performanceRate);
      setTopMaterials(topMaterialsData);
      setCustomerStats({
        totalCustomers: uniqueCustomers.size,
        repeatCustomers,
        newCustomers
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('An unexpected error occurred while loading analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentStats = () => {
    switch (timeRange) {
      case 'week':
        return {
          collections: Math.floor(stats.weeklyCollections),
          kg: Math.floor(stats.weeklyKg),
          points: Math.floor(stats.weeklyPoints),
          earnings: Math.floor(stats.weeklyEarnings)
        };
      case 'month':
        return {
          collections: stats.monthlyCollections,
          kg: stats.monthlyKg,
          points: stats.monthlyPoints,
          earnings: stats.monthlyEarnings
        };
      case 'year':
        return {
          collections: stats.totalCollections,
          kg: stats.totalKg,
          points: stats.totalPoints,
          earnings: stats.totalEarnings
        };
      default:
        return {
          collections: stats.monthlyCollections,
          kg: stats.monthlyKg,
          points: stats.monthlyPoints,
          earnings: stats.monthlyEarnings
        };
    }
  };

  const currentStats = getCurrentStats();

  // Helper functions
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'rejected':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Collection completed';
      case 'approved':
        return 'Collection approved';
      case 'pending':
        return 'Collection pending';
      case 'rejected':
        return 'Collection rejected';
      case 'cancelled':
        return 'Collection cancelled';
      default:
        return 'Collection updated';
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
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Analytics</h1>
            <p className="text-gray-300 text-sm">Track your collection performance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-28 sm:w-32 bg-gray-800 border-gray-600 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={loadAnalyticsData} className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card className="bg-gray-800 border-gray-700 text-white hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Collections</CardTitle>
            <Package className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-400">{currentStats.collections}</div>
            <p className="text-[11px] sm:text-xs text-gray-400">
              {timeRange === 'week' ? 'This week' : timeRange === 'month' ? 'This month' : 'Total'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 text-white hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Weight Collected</CardTitle>
            <Target className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-yellow-400">{currentStats.kg.toFixed(1)} kg</div>
            <p className="text-[11px] sm:text-xs text-gray-400">
              {timeRange === 'week' ? 'This week' : timeRange === 'month' ? 'This month' : 'Total'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 text-white hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Points Earned</CardTitle>
            <Leaf className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-400">{currentStats.points}</div>
            <p className="text-[11px] sm:text-xs text-gray-400">
              {timeRange === 'week' ? 'This week' : timeRange === 'month' ? 'This month' : 'Total'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 text-white hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-300">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-yellow-400">{performanceRate.toFixed(1)}%</div>
            <p className="text-[11px] sm:text-xs text-gray-400">
              {timeRange === 'week' ? 'This week' : timeRange === 'month' ? 'This month' : 'Total'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="bg-gray-800 border-gray-700 text-white hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-orange-400" />
              Performance Trends
            </CardTitle>
            <CardDescription className="text-gray-300 text-xs sm:text-sm">
              Your collection performance over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Daily Average Collections</span>
                <span className="text-xs sm:text-sm text-gray-400">
                  {timeRange === 'week' ? (stats.weeklyCollections / 7).toFixed(1) : 
                   timeRange === 'month' ? (stats.monthlyCollections / 30).toFixed(1) : 
                   (stats.totalCollections / 365).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Daily Average Weight</span>
                <span className="text-xs sm:text-sm text-gray-400">
                  {timeRange === 'week' ? (stats.weeklyKg / 7).toFixed(1) : 
                   timeRange === 'month' ? (stats.monthlyKg / 30).toFixed(1) : 
                   (stats.totalKg / 365).toFixed(1)} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Efficiency Rate</span>
                <span className="text-xs sm:text-sm text-gray-400">
                  {((currentStats.collections / Math.max(currentStats.collections, 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 text-white hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="h-5 w-5 text-yellow-400" />
              Environmental Impact
            </CardTitle>
            <CardDescription className="text-gray-300 text-xs sm:text-sm">
              Your contribution to sustainability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-300">CO₂ Saved</span>
                <span className="text-xs sm:text-sm text-gray-400">
                  {(currentStats.kg * 2.5).toFixed(1)} kg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Water Saved</span>
                <span className="text-xs sm:text-sm text-gray-400">
                  {(currentStats.kg * 3.5).toFixed(1)} liters
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Trees Equivalent</span>
                <span className="text-xs sm:text-sm text-gray-400">
                  {(currentStats.kg / 22).toFixed(1)} trees
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="bg-gray-800 border-gray-700 text-white hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <Package className="h-5 w-5 text-green-400" />
              Top Materials
            </CardTitle>
            <CardDescription className="text-gray-300 text-xs sm:text-sm">
              Most collected materials this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMaterials.length === 0 ? (
                <p className="text-gray-400 text-xs sm:text-sm">No material data available</p>
              ) : (
                topMaterials.map((material, index) => (
                  <div key={material.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-xs font-bold text-green-400">
                        {index + 1}
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-white">{material.name}</span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-400">{material.count} collections</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 text-white hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-blue-400" />
              Customer Insights
            </CardTitle>
            <CardDescription className="text-gray-300 text-xs sm:text-sm">
              Your customer relationship metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Total Customers</span>
                <span className="text-xs sm:text-sm text-gray-400">{customerStats.totalCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Repeat Customers</span>
                <span className="text-xs sm:text-sm text-gray-400">{customerStats.repeatCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-300">New Customers</span>
                <span className="text-xs sm:text-sm text-gray-400">{customerStats.newCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Retention Rate</span>
                <span className="text-xs sm:text-sm text-gray-400">
                  {customerStats.totalCustomers > 0 
                    ? ((customerStats.repeatCustomers / customerStats.totalCustomers) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-gray-800 border-gray-700 text-white hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-orange-400" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-gray-300 text-xs sm:text-sm">
            Your latest collection activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">No recent activity</p>
                <p className="text-xs sm:text-sm text-gray-500">Your collection activities will appear here</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => {
                const timeAgo = getTimeAgo(activity.createdAt);
                const statusColor = getStatusColor(activity.status);
                const statusText = getStatusText(activity.status);
                
                return (
                  <div key={activity.id || index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                      <div>
                        <span className="text-xs sm:text-sm font-medium text-white">{statusText}</span>
                        <p className="text-[11px] sm:text-xs text-gray-400">
                          {activity.customerName} • {activity.weight.toFixed(1)}kg
                        </p>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-400">{timeAgo}</span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Navigation />
    </div>
  );
}
