import { z } from 'zod'

// Shared coordinate validators — single source of truth for lat/lng range enforcement.
// Prevents clients from supplying out-of-range values that could manipulate pricing
// or produce nonsensical haversine results.
export const latSchema = z
  .number({ invalid_type_error: 'Latitude must be a number' })
  .min(-90, 'Latitude must be ≥ -90')
  .max(90, 'Latitude must be ≤ 90')

export const lngSchema = z
  .number({ invalid_type_error: 'Longitude must be a number' })
  .min(-180, 'Longitude must be ≥ -180')
  .max(180, 'Longitude must be ≤ 180')

export const phoneSchema = z
  .string()
  .regex(/^(\+234|0)[789][01]\d{8}$/, 'Enter a valid Nigerian phone number')
