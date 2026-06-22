import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyNearbyRidersForOrder } from '@/lib/order-dispatch'

const verifySchema = z.object({
  reference: z.string().min(1, 'Reference required'),
  orderId: z.string().uuid('Invalid order ID'),
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
    const parsed = verifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const { reference, orderId } = parsed.data

    // Fetch order for ownership check and canonical fee amount
    const { data: order } = await supabase
      .from('orders')
      .select('id, total_fee, payment_status')
      .eq('id', orderId)
      .eq('customer_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Idempotency: if already paid (webhook beat us here), return success
    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: true })
    }

    // Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    )

    if (!paystackResponse.ok) {
      console.error('Paystack API error:', paystackResponse.status)
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const paystackData = await paystackResponse.json()

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 })
    }

    // Verify the amount Paystack actually charged matches what we stored.
    // Paystack amounts are in kobo (1 NGN = 100 kobo).
    const expectedKobo = Math.round(order.total_fee * 100)
    const chargedKobo: number = paystackData.data.amount

    if (chargedKobo !== expectedKobo) {
      console.error(
        `Payment amount mismatch for order ${orderId}: ` +
          `expected ${expectedKobo} kobo, Paystack returned ${chargedKobo} kobo`,
      )
      return NextResponse.json(
        { error: 'Payment amount does not match order total' },
        { status: 400 },
      )
    }

    // Use admin client so updates succeed regardless of RLS on payments table
    const admin = createAdminClient()

    // Guard against webhook race: only update if still pending
    const { error: paymentUpdateError } = await admin
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('paystack_reference', reference)
      .eq('status', 'pending')

    if (paymentUpdateError) {
      console.error('Payment update error:', paymentUpdateError)
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }

    const { error: orderUpdateError } = await admin
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('id', orderId)
      .eq('payment_status', 'pending')

    if (orderUpdateError) {
      console.error('Order payment status update error:', orderUpdateError)
    }

    // Dispatch: find nearby riders and create in-app notifications.
    // Fire-and-forget — a failure here does not fail the payment response.
    notifyNearbyRidersForOrder(orderId).catch((err) =>
      console.error('Rider dispatch error after verify:', err),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Paystack verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
