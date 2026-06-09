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

    const { payoutId } = await request.json()
    if (!payoutId) return NextResponse.json({ error: 'payoutId required' }, { status: 400 })

    const { data: payout } = await supabase
      .from('rider_payouts')
      .select(`
        id, amount, status,
        riders!inner(
          id, bank_account_number, bank_code, bank_name, paystack_recipient_code
        )
      `)
      .eq('id', payoutId)
      .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    const rider = Array.isArray(payout.riders) ? payout.riders[0] : payout.riders
    if (!rider?.bank_account_number || !rider?.bank_code) {
      return NextResponse.json({ error: 'Rider has no bank account on file' }, { status: 400 })
    }

    // Atomically transition pending → processing before touching Paystack.
    // If this UPDATE affects 0 rows the payout is already being processed by
    // a concurrent request — return 409 instead of double-transferring.
    const { data: locked } = await supabase
      .from('rider_payouts')
      .update({ status: 'processing', initiated_by: user.id })
      .eq('id', payoutId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (!locked) {
      return NextResponse.json(
        { error: 'Payout is no longer pending — it may already be processing' },
        { status: 409 },
      )
    }

    let recipientCode = rider.paystack_recipient_code

    // Create Paystack transfer recipient if not yet registered
    if (!recipientCode) {
      const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          account_number: rider.bank_account_number,
          bank_code: rider.bank_code,
          currency: 'NGN',
        }),
      })
      const recipientData = await recipientRes.json()
      if (!recipientRes.ok || !recipientData.data?.recipient_code) {
        // Roll back the status lock so the payout can be retried
        await supabase
          .from('rider_payouts')
          .update({ status: 'pending', initiated_by: null })
          .eq('id', payoutId)
        return NextResponse.json(
          { error: recipientData.message ?? 'Failed to create transfer recipient' },
          { status: 502 },
        )
      }
      recipientCode = recipientData.data.recipient_code
      // Persist recipient code on rider
      await supabase
        .from('riders')
        .update({ paystack_recipient_code: recipientCode })
        .eq('id', rider.id)
    }

    // Initiate Paystack transfer.
    // Amounts throughout the platform are stored in NGN; Paystack Transfer API
    // expects kobo (1 NGN = 100 kobo), so multiply before sending.
    const transferRef = `payout-${payoutId.slice(0, 8)}-${Date.now()}`
    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(payout.amount * 100), // NGN → kobo
        recipient: recipientCode,
        reason: 'Rider earnings payout',
        reference: transferRef,
      }),
    })
    const transferData = await transferRes.json()

    if (!transferRes.ok || !transferData.data?.transfer_code) {
      // Roll back the status lock so the payout can be retried
      await supabase
        .from('rider_payouts')
        .update({ status: 'pending', initiated_by: null })
        .eq('id', payoutId)
      return NextResponse.json(
        { error: transferData.message ?? 'Paystack transfer failed' },
        { status: 502 },
      )
    }

    // Persist transfer details now that Paystack accepted the request
    await supabase
      .from('rider_payouts')
      .update({
        paystack_transfer_code: transferData.data.transfer_code,
        paystack_reference: transferRef,
      })
      .eq('id', payoutId)

    // Admin audit log
    await supabase.from('admin_audit_logs').insert({
      actor_id: user.id,
      action: 'payout.disburse',
      target_type: 'rider_payout',
      target_id: payoutId,
      after_data: { transfer_code: transferData.data.transfer_code, reference: transferRef },
    })

    return NextResponse.json({ success: true, transferCode: transferData.data.transfer_code })
  } catch (err) {
    console.error('Disburse error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
