export type ImpactConfig = {
  petRPerKg: number;       // 1.50
  cansRPerKg: number;      // 18.55
  pointsPerRand: number;   // 1
  petCO2PerKg: number;     // 1.7
  cansCO2PerKg: number;    // 9.1
  petWaterLPerKg: number;  // 30
  cansWaterLPerKg: number; // 140
  landfillDensityKgPerM3: number; // 500
};

export const defaultImpact: ImpactConfig = {
  petRPerKg: 1.5,
  cansRPerKg: 18.55,
  pointsPerRand: 1,
  petCO2PerKg: 1.7,
  cansCO2PerKg: 9.1,
  petWaterLPerKg: 30,
  cansWaterLPerKg: 140,
  landfillDensityKgPerM3: 500,
};

export function computeImpact(
  wPetKg: number,
  wCansKg: number,
  cfg: ImpactConfig = defaultImpact
) {
  const fundR = cfg.petRPerKg * wPetKg + cfg.cansRPerKg * wCansKg;
  const points = cfg.pointsPerRand * fundR;

  const co2Saved = cfg.petCO2PerKg * wPetKg + cfg.cansCO2PerKg * wCansKg;
  const waterSavedL =
    cfg.petWaterLPerKg * wPetKg + cfg.cansWaterLPerKg * wCansKg;

  const totalKg = wPetKg + wCansKg;
  const landfillM3 = totalKg / cfg.landfillDensityKgPerM3;
  const landfillL = landfillM3 * 1000;

  return { fundR, points, co2Saved, waterSavedL, landfillL };
}

// Helper function to calculate total impact from multiple contributions
export function computeTotalImpact(
  contributions: Array<{ petKg: number; cansKg: number }>,
  cfg: ImpactConfig = defaultImpact
) {
  const totalPet = contributions.reduce((sum, c) => sum + c.petKg, 0);
  const totalCans = contributions.reduce((sum, c) => sum + c.cansKg, 0);
  
  return computeImpact(totalPet, totalCans, cfg);
}

// Helper function to format impact values for display
export function formatImpactValue(value: number, unit: string, decimals: number = 1): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)}k ${unit}`;
  }
  return `${value.toFixed(decimals)} ${unit}`;
}

// Helper function to get impact description
export function getImpactDescription(impactType: 'co2' | 'water' | 'landfill'): string {
  switch (impactType) {
    case 'co2':
      return 'Carbon footprint reduction';
    case 'water':
      return 'Water conservation';
    case 'landfill':
      return 'Landfill space saved';
    default:
      return 'Environmental benefit';
  }
}
