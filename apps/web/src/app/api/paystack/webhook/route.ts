import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyNearbyRidersForOrder } from '@/lib/order-dispatch'
import { sendPushToUsers } from '@sendit/notifications'
import { nairaToKobo, verifyPaystackSignature } from '@sendit/utils'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''

  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? ''
  if (!signature || !(await verifyPaystackSignature(rawBody, signature, secretKey))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = createAdminClient()

  // charge.success — backup path for when client-side verify doesn't fire
  if (event.event === 'charge.success') {
    const data = event.data
    const reference = data.reference as string
    const chargedKobo = data.amount as number
    const metadata = (data.metadata ?? {}) as Record<string, unknown>
    const orderId = metadata.orderId as string | undefined

    if (!reference || !orderId) {
      return NextResponse.json({ ok: true })
    }

    // Fetch the stored order to verify amount — guard against tampered webhooks
    const { data: order } = await admin
      .from('orders')
      .select('id, total_fee, payment_status, customer_id')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ ok: true })

    // Idempotency: already processed
    if (order.payment_status === 'paid') return NextResponse.json({ ok: true })

    const expectedKobo = nairaToKobo(order.total_fee)
    if (chargedKobo !== expectedKobo) {
      console.error(`Webhook amount mismatch for order ${orderId}: expected ${expectedKobo}, got ${chargedKobo}`)
      return NextResponse.json({ ok: true })
    }

    await admin
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('paystack_reference', reference)
      .eq('status', 'pending')

    await admin
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('id', orderId)
      .eq('payment_status', 'pending')

    notifyNearbyRidersForOrder(orderId).catch(console.error)
  }

  // refund.processed — update payment and order status to refunded
  if (event.event === 'refund.processed') {
    const data = event.data
    const reference = (data.transaction as Record<string, unknown>)?.reference as string | undefined

    if (!reference) return NextResponse.json({ ok: true })

    const { data: payment } = await admin
      .from('payments')
      .select('order_id, customer_id')
      .eq('paystack_reference', reference)
      .maybeSingle()

    if (!payment) return NextResponse.json({ ok: true })

    await admin
      .from('payments')
      .update({ status: 'refunded' })
      .eq('paystack_reference', reference)

    await admin
      .from('orders')
      .update({ payment_status: 'refunded' })
      .eq('id', payment.order_id)

    // Notify the customer that their refund was processed
    sendPushToUsers(admin, [payment.customer_id], {
      title: 'Refund Processed',
      body: 'Your refund has been processed and should appear within 5–10 business days.',
      url: `/orders/${payment.order_id}`,
      tag: `refund-${payment.order_id}`,
    }).catch(console.error)
  }

  // charge.failed — let the customer know their payment didn't go through,
  // and alert admins so a stuck order doesn't go unnoticed.
  if (event.event === 'charge.failed') {
    const data = event.data
    const reference = data.reference as string | undefined
    const metadata = (data.metadata ?? {}) as Record<string, unknown>
    const orderId = metadata.orderId as string | undefined

    if (reference) {
      const { data: payment } = await admin
        .from('payments')
        .select('order_id, customer_id')
        .eq('paystack_reference', reference)
        .maybeSingle()

      const customerId = payment?.customer_id
      const failedOrderId = payment?.order_id ?? orderId

      if (customerId && failedOrderId) {
        sendPushToUsers(admin, [customerId], {
          title: 'Payment Failed',
          body: 'Your payment could not be processed. Please try again to complete your order.',
          url: `/orders/${failedOrderId}`,
          tag: `payment-failed-${failedOrderId}`,
        }).catch(console.error)
      }

      const { data: admins } = await admin.from('users').select('id').eq('role', 'admin')
      if (admins?.length && failedOrderId) {
        sendPushToUsers(admin, admins.map((a) => a.id), {
          title: 'Payment Failure',
          body: 'A customer payment failed to process.',
          url: `/dashboard/payments`,
          tag: `payment-failed-admin-${failedOrderId}`,
        }).catch(console.error)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
