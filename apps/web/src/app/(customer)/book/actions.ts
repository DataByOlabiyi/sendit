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

  const distanceKm = haversineDistance(
    validData.pickup_lat,
    validData.pickup_lng,
    validData.delivery_lat,
    validData.delivery_lng,
  )

  const durationMin = Math.ceil(distanceKm * 4)

  const pricing = calculatePricing(
    distanceKm,
    validData.package_size as PackageSize,
    validData.has_insurance,
    durationMin,
  )

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
      total_fee: pricing.total_fee,
      status: 'pending',
      payment_status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Order creation error:', error)
    return { error: 'Failed to create order. Please try again.' }
  }

  if (validData.payment_method === 'cash') {
    redirect(`/orders/${order.id}`)
  }

  return { orderId: order.id, totalFee: pricing.total_fee }
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
