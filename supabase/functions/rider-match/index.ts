import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { haversineDistance } from '../_shared/haversine.ts'

const MATCH_RADIUS_KM = 10

// Which vehicle types can carry each package size
const VEHICLE_COMPAT: Record<string, string[]> = {
  small: ['bicycle', 'motorcycle', 'car', 'van'],
  medium: ['motorcycle', 'car', 'van'],
  large: ['car', 'van'],
  extra_large: ['van'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''

  // Accept either a valid user JWT or the service-role key (used by server-side
  // callers such as the verify route and the webhook handler).
  const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`

  if (!isServiceRole) {
    // Verify user is authenticated
    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // Use service-role client for all data access in this function
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const body = await req.json().catch(() => ({}))
  const { order_id } = body

  if (!order_id) {
    return new Response(JSON.stringify({ error: 'order_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('pickup_lat, pickup_lng, package_size, status')
    .eq('id', order_id)
    .single()

  if (!order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (order.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Order is not pending' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const compatible = VEHICLE_COMPAT[order.package_size] ?? VEHICLE_COMPAT['small']

  const { data: riders } = await supabase
    .from('riders')
    .select('id, user_id, vehicle_type, rating, total_deliveries, current_lat, current_lng')
    .eq('is_online', true)
    .eq('status', 'approved')
    .not('current_lat', 'is', null)
    .not('current_lng', 'is', null)
    .in('vehicle_type', compatible)

  if (!riders || riders.length === 0) {
    return new Response(JSON.stringify({ riders: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const ranked = riders
    .map((r) => {
      const distance_km =
        Math.round(
          haversineDistance(order.pickup_lat, order.pickup_lng, r.current_lat, r.current_lng) * 10,
        ) / 10
      return { ...r, distance_km }
    })
    .filter((r) => r.distance_km <= MATCH_RADIUS_KM)
    .map((r) => {
      // Normalise both dimensions to [0, 1] before applying weights so that
      // the stated 70/30 split is actually effective.
      // Without normalisation, distance (0–10 km) dominated rating (0–5 stars)
      // at ~82% effective weight, not the intended 70%.
      const normDistance = r.distance_km / MATCH_RADIUS_KM           // 0 = closest
      const normRatingPenalty = (5 - (r.rating ?? 5)) / 5            // 0 = best rated
      const score = normDistance * 0.7 + normRatingPenalty * 0.3      // lower is better
      return { ...r, score }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(({ score, ...r }) => r)

  return new Response(JSON.stringify({ riders: ranked }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
