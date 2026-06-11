import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotification, type PushPayload } from '@/lib/push-notification-client'

// Sends a Web Push notification to all active subscriptions for each userId.
// Silently removes expired subscriptions (410 Gone) and continues to others.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

  const admin = createAdminClient()
  const { data: subscriptions } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subscriptions?.length) return

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await sendPushNotification(sub.endpoint, { p256dh: sub.p256dh, auth: sub.auth }, payload)
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'SUBSCRIPTION_EXPIRED') {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }),
  )
}
