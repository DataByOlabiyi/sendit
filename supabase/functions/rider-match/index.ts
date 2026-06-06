import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const MATCH_RADIUS_KM = 10

// Which vehicle types can handle each package size
const VEHICLE_COMPAT: Record<string, string[]> = {
  small: ['bicycle', 'motorcycle', 'car', 'van'],
  medium: ['motorcycle', 'car', 'van'],
  large: ['car', 'van'],
  extra_large: ['van'],
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Require a valid Supabase auth token — admin app sends this automatically
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  // Verify the caller is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { order_id } = await req.json()
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

  const { data: riders } = await supabase
    .from('riders')
    .select('id, user_id, vehicle_type, rating, total_deliveries, current_lat, current_lng')
    .eq('is_online', true)
    .eq('status', 'approved')
    .not('current_lat', 'is', null)
    .not('current_lng', 'is', null)

  if (!riders || riders.length === 0) {
    return new Response(JSON.stringify({ riders: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const compatible = VEHICLE_COMPAT[order.package_size] ?? VEHICLE_COMPAT['small']

  const ranked = riders
    .filter((r) => compatible.includes(r.vehicle_type))
    .map((r) => {
      const distance_km =
        Math.round(
          haversineDistance(order.pickup_lat, order.pickup_lng, r.current_lat, r.current_lng) * 10
        ) / 10
      // Weighted score: distance matters more than rating
      const score = distance_km * 0.7 + (5 - (r.rating ?? 0)) * 0.3
      return { ...r, distance_km, score }
    })
    .filter((r) => r.distance_km <= MATCH_RADIUS_KM)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(({ score, ...r }) => r)

  return new Response(JSON.stringify({ riders: ranked }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
