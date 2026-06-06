'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { riderProfileSchema } from '@sendit/validations'
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

  const { error } = await supabase
    .from('orders')
    .update({ rider_id: rider.id, status: 'accepted' })
    .eq('id', orderId)
    .eq('status', 'pending')

  if (error) return { error: 'Failed to accept order. It may have been taken.' }

  revalidatePath('/rider/dashboard')
  revalidatePath(`/rider/orders/${orderId}`)
  return { success: true }
}

export async function rejectOrderAction(_orderId: string) {
  // Rider declines without a DB change — the order stays pending for others.
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
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

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('rider_id', rider.id)

  if (error) return { error: 'Failed to update order status' }

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

  // The order must currently be in_transit; status machine enforces delivered→
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'delivered',
      proof_of_delivery_url: imageUrl,
    })
    .eq('id', orderId)
    .eq('rider_id', rider.id)
    .eq('status', 'in_transit')

  if (error) return { error: 'Failed to complete delivery' }

  revalidatePath(`/rider/orders/${orderId}`)
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function toggleOnlineStatusAction(isOnline: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!isOnline) {
    // Block going offline when rider has an active delivery
    const { data: rider } = await supabase
      .from('riders')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (rider) {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', rider.id)
        .in('status', ['accepted', 'picked_up', 'in_transit'])

      if ((count ?? 0) > 0) {
        return { error: 'You have an active delivery. Complete it before going offline.' }
      }
    }
  }

  const { error } = await supabase
    .from('riders')
    .update({ is_online: isOnline })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to update status' }

  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function uploadRiderDocumentAction(docType: 'license' | 'vehicle', imageUrl: string) {
  if (!['license', 'vehicle'].includes(docType)) return { error: 'Invalid document type' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Validate URL points to our rider-documents bucket
  const supabaseStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object`
  const expectedPrefix = `${supabaseStorageBase}/public/rider-documents/${user.id}/`
  if (!imageUrl.startsWith(expectedPrefix)) return { error: 'Invalid document URL' }

  const column = docType === 'license' ? 'license_doc_url' : 'vehicle_doc_url'
  const { error } = await supabase
    .from('riders')
    .update({ [column]: imageUrl })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to save document' }

  revalidatePath('/rider/onboarding')
  revalidatePath('/rider/profile')
  return { success: true }
}

export async function createRiderProfileAction(data: unknown) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = riderProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid rider profile data' }
  }

  const { error } = await supabase.from('riders').insert({
    user_id: user.id,
    vehicle_type: parsed.data.vehicle_type,
    vehicle_plate: parsed.data.vehicle_plate,
    vehicle_model: parsed.data.vehicle_model,
    license_number: parsed.data.license_number,
    status: 'pending',
    is_online: false,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Rider profile already exists' }
    return { error: 'Failed to create rider profile' }
  }

  return { success: true }
}

// updateRiderLocationAction is intentionally removed.
// GPS location updates are high-frequency and should use the lightweight
// PATCH /api/rider/location endpoint rather than a Server Action to avoid
// Next.js overhead and Supabase Auth re-verification on every ping.
