import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@sendit/notifications'
import { formatCurrency } from '@sendit/utils'

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

    const { payoutId, reason } = await request.json()
    if (!payoutId) return NextResponse.json({ error: 'payoutId required' }, { status: 400 })

    const { data: payout } = await supabase
      .from('rider_payouts')
      .select('id, status, rider_id, amount, riders!inner(user_id)')
      .eq('id', payoutId)
      .single()

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    if (!['pending', 'processing'].includes(payout.status)) {
      return NextResponse.json({ error: 'Cannot fail a completed payout' }, { status: 400 })
    }

    await supabase
      .from('rider_payouts')
      .update({ status: 'failed', failure_reason: reason ?? 'Admin rejected' })
      .eq('id', payoutId)

    // Refund amount back to rider wallet (the DB trigger handles this but we set it explicitly)
    await supabase.rpc('credit_rider_wallet_direct', {
      p_rider_id: payout.rider_id,
      p_amount: payout.amount,
    }).maybeSingle()

    await supabase.from('admin_audit_logs').insert({
      actor_id: user.id,
      action: 'payout.fail',
      target_type: 'rider_payout',
      target_id: payoutId,
      after_data: { reason },
    })

    const riderUserId = (Array.isArray(payout.riders) ? payout.riders[0] : payout.riders)?.user_id
    if (riderUserId) {
      const adminDb = createAdminClient()
      const failTitle = 'Payout Failed'
      const failBody = `Your ${formatCurrency(payout.amount)} payout could not be completed. The funds have been returned to your wallet.`

      await adminDb.from('notifications').insert({
        user_id: riderUserId,
        type: 'system',
        title: failTitle,
        body: failBody,
        is_read: false,
      })

      sendPushToUsers(adminDb, [riderUserId], {
        title: failTitle,
        body: failBody,
        url: '/rider/earnings',
        tag: `payout-${payoutId}`,
      }).catch(console.error)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Fail payout error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
