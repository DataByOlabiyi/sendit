import { z } from 'zod'

export const riderProfileSchema = z.object({
  vehicle_type: z.enum(['bicycle', 'motorcycle', 'car', 'van']),
  vehicle_plate: z.string().min(5, 'Enter a valid plate number'),
  vehicle_model: z.string().min(2, 'Enter vehicle model'),
  license_number: z.string().min(5, 'Enter license number'),
})

export const riderBankAccountSchema = z.object({
  bank_account_number: z
    .string()
    .regex(/^\d{10}$/, 'Account number must be exactly 10 digits'),
  bank_code: z.string().min(2, 'Select a bank'),
  bank_name: z.string().min(2, 'Bank name required'),
  bank_account_name: z.string().min(2, 'Enter the account name as it appears on your bank statement'),
})

export const riderKycSchema = z.object({
  bvn: z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits'),
  nin: z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 digits'),
})

export type RiderProfileInput = z.infer<typeof riderProfileSchema>
export type RiderBankAccountInput = z.infer<typeof riderBankAccountSchema>
export type RiderKycInput = z.infer<typeof riderKycSchema>
