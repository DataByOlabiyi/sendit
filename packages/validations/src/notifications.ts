import { z } from 'zod'

export const broadcastNotificationSchema = z.object({
  title: z.string().min(3, 'Title required').max(100),
  body: z.string().min(5, 'Message body required').max(500),
  type: z.enum(['order_update', 'chat_message', 'payment', 'promotion', 'system']),
  target: z.enum(['all', 'customers', 'riders']),
  data: z.record(z.unknown()).optional(),
})

export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationSchema>
