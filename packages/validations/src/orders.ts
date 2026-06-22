import { z } from 'zod'
import { latSchema, lngSchema } from './common'

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
  // 'cash' disabled in booking UI until cash-collection audit mechanism is built
  payment_method: z.enum(['paystack', 'wallet']),
  promo_id: z.string().uuid().optional(),
  promo_discount: z.number().int().min(0).optional(),
  is_scheduled: z.boolean().default(false),
  scheduled_pickup_at: z.string().datetime({ offset: true }).optional(),
  preferred_time_slot: z.enum(['morning', 'afternoon', 'evening', 'asap']).default('asap'),
  is_multi_stop: z.boolean().default(false),
  extra_stops: z.array(z.object({
    sequence: z.number().int().positive(),
    address: z.string().min(5, 'Stop address is required'),
    lat: latSchema,
    lng: lngSchema,
    landmark: z.string().max(200).optional(),
    contact_name: z.string().max(100).optional(),
    contact_phone: z.string().max(20).optional(),
  })).max(10, 'Maximum 10 extra stops').optional(),
}).refine(
  (data) => !data.is_scheduled || !!data.scheduled_pickup_at,
  { message: 'Scheduled pickup time is required for scheduled orders', path: ['scheduled_pickup_at'] }
)

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type PackageDetailsInput = z.infer<typeof packageDetailsSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
