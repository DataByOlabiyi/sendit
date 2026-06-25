'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculatePricing, haversineDistance } from '@sendit/utils'
import { createOrderSchema } from '@sendit/validations'
import { notifyNearbyRidersForOrder } from '@/lib/order-dispatch'
import { checkBookingRate } from '@/lib/rate-limit'
import type { PackageSize } from '@sendit/types'


export async function createOrderAction(data: unknown) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const allowed = await checkBookingRate(user.id)
  if (!allowed) return { error: 'Too many requests. Please wait a moment.' }

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
        // Percentage promos are stored as basis points (10000 = 100%) with no upper
        // bound enforced at the point of admin creation; always cap at order total.
        promoDiscount = Math.min(promoDiscount, pricing.total_fee)
      }
    }
  }

  const discountedTotal = Math.max(0, pricing.total_fee - promoDiscount)

  // Wallet payment: create order and debit wallet in a single DB transaction.
  // The create_wallet_order() function holds a FOR UPDATE lock on the wallet row,
  // so concurrent requests cannot both pass the balance check.
  if (validData.payment_method === 'wallet') {
    const admin = createAdminClient()
    const { data: orderId, error: walletOrderError } = await admin.rpc('create_wallet_order', {
      p_customer_id:            user.id,
      p_pickup_address:         validData.pickup_address,
      p_pickup_lat:             validData.pickup_lat,
      p_pickup_lng:             validData.pickup_lng,
      p_delivery_address:       validData.delivery_address,
      p_delivery_lat:           validData.delivery_lat,
      p_delivery_lng:           validData.delivery_lng,
      p_delivery_landmark:      validData.delivery_landmark ?? null,
      p_package_description:    validData.package_description,
      p_package_size:           validData.package_size,
      p_package_weight:         validData.package_weight ?? null,
      p_is_fragile:             validData.is_fragile,
      p_has_insurance:          validData.has_insurance,
      p_special_instructions:   validData.special_instructions ?? null,
      p_is_scheduled:           validData.is_scheduled ?? false,
      p_scheduled_pickup_at:    validData.is_scheduled ? (validData.scheduled_pickup_at ?? null) : null,
      p_preferred_time_slot:    validData.is_scheduled ? (validData.preferred_time_slot ?? 'asap') : 'asap',
      p_estimated_distance_km:  pricing.estimated_distance_km,
      p_estimated_duration_min: pricing.estimated_duration_min,
      p_base_fee:               pricing.base_fee,
      p_distance_fee:           pricing.distance_fee,
      p_insurance_fee:          pricing.insurance_fee,
      p_total_fee:              discountedTotal,
    })

    if (walletOrderError) {
      console.error('Wallet order error:', walletOrderError)
      const msg = walletOrderError.message ?? ''
      if (msg.includes('insufficient_balance')) {
        return { error: 'Insufficient wallet balance. Please top up and try again.' }
      }
      if (msg.includes('wallet_not_found')) {
        return { error: 'Wallet not found. Please contact support.' }
      }
      return { error: 'Wallet payment failed. Your balance was not charged.' }
    }

    // Record promo redemption after the atomic order creation.
    if (validData.promo_id && promoDiscount > 0) {
      await admin.from('promo_redemptions').insert({
        promo_id:        validData.promo_id,
        user_id:         user.id,
        order_id:        orderId as string,
        discount_amount: promoDiscount,
      })
    }

    // Insert extra stops for multi-stop wallet orders
    if (validData.extra_stops && validData.extra_stops.length > 0) {
      await admin.from('order_stops').insert(
        validData.extra_stops.map((stop) => ({
          order_id:      orderId as string,
          sequence:      stop.sequence,
          address:       stop.address,
          lat:           stop.lat,
          lng:           stop.lng,
          landmark:      stop.landmark ?? null,
          contact_name:  stop.contact_name ?? null,
          contact_phone: stop.contact_phone ?? null,
          status:        'pending',
        }))
      )
    }

    // Dispatch riders — same fire-and-forget pattern as the Paystack verify route.
    // Wallet orders skip the payment step so dispatch must happen here instead.
    notifyNearbyRidersForOrder(orderId as string).catch((err) =>
      console.error('Rider dispatch error after wallet order:', err),
    )

    return { orderId: orderId as string, totalFee: 0 }
  }

  // Paystack / cash payment: insert order first, payment happens via redirect.
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      customer_id:             user.id,
      pickup_address:          validData.pickup_address,
      pickup_lat:              validData.pickup_lat,
      pickup_lng:              validData.pickup_lng,
      delivery_address:        validData.delivery_address,
      delivery_lat:            validData.delivery_lat,
      delivery_lng:            validData.delivery_lng,
      delivery_landmark:       validData.delivery_landmark ?? null,
      package_description:     validData.package_description,
      package_size:            validData.package_size,
      package_weight:          validData.package_weight ?? null,
      is_fragile:              validData.is_fragile,
      has_insurance:           validData.has_insurance,
      special_instructions:    validData.special_instructions ?? null,
      payment_method:          validData.payment_method,
      is_scheduled:            validData.is_scheduled ?? false,
      scheduled_pickup_at:     validData.is_scheduled ? (validData.scheduled_pickup_at ?? null) : null,
      preferred_time_slot:     validData.is_scheduled ? (validData.preferred_time_slot ?? 'asap') : 'asap',
      estimated_distance_km:   pricing.estimated_distance_km,
      estimated_duration_min:  pricing.estimated_duration_min,
      base_fee:                pricing.base_fee,
      distance_fee:            pricing.distance_fee,
      insurance_fee:           pricing.insurance_fee,
      total_fee:               discountedTotal,
      status:                  'pending',
      payment_status:          'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Order creation error:', error)
    return { error: 'Failed to create order. Please try again.' }
  }

  const admin2 = createAdminClient()

  // Record promo redemption using the server-calculated discount amount.
  if (validData.promo_id && promoDiscount > 0) {
    await admin2.from('promo_redemptions').insert({
      promo_id:        validData.promo_id,
      user_id:         user.id,
      order_id:        order.id,
      discount_amount: promoDiscount,
    })
    // Trigger on promo_redemptions handles uses_count increment
  }

  // Insert extra stops for multi-stop orders
  if (validData.extra_stops && validData.extra_stops.length > 0) {
    await admin2.from('order_stops').insert(
      validData.extra_stops.map((stop) => ({
        order_id:      order.id,
        sequence:      stop.sequence,
        address:       stop.address,
        lat:           stop.lat,
        lng:           stop.lng,
        landmark:      stop.landmark ?? null,
        contact_name:  stop.contact_name ?? null,
        contact_phone: stop.contact_phone ?? null,
        status:        'pending',
      }))
    )
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
    .select('id, status, payment_status, payment_method, total_fee')
    .eq('id', orderId)
    .eq('customer_id', user.id)
    .single()

  if (!order) return { error: 'Order not found' }

  const cancellableStatuses = ['pending', 'accepted', 'picked_up', 'in_transit']
  if (!cancellableStatuses.includes(order.status)) {
    return { error: 'This order cannot be cancelled at its current status' }
  }

  const admin = createAdminClient()

  // Refund the customer if payment was already collected
  if (order.payment_status === 'paid') {
    if (order.payment_method === 'wallet') {
      // Wallet refund: credit back to customer wallet immediately
      const { error: refundError } = await admin.rpc('credit_customer_wallet', {
        p_user_id: user.id,
        p_amount: order.total_fee,
      })
      if (refundError) {
        console.error('Wallet refund error:', refundError)
        return { error: 'Could not refund wallet balance. Please contact support.' }
      }
    } else {
      // Paystack refund: the refund.processed webhook will update payment_status
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
          body: JSON.stringify({ transaction: payment.paystack_reference }),
        })

        if (!refundRes.ok) {
          const body = await refundRes.text().catch(() => '')
          console.error('Paystack refund failed:', refundRes.status, body)
          return {
            error: 'Could not initiate refund automatically. Please contact support to process your refund.',
          }
        }
      }
    }
  }

  const { error } = await admin
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_by: 'customer',
      cancelled_reason: reason ?? 'Cancelled by customer',
    })
    .eq('id', orderId)
    .eq('customer_id', user.id)
    .in('status', cancellableStatuses)

  if (error) return { error: 'Failed to cancel order' }

  return { success: true }
}
