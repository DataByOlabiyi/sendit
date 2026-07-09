import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushNotification, type PushPayload } from './push-sender'

// Sends a Web Push notification to all active subscriptions for each userId.
// Silently removes expired subscriptions (410 Gone) and continues to others.
// `admin` must be a service-role client (bypasses RLS to read across users).
export async function sendPushToUsers(
  admin: SupabaseClient,
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!userIds.length) return
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

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
