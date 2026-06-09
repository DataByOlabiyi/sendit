import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Per-order wrong-attempt counter. Keyed by order ID.
// TODO: replace with Redis/Upstash for multi-replica deployments.
const otpAttempts = new Map<string, number>()
const MAX_OTP_ATTEMPTS = 5

// Called by the rider when the recipient tells them the OTP.
// On success, marks delivery_otp_verified_at.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId, otp } = await request.json()
  if (!orderId || !otp) return NextResponse.json({ error: 'orderId and otp required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, status, delivery_otp, delivery_otp_verified_at, rider_id')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'in_transit') {
    return NextResponse.json({ error: 'Order is not in transit' }, { status: 400 })
  }

  // Verify the rider making the call is assigned to this order
  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!rider || order.rider_id !== rider.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (order.delivery_otp_verified_at) {
    return NextResponse.json({ success: true, already_verified: true })
  }

  const attempts = otpAttempts.get(orderId) ?? 0
  if (attempts >= MAX_OTP_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Contact support to unlock this delivery.' },
      { status: 429 },
    )
  }

  if (order.delivery_otp !== otp.trim()) {
    otpAttempts.set(orderId, attempts + 1)
    const remaining = MAX_OTP_ATTEMPTS - (attempts + 1)
    return NextResponse.json(
      { error: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
      { status: 400 },
    )
  }

  otpAttempts.delete(orderId)

  await admin
    .from('orders')
    .update({ delivery_otp_verified_at: new Date().toISOString() })
    .eq('id', orderId)

  return NextResponse.json({ success: true })
}
