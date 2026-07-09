import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@sendit/notifications'

// Calls the rider-match Edge Function and creates in-app notifications for
// the top matched riders. Called after payment is confirmed (from both the
// verify API route and the Paystack webhook Edge Function).
// Idempotent: checks for existing notifications before inserting.
export async function notifyNearbyRidersForOrder(orderId: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return

  // Check if we already notified riders for this order
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('notifications')
    .select('id')
    .eq('type', 'order_update')
    .filter('data->>order_id', 'eq', orderId)
    .limit(1)
    .maybeSingle()

  if (existing) return // already dispatched

  // Call the rider-match Edge Function using the service role key as the
  // auth bearer — the function is updated to recognise service-role callers.
  const matchRes = await fetch(`${supabaseUrl}/functions/v1/rider-match`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ order_id: orderId }),
  })

  if (!matchRes.ok) {
    console.error('rider-match Edge Function error:', matchRes.status, await matchRes.text())
    return
  }

  const { riders } = (await matchRes.json()) as {
    riders: Array<{ user_id: string; distance_km: number }>
  }

  if (!riders?.length) return

  const notificationRows = riders.map((r) => ({
    user_id: r.user_id,
    type: 'order_update' as const,
    title: 'New Delivery Available',
    body: `A delivery is available ${r.distance_km.toFixed(1)} km away. Tap to view.`,
    data: { order_id: orderId },
  }))

  await admin.from('notifications').insert(notificationRows)

  // Fire-and-forget push — don't let push failures block the response
  sendPushToUsers(
    admin,
    riders.map((r) => r.user_id),
    { title: 'New Delivery Available', body: notificationRows[0].body, url: `/rider/orders/${orderId}`, tag: `order-${orderId}` },
  ).catch(console.error)
}
