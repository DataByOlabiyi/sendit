import { describe, it, expect } from 'vitest'
import { calculatePricing } from '../pricing'

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
