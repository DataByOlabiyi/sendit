'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculatePricing, haversineDistance } from '@sendit/utils'
import type { CreateOrderInput, PackageSize } from '@sendit/types'

export async function createOrderAction(data: CreateOrderInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const distanceKm = haversineDistance(
    data.pickup_lat,
    data.pickup_lng,
    data.delivery_lat,
    data.delivery_lng
  )

  const durationMin = Math.ceil(distanceKm * 4)

  const pricing = calculatePricing(
    distanceKm,
    data.package_size as PackageSize,
    data.has_insurance,
    durationMin
  )

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      pickup_address: data.pickup_address,
      pickup_lat: data.pickup_lat,
      pickup_lng: data.pickup_lng,
      delivery_address: data.delivery_address,
      delivery_lat: data.delivery_lat,
      delivery_lng: data.delivery_lng,
      package_description: data.package_description,
      package_size: data.package_size,
      package_weight: data.package_weight ?? null,
      is_fragile: data.is_fragile,
      has_insurance: data.has_insurance,
      special_instructions: data.special_instructions ?? null,
      payment_method: data.payment_method,
      estimated_distance_km: pricing.estimated_distance_km,
      estimated_duration_min: pricing.estimated_duration_min,
      base_fee: pricing.base_fee,
      distance_fee: pricing.distance_fee,
      insurance_fee: pricing.insurance_fee,
      total_fee: pricing.total_fee,
      status: 'pending',
      payment_status: data.payment_method === 'cash' ? 'pending' : 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Order creation error:', error)
    return { error: 'Failed to create order. Please try again.' }
  }

  if (data.payment_method === 'cash') {
    redirect(`/orders/${order.id}`)
  }

  return { orderId: order.id, totalFee: pricing.total_fee }
}

export async function cancelOrderAction(orderId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
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
