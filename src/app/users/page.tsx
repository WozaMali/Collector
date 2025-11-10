'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Search, 
  Filter, 
  Mail,
  Phone,
  Eye,
  MoreVertical,
  UserCheck,
  UserX,
  Shield,
  Package,
  MapPin,
  Calendar,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { formatUserDisplayName, getUserRoleDisplayName, getUserStatusDisplay } from '@/lib/user-utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UsersService, type User } from '@/lib/users-service';
import Navigation from '@/components/Navigation';
import { supabase } from '@/lib/supabase';
import CollectionModal from '@/components/CollectionModal';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Collection modal state
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  // Derive normalized role name from user (handles UUID role_id by using joined role)
  const getRoleName = (user: any) => String((user.role?.name || user.role_id || '')).toLowerCase();

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => getRoleName(user) === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Prefer registered users view if available, fall back to all users
      const reg = await UsersService.getRegisteredUsers();
      const useRegistered = !reg.error && Array.isArray(reg.data);
      const { data, error } = useRegistered ? { data: reg.data as any, error: null } : await UsersService.getAllUsers();

      if (error) {
        console.error('Error loading users:', error);
        return;
      }

      // If using registered view, map to User shape
      let mapped = useRegistered
        ? (data as any[]).map((row) => ({
            id: row.id,
            email: row.email,
            full_name: row.email?.split('@')[0] || row.email,
            first_name: undefined,
            last_name: undefined,
            phone: undefined,
            role_id: row.role_name || row.role_id || 'member',
            status: row.app_status || 'active',
            created_at: row.registered_at,
            updated_at: row.registered_at,
            street_addr: undefined,
            township_id: undefined,
            subdivision: undefined,
            suburb: undefined,
            city: undefined,
            postal_code: undefined,
            area_id: undefined,
            role: row.role_name ? { name: row.role_name } : undefined
          }))
        : (data || []);

      // Enrich with details from public.users (names and address fields)
      if (useRegistered && Array.isArray(mapped) && mapped.length > 0) {
        const emails = (mapped as any[]).map(u => u.email).filter(Boolean);
        try {
          const { data: details } = await supabase
            .from('users')
            .select('email, first_name, last_name, full_name, street_addr, township_id, subdivision, suburb, city, postal_code, area_id')
            .in('email', emails);

          const emailToDetails = new Map<string, any>((details || []).map(d => [String(d.email).toLowerCase(), d]));
          mapped = (mapped as any[]).map(u => {
            const d = emailToDetails.get(String(u.email || '').toLowerCase());
            if (!d) return u;
            return {
              ...u,
              first_name: d.first_name ?? u.first_name,
              last_name: d.last_name ?? u.last_name,
              full_name: d.full_name ?? u.full_name,
              street_addr: d.street_addr ?? u.street_addr,
              township_id: d.township_id ?? u.township_id,
              subdivision: d.subdivision ?? u.subdivision,
              suburb: d.suburb ?? u.suburb,
              city: d.city ?? u.city,
              postal_code: d.postal_code ?? u.postal_code,
              area_id: d.area_id ?? u.area_id
            };
          });
        } catch (_e) {}

        // Fallback address from recent unified collections pickup_address
        const ids = (mapped as any[]).map(u => u.id).filter(Boolean);
        try {
          const { data: recentCollections } = await supabase
            .from('unified_collections')
            .select('customer_id, pickup_address, created_at')
            .in('customer_id', ids)
            .order('created_at', { ascending: false });

          const addressByUser = new Map<string, string>();
          (recentCollections || []).forEach(row => {
            const key = String(row.customer_id);
            if (!addressByUser.has(key) && row.pickup_address) {
              addressByUser.set(key, String(row.pickup_address));
            }
          });

          mapped = (mapped as any[]).map(u => {
            const hasAddress = u.street_addr || u.subdivision || u.suburb || u.city || u.postal_code;
            if (hasAddress) return u;
            const fallback = addressByUser.get(String(u.id));
            if (!fallback) return u;
            // Place fallback string into street_addr for display formatting
            return { ...u, street_addr: fallback };
          });
        } catch (_e) {}
      }

      setUsers(mapped as any);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (roleId: string | null | undefined) => {
    if (!roleId) {
      return (
        <Badge className="bg-gray-100 text-gray-800">
          No Role
        </Badge>
      );
    }
    
    const roleDisplayName = getUserRoleDisplayName(roleId);
    const roleMap: { [key: string]: { color: string } } = {
      'member': { color: 'bg-green-100 text-green-800' },
      'collector': { color: 'bg-blue-100 text-blue-800' },
      'admin': { color: 'bg-red-100 text-red-800' },
      'super_admin': { color: 'bg-red-200 text-red-900' },
      'office_staff': { color: 'bg-yellow-100 text-yellow-800' }
    };

    const role = roleMap[roleId] || { color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge className={role.color}>
        {roleDisplayName}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; label: string } } = {
      'active': { color: 'bg-green-100 text-green-800', label: 'Active' },
      'inactive': { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      'suspended': { color: 'bg-yellow-100 text-yellow-800', label: 'Suspended' }
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getRoleIcon = (roleId: string) => {
    switch (roleId) {
      case 'admin':
        return <Shield className="w-5 h-5 text-red-600" />;
      case 'collector':
        return <UserCheck className="w-5 h-5 text-blue-600" />;
      case 'member':
        return <Users className="w-5 h-5 text-green-600" />;
      case 'office_staff':
        return <UserX className="w-5 h-5 text-yellow-600" />;
      default:
        return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (user: User) => {
    const addressParts = [];
    
    if (user.street_addr) addressParts.push(user.street_addr);
    if (user.subdivision) addressParts.push(user.subdivision);
    if (user.suburb) addressParts.push(user.suburb);
    if (user.city) addressParts.push(user.city);
    if (user.postal_code) addressParts.push(user.postal_code);
    
    return addressParts.length > 0 ? addressParts.join(', ') : 'Address not provided';
  };

  const canCollectFrom = (user: any) => {
    const disallowedRoles = new Set(['collector', 'admin', 'super_admin', 'office_staff']);
    const role = getRoleName(user);
    const isActive = (user.status || '').toLowerCase() === 'active';
    return isActive && !disallowedRoles.has(role);
  };

  const handleCreateCollection = (user: User) => {
    setSelectedUser(user);
    setIsCollectionModalOpen(true);
  };

  const handleCollectionSuccess = () => {
    // Refresh users data after successful collection
    loadUsers();
  };

  const handleCloseCollectionModal = () => {
    setIsCollectionModalOpen(false);
    setSelectedUser(null);
  };

  // Get unique roles for filter based on normalized role names
  const uniqueRoles = Array.from(
    new Set(users.map((user) => getRoleName(user)).filter((role) => role && role !== ''))
  );


  if (loading) {
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
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mr-2"></div>
            <p className="text-gray-300">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Users</h1>
            <p className="text-gray-400 text-sm">Manage and collect from users</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadUsers}
              className="flex items-center space-x-2 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <span className="text-xs sm:text-sm font-medium text-gray-300">
                {filteredUsers.length} / {users.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">

        {/* Statistics Cards (2x2 layout) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Total Users</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{users.length}</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Residents</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {users.filter(u => {
                    const r = getRoleName(u);
                    return r === 'resident' || r === 'member';
                  }).length}
                </p>
              </div>
              <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Collectors</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {users.filter(u => getRoleName(u) === 'collector').length}
                </p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Active Users</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-orange-500" />
            <span className="text-white font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by first name, last name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all" className="text-white hover:bg-gray-600">All roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role} className="text-white hover:bg-gray-600">
                      {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all" className="text-white hover:bg-gray-600">All statuses</SelectItem>
                  <SelectItem value="active" className="text-white hover:bg-gray-600">Active</SelectItem>
                  <SelectItem value="inactive" className="text-white hover:bg-gray-600">Inactive</SelectItem>
                  <SelectItem value="suspended" className="text-white hover:bg-gray-600">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Users List (Mobile-first with Collect button) */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <span className="text-white font-medium">All Users ({filteredUsers.length})</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Tap Collect to start a collection for that user
            </p>
          </div>
          <div className="divide-y divide-gray-700">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10">
                <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-white mb-1">No users found</h3>
                <p className="text-gray-400 text-sm">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'No users have been created yet.'
                  }
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-700/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      {getRoleIcon(getRoleName(user))}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-white text-sm sm:text-base truncate">
                        {formatUserDisplayName(user)}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400 truncate">
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-400 truncate">
                        <MapPin className="h-3 w-3 text-orange-400 flex-shrink-0" />
                        <span className="truncate" title={formatAddress(user)}>{formatAddress(user)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canCollectFrom(user) && (
                      <Button 
                        size="sm"
                        onClick={() => handleCreateCollection(user)}
                        className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white px-3 py-2 text-xs sm:text-sm"
                      >
                        Collect
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Collection Modal */}
      <CollectionModal
        isOpen={isCollectionModalOpen}
        onClose={handleCloseCollectionModal}
        user={selectedUser}
        onSuccess={handleCollectionSuccess}
      />
      
      {/* Navigation */}
      <Navigation />
    </div>
  );
}
