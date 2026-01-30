'use client';

import React, { useState } from 'react';
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
    console.log('🎯 User selected in LiveCollectionModal:', user);
    setSelectedUser(user);
    setCurrentStep('collection');
    // UserSearchModal will remain open until we explicitly close it
    // CollectionModal will open on top
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

  return (
    <>
      {/* User Search Modal - Only show when in search step */}
      {currentStep === 'search' && (
        <UserSearchModal
          isOpen={isOpen}
          onClose={handleClose}
          onUserSelect={handleUserSelect}
        />
      )}

      {/* Collection Modal - Same as Users page - Opens when user is selected */}
      {selectedUser && currentStep === 'collection' && (
        <CollectionModal
          isOpen={true}
          onClose={handleClose}
          user={selectedUser}
          onSuccess={handleCollectionSuccess}
        />
      )}
    </>
  );
}
