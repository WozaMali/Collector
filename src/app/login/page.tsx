"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  CheckCircle,
  LogIn,
  UserPlus,
  MapPin,
  Calendar
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Township {
  id: string;
  name: string;
  city: string;
  postal_code: string;
}

export default function CollectorAuthPage() {
  const router = useRouter();
  const { login, signUp, signInWithGoogle, isLoading, user, profile } = useAuth();
  
  // Sign-in form data
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  
  // Sign-up form data
  const [signUpData, setSignUpData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    streetAddress: '',
    townshipId: '',
    subdivision: '',
    city: 'Soweto',
    postalCode: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });

  // Address data
  const [townships, setTownships] = useState<Township[]>([]);
  const [subdivisions, setSubdivisions] = useState<string[]>([]);
  const [selectedTownship, setSelectedTownship] = useState<Township | null>(null);
  
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSignUpLoading, setIsSignUpLoading] = useState(false);
  const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({});
  // Local action loading states (avoid showing global auth loading as "Signing in…")
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Debug - User object:', user);
    console.log('🔍 Debug - Profile object:', profile);
    if (user) {
      console.log('🔍 Debug - User ID:', user.id);
      console.log('🔍 Debug - User email:', user.email);
      console.log('🔍 Debug - User role (if exists):', (user as any).role);
    }
    if (profile) {
      console.log('🔍 Debug - Profile ID:', profile.id);
      console.log('🔍 Debug - Profile role:', profile.role);
    }
  }, [user, profile]);

  // Load townships on component mount
  useEffect(() => {
    loadTownships();
  }, []);

  const loadTownships = async () => {
    try {
      // Use the same source as the Main App sign-up flow
      const { data, error } = await supabase
        .from('address_townships')
        .select('id, township_name, city, postal_code')
        .order('township_name');

      if (error) {
        console.error('Error loading townships:', error);
        setTownships([]);
        return;
      }

      const mapped: Township[] = ((data as any[]) || []).map((t: any) => ({
        id: t.id,
        name: t.township_name ?? t.name ?? '',
        city: t.city ?? '',
        postal_code: t.postal_code ?? ''
      }));
      setTownships(mapped);
    } catch (error) {
      console.error('Error loading townships:', error);
    }
  };

  const handleTownshipChange = (townshipId: string) => {
    const township = townships.find(t => t.id === townshipId);
    setSelectedTownship(township || null);
    
    setSignUpData(prev => ({
      ...prev,
      townshipId,
      subdivision: "", // Reset subdivision when township changes
      city: township?.city || "Soweto",
      postalCode: township?.postal_code || ""
    }));

    // Load subdivisions for the selected township (only if townshipId is not empty)
    if (townshipId && townshipId.trim() !== "") {
      loadSubdivisions(townshipId);
    } else {
      setSubdivisions([]);
    }
  };

  const loadSubdivisions = async (townshipId: string) => {
    // Don't query if townshipId is empty or invalid
    if (!townshipId || townshipId.trim() === "") {
      setSubdivisions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('address_subdivisions')
        .select('subdivision')
        .eq('area_id', townshipId)
        .order('subdivision');

      if (error) {
        console.error('Error loading subdivisions:', error);
        setSubdivisions([]);
      } else {
        setSubdivisions((data || []).map((r: any) => r.subdivision));
      }
    } catch (error) {
      console.error('Error loading subdivisions:', error);
    }
  };

  const generateEmployeeNumber = async (): Promise<string> => {
    try {
      // Find the highest existing employee number with SNW-C prefix, then increment
      const { data, error } = await supabase
        .from('users')
        .select('employee_number')
        .ilike('employee_number', 'SNW-C%')
        .order('employee_number', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('Error fetching last employee number (column may not exist yet):', error);
        // Generate a fallback employee number based on timestamp
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `SNW-C${randomSuffix}`;
      }

      const last = data && data.length > 0 ? data[0].employee_number as string : '';
      if (!last) return 'SNW-C0001';

      // Parse numeric portion and increment
      const match = last.match(/SNW-C(\d{4})/i);
      const lastNum = match ? parseInt(match[1], 10) : 0;
      const nextNum = lastNum + 1;
      return `SNW-C${nextNum.toString().padStart(4, '0')}`;
    } catch (error) {
      console.warn('Error generating employee number, using fallback:', error);
      // Generate a fallback employee number based on timestamp
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `SNW-C${randomSuffix}`;
    }
  };

  // Redirect if already authenticated (avoid loops until auth resolves)
  useEffect(() => {
    if (isLoading) return;
    if (user && user.role) {
      console.log('🔍 Debug - User authenticated with role:', user.role);
      if (user.role === 'collector') {
        console.log('🔍 Debug - Redirecting to dashboard');
        router.replace('/dashboard');
      } else if (user.role === 'admin') {
        console.log('🔍 Debug - Redirecting to admin dashboard');
        router.replace('/admin');
      } else {
        console.log('🔍 Debug - Unknown role, redirecting to dashboard');
        router.replace('/dashboard');
      }
    } else if (user && !user.role) {
      console.log('🔍 Debug - User authenticated but no role, redirecting to dashboard for dev mode');
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  // Sign-in handlers
  const handleSignInInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSignInData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (error) setError(null);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSigningIn(true);
    const response = await login(signInData.email, signInData.password);
    
    if (response.success) {
      setSuccess('Login successful! Redirecting...');
      // Navigate immediately; auth effect will stabilize destination
      router.replace('/dashboard');
    } else {
      setError(response.error || 'Login failed');
    }
    setIsSigningIn(false);
  };


  // Sign-up handlers
  const handleSignUpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setSignUpData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (signUpErrors[name]) {
      setSignUpErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (error) setError(null);
  };

  const validateSignUpForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    console.log('Validating form data:', signUpData);

    // Required fields
    if (!signUpData.firstName?.trim()) newErrors.firstName = "First name is required";
    if (!signUpData.lastName?.trim()) newErrors.lastName = "Last name is required";
    if (!signUpData.email?.trim()) newErrors.email = "Email is required";
    if (!signUpData.password) newErrors.password = "Password is required";
    if (!signUpData.phone?.trim()) newErrors.phone = "Phone number is required";
    if (!signUpData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!signUpData.streetAddress?.trim()) newErrors.streetAddress = "Street address is required";
    if (!signUpData.townshipId) newErrors.townshipId = "Township is required";
    if (!signUpData.subdivision?.trim()) {
      console.log('Subdivision validation failed:', signUpData.subdivision);
      newErrors.subdivision = "Subdivision is required";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (signUpData.email && !emailRegex.test(signUpData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (signUpData.password && signUpData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Password confirmation
    if (signUpData.password !== signUpData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Phone validation (basic)
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (signUpData.phone && !phoneRegex.test(signUpData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }


    // Date of birth validation
    if (signUpData.dateOfBirth) {
      const birthDate = new Date(signUpData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old to register";
      }
      
      if (age > 100) {
        newErrors.dateOfBirth = "Please enter a valid date of birth";
      }
    }

    setSignUpErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignUpForm()) {
      return;
    }

    setIsSignUpLoading(true);
    setError(null);
    setSuccess(null);
    setSignUpErrors({});

    try {
      // Generate employee number
      const empNumber = await generateEmployeeNumber();

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            phone: signUpData.phone,
            employee_number: empNumber
          }
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // Create collector profile in users table
      // Create user profile in users table
      let profileError = null;
      
      // First try with employee_number
      const { error: errorWithEmp } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: signUpData.email,
          first_name: signUpData.firstName,
          last_name: signUpData.lastName,
          full_name: `${signUpData.firstName} ${signUpData.lastName}`,
          phone: signUpData.phone,
          role_id: 'collector', // collector role name
          status: 'pending_approval', // Requires admin approval
          street_addr: signUpData.streetAddress,
          township_id: signUpData.townshipId,
          subdivision: signUpData.subdivision,
          city: signUpData.city,
          postal_code: signUpData.postalCode,
          employee_number: empNumber,
          date_of_birth: signUpData.dateOfBirth
        });

      if (errorWithEmp) {
        console.warn('Failed to insert with employee_number, trying without:', errorWithEmp.message);
        
        // If employee_number column doesn't exist, try without it
        const { error: errorWithoutEmp } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: signUpData.email,
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            full_name: `${signUpData.firstName} ${signUpData.lastName}`,
            phone: signUpData.phone,
            role_id: 'collector', // collector role name
            status: 'pending_approval', // Requires admin approval
            street_addr: signUpData.streetAddress,
            township_id: signUpData.townshipId,
            subdivision: signUpData.subdivision,
            city: signUpData.city,
            postal_code: signUpData.postalCode,
            date_of_birth: signUpData.dateOfBirth
          });
        
        profileError = errorWithoutEmp;
      } else {
        profileError = errorWithEmp;
      }

      if (profileError) {
        throw new Error(`Failed to create collector profile: ${profileError.message}`);
      }

      // Note: unified_collections record creation removed due to schema mismatch
      // This can be added later when the table structure is clarified

      setSuccess(`Registration successful! Your employee number is ${empNumber}. Your account is pending admin approval.`);
      
      // Clear form
      setSignUpData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        streetAddress: '',
        townshipId: '',
        subdivision: '',
        city: 'Soweto',
        postalCode: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false,
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSignUpLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);

    try {
      setIsGoogleSigningIn(true);
      const result = await signInWithGoogle();
      if (!result.success) {
        setError(result.error || 'Google sign-in failed');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('An unexpected error occurred during Google sign-in.');
    } finally {
      // The OAuth flow may redirect away, but if it doesn't, clear the local state
      setIsGoogleSigningIn(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border border-gray-700 bg-gray-900/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img 
                src="/w%20yellow.png" 
                alt="WozaMali Logo" 
                className="h-20 w-auto drop-shadow-2xl"
              />
              <div className="absolute -inset-3 bg-gradient-to-r from-orange-400 to-green-400 rounded-full blur opacity-30 animate-pulse"></div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-green-400 bg-clip-text text-transparent">
            WozaMali Collector
          </CardTitle>
          <CardDescription className="text-gray-300 mt-2">
            Create your collector account or sign in to existing account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-800 border border-gray-700">
              <TabsTrigger value="signin" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300">
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            {/* Sign In Tab */}
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInData.email}
                      onChange={handleSignInInputChange}
                      className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-password"
                      name="password"
                      type={showSignInPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={signInData.password}
                      onChange={handleSignInInputChange}
                      className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    name="rememberMe"
                    checked={signInData.rememberMe}
                    onCheckedChange={(checked) => 
                      setSignInData(prev => ({ ...prev, rememberMe: checked as boolean }))
                    }
                    className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <Label htmlFor="rememberMe" className="text-sm text-gray-300">
                    Remember me
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-400 hover:to-green-400 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-orange-500/25 transition-all duration-200 transform hover:scale-[1.02] border border-orange-400/20"
                  disabled={isSigningIn}
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-5 w-5" />
                      Sign In
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-900 px-2 text-gray-400">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign In Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="w-full border-2 border-gray-600 hover:border-gray-500 hover:bg-gray-800 text-gray-300 hover:text-white transition-all duration-200"
                  disabled={isGoogleSigningIn}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </form>
            </TabsContent>
            
            {/* Sign Up Tab */}
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                {/* Personal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="signup-firstName" className="text-gray-300">First Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-firstName"
                        name="firstName"
                        type="text"
                        value={signUpData.firstName}
                        onChange={handleSignUpInputChange}
                        className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                        placeholder="Enter your first name"
                      />
                    </div>
                    {signUpErrors.firstName && (
                      <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {signUpErrors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="signup-lastName" className="text-gray-300">Last Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-lastName"
                        name="lastName"
                        type="text"
                        value={signUpData.lastName}
                        onChange={handleSignUpInputChange}
                        className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                        placeholder="Enter your last name"
                      />
                    </div>
                    {signUpErrors.lastName && (
                      <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {signUpErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="signup-email" className="text-gray-300">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        value={signUpData.email}
                        onChange={handleSignUpInputChange}
                        className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                        placeholder="Enter your email"
                      />
                    </div>
                    {signUpErrors.email && (
                      <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {signUpErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="signup-phone" className="text-gray-300">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-phone"
                        name="phone"
                        type="tel"
                        value={signUpData.phone}
                        onChange={handleSignUpInputChange}
                        className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    {signUpErrors.phone && (
                      <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {signUpErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="signup-dateOfBirth" className="text-gray-300">Date of Birth *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={signUpData.dateOfBirth}
                        onChange={handleSignUpInputChange}
                        className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                    {signUpErrors.dateOfBirth && (
                      <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {signUpErrors.dateOfBirth}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address Information */}
                <div className="border-t border-gray-600 pt-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    Address Information
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="signup-streetAddress" className="text-gray-300">Street Address *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-streetAddress"
                          name="streetAddress"
                          type="text"
                          value={signUpData.streetAddress}
                          onChange={handleSignUpInputChange}
                          className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                          placeholder="Enter your street address"
                        />
                      </div>
                      {signUpErrors.streetAddress && (
                        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {signUpErrors.streetAddress}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="signup-townshipId" className="text-gray-300">Township *</Label>
                        <select
                          id="signup-townshipId"
                          value={signUpData.townshipId}
                          onChange={(e) => handleTownshipChange(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Select Township</option>
                          {townships.map((township) => (
                            <option key={township.id} value={township.id}>
                              {township.name}
                            </option>
                          ))}
                        </select>
                        {signUpErrors.townshipId && (
                          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {signUpErrors.townshipId}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="signup-subdivision" className="text-gray-300">Subdivision *</Label>
                        <select
                          id="signup-subdivision"
                          value={signUpData.subdivision}
                          onChange={(e) => {
                            console.log('Subdivision changed to:', e.target.value);
                            setSignUpData(prev => ({
                              ...prev,
                              subdivision: e.target.value
                            }));
                            if (signUpErrors.subdivision) {
                              setSignUpErrors(prev => ({ ...prev, subdivision: '' }));
                            }
                          }}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          disabled={!selectedTownship}
                        >
                          <option value="">Select Subdivision</option>
                          {subdivisions.map((subdivision) => (
                            <option key={subdivision} value={subdivision}>
                              {subdivision}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Current value: {signUpData.subdivision || 'None selected'}</p>
                        {signUpErrors.subdivision && (
                          <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {signUpErrors.subdivision}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="signup-city" className="text-gray-300">City</Label>
                        <Input
                          id="signup-city"
                          name="city"
                          type="text"
                          value={signUpData.city}
                          readOnly
                          className="bg-gray-600 border-gray-500 text-gray-300"
                          placeholder="Auto-filled from township"
                        />
                      </div>

                      <div>
                        <Label htmlFor="signup-postalCode" className="text-gray-300">Postal Code</Label>
                        <Input
                          id="signup-postalCode"
                          name="postalCode"
                          type="text"
                          value={signUpData.postalCode}
                          readOnly
                          className="bg-gray-600 border-gray-500 text-gray-300"
                          placeholder="Auto-filled from township"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Password Section */}
                <div className="border-t border-gray-600 pt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Account Security</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="signup-password" className="text-gray-300">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-password"
                          name="password"
                          type={showSignUpPassword ? "text" : "password"}
                          value={signUpData.password}
                          onChange={handleSignUpInputChange}
                          className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                          placeholder="Create a password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {signUpErrors.password && (
                        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {signUpErrors.password}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="signup-confirmPassword" className="text-gray-300">Confirm Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={signUpData.confirmPassword}
                          onChange={handleSignUpInputChange}
                          className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500"
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {signUpErrors.confirmPassword && (
                        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {signUpErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agreeToTerms"
                    name="agreeToTerms"
                    checked={signUpData.agreeToTerms}
                    onCheckedChange={(checked) => 
                      setSignUpData(prev => ({ ...prev, agreeToTerms: checked as boolean }))
                    }
                    className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <Label htmlFor="agreeToTerms" className="text-sm text-gray-300">
                    I agree to the terms and conditions
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-400 hover:to-green-400 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-orange-500/25 transition-all duration-200 transform hover:scale-[1.02] border border-orange-400/20"
                  disabled={isSignUpLoading}
                >
                  {isSignUpLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Create Collector Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mt-6 border-red-500/30 bg-red-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-500/30 bg-green-900/20 text-green-400 mt-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Registration Link */}
          <div className="text-center mt-8 pt-6 border-t border-gray-600">
            <p className="text-gray-300 text-sm">
              Don't have an account?{" "}
              <button 
                onClick={() => {
                  // Switch to signup tab
                  const signupTab = document.querySelector('[value="signup"]') as HTMLElement;
                  if (signupTab) signupTab.click();
                }}
                className="text-orange-400 hover:text-orange-300 font-medium transition-colors duration-200 cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}