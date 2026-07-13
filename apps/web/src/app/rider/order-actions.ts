'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@sendit/notifications'
import type { OrderStatus } from '@sendit/types'

// Valid forward-only state machine transitions a rider may initiate.
// Cancellation from accepted/picked_up/in_transit is intentionally excluded
// here — riders cannot cancel; only customers or admins can.
const RIDER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'accepted',
  accepted: 'picked_up',
  picked_up: 'in_transit',
  in_transit: 'delivered',
}

const uuidSchema = z.string().uuid('Invalid ID format')

export async function acceptOrderAction(orderId: string) {
  if (!uuidSchema.safeParse(orderId).success) return { error: 'Invalid order ID' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rider } = await supabase
    .from('riders')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  if (!rider) return { error: 'Rider profile not found' }
  if (rider.status !== 'approved') return { error: 'Your account is pending approval' }

  const { data: accepted, error } = await supabase
    .from('orders')
    .update({ rider_id: rider.id, status: 'accepted' })
    .eq('id', orderId)
    .eq('status', 'pending')
    // Same payment guard as the dashboard listing — a rider must not be able
    // to accept an unpaid Paystack/wallet order by calling this action directly.
    .or('payment_method.eq.cash,payment_status.eq.paid')
    .select('customer_id')
    .single()

  if (error || !accepted) return { error: 'Failed to accept order. It may have been taken.' }

  sendPushToUsers(createAdminClient(), [accepted.customer_id], {
    title: 'Rider on the way!',
    body: 'A rider has accepted your order and is heading to the pickup location.',
    url: `/orders/${orderId}`,
    tag: `order-${orderId}`,
  }).catch(console.error)

  revalidatePath('/rider/dashboard')
  revalidatePath(`/rider/orders/${orderId}`)
  return { success: true }
}

export async function rejectOrderAction(_orderId: string) {
  // Rider declines without a DB change — the order stays pending for others.
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function advanceOrderStatusAction(orderId: string, status: OrderStatus) {
  if (!uuidSchema.safeParse(orderId).success) return { error: 'Invalid order ID' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!rider) return { error: 'Rider not found' }

  // Fetch current status to enforce the transition before hitting the DB
  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('rider_id', rider.id)
    .single()

  if (!order) return { error: 'Order not found' }

  const allowedNext = RIDER_TRANSITIONS[order.status as OrderStatus]
  if (allowedNext !== status) {
    return {
      error: `Cannot transition from '${order.status}' to '${status}'. Expected next: '${allowedNext ?? 'none'}'.`,
    }
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('rider_id', rider.id)
    .select('customer_id')
    .single()

  if (error || !updated) return { error: 'Failed to update order status' }

  const pushMessages: Partial<Record<OrderStatus, string>> = {
    picked_up: 'Your package has been picked up and is on the way!',
    in_transit: 'Your delivery is now in transit.',
  }
  const pushBody = pushMessages[status]
  if (pushBody) {
    sendPushToUsers(createAdminClient(), [updated.customer_id], {
      title: 'Order Update',
      body: pushBody,
      url: `/orders/${orderId}`,
      tag: `order-${orderId}`,
    }).catch(console.error)
  }

  revalidatePath(`/rider/orders/${orderId}`)
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function uploadProofOfDeliveryAction(orderId: string, imageUrl: string) {
  if (!uuidSchema.safeParse(orderId).success) return { error: 'Invalid order ID' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!rider) return { error: 'Rider not found' }

  // Validate the URL points to an object inside our proof-of-delivery bucket
  // scoped to this order. Path convention: proof-of-delivery/{orderId}/{filename}
  const supabaseStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object`
  const expectedPrefix = `${supabaseStorageBase}/public/proof-of-delivery/${orderId}/`

  if (!imageUrl.startsWith(expectedPrefix)) {
    return { error: 'Invalid proof of delivery URL' }
  }

  // Verify the object actually exists in storage (prevents forged path strings)
  const { data: storageList, error: storageError } = await supabase.storage
    .from('proof-of-delivery')
    .list(orderId)

  if (storageError || !storageList?.length) {
    return { error: 'Proof of delivery image not found in storage' }
  }

  // Fetch payment_method so cash orders can be marked paid simultaneously
  const { data: orderData } = await supabase
    .from('orders')
    .select('payment_method')
    .eq('id', orderId)
    .eq('rider_id', rider.id)
    .eq('status', 'in_transit')
    .single()

  if (!orderData) return { error: 'Order not found or not in transit' }

  const updates: Record<string, unknown> = {
    status: 'delivered',
    proof_of_delivery_url: imageUrl,
  }
  // Cash COD: rider confirmed collection on the client — mark payment settled
  if (orderData.payment_method === 'cash') {
    updates.payment_status = 'paid'
  }

  const { data: delivered, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('rider_id', rider.id)
    .eq('status', 'in_transit')
    .select('customer_id')
    .single()

  if (error || !delivered) return { error: 'Failed to complete delivery' }

  sendPushToUsers(createAdminClient(), [delivered.customer_id], {
    title: 'Package Delivered!',
    body: 'Your delivery has been completed successfully.',
    url: `/orders/${orderId}`,
    tag: `order-${orderId}`,
  }).catch(console.error)

  revalidatePath(`/rider/orders/${orderId}`)
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function markFailedDeliveryAction(orderId: string, reason: string) {
  if (!uuidSchema.safeParse(orderId).success) return { error: 'Invalid order ID' }
  if (!reason.trim()) return { error: 'Please provide a reason for the failed delivery' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!rider) return { error: 'Rider not found' }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'failed_delivery', failure_reason: reason.trim(), cancelled_by: 'rider' })
    .eq('id', orderId)
    .eq('rider_id', rider.id)
    .eq('status', 'in_transit')

  if (error) return { error: 'Failed to update order status' }

  revalidatePath(`/rider/orders/${orderId}`)
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function markReturnInProgressAction(orderId: string) {
  if (!uuidSchema.safeParse(orderId).success) return { error: 'Invalid order ID' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!rider) return { error: 'Rider not found' }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'return_in_progress' })
    .eq('id', orderId)
    .eq('rider_id', rider.id)
    .eq('status', 'failed_delivery')

  if (error) return { error: 'Failed to update order status' }

  revalidatePath(`/rider/orders/${orderId}`)
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function markOrderReturnedAction(orderId: string, proofUrl: string) {
  if (!uuidSchema.safeParse(orderId).success) return { error: 'Invalid order ID' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!rider) return { error: 'Rider not found' }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'returned', proof_of_delivery_url: proofUrl })
    .eq('id', orderId)
    .eq('rider_id', rider.id)
    .eq('status', 'return_in_progress')

  if (error) return { error: 'Failed to mark as returned' }

  revalidatePath(`/rider/orders/${orderId}`)
  revalidatePath('/rider/dashboard')
  return { success: true }
}
