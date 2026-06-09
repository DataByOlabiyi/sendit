'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculatePricing, haversineDistance } from '@sendit/utils'
import { createOrderSchema } from '@sendit/validations'
import type { PackageSize } from '@sendit/types'


export async function createOrderAction(data: unknown) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Server-side validation — never trust client-supplied data
  const parsed = createOrderSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid order data' }
  }

  const validData = parsed.data

  // Fetch canonical pricing from the edge function (uses Google Maps road distance).
  // Fall back to Haversine only if the edge function is unavailable.
  type PricingResult = {
    base_fee: number
    distance_fee: number
    insurance_fee: number
    total_fee: number
    estimated_distance_km: number
    estimated_duration_min: number
  }

  let pricing: PricingResult
  try {
    const pricingRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/pricing`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          pickup_lat: validData.pickup_lat,
          pickup_lng: validData.pickup_lng,
          delivery_lat: validData.delivery_lat,
          delivery_lng: validData.delivery_lng,
          package_size: validData.package_size,
          has_insurance: validData.has_insurance,
        }),
        signal: AbortSignal.timeout(8_000),
      },
    )
    if (!pricingRes.ok) throw new Error(`Pricing function ${pricingRes.status}`)
    pricing = await pricingRes.json()
  } catch {
    const distanceKm = haversineDistance(
      validData.pickup_lat,
      validData.pickup_lng,
      validData.delivery_lat,
      validData.delivery_lng,
    )
    const durationMin = Math.ceil(distanceKm * 4)
    pricing = calculatePricing(
      distanceKm,
      validData.package_size as PackageSize,
      validData.has_insurance,
      durationMin,
    )
  }

  // Re-validate the promo server-side — never trust the client-supplied discount amount.
  // The client passes promo_id; we recalculate the discount ourselves.
  let promoDiscount = 0
  if (validData.promo_id) {
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('id, type, value, max_uses, uses_count, min_order_value, valid_until, scope, target_user_id')
      .eq('id', validData.promo_id)
      .eq('is_active', true)
      .single()

    if (promo) {
      const now = new Date()
      const isValid =
        (!promo.valid_until || new Date(promo.valid_until) >= now) &&
        (promo.max_uses === null || promo.uses_count < promo.max_uses) &&
        (promo.scope !== 'single_user' || promo.target_user_id === user.id) &&
        pricing.total_fee >= promo.min_order_value

      if (isValid) {
        promoDiscount =
          promo.type === 'flat'
            ? Math.min(promo.value, pricing.total_fee)
            : Math.floor((pricing.total_fee * promo.value) / 10_000)
      }
    }
  }

  const discountedTotal = Math.max(0, pricing.total_fee - promoDiscount)

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      pickup_address: validData.pickup_address,
      pickup_lat: validData.pickup_lat,
      pickup_lng: validData.pickup_lng,
      delivery_address: validData.delivery_address,
      delivery_lat: validData.delivery_lat,
      delivery_lng: validData.delivery_lng,
      delivery_landmark: validData.delivery_landmark ?? null,
      package_description: validData.package_description,
      package_size: validData.package_size,
      package_weight: validData.package_weight ?? null,
      is_fragile: validData.is_fragile,
      has_insurance: validData.has_insurance,
      special_instructions: validData.special_instructions ?? null,
      payment_method: validData.payment_method,
      estimated_distance_km: pricing.estimated_distance_km,
      estimated_duration_min: pricing.estimated_duration_min,
      base_fee: pricing.base_fee,
      distance_fee: pricing.distance_fee,
      insurance_fee: pricing.insurance_fee,
      total_fee: discountedTotal,
      status: 'pending',
      payment_status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Order creation error:', error)
    return { error: 'Failed to create order. Please try again.' }
  }

  // Record promo redemption using the server-calculated discount amount.
  if (validData.promo_id && promoDiscount > 0) {
    const admin = createAdminClient()
    await admin.from('promo_redemptions').insert({
      promo_id: validData.promo_id,
      user_id: user.id,
      order_id: order.id,
      discount_amount: promoDiscount,
    })
    // Trigger on promo_redemptions handles uses_count increment
  }

  return { orderId: order.id, totalFee: discountedTotal }
}

export async function cancelOrderAction(orderId: string, reason?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Fetch order to check payment status before cancelling
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, payment_status, total_fee')
    .eq('id', orderId)
    .eq('customer_id', user.id)
    .single()

  if (!order) return { error: 'Order not found' }
  if (order.status !== 'pending') return { error: 'Only pending orders can be cancelled' }

  // If the customer already paid, initiate a Paystack refund before cancelling.
  // The refund.processed webhook will update payment_status to 'refunded'.
  if (order.payment_status === 'paid') {
    const { data: payment } = await supabase
      .from('payments')
      .select('paystack_reference')
      .eq('order_id', orderId)
      .eq('status', 'paid')
      .maybeSingle()

    if (payment?.paystack_reference) {
      const refundRes = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: payment.paystack_reference,
          // Paystack expects amount in kobo; omitting it refunds the full amount
        }),
      })

      if (!refundRes.ok) {
        const body = await refundRes.text().catch(() => '')
        console.error('Paystack refund failed:', refundRes.status, body)
        return {
          error:
            'Could not initiate refund automatically. Please contact support to process your refund.',
        }
      }
    }
  }

  // Admin client needed because the state machine trigger will fire and RLS
  // must not block the transition from our server-side cancellation.
  const admin = createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_reason: reason ?? 'Cancelled by customer',
    })
    .eq('id', orderId)
    .eq('customer_id', user.id)
    .eq('status', 'pending')

  if (error) return { error: 'Failed to cancel order' }

  return { success: true }
}
