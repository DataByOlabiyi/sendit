import { createClient } from 'npm:@supabase/supabase-js@2'

async function verifyPaystackSignature(
  secret: string,
  body: string,
  signature: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return expected === signature
}

async function dispatchRiders(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  // Idempotency: skip if riders have already been notified for this order
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', 'order_update')
    .filter('data->>order_id', 'eq', orderId)
    .limit(1)
    .maybeSingle()

  if (existing) return

  const matchRes = await fetch(`${supabaseUrl}/functions/v1/rider-match`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ order_id: orderId }),
  })

  if (!matchRes.ok) {
    console.error('rider-match error from webhook:', matchRes.status)
    return
  }

  const { riders } = (await matchRes.json()) as {
    riders: Array<{ user_id: string; distance_km: number }>
  }

  if (!riders?.length) return

  await supabase.from('notifications').insert(
    riders.map((r) => ({
      user_id: r.user_id,
      type: 'order_update',
      title: 'New Delivery Available',
      body: `A delivery is available ${r.distance_km} km away. Tap to view.`,
      data: { order_id: orderId },
    })),
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('x-paystack-signature') ?? ''
  const body = await req.text()
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''

  const isValid = await verifyPaystackSignature(secret, body, signature)
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 })
  }

  const event = JSON.parse(body)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  if (event.event === 'charge.success') {
    const reference: string = event.data.reference

    // Guard: only transition from pending → paid (idempotency with verify route)
    await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('paystack_reference', reference)
      .eq('status', 'pending')

    const { data: payment } = await supabase
      .from('payments')
      .select('order_id')
      .eq('paystack_reference', reference)
      .single()

    if (payment?.order_id) {
      await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', payment.order_id)
        .eq('payment_status', 'pending')

      // Dispatch nearby riders; idempotent — won't double-notify if verify
      // route already ran.
      dispatchRiders(supabase, payment.order_id, supabaseUrl, serviceRoleKey).catch((err) =>
        console.error('Rider dispatch error in webhook:', err),
      )
    }
  }

  if (event.event === 'charge.failed') {
    const reference: string = event.data.reference
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('paystack_reference', reference)
      .eq('status', 'pending')
  }

  if (event.event === 'refund.processed') {
    // Paystack sends the original transaction reference under transaction_reference
    const reference: string = event.data.transaction_reference ?? event.data.reference

    await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('paystack_reference', reference)

    const { data: payment } = await supabase
      .from('payments')
      .select('order_id')
      .eq('paystack_reference', reference)
      .single()

    if (payment?.order_id) {
      await supabase
        .from('orders')
        .update({ payment_status: 'refunded' })
        .eq('id', payment.order_id)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
