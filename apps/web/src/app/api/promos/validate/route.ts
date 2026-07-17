import { NextResponse } from 'next/server'
import { z } from 'zod'
import { calculatePromoDiscount, type PromoType } from '@sendit/utils'
import { createClient } from '@/lib/supabase/server'
import { checkPromoValidateRate } from '@/lib/rate-limit'

const validatePromoSchema = z.object({
  code: z.string().min(1, 'Promo code required').max(50),
  orderTotal: z.number().positive('Order total must be positive'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = await checkPromoValidateRate(user.id)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const parsed = validatePromoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { code, orderTotal } = parsed.data

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('id, type, scope, value, max_uses, uses_count, min_order_value, valid_until, target_user_id')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (!promo) return NextResponse.json({ error: 'Promo code not found or expired' }, { status: 404 })

  const now = new Date()
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return NextResponse.json({ error: 'Promo code has expired' }, { status: 400 })
  }

  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return NextResponse.json({ error: 'Promo code has reached its usage limit' }, { status: 400 })
  }

  if (promo.scope === 'single_user' && promo.target_user_id !== user.id) {
    return NextResponse.json({ error: 'This promo code is not valid for your account' }, { status: 400 })
  }

  if (promo.scope === 'new_users') {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', user.id)
      .eq('payment_status', 'paid')
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'This promo code is for new users only' }, { status: 400 })
    }
  }

  if (orderTotal < promo.min_order_value) {
    return NextResponse.json(
      { error: `Minimum order of ₦${(promo.min_order_value / 100).toLocaleString('en-NG')} required` },
      { status: 400 },
    )
  }

  // Check if already redeemed by this user
  const { count: redeemed } = await supabase
    .from('promo_redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('promo_id', promo.id)
    .eq('user_id', user.id)

  if ((redeemed ?? 0) > 0) {
    return NextResponse.json({ error: 'You have already used this promo code' }, { status: 400 })
  }

  const discount = calculatePromoDiscount(
    { type: promo.type as PromoType, value: promo.value },
    orderTotal,
  )

  return NextResponse.json({ success: true, discount, promoId: promo.id })
}
