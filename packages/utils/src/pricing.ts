import { PRICING, PACKAGE_SIZE_MULTIPLIER } from '@sendit/constants'
import type { PackageSize, PricingEstimate } from '@sendit/types'

export function calculatePricing(
  distanceKm: number,
  packageSize: PackageSize,
  hasInsurance: boolean,
  durationMin: number
): PricingEstimate {
  const multiplier = PACKAGE_SIZE_MULTIPLIER[packageSize]
  const base_fee = PRICING.BASE_FEE
  const distance_fee = Math.ceil(distanceKm * PRICING.PER_KM_FEE * multiplier)
  const insurance_fee = hasInsurance ? PRICING.INSURANCE_FEE : 0
  const total_fee = base_fee + distance_fee + insurance_fee

  return {
    base_fee,
    distance_fee,
    insurance_fee,
    total_fee,
    estimated_distance_km: Math.round(distanceKm * 10) / 10,
    estimated_duration_min: durationMin,
  }
}
