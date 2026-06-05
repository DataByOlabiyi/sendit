import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, amount, reference } = await request.json()

    if (!orderId || !amount || !reference) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify order belongs to user
    const { data: order } = await supabase
      .from('orders')
      .select('id, customer_id, total_fee')
      .eq('id', orderId)
      .eq('customer_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get user email
    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()

    // Create payment record
    const { error: paymentError } = await supabase.from('payments').insert({
      order_id: orderId,
      customer_id: user.id,
      amount: order.total_fee,
      currency: 'NGN',
      method: 'paystack',
      status: 'pending',
      paystack_reference: reference,
    })

    if (paymentError) {
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
