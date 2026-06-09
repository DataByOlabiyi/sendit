// @ts-nocheck — Deno runtime file
// Auto-dispatch Edge Function: assigns the best available rider to a newly-paid
// order without waiting for riders to self-select. Called after payment success.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { haversineDistance } from '../_shared/haversine.ts'

const MATCH_RADIUS_KM = 10
const REASSIGN_ATTEMPTS_MAX = 3  // Give up and auto-cancel if exceeded

const VEHICLE_COMPAT: Record<string, string[]> = {
  small:       ['bicycle', 'motorcycle', 'car', 'van'],
  medium:      ['motorcycle', 'car', 'van'],
  large:       ['car', 'van'],
  extra_large: ['van'],
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey)
  const { order_id, exclude_rider_ids = [] } = await req.json()

  if (!order_id) {
    return new Response(JSON.stringify({ error: 'order_id required' }), { status: 400 })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, customer_id, pickup_lat, pickup_lng, package_size, status, dispatch_attempts')
    .eq('id', order_id)
    .single()

  if (!order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 })
  }

  if (order.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Order is not pending', status: order.status }), { status: 400 })
  }

  if ((order.dispatch_attempts ?? 0) >= REASSIGN_ATTEMPTS_MAX) {
    // Too many failed attempts — cancel the order
    await supabase.from('orders').update({
      status: 'cancelled',
      cancelled_by: 'system',
      cancelled_reason: 'No available riders after multiple dispatch attempts. Refund will be processed.',
    }).eq('id', order_id).eq('status', 'pending')

    await supabase.from('notifications').insert({
      user_id: order.customer_id,
      type: 'order_update',
      title: 'Order Cancelled',
      body: 'No available riders found. Your payment will be refunded within 24 hours.',
      data: { order_id, action: 'auto_cancelled_no_riders' },
    }).catch(() => {})

    return new Response(JSON.stringify({ assigned: false, reason: 'max_attempts_reached' }))
  }

  const compatible = VEHICLE_COMPAT[order.package_size] ?? VEHICLE_COMPAT['small']

  const { data: riders } = await supabase
    .from('riders')
    .select('id, user_id, vehicle_type, rating, current_lat, current_lng')
    .eq('is_online', true)
    .eq('status', 'approved')
    .not('current_lat', 'is', null)
    .not('current_lng', 'is', null)
    .in('vehicle_type', compatible)
    .not('id', 'in', `(${exclude_rider_ids.join(',') || 'null'})`)

  const nearby = (riders ?? [])
    .map((r) => {
      const distance_km = haversineDistance(
        order.pickup_lat, order.pickup_lng, r.current_lat, r.current_lng,
      )
      return { ...r, distance_km }
    })
    .filter((r) => r.distance_km <= MATCH_RADIUS_KM)
    .map((r) => {
      const normDistance     = r.distance_km / MATCH_RADIUS_KM
      const normRatingPenalty = (5 - (r.rating ?? 5)) / 5
      return { ...r, score: normDistance * 0.7 + normRatingPenalty * 0.3 }
    })
    .sort((a, b) => a.score - b.score)

  if (!nearby.length) {
    return new Response(JSON.stringify({ assigned: false, reason: 'no_nearby_riders' }))
  }

  const best = nearby[0]

  // Assign the order to the best rider (compare-and-swap on status to avoid races)
  const { data: updated, error } = await supabase
    .from('orders')
    .update({
      rider_id: best.id,
      status: 'accepted',
      assigned_at: new Date().toISOString(),
      dispatch_attempts: (order.dispatch_attempts ?? 0) + 1,
    })
    .eq('id', order_id)
    .eq('status', 'pending')  // guard against concurrent assignment
    .select('id')
    .single()

  if (error || !updated) {
    return new Response(JSON.stringify({ assigned: false, reason: 'race_condition' }))
  }

  // Notify the assigned rider
  await supabase.from('notifications').insert({
    user_id: best.user_id,
    type: 'order_update',
    title: 'New Delivery Assigned',
    body: `You have been assigned a delivery. Tap to view details.`,
    data: { order_id, action: 'auto_assigned' },
  }).catch(() => {})

  return new Response(
    JSON.stringify({ assigned: true, rider_id: best.id, distance_km: Math.round(best.distance_km * 10) / 10 }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
