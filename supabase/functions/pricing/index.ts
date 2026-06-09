// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — Deno runtime file; type-checked by Deno LSP, not tsc
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { haversineDistance } from '../_shared/haversine.ts'

const FALLBACK_PRICING = {
  BASE_FEE: 500,
  PER_KM_FEE: 100,
  INSURANCE_FEE: 200,
} as const

const PACKAGE_SIZE_MULTIPLIER: Record<string, number> = {
  small: 1,
  medium: 1.2,
  large: 1.5,
  extra_large: 2,
}

// Peak-hour windows (WAT = UTC+1): 7–9 AM and 5–8 PM
function getSurgeMultiplier(surgeEnabled: boolean, surgeMult: number): number {
  if (!surgeEnabled) return 1
  const hour = new Date().getUTCHours() + 1 // WAT offset
  const isPeak = (hour >= 7 && hour < 9) || (hour >= 17 && hour < 20)
  return isPeak ? surgeMult : 1
}

async function loadPricing() {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data } = await supabase
      .from('platform_config')
      .select('key, value')
      .in('key', ['base_fee', 'per_km_fee', 'insurance_fee', 'surge_enabled', 'surge_multiplier'])

    if (!data || data.length === 0) return { ...FALLBACK_PRICING, SURGE_ENABLED: false, SURGE_MULTIPLIER: 1.5 }

    const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]))
    return {
      BASE_FEE: Number(map.base_fee ?? FALLBACK_PRICING.BASE_FEE),
      PER_KM_FEE: Number(map.per_km_fee ?? FALLBACK_PRICING.PER_KM_FEE),
      INSURANCE_FEE: Number(map.insurance_fee ?? FALLBACK_PRICING.INSURANCE_FEE),
      SURGE_ENABLED: map.surge_enabled === 'true',
      SURGE_MULTIPLIER: Number(map.surge_multiplier ?? 1.5),
    }
  } catch {
    return { ...FALLBACK_PRICING, SURGE_ENABLED: false, SURGE_MULTIPLIER: 1.5 }
  }
}

// Vehicle-type per-km multipliers
const VEHICLE_KM_MULTIPLIER: Record<string, number> = {
  bicycle:    0.8,
  motorcycle: 1.0,
  car:        1.3,
  van:        1.8,
}

async function getRoadDistance(
  pickupLat: number, pickupLng: number,
  deliveryLat: number, deliveryLng: number,
): Promise<{ distanceKm: number; durationMin: number }> {
  const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
  if (!googleKey) throw new Error('no_key')

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${deliveryLat},${deliveryLng}&mode=driving&units=metric&key=${googleKey}`
  const res = await fetch(url)
  const data = await res.json()

  const element = data?.rows?.[0]?.elements?.[0]
  if (element?.status !== 'OK') throw new Error('distance_matrix_error')

  return {
    distanceKm: element.distance.value / 1000,
    durationMin: Math.ceil(element.duration.value / 60),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Require a Supabase Bearer token (anon key or service-role key) so that
  // unauthenticated callers cannot consume Google Maps API quota for free.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { pickup_lat, pickup_lng, delivery_lat, delivery_lng, package_size, has_insurance, vehicle_type } =
      await req.json()

    if (
      pickup_lat == null || pickup_lng == null ||
      delivery_lat == null || delivery_lng == null ||
      !package_size
    ) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const PRICING = await loadPricing()

    let distanceKm: number
    let durationMin: number
    let distanceSource: string

    try {
      const road = await getRoadDistance(pickup_lat, pickup_lng, delivery_lat, delivery_lng)
      distanceKm = road.distanceKm
      durationMin = road.durationMin
      distanceSource = 'distance_matrix'
    } catch {
      // Fallback to haversine if Distance Matrix API is unavailable
      distanceKm = haversineDistance(pickup_lat, pickup_lng, delivery_lat, delivery_lng)
      durationMin = Math.ceil(distanceKm * 4)
      distanceSource = 'haversine'
    }

    const packageMultiplier = PACKAGE_SIZE_MULTIPLIER[package_size] ?? 1
    const vehicleMultiplier = VEHICLE_KM_MULTIPLIER[vehicle_type ?? 'motorcycle'] ?? 1
    const surgeMultiplier = getSurgeMultiplier(PRICING.SURGE_ENABLED, PRICING.SURGE_MULTIPLIER)

    const base_fee = PRICING.BASE_FEE
    const distance_fee = Math.ceil(distanceKm * PRICING.PER_KM_FEE * packageMultiplier * vehicleMultiplier * surgeMultiplier)
    const insurance_fee = has_insurance ? PRICING.INSURANCE_FEE : 0
    const total_fee = base_fee + distance_fee + insurance_fee

    return new Response(
      JSON.stringify({
        base_fee,
        distance_fee,
        insurance_fee,
        total_fee,
        estimated_distance_km: Math.round(distanceKm * 10) / 10,
        estimated_duration_min: durationMin,
        surge_active: surgeMultiplier > 1,
        surge_multiplier: surgeMultiplier,
        distance_source: distanceSource,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
