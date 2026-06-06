import { createClient } from 'npm:@supabase/supabase-js@2'

async function verifyPaystackSignature(secret: string, body: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return expected === signature
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (event.event === 'charge.success') {
    const reference: string = event.data.reference

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
    }
  }

  if (event.event === 'charge.failed') {
    const reference: string = event.data.reference
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('paystack_reference', reference)
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
