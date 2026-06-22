import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { disputeId, action, resolution, refundAmount } = await request.json()
    if (!disputeId || !action) {
      return NextResponse.json({ error: 'disputeId and action required' }, { status: 400 })
    }

    const newStatus =
      action === 'resolve' ? 'resolved'
      : action === 'reject' ? 'rejected'
      : 'under_review'

    const updateData: Record<string, unknown> = {
      status: newStatus,
      resolution: resolution || null,
      resolved_by: user.id,
    }
    if (typeof refundAmount === 'number' && refundAmount > 0) {
      updateData.refund_amount = refundAmount
    }

    const { error } = await supabase
      .from('disputes')
      .update(updateData)
      .eq('id', disputeId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update dispute' }, { status: 500 })
    }

    // Notify customer
    const { data: dispute } = await supabase
      .from('disputes')
      .select('customer_id, order_id')
      .eq('id', disputeId)
      .single()

    if (dispute) {
      // When the admin approves a refund, initiate it with Paystack immediately
      // so the promise made to the customer is fulfilled automatically.
      if (action === 'resolve' && typeof refundAmount === 'number' && refundAmount > 0) {
        const { data: payment } = await supabase
          .from('payments')
          .select('id, paystack_reference, amount, refund_initiated_at')
          .eq('order_id', dispute.order_id)
          .eq('status', 'paid')
          .maybeSingle()

        if (payment?.paystack_reference) {
          // Validate the requested refund does not exceed the original payment.
          if (refundAmount > payment.amount) {
            return NextResponse.json(
              { error: `Refund amount (${refundAmount}) exceeds original payment (${payment.amount})` },
              { status: 400 },
            )
          }

          // Atomic lock: prevents a second admin click or network retry from
          // sending a duplicate refund to Paystack.
          const { data: lockGranted } = await supabase
            .rpc('lock_payment_for_refund', { p_payment_id: payment.id })

          if (!lockGranted) {
            // Another request already holds the lock — don't double-refund.
            console.warn(`Refund lock already held for payment ${payment.id} (dispute ${disputeId})`)
          } else {
            const refundRes = await fetch('https://api.paystack.co/refund', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transaction: payment.paystack_reference,
                // DB amounts are NGN; Paystack refund API expects kobo
                amount: Math.round(refundAmount * 100),
                merchant_note: `Dispute resolution: ${resolution ?? disputeId}`,
              }),
            })
            if (!refundRes.ok) {
              const body = await refundRes.text().catch(() => '')
              console.error('Dispute refund failed:', refundRes.status, body)
              // Non-fatal: dispute is already marked resolved; ops team can retry manually
            }
          }
        }
      }

      const notifTitle = newStatus === 'resolved' ? 'Dispute Resolved'
        : newStatus === 'rejected' ? 'Dispute Update'
        : 'Dispute Under Review'
      const notifBody = newStatus === 'resolved'
        ? `Your dispute has been resolved. ${resolution ?? ''}`
        : newStatus === 'rejected'
        ? `Your dispute was reviewed and could not be upheld. ${resolution ?? ''}`
        : "Your dispute is now under review. We'll update you within 24 hours."

      await supabase.from('notifications').insert({
        user_id: dispute.customer_id,
        type: 'system',
        title: notifTitle,
        body: notifBody,
        data: { dispute_id: disputeId, order_id: dispute.order_id },
      })
    }

    await supabase.from('admin_audit_logs').insert({
      actor_id: user.id,
      action: `dispute.${action}`,
      target_type: 'dispute',
      target_id: disputeId,
      after_data: { resolution, refund_amount: refundAmount },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Dispute resolve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
