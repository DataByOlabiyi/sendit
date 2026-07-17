import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashOtpForOrder } from '@sendit/utils'

const verifyOtpSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  otp: z.string().length(4, 'OTP must be 4 digits').regex(/^\d{4}$/, 'OTP must be numeric'),
})

const MAX_OTP_ATTEMPTS = 5

// Called by the rider when the recipient tells them the OTP.
// On success, marks delivery_otp_verified_at.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = verifyOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { orderId, otp } = parsed.data

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, status, delivery_otp_hash, delivery_otp_attempts, delivery_otp_verified_at, rider_id')
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

  // Reject if no OTP has been generated yet for this order.
  if (!order.delivery_otp_hash) {
    return NextResponse.json({ error: 'OTP has not been generated for this order yet.' }, { status: 400 })
  }

  // Atomically increment BEFORE checking the hash — prevents two concurrent
  // requests from both reading attempts=4, both passing the limit check, and
  // both getting a free guess. The increment RPC returns the new count so we
  // can still tell the caller how many attempts remain.
  const { data: newAttempts } = await admin.rpc('increment_otp_attempts', { p_order_id: orderId })
  const attemptCount = newAttempts as number

  if (attemptCount > MAX_OTP_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Contact support to unlock this delivery.' },
      { status: 429 },
    )
  }

  const submittedHash = await hashOtpForOrder(otp.trim(), orderId)

  if (order.delivery_otp_hash !== submittedHash) {
    const remaining = MAX_OTP_ATTEMPTS - attemptCount
    return NextResponse.json(
      { error: `Incorrect OTP. ${remaining > 0 ? `${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : 'No attempts remaining. Contact support.'}` },
      { status: 400 },
    )
  }

  // Correct OTP — reset counter and mark verified.
  await admin
    .from('orders')
    .update({ delivery_otp_verified_at: new Date().toISOString(), delivery_otp_attempts: 0 })
    .eq('id', orderId)

  return NextResponse.json({ success: true })
}
