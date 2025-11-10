'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Package, 
  User, 
  ArrowLeft,
  Search,
  Mail,
  Phone
} from 'lucide-react';
import UserSearchModal from './UserSearchModal';
import CollectionModal from './CollectionModal';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  full_name?: string;
  status: string;
  role_id: string;
  created_at: string;
}

interface LiveCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LiveCollectionModal({ isOpen, onClose, onSuccess }: LiveCollectionModalProps) {
  const [currentStep, setCurrentStep] = useState<'search' | 'collection'>('search');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleUserSelect = (user: User) => {
    console.log('🎯 User selected:', user);
    setSelectedUser(user);
    setCurrentStep('collection');
    console.log('🎯 Current step set to:', 'collection');
  };

  const handleBackToSearch = () => {
    setCurrentStep('search');
    setSelectedUser(null);
  };

  const handleClose = () => {
    setCurrentStep('search');
    setSelectedUser(null);
    onClose();
  };

  const handleCollectionSuccess = () => {
    setCurrentStep('search');
    setSelectedUser(null);
    onSuccess?.();
  };

  if (!isOpen) return null;

  console.log('🔍 LiveCollectionModal render:', { isOpen, currentStep, selectedUser: !!selectedUser, selectedUserData: selectedUser });

  return (
    <>
      {/* User Search Modal */}
      <UserSearchModal
        isOpen={isOpen && currentStep === 'search'}
        onClose={handleClose}
        onUserSelect={handleUserSelect}
      />

      {/* Collection Modal */}
      {(selectedUser || currentStep === 'collection') && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          {console.log('🎯 RENDERING COLLECTION MODAL!', { selectedUser, currentStep })}
          <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 border border-gray-600/50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
            {/* Header with Back Button */}
            <div className="relative bg-gradient-to-r from-gray-700/50 to-gray-600/50 border-b border-gray-600/50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToSearch}
                    className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Package className="h-6 w-6 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Live Collection</h2>
                    <p className="text-gray-300 text-sm">
                      Recording collection for {selectedUser.full_name}
                    </p>
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

            {/* Collection Form Content - Direct rendering without CollectionModal wrapper */}
            <div className="overflow-y-auto max-h-[calc(95vh-120px)] p-6 space-y-6">
              {/* User Info */}
              <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <User className="h-5 w-5 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Customer Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <User className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-300">Full Name</span>
                        <p className="text-white font-semibold">{selectedUser?.full_name || 'Test User'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Mail className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-300">Email Address</span>
                        <p className="text-white font-semibold">{selectedUser?.email || 'test@example.com'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Phone className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-300">Phone Number</span>
                        <p className="text-white font-semibold">{selectedUser?.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collection Form */}
              {selectedUser ? (
                <CollectionModal
                  isOpen={true}
                  onClose={handleClose}
                  user={selectedUser}
                  onSuccess={handleCollectionSuccess}
                  isEmbedded={true}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No user selected</p>
                  <p className="text-sm text-gray-500">Please select a user first</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
