// @ts-nocheck — Deno runtime file
// Triggered by Supabase DB webhook on INSERT into notifications table.
// Finds the user's push subscriptions and delivers the notification.
import { createClient } from 'npm:@supabase/supabase-js@2'

// Minimal VAPID / Web Push implementation using Deno std crypto
// We use the web-push npm package via esm.sh for convenience
import webpush from 'npm:web-push@3.6.7'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@senditmoves.com'

  if (!vapidPublic || !vapidPrivate) {
    return new Response('VAPID keys not configured', { status: 500 })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey)

  const payload = await req.json()
  // Payload can be a single notification record (from DB webhook) or { user_id, title, body, url }
  const { user_id, title, body, data } = payload.record ?? payload

  if (!user_id || !title) {
    return new Response(JSON.stringify({ error: 'user_id and title required' }), { status: 400 })
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user_id)

  if (error) {
    console.error('Fetch subscriptions error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!subscriptions?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  const pushPayload = JSON.stringify({
    title,
    body: body ?? '',
    url: data?.url ?? '/',
    tag: data?.tag ?? 'sendit',
  })

  let sent = 0
  const expiredIds: string[] = []

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        pushPayload,
        { TTL: 3600 },
      )
      sent++
    } catch (err: unknown) {
      if (err?.statusCode === 410) {
        expiredIds.push(sub.id)
      } else {
        console.error(`Push send error for sub ${sub.id}:`, err)
      }
    }
  }

  // Clean up expired subscriptions
  if (expiredIds.length) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }

  return new Response(JSON.stringify({ sent, expired: expiredIds.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
