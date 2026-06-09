import { z } from 'zod'

// Reusable coordinate validators with geographic range enforcement.
// Prevents clients from supplying out-of-range values that could manipulate
// pricing calculations or produce nonsensical haversine results.
const latSchema = z
  .number({ invalid_type_error: 'Latitude must be a number' })
  .min(-90, 'Latitude must be ≥ -90')
  .max(90, 'Latitude must be ≤ 90')

const lngSchema = z
  .number({ invalid_type_error: 'Longitude must be a number' })
  .min(-180, 'Longitude must be ≥ -180')
  .max(180, 'Longitude must be ≤ 180')

export const packageDetailsSchema = z.object({
  package_description: z.string().min(3, 'Describe the package').max(200),
  package_size: z.enum(['small', 'medium', 'large', 'extra_large']),
  package_weight: z.number().positive().optional(),
  is_fragile: z.boolean(),
  has_insurance: z.boolean(),
  special_instructions: z.string().max(500).optional(),
})

export const createOrderSchema = z.object({
  pickup_address: z.string().min(5, 'Enter a pickup address'),
  pickup_lat: latSchema,
  pickup_lng: lngSchema,
  delivery_address: z.string().min(5, 'Enter a delivery address'),
  delivery_lat: latSchema,
  delivery_lng: lngSchema,
  delivery_landmark: z.string().max(200).optional(),
  package_description: z.string().min(3).max(200),
  package_size: z.enum(['small', 'medium', 'large', 'extra_large']),
  package_weight: z.number().positive().optional(),
  is_fragile: z.boolean().default(false),
  has_insurance: z.boolean().default(false),
  special_instructions: z.string().max(500).optional(),
  // Cash disabled in booking UI until cash-collection audit mechanism is built
  payment_method: z.enum(['paystack']),
  promo_id: z.string().uuid().optional(),
  promo_discount: z.number().int().min(0).optional(),
})

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type PackageDetailsInput = z.infer<typeof packageDetailsSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
