import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Lightweight GPS update endpoint for the rider app.
// Replaces the former updateRiderLocationAction Server Action to eliminate
// Next.js RSC overhead and redundant auth re-verification on every GPS ping.
// The RLS policy "Riders can update own record" enforces ownership.
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { lat, lng } = body

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'lat and lng must be numbers' }, { status: 400 })
    }

    if (lat < -90 || lat > 90) {
      return NextResponse.json({ error: 'lat must be between -90 and 90' }, { status: 400 })
    }

    if (lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'lng must be between -180 and 180' }, { status: 400 })
    }

    const { error } = await supabase
      .from('riders')
      .update({ current_lat: lat, current_lng: lng })
      .eq('user_id', user.id)

    if (error) {
      console.error('Location update error:', error)
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
