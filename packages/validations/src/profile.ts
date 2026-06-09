import { z } from 'zod'

const latSchema = z
  .number({ invalid_type_error: 'Latitude must be a number' })
  .min(-90, 'Latitude must be ≥ -90')
  .max(90, 'Latitude must be ≤ 90')

const lngSchema = z
  .number({ invalid_type_error: 'Longitude must be a number' })
  .min(-180, 'Longitude must be ≥ -180')
  .max(180, 'Longitude must be ≤ 180')

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z
    .string()
    .regex(/^(\+234|0)[789][01]\d{8}$/, 'Enter a valid Nigerian phone number')
    .optional(),
})

export const addressSchema = z.object({
  label: z.string().min(2, 'Enter a label (e.g. Home, Office)'),
  full_address: z.string().min(5, 'Enter the full address'),
  lat: latSchema,
  lng: lngSchema,
  is_default: z.boolean().default(false),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type AddressInput = z.infer<typeof addressSchema>
