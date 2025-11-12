'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Search, 
  User, 
  Mail, 
  Phone,
  MapPin,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { UsersService, type User } from '@/lib/users-service';
import { formatUserDisplayName } from '@/lib/user-utils';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect: (user: User) => void;
}

export default function UserSearchModal({ isOpen, onClose, onUserSelect }: UserSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Masking helpers
  const maskEmail = (email?: string) => {
    if (!email) return '';
    const [local, domain] = String(email).split('@');
    if (!domain) return '***';
    const l = local || '';
    if (l.length <= 2) return (l.slice(0, 1) || '*') + '*@' + domain;
    const middleLen = Math.max(l.length - 2, 3);
    return l[0] + '*'.repeat(middleLen) + l.slice(-1) + '@' + domain;
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return '';
    const p = phone.replace(/\s+/g, '');
    if (p.length <= 4) return '*'.repeat(Math.max(p.length, 4));
    const middleLen = Math.max(p.length - 4, 4);
    return p.slice(0, 2) + '*'.repeat(middleLen) + p.slice(-2);
  };

  // Search users when search term changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchUsers();
      } else {
        setUsers([]);
      }
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Searching users by name/surname:', searchTerm);
      
      // Search only by first_name, last_name, and full_name (NOT email)
      const { data, error } = await UsersService.searchActiveCustomers(
        searchTerm,
        undefined, // roleFilter - all roles
        'active', // statusFilter - active only
        20 // limit
      );

      if (error) {
        console.error('❌ Error searching users:', error);
        return;
      }

      console.log('📊 Search results:', data?.length || 0, 'users found');

      // Normalize role field if PostgREST returned roles!role_id(name)
      const mapped = (data || []).map((u: any) => {
        const roleFromRelation = (u.roles && typeof u.roles === 'object' && u.roles.name) ? { name: u.roles.name } : undefined;
        return roleFromRelation ? { ...u, role: roleFromRelation } : u;
      });

      // Filter results to ONLY include name matches (first_name, last_name, full_name)
      // EXCLUDE email matches
      const searchLower = searchTerm.toLowerCase();
      const filtered = mapped.filter((user: any) => {
        const firstName = (user.first_name || '').toLowerCase();
        const lastName = (user.last_name || '').toLowerCase();
        const fullName = (user.full_name || '').toLowerCase();
        
        // Only match by name fields, NOT email
        return firstName.includes(searchLower) || 
               lastName.includes(searchLower) || 
               fullName.includes(searchLower);
      });

      // Ensure full_name is set for display
      const usersWithFullName = filtered.map((user: any) => ({
        ...user,
        full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'
      }));

      setUsers(usersWithFullName);
    } catch (error) {
      console.error('❌ Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  const handleConfirmSelection = () => {
    if (selectedUser) {
      // Call onUserSelect to pass the user to parent, but don't close yet
      // The parent (LiveCollectionModal) will handle closing this modal and opening CollectionModal
      onUserSelect(selectedUser);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setUsers([]);
    setSelectedUser(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 border border-gray-600/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-gray-700/50 to-gray-600/50 border-b border-gray-600/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Search className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Find Customer</h2>
                <p className="text-gray-300 text-sm">Search by first name or last name to start collection</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose} 
              className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Search Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">Search Customer</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter first name or last name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-orange-500/50"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                <span className="ml-2 text-gray-300">Searching...</span>
              </div>
            )}

            {!loading && searchTerm.length >= 2 && users.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No customers found</p>
                <p className="text-sm text-gray-500">Try a different search term</p>
              </div>
            )}

            {!loading && searchTerm.length < 2 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Start typing to search customers</p>
                <p className="text-sm text-gray-500">Enter at least 2 characters</p>
              </div>
            )}

            {users.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">
                  Found {users.length} customer{users.length !== 1 ? 's' : ''}
                </p>
                {users.map((user) => (
                  <Card 
                    key={user.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedUser?.id === user.id 
                        ? 'bg-orange-600/20 border-orange-500/50' 
                        : 'bg-gray-800/50 border-gray-600/50 hover:bg-gray-700/50'
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-orange-500/20 rounded-lg">
                            <User className="h-5 w-5 text-orange-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{formatUserDisplayName(user)}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{maskEmail(user.email)}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{maskPhone(user.phone)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {selectedUser?.id === user.id && (
                          <CheckCircle className="h-5 w-5 text-orange-400" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {selectedUser && (
            <div className="flex space-x-3 pt-4 border-t border-gray-600/50">
              <Button
                onClick={handleConfirmSelection}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Start Collection for {formatUserDisplayName(selectedUser)}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
