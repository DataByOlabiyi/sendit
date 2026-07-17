import { PRICING, PACKAGE_SIZE_MULTIPLIER } from '@sendit/constants'
import type { PackageSize, PricingEstimate } from '@sendit/types'

// Paystack charges in kobo (1 NGN = 100 kobo); orders.total_fee is stored in
// naira. Every naira→kobo comparison in the payment layer must go through
// this — inline `* 100` maths caused the 100x undercharge bug (commit 4c11a95).
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100)
}

export interface CommissionSplit {
  platformFee: number
  riderPayout: number
}

export function computeCommissionSplit(totalFee: number): CommissionSplit {
  const platformFee = Math.round(totalFee * PRICING.PLATFORM_COMMISSION * 100) / 100
  const riderPayout = Math.round((totalFee - platformFee) * 100) / 100
  return { platformFee, riderPayout }
}

export type PromoType = 'flat' | 'percentage'

// `value` is kobo for flat promos, basis points for percentage promos
// (1500 = 15%). `orderTotal` is kobo. Mirrors the promo_codes schema.
export function calculatePromoDiscount(
  promo: { type: PromoType; value: number },
  orderTotal: number,
): number {
  return promo.type === 'flat'
    ? Math.min(promo.value, orderTotal)
    : Math.floor((orderTotal * promo.value) / 10000)
}

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
