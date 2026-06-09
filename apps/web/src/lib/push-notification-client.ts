import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:hello@senditmoves.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export async function sendPushNotification(
  endpoint: string,
  keys: PushSubscriptionKeys,
  payload: PushPayload,
): Promise<void> {
  try {
    await webpush.sendNotification(
      { endpoint, keys },
      JSON.stringify(payload),
      { TTL: 3600 },
    )
  } catch (err: unknown) {
    // 410 Gone = subscription expired; caller should delete it
    if (typeof err === 'object' && err !== null && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
      throw new Error('SUBSCRIPTION_EXPIRED')
    }
    throw err
  }
}
