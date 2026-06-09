// @ts-nocheck — Deno runtime file
// ---------------------------------------------------------------------------
// order-timeout Edge Function
// Finds pending orders whose payment was confirmed but no rider accepted
// within the configured timeout window, then cancels them and notifies
// the customer.
//
// Invocation: call via pg_cron every minute, or Supabase Scheduled Functions.
// The function is idempotent — running it multiple times is safe.
// ---------------------------------------------------------------------------
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Accept both GET (cron ping) and POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Validate internal invocation secret to prevent unauthorized triggers
  const authHeader = req.headers.get('Authorization') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
  const supabase     = createClient(supabaseUrl, serviceRoleKey)

  // Read timeout setting from platform_config (default: 15 minutes)
  const { data: configRow } = await supabase
    .from('platform_config')
    .select('value')
    .eq('key', 'order_timeout_minutes')
    .single()

  const timeoutMinutes = parseInt(configRow?.value ?? '15', 10)
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString()

  // Find paid orders that are still pending and were created before cutoff
  const { data: timedOutOrders, error: fetchError } = await supabase
    .from('orders')
    .select('id, customer_id, reference')
    .eq('status', 'pending')
    .eq('payment_status', 'paid')
    .lt('created_at', cutoff)
    .limit(50) // process in batches

  if (fetchError) {
    console.error('Error fetching timed-out orders:', fetchError)
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
  }

  if (!timedOutOrders?.length) {
    return new Response(JSON.stringify({ cancelled: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let cancelledCount = 0
  const errors: string[] = []

  for (const order of timedOutOrders) {
    // Cancel the order
    const { error: cancelError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_by: 'system',
        cancelled_reason: `No rider available within ${timeoutMinutes} minutes. Refund will be processed.`,
      })
      .eq('id', order.id)
      .eq('status', 'pending') // guard against race

    if (cancelError) {
      errors.push(`Order ${order.id}: ${cancelError.message}`)
      continue
    }

    // Initiate the Paystack refund immediately so the customer is not
    // left waiting on a manual process after the auto-cancel.
    const { data: payment } = await supabase
      .from('payments')
      .select('paystack_reference')
      .eq('order_id', order.id)
      .eq('status', 'paid')
      .maybeSingle()

    if (payment?.paystack_reference) {
      const refundRes = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: payment.paystack_reference,
          merchant_note: `Auto-cancelled: no rider available within ${timeoutMinutes} minutes`,
        }),
      }).catch((err: Error) => {
        console.error(`Refund failed for order ${order.id}:`, err)
        return null
      })

      if (refundRes && !refundRes.ok) {
        const body = await refundRes.text().catch(() => '')
        console.error(`Paystack refund error for order ${order.id}:`, refundRes.status, body)
      }
    }

    // Notify customer
    await supabase.from('notifications').insert({
      user_id: order.customer_id,
      type: 'order_update',
      title: 'Order Cancelled — Refund Initiated',
      body: `Your order ${order.reference ?? order.id.slice(0, 8).toUpperCase()} was cancelled — no rider was available. Your refund has been initiated and should appear within 24 hours.`,
      data: { order_id: order.id, action: 'auto_cancelled' },
    }).catch((err: Error) => console.error('Notification error:', err))

    cancelledCount++
  }

  console.log(`order-timeout: cancelled ${cancelledCount} orders, ${errors.length} errors`)
  if (errors.length) console.error('Errors:', errors)

  return new Response(
    JSON.stringify({ cancelled: cancelledCount, errors }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
