import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { haversineDistance } from '@sendit/utils'

// Max speed a motorcycle can realistically travel (km/h) — used for velocity check.
// 200 km/h is intentionally generous to avoid false positives for fast riders.
const MAX_REALISTIC_SPEED_KMH = 200

// Minimum seconds between accepted location updates per rider.
const MIN_UPDATE_INTERVAL_SECONDS = 3

// In-process rate limit store (keyed by user ID).
// Production: replace with Redis/Upstash for multi-replica deployments.
const lastUpdateAt = new Map<string, number>()

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: one update every MIN_UPDATE_INTERVAL_SECONDS
    const now = Date.now()
    const lastMs = lastUpdateAt.get(user.id) ?? 0
    if (now - lastMs < MIN_UPDATE_INTERVAL_SECONDS * 1000) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { lat, lng } = body

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'lat and lng must be numbers' }, { status: 400 })
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Coordinates out of range' }, { status: 400 })
    }

    // Velocity check: compare against the rider's last known position
    const { data: rider } = await supabase
      .from('riders')
      .select('id, current_lat, current_lng, updated_at')
      .eq('user_id', user.id)
      .single()

    if (rider?.current_lat != null && rider?.current_lng != null && rider?.updated_at) {
      const prevLat = rider.current_lat as number
      const prevLng = rider.current_lng as number
      const prevTime = new Date(rider.updated_at as string).getTime()
      const elapsedHours = (now - prevTime) / 3_600_000

      if (elapsedHours > 0) {
        const distKm = haversineDistance(prevLat, prevLng, lat, lng)
        // For gaps < 1 hour use the instantaneous speed check.
        // For gaps >= 1 hour apply a proportional max-distance check so that
        // a rider cannot "teleport" across cities by spacing updates far apart.
        const maxAllowedKm = MAX_REALISTIC_SPEED_KMH * elapsedHours
        if (distKm > maxAllowedKm) {
          console.warn(
            `Velocity check failed for user ${user.id}: ` +
            `${distKm.toFixed(1)} km in ${(elapsedHours * 60).toFixed(1)} min ` +
            `(max ${maxAllowedKm.toFixed(1)} km) — skipping update`,
          )
          return NextResponse.json({ error: 'Location update rejected: implausible speed' }, { status: 422 })
        }
      }
    }

    const { error } = await supabase
      .from('riders')
      .update({ current_lat: lat, current_lng: lng })
      .eq('user_id', user.id)

    if (error) {
      console.error('Location update error:', error)
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    lastUpdateAt.set(user.id, now)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
