import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePaystackReference } from '@/lib/paystack'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const amount = Number(body?.amount)

  if (!amount || amount < 100) {
    return NextResponse.json({ error: 'Minimum top-up amount is ₦100' }, { status: 400 })
  }
  if (amount > 1_000_000) {
    return NextResponse.json({ error: 'Maximum top-up amount is ₦1,000,000' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!profile?.email) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 400 })
  }

  const reference = generatePaystackReference(`wallet-${user.id.slice(0, 8)}`)

  // Record the pending top-up for idempotency
  const { error: insertError } = await supabase.from('wallet_topups').insert({
    user_id: user.id,
    amount,
    paystack_reference: reference,
    status: 'pending',
  })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create top-up record' }, { status: 500 })
  }

  // Initialize Paystack transaction
  const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: profile.email,
      amount: Math.round(amount * 100), // kobo
      reference,
      metadata: { type: 'wallet_topup', userId: user.id },
    }),
  })

  if (!psRes.ok) {
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 502 })
  }

  const psData = await psRes.json()
  return NextResponse.json({ reference, accessCode: psData.data?.access_code })
}
