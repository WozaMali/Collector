'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Mail, Phone, Shield, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UnifiedSignupFormProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  defaultRole?: string;
  showRoleSelection?: boolean;
}

export default function UnifiedSignupForm({ 
  onSuccess, 
  onError, 
  defaultRole = 'member',
  showRoleSelection = false 
}: UnifiedSignupFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: defaultRole
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional but if provided, should be valid)
    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            phone: formData.phone.trim() || null
          }
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // 2. Get the role ID for the selected role
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', formData.role)
        .single();

      if (roleError) {
        console.warn('Could not fetch role ID:', roleError);
      }

      // 3. Create user profile in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.email,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          phone: formData.phone.trim() || null,
          role_id: roleData?.id || formData.role, // Fallback to role name if ID not found
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.warn('Could not create user profile:', userError);
      }

      // 4. Success
      const userProfile = {
        ...authData.user,
        user_metadata: {
          ...authData.user.user_metadata,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          phone: formData.phone.trim() || null
        },
        profile: userData
      };

      onSuccess?.(userProfile);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: defaultRole
      });

    } catch (error: any) {
      console.error('Signup error:', error);
      onError?.(error.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-800 border-gray-700">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
        <CardDescription className="text-gray-400">
          Join the WozaMali community
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              placeholder="Enter your first name"
              disabled={loading}
            />
            {errors.firstName && (
              <Alert className="bg-red-900/20 border-red-500">
                <AlertDescription className="text-red-400">{errors.firstName}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              placeholder="Enter your last name"
              disabled={loading}
            />
            {errors.lastName && (
              <Alert className="bg-red-900/20 border-red-500">
                <AlertDescription className="text-red-400">{errors.lastName}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pl-10"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
            {errors.email && (
              <Alert className="bg-red-900/20 border-red-500">
                <AlertDescription className="text-red-400">{errors.email}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pl-10"
                placeholder="Enter your phone number"
                disabled={loading}
              />
            </div>
            {errors.phone && (
              <Alert className="bg-red-900/20 border-red-500">
                <AlertDescription className="text-red-400">{errors.phone}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Role Selection (if enabled) */}
          {showRoleSelection && (
            <div className="space-y-2">
              <Label htmlFor="role" className="text-gray-300">Role</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white pl-10">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="member" className="text-white">Member/Resident</SelectItem>
                    <SelectItem value="collector" className="text-white">Collector</SelectItem>
                    <SelectItem value="office_staff" className="text-white">Office Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-10"
                placeholder="Create a password"
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            {errors.password && (
              <Alert className="bg-red-900/20 border-red-500">
                <AlertDescription className="text-red-400">{errors.password}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-10"
                placeholder="Confirm your password"
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <Alert className="bg-red-900/20 border-red-500">
                <AlertDescription className="text-red-400">{errors.confirmPassword}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
