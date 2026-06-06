import { corsHeaders } from '../_shared/cors.ts'

// Mirror of packages/constants PRICING — update both together if tiers change
const PRICING = {
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

  try {
    const { pickup_lat, pickup_lng, delivery_lat, delivery_lng, package_size, has_insurance } =
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

    const distanceKm = haversineDistance(pickup_lat, pickup_lng, delivery_lat, delivery_lng)
    const durationMin = Math.ceil(distanceKm * 4)
    const multiplier = PACKAGE_SIZE_MULTIPLIER[package_size] ?? 1
    const base_fee = PRICING.BASE_FEE
    const distance_fee = Math.ceil(distanceKm * PRICING.PER_KM_FEE * multiplier)
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
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
