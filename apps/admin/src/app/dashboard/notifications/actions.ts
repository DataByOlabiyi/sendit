'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@sendit/notifications'

const broadcastSchema = z.object({
  audience: z.enum(['all', 'customers', 'riders']),
  title: z.string().trim().min(1, 'Title is required').max(100),
  body: z.string().trim().min(1, 'Message is required').max(200),
})

export async function broadcastNotificationAction(input: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden' }

  const parsed = broadcastSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid broadcast' }
  const { audience, title, body } = parsed.data

  const admin = createAdminClient()
  let query = admin.from('users').select('id')
  if (audience === 'customers') query = query.eq('role', 'customer')
  if (audience === 'riders') query = query.eq('role', 'rider')

  const { data: users } = await query
  if (!users?.length) return { error: 'No users found for this audience' }

  const userIds = users.map((u) => u.id)

  const { error } = await admin.from('notifications').insert(
    userIds.map((userId) => ({ user_id: userId, type: 'system' as const, title, body, is_read: false })),
  )
  if (error) return { error: 'Failed to send notifications' }

  sendPushToUsers(admin, userIds, { title, body, url: '/notifications', tag: 'broadcast' }).catch(console.error)

  await admin.from('admin_audit_logs').insert({
    actor_id: user.id,
    action: 'notification.broadcast',
    target_type: 'audience',
    target_id: audience,
    after_data: { title, body, count: userIds.length },
  })

  return { success: true, count: userIds.length }
}
