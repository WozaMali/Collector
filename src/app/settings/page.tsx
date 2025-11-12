"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  IdCard,
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  Settings as SettingsIcon,
  Lock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import Navigation from "@/components/Navigation";
import { LogOut } from "lucide-react";

interface SettingsData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  streetAddress: string;
  townshipId: string;
  subdivision: string;
  suburb: string;
  city: string;
  postalCode: string;
  areaId: string;
  employeeNumber: string;
}

interface Township {
  id: string;
  name: string;
  city: string;
  postal_code: string;
}

export default function CollectorSettings() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [townships, setTownships] = useState<Township[]>([]);
  const [subdivisions, setSubdivisions] = useState<string[]>([]);
  const [selectedTownship, setSelectedTownship] = useState<Township | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [formData, setFormData] = useState<SettingsData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    streetAddress: "",
    townshipId: "",
    subdivision: "",
    suburb: "",
    city: "",
    postalCode: "",
    areaId: "",
    employeeNumber: ""
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load user data and townships on component mount
  useEffect(() => {
    if (user) {
      loadUserData();
      loadTownships();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone,
          role_id,
          status,
          street_addr,
          township_id,
          subdivision,
          suburb,
          city,
          postal_code,
          area_id,
          date_of_birth,
          employee_number
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user data:', error);
      } else if (userData) {
        setFormData({
          firstName: userData.first_name || "",
          lastName: userData.last_name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          dateOfBirth: userData.date_of_birth || "",
          streetAddress: userData.street_addr || "",
          townshipId: userData.township_id || "",
          subdivision: userData.subdivision || "",
          suburb: userData.suburb || "",
          city: userData.city || "",
          postalCode: userData.postal_code || "",
          areaId: userData.area_id || "",
          employeeNumber: userData.employee_number || "Not assigned"
        });

        // Set selected township if exists
        if (userData.township_id) {
          const township = townships.find(t => t.id === userData.township_id);
          if (township) {
            setSelectedTownship(township);
            loadSubdivisions(township.id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTownships = async () => {
    try {
      // Use the same township_dropdown view as the Main App
      const { data, error } = await supabase
        .from('township_dropdown')
        .select('id, township_name, city, postal_code')
        .order('township_name');

      if (error) {
        console.error('Error loading townships:', error);
      } else {
        // Map the data to match the expected interface
        const mappedTownships = data?.map(township => ({
          id: township.id,
          name: township.township_name,
          city: township.city,
          postal_code: township.postal_code
        })) || [];
        setTownships(mappedTownships);
      }
    } catch (error) {
      console.error('Error loading townships:', error);
    }
  };

  const handleTownshipChange = (townshipId: string) => {
    const township = townships.find(t => t.id === townshipId);
    setSelectedTownship(township || null);
    
    setFormData(prev => ({
      ...prev,
      townshipId,
      city: township?.city || "",
      postalCode: township?.postal_code || ""
    }));

    // Load subdivisions for the selected township
    loadSubdivisions(townshipId);
  };

  const loadSubdivisions = async (townshipId: string) => {
    try {
      // Fetch subdivisions from the database like the Main App does
      const { data, error } = await supabase
        .from('subdivision_dropdown')
        .select('subdivision')
        .eq('area_id', townshipId)
        .order('subdivision');

      if (error) {
        console.error('Error fetching subdivisions:', error);
        setSubdivisions([]);
        return;
      }

      // Extract subdivision names from the database response
      const subdivisions = data?.map(item => item.subdivision) || [];
      setSubdivisions(subdivisions);
    } catch (error) {
      console.error('Error loading subdivisions:', error);
      setSubdivisions([]);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.streetAddress.trim()) newErrors.streetAddress = "Street address is required";
    if (!formData.townshipId) newErrors.townshipId = "Township is required";
    if (!formData.subdivision.trim()) newErrors.subdivision = "Subdivision is required";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation (basic)
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }


    // Date of birth validation
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old";
      }
      
      if (age > 100) {
        newErrors.dateOfBirth = "Please enter a valid date of birth";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      setErrors({ submit: 'User not authenticated' });
      return;
    }

    setIsSaving(true);
    setErrors({});
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth,
          street_addr: formData.streetAddress,
          township_id: formData.townshipId,
          subdivision: formData.subdivision,
          suburb: formData.suburb,
          city: formData.city,
          postal_code: formData.postalCode,
          area_id: formData.areaId
        })
        .eq('id', user.id);

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('Update error:', error);
      setErrors({ submit: error.message || 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof SettingsData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    // Basic validation
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setIsChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message || "Failed to update password.");
        return;
      }
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      // Hide success after a moment
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 pb-24">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/w yellow.png" 
              alt="WozaMali Logo" 
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-300">Update your collector profile information</p>
        </div>

        {/* Settings Form */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-orange-500" />
              Profile Information
            </CardTitle>
            <CardDescription className="text-gray-400">
              Update your personal and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-white">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName" className="text-white">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-white">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth" className="text-white">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  {errors.dateOfBirth && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="employeeNumber" className="text-white">Employee Number</Label>
                  <Input
                    id="employeeNumber"
                    type="text"
                    value={formData.employeeNumber}
                    onChange={(e) => handleInputChange('employeeNumber', e.target.value)}
                    className="bg-gray-600 border-gray-500 text-gray-300"
                    placeholder="SNW-C0001"
                    readOnly
                  />
                  <p className="text-xs text-gray-400 mt-1">Your assigned employee number</p>
                </div>
              </div>


              {/* Address Information */}
              <div className="border-t border-gray-600 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-500" />
                  Address Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="streetAddress" className="text-white">Street Address *</Label>
                    <Input
                      id="streetAddress"
                      type="text"
                      value={formData.streetAddress}
                      onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter your street address"
                    />
                    {errors.streetAddress && (
                      <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.streetAddress}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="townshipId" className="text-white">Township *</Label>
                      <select
                        id="townshipId"
                        value={formData.townshipId}
                        onChange={(e) => handleTownshipChange(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select Township</option>
                        {townships.map((township) => (
                          <option key={township.id} value={township.id}>
                            {township.name}
                          </option>
                        ))}
                      </select>
                      {errors.townshipId && (
                        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.townshipId}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="subdivision" className="text-white">Subdivision *</Label>
                      <select
                        id="subdivision"
                        value={formData.subdivision}
                        onChange={(e) => handleInputChange('subdivision', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        disabled={!selectedTownship}
                      >
                        <option value="">Select Subdivision</option>
                        {subdivisions.map((subdivision) => (
                          <option key={subdivision} value={subdivision}>
                            {subdivision}
                          </option>
                        ))}
                      </select>
                      {errors.subdivision && (
                        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.subdivision}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-white">City</Label>
                      <Input
                        id="city"
                        type="text"
                        value={formData.city}
                        readOnly
                        className="bg-gray-600 border-gray-500 text-gray-300"
                        placeholder="Auto-filled from township"
                      />
                    </div>

                    <div>
                      <Label htmlFor="postalCode" className="text-white">Postal Code</Label>
                      <Input
                        id="postalCode"
                        type="text"
                        value={formData.postalCode}
                        readOnly
                        className="bg-gray-600 border-gray-500 text-gray-300"
                        placeholder="Auto-filled from township"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Success Message */}
              {success && (
                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Profile updated successfully!
                  </p>
                </div>
              )}

              {/* Submit Error */}
              {errors.submit && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {errors.submit}
                  </p>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="space-y-4 pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/')}
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Back to Dashboard
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={logout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="bg-gray-800 border-gray-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-500" />
              Change Password
            </CardTitle>
            <CardDescription className="text-gray-400">
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newPassword" className="text-white">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter a new password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </p>
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Password updated successfully
                  </p>
                </div>
              )}

              <div>
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <Navigation />
    </div>
  );
}