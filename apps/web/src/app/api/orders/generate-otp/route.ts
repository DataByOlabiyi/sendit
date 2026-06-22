import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOtp, generateOtp } from '@/lib/sms-client'

const generateOtpSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  recipientPhone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number').optional(),
})

// HMAC-SHA256 of the OTP using the order ID as the key.
// Order ID as key means each order has a unique hash space, preventing
// a DB dump from revealing OTPs via a precomputed 10-000-entry rainbow table.
async function hashOtpForOrder(otp: string, orderId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(orderId),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(otp))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Called server-side when an order transitions to in_transit.
// Generates a 4-digit OTP, stores it hashed, and sends SMS to recipient phone.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = generateOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { orderId, recipientPhone } = parsed.data

  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, status, delivery_otp_hash, rider_id')
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

  // Generate OTP and store its hash (idempotent: re-generates on resend).
  const otp = generateOtp(4)
  const otpHash = await hashOtpForOrder(otp, orderId)

  await admin
    .from('orders')
    .update({ delivery_otp_hash: otpHash, delivery_otp_attempts: 0 })
    .eq('id', orderId)

  if (recipientPhone) {
    await sendOtp({ to: recipientPhone, pin: otp })
  }

  return NextResponse.json({ success: true })
}
