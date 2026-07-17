import { describe, it, expect } from 'vitest'
import { PRICING } from '@sendit/constants'
import {
  calculatePricing,
  calculatePromoDiscount,
  computeCommissionSplit,
  nairaToKobo,
} from '../pricing'

describe('calculatePricing', () => {
  it('calculates small package pricing', () => {
    const result = calculatePricing(5, 'small', false, 20)
    expect(result.base_fee).toBeGreaterThan(0)
    expect(result.distance_fee).toBeGreaterThan(0)
    expect(result.insurance_fee).toBe(0)
    expect(result.total_fee).toBe(result.base_fee + result.distance_fee)
    expect(result.estimated_distance_km).toBe(5)
    expect(result.estimated_duration_min).toBe(20)
  })

  it('adds insurance fee when has_insurance is true', () => {
    const without = calculatePricing(5, 'small', false, 20)
    const with_ = calculatePricing(5, 'small', true, 20)
    expect(with_.insurance_fee).toBeGreaterThan(0)
    expect(with_.total_fee).toBeGreaterThan(without.total_fee)
    expect(with_.total_fee).toBe(without.total_fee + with_.insurance_fee)
  })

  it('larger packages cost more than smaller packages', () => {
    const small = calculatePricing(10, 'small', false, 40)
    const medium = calculatePricing(10, 'medium', false, 40)
    const large = calculatePricing(10, 'large', false, 40)
    const xl = calculatePricing(10, 'extra_large', false, 40)
    expect(medium.total_fee).toBeGreaterThan(small.total_fee)
    expect(large.total_fee).toBeGreaterThan(medium.total_fee)
    expect(xl.total_fee).toBeGreaterThan(large.total_fee)
  })

  it('longer distance increases total fee', () => {
    const short = calculatePricing(2, 'small', false, 10)
    const long = calculatePricing(20, 'small', false, 80)
    expect(long.total_fee).toBeGreaterThan(short.total_fee)
  })

  it('rounds estimated distance to 1 decimal place', () => {
    const result = calculatePricing(5.123456789, 'small', false, 20)
    expect(result.estimated_distance_km).toBe(5.1)
  })
})

describe('nairaToKobo', () => {
  it('converts whole naira', () => {
    expect(nairaToKobo(1500)).toBe(150000)
  })

  it('never returns the raw naira value — guards the 100x undercharge bug', () => {
    expect(nairaToKobo(700)).not.toBe(700)
    expect(nairaToKobo(700)).toBe(70000)
  })

  it('rounds fractional naira instead of truncating float noise', () => {
    expect(nairaToKobo(10.05)).toBe(1005)
    expect(nairaToKobo(0.1 + 0.2)).toBe(30)
  })

  it('handles zero', () => {
    expect(nairaToKobo(0)).toBe(0)
  })
})

describe('computeCommissionSplit', () => {
  it('splits by PLATFORM_COMMISSION and sums back to the total', () => {
    const { platformFee, riderPayout } = computeCommissionSplit(1000)
    expect(platformFee).toBe(1000 * PRICING.PLATFORM_COMMISSION)
    expect(platformFee + riderPayout).toBe(1000)
  })

  it('rounds both sides to 2 decimal places', () => {
    const { platformFee, riderPayout } = computeCommissionSplit(999.99)
    expect(platformFee).toBe(Math.round(999.99 * PRICING.PLATFORM_COMMISSION * 100) / 100)
    expect(riderPayout).toBe(Math.round((999.99 - platformFee) * 100) / 100)
  })

  it('rider always receives the majority share', () => {
    const { platformFee, riderPayout } = computeCommissionSplit(2500)
    expect(riderPayout).toBeGreaterThan(platformFee)
  })
})

describe('calculatePromoDiscount', () => {
  it('flat promo discounts its kobo value', () => {
    expect(calculatePromoDiscount({ type: 'flat', value: 50000 }, 150000)).toBe(50000)
  })

  it('flat promo is capped at the order total — never a negative balance', () => {
    expect(calculatePromoDiscount({ type: 'flat', value: 200000 }, 150000)).toBe(150000)
  })

  it('percentage promo treats value as basis points (1500 = 15%)', () => {
    expect(calculatePromoDiscount({ type: 'percentage', value: 1500 }, 100000)).toBe(15000)
  })

  it('percentage promo floors to whole kobo', () => {
    expect(calculatePromoDiscount({ type: 'percentage', value: 1500 }, 99999)).toBe(14999)
  })

  it('100% promo (10000 bp) discounts the full total, no more', () => {
    expect(calculatePromoDiscount({ type: 'percentage', value: 10000 }, 87500)).toBe(87500)
  })

  it('zero-value promo discounts nothing', () => {
    expect(calculatePromoDiscount({ type: 'flat', value: 0 }, 150000)).toBe(0)
    expect(calculatePromoDiscount({ type: 'percentage', value: 0 }, 150000)).toBe(0)
  })
})
