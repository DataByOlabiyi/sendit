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

async function loadPricing() {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data } = await supabase
      .from('platform_config')
      .select('key, value')
      .in('key', ['base_fee', 'per_km_fee', 'insurance_fee'])

    if (!data || data.length === 0) return FALLBACK_PRICING

    const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, Number(r.value)]))
    return {
      BASE_FEE: map.base_fee ?? FALLBACK_PRICING.BASE_FEE,
      PER_KM_FEE: map.per_km_fee ?? FALLBACK_PRICING.PER_KM_FEE,
      INSURANCE_FEE: map.insurance_fee ?? FALLBACK_PRICING.INSURANCE_FEE,
    }
  } catch {
    return FALLBACK_PRICING
  }
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

    const PRICING = await loadPricing()
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
