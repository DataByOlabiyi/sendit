import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOtp, generateOtp } from '@/lib/sms-client'

// Called server-side when an order transitions to in_transit.
// Generates a 4-digit OTP, stores it hashed, and sends SMS to recipient phone.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId, recipientPhone } = await request.json()
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, status, delivery_otp, rider_id')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'in_transit') {
    return NextResponse.json({ error: 'OTP only generated for in_transit orders' }, { status: 400 })
  }

  // Only the assigned rider or an admin may generate / resend the OTP.
  const isAssignedRider = rider?.id != null && rider.id === order.rider_id
  if (!isAssignedRider) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Idempotent: if OTP already generated, just resend
  const otp = order.delivery_otp ?? generateOtp(4)

  await admin
    .from('orders')
    .update({ delivery_otp: otp })
    .eq('id', orderId)

  if (recipientPhone) {
    await sendOtp({ to: recipientPhone, pin: otp })
  }

  return NextResponse.json({ success: true })
}
