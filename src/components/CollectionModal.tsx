'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Plus, 
  Trash2, 
  Package, 
  Scale, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Camera,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { DashboardService } from '../lib/dashboard-service';
import { OfficeIntegrationService } from '../lib/office-integration-service';
import PhotoCapture from './PhotoCapture';
import { PhotoService } from '../lib/photo-service';

interface Material {
  id: string;
  name: string;
  rate_per_kg?: number;
  is_active: boolean;
  category?: string;
  unit?: string;
  description?: string;
}

interface CollectionMaterial {
  materialName: string;
  kilograms: number;
  unitPrice: number;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  full_name?: string;
  pickup_address?: string;
  address?: string;
  street_addr?: string;
  township_id?: string;
  subdivision?: string;
  suburb?: string;
  city?: string;
  postal_code?: string;
  area_id?: string;
}

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess?: () => void;
  isEmbedded?: boolean;
}

export default function CollectionModal({ isOpen, onClose, user, onSuccess, isEmbedded = false }: CollectionModalProps) {
  const { user: collector } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
  const maskAddress = (addr?: string) => {
    if (!addr) return '';
    return String(addr).replace(/[A-Za-z0-9]/g, '*');
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
  const [retryCount, setRetryCount] = useState<number>(0);
  
  const [collectionMaterials, setCollectionMaterials] = useState<CollectionMaterial[]>([
    { materialName: '', kilograms: 0, unitPrice: 0 }
  ]);

  // Photo state
  const [materialPhoto, setMaterialPhoto] = useState<File | null>(null);
  const [scalePhoto, setScalePhoto] = useState<File | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Load materials when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMaterials();
      checkStorageBucket();
      setError(null);
      setSuccess(null);
      setCollectionMaterials([{ materialName: '', kilograms: 0, unitPrice: 0 }]);
      // Reset photo state
      setMaterialPhoto(null);
      setScalePhoto(null);
      setUploadingPhotos(false);
    }
  }, [isOpen]);

  const loadMaterials = async (retryAttempt: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔍 Loading materials... (attempt ${retryAttempt + 1})`);
      
			// Attempt 1: modern columns with is_active filter
			let query = supabase
        .from('materials')
        .select('id, name, rate_per_kg, is_active, category, unit, description')
        .eq('is_active', true)
        .order('name');
			let { data, error } = await query;

			// If column names differ, fall back to current_rate and relax filters
			if (error && (String(error.message).includes('rate_per_kg') || String(error.message).includes('is_active') || error.code === '42703')) {
				console.warn('↩️ Falling back to legacy/materials schema (current_rate/no is_active)');
				const alt = await supabase
					.from('materials')
					.select('id, name, current_rate, category, unit, description')
					.order('name');
				data = alt.data as any[] | null;
				error = alt.error as any;
			}

      if (error) {
        console.error('❌ Error loading materials:', error);
        throw error;
      }
      
			// Normalize to Material[] with rate_per_kg populated
			const normalized: Material[] = (data || []).map((m: any) => ({
				id: m.id,
				name: m.name,
				rate_per_kg: typeof m.rate_per_kg === 'number' ? m.rate_per_kg : (typeof m.current_rate === 'number' ? m.current_rate : 0),
				is_active: typeof m.is_active === 'boolean' ? m.is_active : true,
				category: m.category,
				unit: m.unit,
				description: m.description,
			}));

			console.log('📦 Loaded materials (normalized):', normalized.length);
			setMaterials(normalized);
			setRetryCount(0);

			if (normalized.length === 0) {
				console.warn('⚠️ No materials found in database');
        setError('No materials available. Please contact administrator.');
      }
    } catch (error: any) {
      console.error('❌ Error loading materials:', error);
      if (retryAttempt < 2 && (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_CLOSED'))) {
				console.log(`🔄 Retrying in 1 second... (attempt ${retryAttempt + 1}/3)`);
        setRetryCount(retryAttempt + 1);
				setTimeout(() => { loadMaterials(retryAttempt + 1); }, 1000);
        return;
      }
			setError(`Failed to load materials: ${error.message || 'Network error. Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const retryLoadMaterials = () => {
    setRetryCount(0);
    loadMaterials(0);
  };

  const checkStorageBucket = async () => {
    try {
      const bucketExists = await PhotoService.ensureBucketExists();
      if (!bucketExists) {
        console.warn('⚠️ Storage bucket not available. Photo uploads will be disabled.');
        setError('Photo storage not configured. Please contact administrator to set up photo storage.');
      }
    } catch (error) {
      console.error('❌ Error checking storage bucket:', error);
    }
  };

  const addMaterial = () => {
    setCollectionMaterials([...collectionMaterials, { materialName: '', kilograms: 0, unitPrice: 0 }]);
  };

  const removeMaterial = (index: number) => {
    if (collectionMaterials.length > 1) {
      setCollectionMaterials(collectionMaterials.filter((_, i) => i !== index));
    }
  };

  const updateMaterial = (index: number, field: keyof CollectionMaterial, value: string | number) => {
    console.log('🔄 updateMaterial called:', { index, field, value, materialsCount: materials.length });
    const updated = [...collectionMaterials];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill unit price when material is selected
    if (field === 'materialName' && typeof value === 'string') {
      const selectedMaterial = materials.find(m => m.name === value);
      console.log('🔍 Selected material:', selectedMaterial);
      if (selectedMaterial) {
        // Use the rate_per_kg field from the materials table
        const rate = selectedMaterial.rate_per_kg || 0;
        console.log('💰 Setting unit price to:', rate);
        updated[index].unitPrice = rate;
      }
    }
    
    setCollectionMaterials(updated);
  };

  const getTotalWeight = () => {
    return collectionMaterials.reduce((sum, material) => sum + (material.kilograms || 0), 0);
  };

  const getTotalValue = () => {
    return collectionMaterials.reduce((sum, material) => sum + ((material.kilograms || 0) * (material.unitPrice || 0)), 0);
  };

  const handleSaveCollection = async () => {
    if (!user || !collector) {
      setError('User or collector information is missing');
      return;
    }

    // Validate materials
    const validMaterials = collectionMaterials.filter(m => m.materialName && m.kilograms > 0);
    if (validMaterials.length === 0) {
      setError('Please add at least one material with valid weight');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const timeoutId = setTimeout(() => {
      setSaving(false);
      setError('Request timed out. Please try again.');
    }, 30000);

    try {
      console.log('💾 Creating collection for user:', user.id);

      // Create collection record
      const collectionData = {
        customer_id: user.id,
        collector_id: collector.id,
        customer_name: (user.first_name && user.last_name) 
          ? `${user.first_name} ${user.last_name}`.trim()
          : user.full_name || 'Unknown User',
        customer_email: user.email,
        collector_name: `${collector.first_name || ''} ${collector.last_name || ''}`.trim(),
        collector_email: collector.email,
        pickup_address: user.pickup_address || user.address || 'Address not provided',
        total_weight_kg: getTotalWeight(),
        total_value: getTotalValue(),
        computed_value: getTotalValue(),
        status: 'pending',
        created_by: collector.id,
        updated_by: collector.id
      };

      const { data: collection, error: collectionError } = await supabase
        .from('unified_collections')
        .insert(collectionData)
        .select('id')
        .single();

      if (collectionError || !collection) {
        console.error('❌ Error creating collection:', collectionError);
        setError(`Failed to create collection: ${collectionError?.message || 'Unknown error'}`);
        throw collectionError;
      }
      
      console.log('✅ Collection created successfully:', collection);

      // Upload photos if provided and bucket is available
      let materialPhotoUrl = null;
      let scalePhotoUrl = null;

      if (materialPhoto || scalePhoto) {
        setUploadingPhotos(true);
        console.log('📸 Uploading photos...');
        console.log('📸 Material photo:', materialPhoto ? `${materialPhoto.name} (${materialPhoto.size} bytes)` : 'None');
        console.log('📸 Scale photo:', scalePhoto ? `${scalePhoto.name} (${scalePhoto.size} bytes)` : 'None');

        // Upload material photo
        if (materialPhoto) {
          console.log('📤 Uploading material photo...');
          const materialResult = await PhotoService.uploadPhoto(materialPhoto, collection.id, 'material');
          if (materialResult.success && materialResult.url) {
            materialPhotoUrl = materialResult.url;
            console.log('✅ Material photo uploaded successfully:', materialPhotoUrl);
          } else {
            console.error('❌ Failed to upload material photo:', materialResult.error);
            // Don't fail the entire collection if photo upload fails
            console.warn('⚠️ Continuing without material photo...');
            // setError(`Failed to upload material photo: ${materialResult.error}`);
          }
        }

        // Upload scale photo
        if (scalePhoto) {
          console.log('📤 Uploading scale photo...');
          const scaleResult = await PhotoService.uploadPhoto(scalePhoto, collection.id, 'scale');
          if (scaleResult.success && scaleResult.url) {
            scalePhotoUrl = scaleResult.url;
            console.log('✅ Scale photo uploaded successfully:', scalePhotoUrl);
          } else {
            console.error('❌ Failed to upload scale photo:', scaleResult.error);
            // Don't fail the entire collection if photo upload fails
            console.warn('⚠️ Continuing without scale photo...');
            // setError(`Failed to upload scale photo: ${scaleResult.error}`);
          }
        }

        // Update collection with photo URLs
        if (materialPhotoUrl || scalePhotoUrl) {
          console.log('💾 Updating collection with photo URLs...');
          const photoUpdate: any = {};
          if (materialPhotoUrl) photoUpdate.material_photo_url = materialPhotoUrl;
          if (scalePhotoUrl) photoUpdate.scale_photo_url = scalePhotoUrl;

          const { error: photoError } = await supabase
            .from('unified_collections')
            .update(photoUpdate)
            .eq('id', collection.id);

          if (photoError) {
            console.error('❌ Failed to update collection with photo URLs:', photoError);
            setError(`Failed to update collection with photo URLs: ${photoError.message}`);
          } else {
            console.log('✅ Collection updated with photo URLs successfully');
          }
        }

        setUploadingPhotos(false);
      }

      // Insert collection materials
      const materialsToInsert = validMaterials.map(material => {
        const selectedMaterial = materials.find(m => m.name === material.materialName);
        return {
          collection_id: collection.id,
          material_id: selectedMaterial?.id,
          quantity: material.kilograms,
          unit_price: material.unitPrice
        };
      });

      if (materialsToInsert.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('collection_materials')
          .insert(materialsToInsert);

        if (itemsError) {
          console.error('❌ Error inserting collection materials:', itemsError);
          setError(`Failed to save materials: ${itemsError.message}`);
          throw itemsError;
        }
        console.log('✅ Collection materials inserted successfully:', itemsData);
      }

      // Wallet updates are disabled in Collector App by business rule

      // Send collection to office app for approval (non-blocking)
      OfficeIntegrationService.sendCollectionForApproval(collection.id)
        .then((approvalResult) => {
          if (approvalResult.success) {
            console.log('✅ Collection sent for approval successfully');
          } else {
            console.warn('⚠️ Failed to send collection for approval:', approvalResult.error);
          }
        })
        .catch((approvalError) => {
          console.warn('⚠️ Error sending collection for approval:', approvalError);
        });

      // Refresh dashboard cache (non-blocking)
      DashboardService.refreshDashboardCache(collector!.id)
        .then(() => {
          console.log('✅ Dashboard cache refreshed');
        })
        .catch((dashboardError) => {
          console.warn('⚠️ Failed to refresh dashboard cache:', dashboardError);
        });

      setSuccess('Collection saved successfully and sent for approval!');
      
      // Close modal after brief delay to show success message
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1500);

    } catch (error: any) {
      console.error('❌ Error saving collection:', error);
      setError(`Failed to save collection: ${error.message || 'Unknown error occurred'}`);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  if (isEmbedded) {
    return (
      <div className="space-y-6">
        {/* Materials */}
        <Card className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Package className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-lg font-semibold">Materials Collected</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addMaterial} 
                className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {collectionMaterials.map((material, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 border border-gray-600/50 rounded-xl bg-gradient-to-r from-gray-800/30 to-gray-700/30 backdrop-blur-sm hover:border-gray-500/50 transition-all duration-200">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>Material</span>
                      <span className="text-xs text-gray-400">({materials.length} available)</span>
                    </Label>
                    <Select 
                      value={material.materialName} 
                      onValueChange={(value) => updateMaterial(index, 'materialName', value)}
                    >
                      <SelectTrigger className="bg-gray-900/50 border-gray-600/50 text-white hover:border-gray-500/50 focus:border-orange-500/50 transition-all duration-200">
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-gray-900 border-gray-600/50 backdrop-blur-sm z-[100]" 
                        position="popper"
                        sideOffset={5}
                        avoidCollisions={true}
                        collisionPadding={10}
                      >
                        {materials.length > 0 ? (
                          materials.map((mat) => (
                            <SelectItem 
                              key={mat.id} 
                              value={mat.name} 
                              className="text-white hover:bg-gray-700/50 focus:bg-gray-700/50 transition-all duration-200"
                            >
                              <div className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-green-400" />
                                <span>{mat.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled className="text-gray-400">
                            {loading ? "Loading materials..." : `No materials available (${materials.length} loaded)`}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <Scale className="h-4 w-4" />
                      <span>Weight (kg)</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0.0"
                      value={material.kilograms || ''}
                      onChange={(e) => updateMaterial(index, 'kilograms', parseFloat(e.target.value) || 0)}
                      className="bg-gray-900/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-orange-500/50 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Unit Credit (C/kg)</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={material.unitPrice || ''}
                      onChange={(e) => updateMaterial(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="bg-gray-900/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-orange-500/50 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300">Actions</Label>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2 p-2 bg-green-500/10 rounded-lg flex-1">
                        <span className="text-sm text-green-400 font-medium">
                          C {((material.kilograms || 0) * (material.unitPrice || 0)).toFixed(2)}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeMaterial(index)}
                        disabled={collectionMaterials.length === 1}
                        className="border-red-600 text-red-400 hover:bg-red-900/20 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-800/40 rounded-xl border border-gray-600/30">
              <div className="flex items-center justify-between text-lg font-semibold text-white mb-3">
                <span>Collection Summary</span>
                <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                  {collectionMaterials.length} Material{collectionMaterials.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Scale className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-300">Total Weight</span>
                    <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-300 border-blue-500/30">
                      {getTotalWeight().toFixed(2)} kg
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Package className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-300">Total Credits</span>
                    <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-300 border-green-500/30">
                      C {getTotalValue().toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo Capture Section */}
        <Card className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-white">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Camera className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-lg font-semibold">Collection Photos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {error && error.includes('Photo storage is not available') && (
              <div className="flex items-center space-x-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="text-yellow-200 text-sm">
                  <p className="font-medium">Photo storage not configured</p>
                  <p>Photos will be captured but not saved. Check QUICK_SETUP.md for instructions.</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Material Photo */}
              <PhotoCapture
                onPhotoCapture={(photo) => setMaterialPhoto(photo)}
                type="material"
                isOptional={false}
              />
              
              {/* Scale Photo */}
              <PhotoCapture
                onPhotoCapture={(photo) => setScalePhoto(photo)}
                type="scale"
                isOptional={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && !error.includes('Photo storage is not available') && (
          <div className="flex items-center space-x-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-red-200 font-medium">Error</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={retryLoadMaterials}
              className="border-red-500 text-red-400 hover:bg-red-900/20"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="flex items-center space-x-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-green-200 font-medium">Success!</p>
              <p className="text-green-300 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600/50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveCollection}
            disabled={saving || collectionMaterials.length === 0 || !collectionMaterials.some(m => m.materialName && m.kilograms > 0)}
            className="bg-orange-600 hover:bg-orange-700 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploadingPhotos ? 'Uploading Photos...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Collection
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 z-[60]">
      <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 border border-gray-600/50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
        {/* Modern Header */}
        <div className="relative bg-gradient-to-r from-gray-700/50 to-gray-600/50 border-b border-gray-600/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Package className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create Collection</h2>
                <p className="text-gray-300 text-xs">Record a collection for this user</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-120px)] p-4 space-y-4">
          {/* User Info */}
          <Card className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-gray-800/30 rounded-lg">
                    <span className="block text-xs font-medium text-gray-300">Full Name</span>
                    <p className="text-white text-sm font-semibold truncate">
                      {/* Always prioritize first_name and last_name from users table (saved during Sign Up/Profile Completion) */}
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`.trim()
                        : user.full_name || 'Unknown User'}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-800/30 rounded-lg">
                    <span className="block text-xs font-medium text-gray-300">Phone Number</span>
                    <p className="text-white text-sm font-semibold truncate">{maskPhone(user.phone) || 'Not provided'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-gray-800/30 rounded-lg">
                    <span className="block text-xs font-medium text-gray-300">Email Address</span>
                    <p className="text-white text-sm font-semibold truncate">{maskEmail(user.email)}</p>
                  </div>
                  <div className="p-2 bg-gray-800/30 rounded-lg">
                    <span className="block text-xs font-medium text-gray-300">Location</span>
                    <p className="text-white text-sm font-semibold truncate" title="Address hidden for privacy">
                      {maskAddress(formatAddress(user))}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials */}
          <Card className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-white text-base">
                <span className="font-semibold">Materials Collected</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addMaterial} 
                  className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Material
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {collectionMaterials.map((material, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-gray-600/50 rounded-xl bg-gradient-to-r from-gray-800/30 to-gray-700/30 backdrop-blur-sm hover:border-gray-500/50 transition-all duration-200">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-300">Material <span className="text-[10px] text-gray-400">({materials.length} available)</span></Label>
                      <Select 
                        value={material.materialName} 
                        onValueChange={(value) => updateMaterial(index, 'materialName', value)}
                      >
                        <SelectTrigger className="bg-gray-900/50 border-gray-600/50 text-white text-sm hover:border-gray-500/50 focus:border-orange-500/50 transition-all duration-200">
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent 
                          className="bg-gray-900 border-gray-600/50 backdrop-blur-sm z-[100]" 
                          position="popper"
                          sideOffset={5}
                          avoidCollisions={true}
                          collisionPadding={10}
                        >
                          {materials.length > 0 ? (
                            materials.map((mat) => (
                              <SelectItem 
                                key={mat.id} 
                                value={mat.name} 
                                className="text-white text-sm hover:bg-gray-700/50 focus:bg-gray-700/50 transition-all duration-200"
                              >
                                <span>{mat.name}</span>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="loading" disabled className="text-gray-400">
                              {loading ? "Loading materials..." : `No materials available (${materials.length} loaded)`}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-300">Weight (kg)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        value={material.kilograms || ''}
                        onChange={(e) => updateMaterial(index, 'kilograms', parseFloat(e.target.value) || 0)}
                        className="bg-gray-900/50 border-gray-600/50 text-white placeholder-gray-400 text-sm focus:border-orange-500/50 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-300">Unit Credit (C/kg)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={material.unitPrice || ''}
                        onChange={(e) => updateMaterial(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="bg-gray-900/50 border-gray-600/50 text-white placeholder-gray-400 text-sm focus:border-orange-500/50 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-300">Actions</Label>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2 p-2 bg-green-500/10 rounded-lg flex-1">
                          <span className="text-sm text-green-400 font-medium">
                            C {((material.kilograms || 0) * (material.unitPrice || 0)).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMaterial(index)}
                          disabled={collectionMaterials.length === 1}
                          className="border-red-600 text-red-400 hover:bg-red-900/20 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 p-3 bg-gray-800/40 rounded-xl border border-gray-600/30">
                <div className="flex items-center justify-between text-white mb-2">
                  <span className="text-sm font-semibold">Collection Summary</span>
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                    {collectionMaterials.length} Material{collectionMaterials.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-gray-800/30 rounded-lg">
                    <span className="block text-xs font-medium text-gray-300">Total Weight</span>
                    <span className="inline-block mt-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded px-2 py-0.5">
                      {getTotalWeight().toFixed(2)} kg
                    </span>
                  </div>
                  <div className="p-2 bg-gray-800/30 rounded-lg">
                    <span className="block text-xs font-medium text-gray-300">Total Credits</span>
                    <span className="inline-block mt-1 text-xs bg-green-500/20 text-green-300 border border-green-500/30 rounded px-2 py-0.5">
                      C {getTotalValue().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo Capture Section */}
          <Card className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">Collection Photos</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {error && error.includes('Photo storage is not available') && (
                <div className="flex items-center space-x-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="text-yellow-200 text-sm">
                    <p className="font-medium">Photo storage not configured</p>
                    <p>Photos will be captured but not saved. Check QUICK_SETUP.md for instructions.</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Material Photo */}
                <PhotoCapture
                  onPhotoCapture={(photo) => setMaterialPhoto(photo)}
                  type="material"
                  isOptional={false}
                />
                
                {/* Scale Photo */}
                <PhotoCapture
                  onPhotoCapture={(photo) => setScalePhoto(photo)}
                  type="scale"
                  isOptional={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && !error.includes('Photo storage is not available') && (
            <div className="flex items-center space-x-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-red-200 font-medium">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retryLoadMaterials}
                className="border-red-500 text-red-400 hover:bg-red-900/20"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="flex items-center space-x-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-green-200 font-medium">Success!</p>
                <p className="text-green-300 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-600/50">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCollection}
              disabled={saving || collectionMaterials.length === 0 || !collectionMaterials.some(m => m.materialName && m.kilograms > 0)}
              className="bg-orange-600 hover:bg-orange-700 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingPhotos ? 'Uploading Photos...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Collection
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
