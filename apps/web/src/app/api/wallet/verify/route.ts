import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const reference: string = body?.reference ?? ''
  if (!reference) return NextResponse.json({ error: 'Missing reference' }, { status: 400 })

  const admin = createAdminClient()

  // Idempotency: if already paid, return success without re-crediting
  const { data: topup } = await admin
    .from('wallet_topups')
    .select('id, amount, status')
    .eq('paystack_reference', reference)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!topup) return NextResponse.json({ error: 'Top-up record not found' }, { status: 404 })
  if (topup.status === 'paid') return NextResponse.json({ success: true, amount: topup.amount })

  // Verify with Paystack
  const psRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  })

  if (!psRes.ok) return NextResponse.json({ error: 'Payment verification failed' }, { status: 502 })

  const psData = await psRes.json()
  if (psData.data?.status !== 'success') {
    return NextResponse.json({ error: 'Payment was not successful' }, { status: 400 })
  }

  const amountNgn = psData.data.amount / 100 // kobo → NGN

  // Mark top-up as paid first (idempotency guard)
  await admin
    .from('wallet_topups')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('paystack_reference', reference)

  // Atomic wallet credit via DB function
  const { error: creditError } = await admin.rpc('credit_customer_wallet', {
    p_user_id: user.id,
    p_amount: amountNgn,
  })

  if (creditError) {
    console.error('Wallet credit error:', creditError)
    return NextResponse.json({ error: 'Failed to credit wallet. Contact support.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, amount: amountNgn })
}
