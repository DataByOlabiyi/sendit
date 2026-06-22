import { z } from 'zod'

export const sendChatMessageSchema = z.object({
  order_id: z.string().uuid(),
  receiver_id: z.string().uuid(),
  message: z.string().min(1, 'Message cannot be empty').max(1000),
})

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>
