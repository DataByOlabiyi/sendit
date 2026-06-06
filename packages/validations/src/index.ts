import { z } from 'zod'

// --- Shared primitives -------------------------------------------------------

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

// --- Auth --------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    phone: z
      .string()
      .regex(/^(\+234|0)[789][01]\d{8}$/, 'Enter a valid Nigerian phone number'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
    // 'admin' is intentionally excluded — see handle_new_user DB trigger
    role: z.enum(['customer', 'rider']),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

// --- Order -------------------------------------------------------------------

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
  package_description: z.string().min(3).max(200),
  package_size: z.enum(['small', 'medium', 'large', 'extra_large']),
  package_weight: z.number().positive().optional(),
  is_fragile: z.boolean().default(false),
  has_insurance: z.boolean().default(false),
  special_instructions: z.string().max(500).optional(),
  // 'wallet' is excluded — the wallet feature is not yet implemented.
  // Remove this comment and add 'wallet' back when the wallet top-up and
  // deduction flows are built.
  payment_method: z.enum(['paystack', 'cash']),
})

// --- Profile -----------------------------------------------------------------

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

// --- Rider -------------------------------------------------------------------

export const riderProfileSchema = z.object({
  vehicle_type: z.enum(['bicycle', 'motorcycle', 'car', 'van']),
  vehicle_plate: z.string().min(5, 'Enter a valid plate number'),
  vehicle_model: z.string().min(2, 'Enter vehicle model'),
  license_number: z.string().min(5, 'Enter license number'),
})

// --- Review ------------------------------------------------------------------

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
})

// --- Inferred types ----------------------------------------------------------

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type PackageDetailsInput = z.infer<typeof packageDetailsSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type AddressInput = z.infer<typeof addressSchema>
export type RiderProfileInput = z.infer<typeof riderProfileSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
