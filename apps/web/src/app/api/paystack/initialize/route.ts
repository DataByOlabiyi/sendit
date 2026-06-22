import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { PRICING } from '@sendit/constants'

const initializeSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  reference: z.string().min(1, 'Reference required'),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = initializeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const { orderId, reference } = parsed.data

    // Verify order belongs to this user and fetch the canonical total
    const { data: order } = await supabase
      .from('orders')
      .select('id, customer_id, total_fee, payment_status')
      .eq('id', orderId)
      .eq('customer_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 409 })
    }

    // Idempotency: if a pending payment already exists for this order, return
    // the existing reference instead of creating a second row.
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, paystack_reference')
      .eq('order_id', orderId)
      .eq('customer_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()

    if (existingPayment) {
      return NextResponse.json({
        success: true,
        email: profile?.email,
        amount: order.total_fee,
        reference: existingPayment.paystack_reference,
      })
    }

    // No existing pending payment — create one with commission split pre-computed
    const platformFee = Math.round(order.total_fee * PRICING.PLATFORM_COMMISSION * 100) / 100
    const riderPayout = Math.round((order.total_fee - platformFee) * 100) / 100

    const { error: paymentError } = await supabase.from('payments').insert({
      order_id: orderId,
      customer_id: user.id,
      amount: order.total_fee,
      currency: 'NGN',
      method: 'paystack',
      status: 'pending',
      paystack_reference: reference,
      platform_fee: platformFee,
      rider_payout: riderPayout,
    })

    if (paymentError) {
      // Unique constraint violation: another request just created a payment row
      // (very small race window). Fetch and return that record.
      if (paymentError.code === '23505') {
        const { data: racePayment } = await supabase
          .from('payments')
          .select('paystack_reference')
          .eq('order_id', orderId)
          .eq('customer_id', user.id)
          .eq('status', 'pending')
          .single()

        return NextResponse.json({
          success: true,
          email: profile?.email,
          amount: order.total_fee,
          reference: racePayment?.paystack_reference ?? reference,
        })
      }

      console.error('Payment record error:', paymentError)
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email: profile?.email,
      amount: order.total_fee,
      reference,
    })
  } catch (error) {
    console.error('Paystack initialize error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
