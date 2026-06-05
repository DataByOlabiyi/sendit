'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@sendit/types'

export async function acceptOrderAction(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

export async function rejectOrderAction(orderId: string) {
  // Rider simply doesn't accept — no DB change needed for rejection
  // Just return success so UI can move on
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rider } = await supabase
    .from('riders')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!rider) return { error: 'Rider not found' }

  const updateData: Record<string, unknown> = { status }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('rider_id', rider.id)

  if (error) return { error: 'Failed to update order status' }

  revalidatePath(`/rider/orders/${orderId}`)
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function uploadProofOfDeliveryAction(orderId: string, imageUrl: string) {
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
    .update({
      status: 'delivered',
      proof_of_delivery_url: imageUrl,
    })
    .eq('id', orderId)
    .eq('rider_id', rider.id)

  if (error) return { error: 'Failed to complete delivery' }

  revalidatePath(`/rider/orders/${orderId}`)
  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function toggleOnlineStatusAction(isOnline: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('riders')
    .update({ is_online: isOnline })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to update status' }

  revalidatePath('/rider/dashboard')
  return { success: true }
}

export async function updateRiderLocationAction(lat: number, lng: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('riders')
    .update({ current_lat: lat, current_lng: lng })
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to update location' }

  return { success: true }
}

export async function createRiderProfileAction(data: {
  vehicle_type: string
  vehicle_plate: string
  vehicle_model: string
  license_number: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('riders').insert({
    user_id: user.id,
    vehicle_type: data.vehicle_type,
    vehicle_plate: data.vehicle_plate,
    vehicle_model: data.vehicle_model,
    license_number: data.license_number,
    status: 'pending',
    is_online: false,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Rider profile already exists' }
    return { error: 'Failed to create rider profile' }
  }

  return { success: true }
}
