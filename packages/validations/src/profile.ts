import { z } from 'zod'
import { latSchema, lngSchema } from './common'

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
