import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reference, orderId } = await request.json()

    if (!reference || !orderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const paystackData = await paystackResponse.json()

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('paystack_reference', reference)

    // Update order payment status
    await supabase
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('id', orderId)
      .eq('customer_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Paystack verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
