import { describe, it, expect } from 'vitest'
import { createOrderSchema } from '../orders'
import { riderKycSchema, riderProfileSchema } from '../rider'

const validOrder = {
  pickup_address: '1 Marina Road, Lagos Island',
  pickup_lat: 6.4531,
  pickup_lng: 3.3958,
  delivery_address: '15 Ozumba Mbadiwe, Victoria Island',
  delivery_lat: 6.4281,
  delivery_lng: 3.4219,
  delivery_contact_name: 'Jane Doe',
  delivery_contact_phone: '08012345678',
  package_description: 'Electronics',
  package_size: 'small' as const,
  is_fragile: false,
  has_insurance: false,
  payment_method: 'paystack' as const,
}

describe('createOrderSchema', () => {
  it('accepts a valid order', () => {
    const result = createOrderSchema.safeParse(validOrder)
    expect(result.success).toBe(true)
  })

  it('rejects pickup_address that is too short', () => {
    const result = createOrderSchema.safeParse({ ...validOrder, pickup_address: 'Ab' })
    expect(result.success).toBe(false)
  })

  it('rejects lat/lng outside valid range', () => {
    const badLat = createOrderSchema.safeParse({ ...validOrder, pickup_lat: 91 })
    expect(badLat.success).toBe(false)
    const badLng = createOrderSchema.safeParse({ ...validOrder, delivery_lng: 181 })
    expect(badLng.success).toBe(false)
  })

  it('rejects invalid package_size', () => {
    const result = createOrderSchema.safeParse({ ...validOrder, package_size: 'huge' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid payment_method', () => {
    const result = createOrderSchema.safeParse({ ...validOrder, payment_method: 'bitcoin' })
    expect(result.success).toBe(false)
  })

  it('requires scheduled_pickup_at when is_scheduled is true', () => {
    const result = createOrderSchema.safeParse({ ...validOrder, is_scheduled: true })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('scheduled_pickup_at')
    }
  })

  it('accepts scheduled order with valid datetime', () => {
    const future = new Date(Date.now() + 3600_000).toISOString()
    const result = createOrderSchema.safeParse({
      ...validOrder,
      is_scheduled: true,
      scheduled_pickup_at: future,
    })
    expect(result.success).toBe(true)
  })

  it('rejects extra_stops with more than 10 entries', () => {
    const stops = Array.from({ length: 11 }, (_, i) => ({
      sequence: i + 2,
      address: '15 Somewhere Road, Lagos',
      lat: 6.45,
      lng: 3.40,
      contact_name: 'John Stop',
      contact_phone: '08012345678',
    }))
    const result = createOrderSchema.safeParse({ ...validOrder, extra_stops: stops })
    expect(result.success).toBe(false)
  })

  it('accepts valid extra stops', () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      is_multi_stop: true,
      extra_stops: [{
        sequence: 2,
        address: '10 Adeola Odeku, VI',
        lat: 6.428,
        lng: 3.423,
        contact_name: 'John Stop',
        contact_phone: '08012345678',
      }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects extra stop missing contact info', () => {
    const result = createOrderSchema.safeParse({
      ...validOrder,
      is_multi_stop: true,
      extra_stops: [{ sequence: 2, address: '10 Adeola Odeku, VI', lat: 6.428, lng: 3.423 }],
    })
    expect(result.success).toBe(false)
  })
})

describe('riderKycSchema', () => {
  it('accepts valid 11-digit BVN and NIN', () => {
    expect(riderKycSchema.safeParse({ bvn: '12345678901', nin: '10987654321' }).success).toBe(true)
  })

  it('rejects BVN shorter than 11 digits', () => {
    expect(riderKycSchema.safeParse({ bvn: '1234567890', nin: '10987654321' }).success).toBe(false)
  })

  it('rejects BVN with non-numeric characters', () => {
    expect(riderKycSchema.safeParse({ bvn: '1234567890a', nin: '10987654321' }).success).toBe(false)
  })
})

describe('riderProfileSchema', () => {
  it('accepts valid rider profile', () => {
    const result = riderProfileSchema.safeParse({
      vehicle_type: 'motorcycle',
      vehicle_plate: 'ABC-123-XY',
      vehicle_model: 'Honda CB500',
      license_number: 'LAG-12345',
    })
    expect(result.success).toBe(true)
  })

  it('rejects vehicle_plate shorter than 5 chars', () => {
    const result = riderProfileSchema.safeParse({
      vehicle_type: 'motorcycle',
      vehicle_plate: 'AB1',
      vehicle_model: 'Honda CB500',
      license_number: 'LAG-12345',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid vehicle_type', () => {
    const result = riderProfileSchema.safeParse({
      vehicle_type: 'helicopter',
      vehicle_plate: 'ABC-123-XY',
      vehicle_model: 'Something',
      license_number: 'LAG-12345',
    })
    expect(result.success).toBe(false)
  })
})
