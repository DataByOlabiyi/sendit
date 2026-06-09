import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify caller is an admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { paymentId, reason } = await request.json()
    if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 })

    // Fetch payment details
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, paystack_reference, amount, status, order_id')
      .eq('id', paymentId)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status !== 'paid') {
      return NextResponse.json({ error: 'Can only refund payments with status = paid' }, { status: 400 })
    }

    if (!payment.paystack_reference) {
      return NextResponse.json({ error: 'No Paystack reference — cannot initiate refund' }, { status: 400 })
    }

    // Initiate refund via Paystack API
    const paystackRes = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: payment.paystack_reference,
        merchant_note: reason ?? 'Admin-initiated refund',
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      console.error('Paystack refund error:', paystackData)
      return NextResponse.json(
        { error: paystackData.message ?? 'Paystack refund failed' },
        { status: 502 },
      )
    }

    // Mark payment as refunded in our DB
    await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', paymentId)

    // Update order payment status
    await supabase
      .from('orders')
      .update({ payment_status: 'refunded' })
      .eq('id', payment.order_id)

    // Write admin audit log entry
    await supabase.from('admin_audit_logs').insert({
      actor_id: user.id,
      action: 'payment.refund',
      target_type: 'payment',
      target_id: paymentId,
      after_data: { reason, paystack_refund_id: paystackData.data?.id },
    })

    return NextResponse.json({ success: true, refundId: paystackData.data?.id })
  } catch (err) {
    console.error('Refund error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
