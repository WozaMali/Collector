// ============================================================================
// RECYCLING AUTO-CALCULATOR SCHEMA
// ============================================================================

// Core Material Types and Pricing
export type MaterialType = 'PET' | 'ALUMINUM_CANS' | 'GLASS' | 'PAPER' | 'ELECTRONICS' | 'BATTERIES';

export interface MaterialPricing {
  id: string;
  type: MaterialType;
  name: string;
  pricePerKg: number;
  pointsPerKg: number;
  co2SavedPerKg: number;
  waterSavedPerKg: number;
  landfillSavedPerKg: number;
  isActive: boolean;
  lastUpdated: Date;
}

// User Achievement System
export type AchievementType = 'BRONZE_RECYCLER' | 'SILVER_RECYCLER' | 'GOLD_RECYCLER' | 'PLATINUM_RECYCLER' | 'DIAMOND_RECYCLER';

export interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  requiredPoints: number;
  requiredKg: number;
  badgeColor: string;
  rewards: {
    points: number;
    fundBonus: number;
    specialFeatures: string[];
  };
}

// User Wallet and Fund Allocation
export type FundType = 'WALLET' | 'GREEN_SCHOLAR' | 'ENVIRONMENTAL_PROJECTS';

export interface UserWallet {
  userId: string;
  totalPoints: number;
  availablePoints: number;
  totalRecycledKg: number;
  totalFundsEarned: number;
  funds: {
    wallet: number;
    greenScholar: number;
    environmentalProjects: number;
  };
  achievements: AchievementType[];
  lastUpdated: Date;
}

// Collection Transaction
export interface CollectionTransaction {
  id: string;
  userId: string;
  collectorId: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    region: string;
  };
  materials: Array<{
    type: MaterialType;
    kg: number;
    price: number;
    points: number;
    co2Saved: number;
    waterSaved: number;
    landfillSaved: number;
  }>;
  totals: {
    totalKg: number;
    totalPrice: number;
    totalPoints: number;
    totalCo2Saved: number;
    totalWaterSaved: number;
    totalLandfillSaved: number;
  };
  fundAllocation: {
    wallet: number;
    greenScholar: number;
    environmentalProjects: number;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  notes?: string;
  images?: string[];
}

// Auto-Calculator Configuration
export interface AutoCalculatorConfig {
  // Fund Allocation Percentages
  fundAllocation: {
    wallet: number;           // 70% - User's personal wallet
    greenScholar: number;     // 20% - Green Scholar Fund
    environmentalProjects: number; // 10% - Environmental Projects
  };
  
  // Points Multipliers
  pointMultipliers: {
    baseMultiplier: number;   // 1 point per R1
    achievementBonus: number; // 10% bonus for achievements
    streakBonus: number;      // 5% bonus for consecutive days
    referralBonus: number;    // 15% bonus for referrals
  };
  
  // Achievement Thresholds
  achievementThresholds: {
    bronze: { points: 100, kg: 50 };
    silver: { points: 500, kg: 200 };
    gold: { points: 1000, kg: 500 };
    platinum: { points: 2500, kg: 1000 };
    diamond: { points: 5000, kg: 2000 };
  };
  
  // Daily Limits
  dailyLimits: {
    maxKgPerDay: number;      // 100 kg per day
    maxTransactionsPerDay: number; // 10 transactions per day
    maxPointsPerDay: number;  // 1000 points per day
  };
}

// Default Configuration
export const defaultAutoCalculatorConfig: AutoCalculatorConfig = {
  fundAllocation: {
    wallet: 70,
    greenScholar: 20,
    environmentalProjects: 10,
  },
  pointMultipliers: {
    baseMultiplier: 1,
    achievementBonus: 0.1,
    streakBonus: 0.05,
    referralBonus: 0.15,
  },
  achievementThresholds: {
    bronze: { points: 100, kg: 50 },
    silver: { points: 500, kg: 200 },
    gold: { points: 1000, kg: 500 },
    platinum: { points: 2500, kg: 1000 },
    diamond: { points: 5000, kg: 2000 },
  },
  dailyLimits: {
    maxKgPerDay: 100,
    maxTransactionsPerDay: 10,
    maxPointsPerDay: 1000,
  },
};

// Default Material Pricing
export const defaultMaterialPricing: MaterialPricing[] = [
  {
    id: 'pet-001',
    type: 'PET',
    name: 'PET Plastic Bottles',
    pricePerKg: 1.50,
    pointsPerKg: 1.5,
    co2SavedPerKg: 1.7,
    waterSavedPerKg: 30,
    landfillSavedPerKg: 2.0,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    id: 'aluminum-001',
    type: 'ALUMINUM_CANS',
    name: 'Aluminum Cans',
    pricePerKg: 18.55,
    pointsPerKg: 18.55,
    co2SavedPerKg: 9.1,
    waterSavedPerKg: 140,
    landfillSavedPerKg: 2.0,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    id: 'glass-001',
    type: 'GLASS',
    name: 'Glass Bottles',
    pricePerKg: 2.50,
    pointsPerKg: 2.5,
    co2SavedPerKg: 0.8,
    waterSavedPerKg: 20,
    landfillSavedPerKg: 2.0,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    id: 'paper-001',
    type: 'PAPER',
    name: 'Paper & Cardboard',
    pricePerKg: 1.20,
    pointsPerKg: 1.2,
    co2SavedPerKg: 0.9,
    waterSavedPerKg: 15,
    landfillSavedPerKg: 2.0,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    id: 'electronics-001',
    type: 'ELECTRONICS',
    name: 'Electronic Waste',
    pricePerKg: 25.00,
    pointsPerKg: 25.0,
    co2SavedPerKg: 15.0,
    waterSavedPerKg: 200,
    landfillSavedPerKg: 5.0,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    id: 'batteries-001',
    type: 'BATTERIES',
    name: 'Batteries',
    pricePerKg: 35.00,
    pointsPerKg: 35.0,
    co2SavedPerKg: 20.0,
    waterSavedPerKg: 300,
    landfillSavedPerKg: 8.0,
    isActive: true,
    lastUpdated: new Date(),
  },
];

// Default Achievements
export const defaultAchievements: Achievement[] = [
  {
    id: 'bronze-001',
    type: 'BRONZE_RECYCLER',
    name: 'Bronze Recycler',
    description: 'Begin your recycling journey',
    icon: '🥉',
    requiredPoints: 100,
    requiredKg: 50,
    badgeColor: '#CD7F32',
    rewards: {
      points: 50,
      fundBonus: 0.05,
      specialFeatures: ['Basic recycling insights'],
    },
  },
  {
    id: 'silver-001',
    type: 'SILVER_RECYCLER',
    name: 'Silver Recycler',
    description: 'Making a real difference',
    icon: '🥈',
    requiredPoints: 500,
    requiredKg: 200,
    badgeColor: '#C0C0C0',
    rewards: {
      points: 100,
      fundBonus: 0.10,
      specialFeatures: ['Advanced analytics', 'Priority support'],
    },
  },
  {
    id: 'gold-001',
    type: 'GOLD_RECYCLER',
    name: 'Gold Recycler',
    description: 'Environmental champion',
    icon: '🥇',
    requiredPoints: 1000,
    requiredKg: 500,
    badgeColor: '#FFD700',
    rewards: {
      points: 250,
      fundBonus: 0.15,
      specialFeatures: ['Exclusive events', 'VIP status', 'Custom achievements'],
    },
  },
  {
    id: 'platinum-001',
    type: 'PLATINUM_RECYCLER',
    name: 'Platinum Recycler',
    description: 'Sustainability leader',
    icon: '💎',
    requiredPoints: 2500,
    requiredKg: 1000,
    badgeColor: '#E5E4E2',
    rewards: {
      points: 500,
      fundBonus: 0.20,
      specialFeatures: ['Community leader', 'Mentorship opportunities', 'Special recognition'],
    },
  },
  {
    id: 'diamond-001',
    type: 'DIAMOND_RECYCLER',
    name: 'Diamond Recycler',
    description: 'Legendary environmental impact',
    icon: '💎',
    requiredPoints: 5000,
    requiredKg: 2000,
    badgeColor: '#B9F2FF',
    rewards: {
      points: 1000,
      fundBonus: 0.25,
      specialFeatures: ['Hall of fame', 'Ambassador status', 'Exclusive partnerships'],
    },
  },
];

// ============================================================================
// AUTO-CALCULATOR FUNCTIONS
// ============================================================================

// Calculate transaction totals
export function calculateTransactionTotals(
  materials: Array<{ type: MaterialType; kg: number }>,
  config: AutoCalculatorConfig = defaultAutoCalculatorConfig,
  userAchievements: AchievementType[] = [],
  userStreak: number = 0,
  hasReferrals: boolean = false
): {
  totalKg: number;
  totalPrice: number;
  totalPoints: number;
  totalCo2Saved: number;
  totalWaterSaved: number;
  totalLandfillSaved: number;
  fundAllocation: { wallet: number; greenScholar: number; environmentalProjects: number };
  achievementProgress: { current: AchievementType; next: AchievementType | null; progress: number };
} {
  let totalKg = 0;
  let totalPrice = 0;
  let totalPoints = 0;
  let totalCo2Saved = 0;
  let totalWaterSaved = 0;
  let totalLandfillSaved = 0;

  // Calculate material totals
  materials.forEach(({ type, kg }) => {
    const material = defaultMaterialPricing.find(m => m.type === type);
    if (material && material.isActive) {
      totalKg += kg;
      totalPrice += kg * material.pricePerKg;
      totalPoints += kg * material.pointsPerKg;
      totalCo2Saved += kg * material.co2SavedPerKg;
      totalWaterSaved += kg * material.waterSavedPerKg;
      totalLandfillSaved += kg * material.landfillSavedPerKg;
    }
  });

  // Apply bonuses
  let bonusMultiplier = 1;
  
  // Achievement bonus
  if (userAchievements.length > 0) {
    bonusMultiplier += config.pointMultipliers.achievementBonus;
  }
  
  // Streak bonus
  if (userStreak > 0) {
    bonusMultiplier += config.pointMultipliers.streakBonus;
  }
  
  // Referral bonus
  if (hasReferrals) {
    bonusMultiplier += config.pointMultipliers.referralBonus;
  }

  // Apply bonus to points
  totalPoints = Math.round(totalPoints * bonusMultiplier);

  // Calculate fund allocation
  const fundAllocation = {
    wallet: (totalPrice * config.fundAllocation.wallet) / 100,
    greenScholar: (totalPrice * config.fundAllocation.greenScholar) / 100,
    environmentalProjects: (totalPrice * config.fundAllocation.environmentalProjects) / 100,
  };

  // Calculate achievement progress
  const achievementProgress = calculateAchievementProgress(totalPoints, totalKg);

  return {
    totalKg,
    totalPrice,
    totalPoints,
    totalCo2Saved,
    totalWaterSaved,
    totalLandfillSaved,
    fundAllocation,
    achievementProgress,
  };
}

// Calculate achievement progress
export function calculateAchievementProgress(
  currentPoints: number,
  currentKg: number
): { current: AchievementType; next: AchievementType | null; progress: number } {
  const achievements = defaultAchievements.sort((a, b) => a.requiredPoints - b.requiredPoints);
  
  let currentAchievement: AchievementType = 'BRONZE_RECYCLER';
  let nextAchievement: AchievementType | null = null;
  let progress = 0;

  for (let i = 0; i < achievements.length; i++) {
    const achievement = achievements[i];
    
    if (currentPoints >= achievement.requiredPoints && currentKg >= achievement.requiredKg) {
      currentAchievement = achievement.type;
      
      // Check if there's a next achievement
      if (i + 1 < achievements.length) {
        const next = achievements[i + 1];
        const pointsProgress = (currentPoints - achievement.requiredPoints) / (next.requiredPoints - achievement.requiredPoints);
        const kgProgress = (currentKg - achievement.requiredKg) / (next.requiredKg - achievement.requiredKg);
        progress = Math.min(Math.max(pointsProgress, kgProgress), 1);
        nextAchievement = next.type;
      } else {
        progress = 1; // Maxed out
      }
    } else {
      // Found the next achievable achievement
      if (i === 0) {
        // Haven't reached bronze yet
        const pointsProgress = currentPoints / achievement.requiredPoints;
        const kgProgress = currentKg / achievement.requiredKg;
        progress = Math.min(Math.max(pointsProgress, kgProgress), 1);
        nextAchievement = achievement.type;
      }
      break;
    }
  }

  return { current: currentAchievement, next: nextAchievement, progress };
}

// Validate transaction limits
export function validateTransactionLimits(
  userId: string,
  newKg: number,
  userDailyStats: { kg: number; transactions: number; points: number },
  config: AutoCalculatorConfig = defaultAutoCalculatorConfig
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check daily kg limit
  if (userDailyStats.kg + newKg > config.dailyLimits.maxKgPerDay) {
    errors.push(`Daily limit exceeded. Maximum ${config.dailyLimits.maxKgPerDay}kg per day.`);
  }

  // Check daily transaction limit
  if (userDailyStats.transactions >= config.dailyLimits.maxTransactionsPerDay) {
    errors.push(`Daily transaction limit reached. Maximum ${config.dailyLimits.maxTransactionsPerDay} transactions per day.`);
  }

  // Check daily points limit
  const estimatedPoints = newKg * 10; // Rough estimate
  if (userDailyStats.points + estimatedPoints > config.dailyLimits.maxPointsPerDay) {
    errors.push(`Daily points limit exceeded. Maximum ${config.dailyLimits.maxPointsPerDay} points per day.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Get material pricing by type
export function getMaterialPricing(type: MaterialType): MaterialPricing | undefined {
  return defaultMaterialPricing.find(m => m.type === type && m.isActive);
}

// Get achievement by type
export function getAchievement(type: AchievementType): Achievement | undefined {
  return defaultAchievements.find(a => a.type === type);
}

// Format currency
export function formatCurrency(amount: number): string {
  return `R ${amount.toFixed(2)}`;
}

// Format weight
export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)} tons`;
  }
  return `${kg.toFixed(1)} kg`;
}

// Format points
export function formatPoints(points: number): string {
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}k pts`;
  }
  return `${points} pts`;
}
