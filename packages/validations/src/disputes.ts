import { z } from 'zod'

export const createDisputeSchema = z.object({
  order_id: z.string().uuid(),
  type: z.enum([
    'missing_item',
    'damaged_item',
    'wrong_delivery',
    'late_delivery',
    'rider_conduct',
    'overcharge',
    'other',
  ]),
  description: z.string().min(20, 'Describe the issue in at least 20 characters').max(1000),
})

export const resolveDisputeSchema = z.object({
  dispute_id: z.string().uuid(),
  resolution: z.string().min(10, 'Resolution note required').max(1000),
  refund_amount: z.number().int().min(0).optional(),
})

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>
