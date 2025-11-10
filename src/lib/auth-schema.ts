// ============================================================================
// AUTHENTICATION SCHEMA
// ============================================================================

export type UserRole = 'ADMIN' | 'STAFF' | 'COLLECTOR';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminStaff extends User {
  role: 'ADMIN' | 'STAFF';
  permissions: string[];
  department?: string;
  canManageUsers: boolean;
  canManageCollections: boolean;
  canViewAnalytics: boolean;
  canManageFunds: boolean;
}



export interface Collector extends User {
  role: 'COLLECTOR';
  collectorId: string;
  assignedRoutes: string[];
  totalCollections: number;
  totalKgCollected: number;
  totalPoints: number;
  currentRoute?: string;
  vehicleInfo?: {
    type: string;
    plateNumber: string;
    capacity: number;
  };
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  redirectTo?: string;
}

export interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

// Mock user database
export const mockUsers: (AdminStaff | Collector)[] = [
  // Admin Users
  {
    id: 'admin-001',
    username: 'admin',
    email: 'admin@wozamali.com',
    role: 'ADMIN',
    firstName: 'System',
    lastName: 'Administrator',
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    permissions: ['*'],
    canManageUsers: true,
    canManageCollections: true,
    canViewAnalytics: true,
    canManageFunds: true,
  },
  {
    id: 'staff-001',
    username: 'manager',
    email: 'manager@wozamali.com',
    role: 'STAFF',
    firstName: 'Sarah',
    lastName: 'Johnson',
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    permissions: ['collections', 'analytics', 'funds'],
    department: 'Operations',
    canManageUsers: false,
    canManageCollections: true,
    canViewAnalytics: true,
    canManageFunds: true,
  },
  {
    id: 'staff-002',
    username: 'supervisor',
    email: 'supervisor@wozamali.com',
    role: 'STAFF',
    firstName: 'Mike',
    lastName: 'Chen',
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    permissions: ['collections', 'analytics'],
    department: 'Collections',
    canManageUsers: false,
    canManageCollections: true,
    canViewAnalytics: true,
    canManageFunds: false,
  },

  // Collector Users
  {
    id: 'collector-001',
    username: 'col001',
    email: 'col001@wozamali.com',
    role: 'COLLECTOR',
    firstName: 'John',
    lastName: 'Smith',
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    collectorId: 'COL-001',
    assignedRoutes: ['route-1', 'route-2'],
    totalCollections: 156,
    totalKgCollected: 2347.5,
    totalPoints: 3456,
    currentRoute: 'route-1',
    vehicleInfo: {
      type: 'Pickup Truck',
      plateNumber: 'CA 123-456',
      capacity: 1000,
    },
  },
  {
    id: 'collector-002',
    username: 'col002',
    email: 'col002@wozamali.com',
    role: 'COLLECTOR',
    firstName: 'Emma',
    lastName: 'Wilson',
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    collectorId: 'COL-002',
    assignedRoutes: ['route-3'],
    totalCollections: 89,
    totalKgCollected: 1234.2,
    totalPoints: 1890,
    currentRoute: 'route-3',
    vehicleInfo: {
      type: 'Van',
      plateNumber: 'CA 789-012',
      capacity: 500,
    },
  },
  {
    id: 'collector-003',
    username: 'col003',
    email: 'col003@wozamali.com',
    role: 'COLLECTOR',
    firstName: 'David',
    lastName: 'Brown',
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    collectorId: 'COL-003',
    assignedRoutes: ['route-1'],
    totalCollections: 203,
    totalKgCollected: 3120.8,
    totalPoints: 4567,
    currentRoute: 'route-1',
    vehicleInfo: {
      type: 'Truck',
      plateNumber: 'CA 345-678',
      capacity: 1500,
    },
  },
];

// Default credentials for testing
export const defaultCredentials = {
  admin: { username: 'admin', email: 'admin@wozamali.com', password: 'admin123' },
  staff: { username: 'manager', email: 'manager@wozamali.com', password: 'staff123' },
  collector: { username: 'col001', email: 'col001@wozamali.com', password: 'collector123' },
};

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

// Authenticate user
export function authenticateUser(credentials: AuthCredentials): AuthResponse {
  const user = mockUsers.find(u => 
    u.username === credentials.username && 
    u.isActive
  );

  if (!user) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  // In a real app, you would hash and verify the password
  // For demo purposes, we'll use simple password matching
  const validPasswords = {
    'admin': 'admin123',
    'manager': 'staff123',
    'supervisor': 'supervisor123',
    'col001': 'collector123',
    'col002': 'collector123',
    'col003': 'collector123',
  };

  if (validPasswords[user.username as keyof typeof validPasswords] !== credentials.password) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  // Update last login
  user.lastLogin = new Date();

        // Generate redirect path based on role
      let redirectTo = '/dashboard';
      if (user.role === 'COLLECTOR') {
        redirectTo = '/collector';
      } else if (user.role === 'ADMIN' || user.role === 'STAFF') {
        redirectTo = '/admin';
      }

  return {
    success: true,
    user,
    token: `token_${user.id}_${Date.now()}`,
    redirectTo,
  };
}

// Get user by ID
export function getUserById(id: string): User | undefined {
  return mockUsers.find(u => u.id === id);
}

// Get user by username
export function getUserByUsername(username: string): User | undefined {
  return mockUsers.find(u => u.username === username);
}

// Check if user has permission
export function hasPermission(user: User, permission: string): boolean {
  if (user.role === 'ADMIN') return true;
  
  if (user.role === 'STAFF') {
    const staffUser = user as AdminStaff;
    return staffUser.permissions.includes(permission) || staffUser.permissions.includes('*');
  }
  
  return false;
}

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'ADMIN': return 'Administrator';
    case 'STAFF': return 'Staff Member';
    case 'COLLECTOR': return 'Collector';
    default: return 'Unknown';
  }
}

// Get role color for UI
export function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'ADMIN': return 'text-red-600 bg-red-50';
    case 'STAFF': return 'text-blue-600 bg-blue-50';
    case 'COLLECTOR': return 'text-green-600 bg-green-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

// Validate username format
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 20) {
    return { isValid: false, error: 'Username must be less than 20 characters' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { isValid: true };
}

// Validate password strength
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 50) {
    return { isValid: false, error: 'Password must be less than 50 characters' };
  }
  
  return { isValid: true };
}

// Get user initials for avatar
export function getUserInitials(user: User): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

// Get user full name
export function getUserFullName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

// Check if user can access admin area
export function canAccessAdmin(user: User): boolean {
  return user.role === 'ADMIN' || user.role === 'STAFF';
}

// Check if user can access collector area
export function canAccessCollector(user: User): boolean {
  return user.role === 'COLLECTOR';
}

// Get user dashboard info
export function getUserDashboardInfo(user: User) {
  if (user.role === 'COLLECTOR') {
    const collector = user as Collector;
    return {
      title: 'Collector Dashboard',
      subtitle: `Route: ${collector.currentRoute || 'Not Assigned'}`,
      stats: [
        { label: 'Total Collections', value: collector.totalCollections },
        { label: 'Total Kg Collected', value: collector.totalKgCollected.toFixed(1) },
        { label: 'Total Points', value: collector.totalPoints },
      ],
    };
  } else {
    return {
      title: 'Admin Dashboard',
      subtitle: `${getRoleDisplayName(user.role)} Portal`,
      stats: [
        { label: 'Total Users', value: mockUsers.filter(u => u.isActive).length },
        { label: 'Total Collectors', value: mockUsers.filter(u => u.role === 'COLLECTOR' && u.isActive).length },
        { label: 'Active Routes', value: 3 },
      ],
    };
  }
}
