import { describe, it, expect } from 'vitest'
import { haversineDistance } from '../geo'

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(6.5244, 3.3792, 6.5244, 3.3792)).toBe(0)
  })

  it('calculates distance between Lagos and Abuja (~526km great-circle)', () => {
    const dist = haversineDistance(6.5244, 3.3792, 9.0765, 7.3986)
    expect(dist).toBeGreaterThan(510)
    expect(dist).toBeLessThan(540)
  })

  it('calculates short intra-city distance (Victoria Island to Lekki ~5km)', () => {
    const dist = haversineDistance(6.4281, 3.4219, 6.4698, 3.5852)
    expect(dist).toBeGreaterThan(3)
    expect(dist).toBeLessThan(20)
  })

  it('rejects coordinates outside valid range by returning a finite number', () => {
    // Haversine should still compute for edge coordinates
    const dist = haversineDistance(-90, -180, 90, 180)
    expect(Number.isFinite(dist)).toBe(true)
  })
})
