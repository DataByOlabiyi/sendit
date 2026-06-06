'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const submitReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export async function submitReviewAction(input: unknown) {
  const parsed = submitReviewSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { orderId, rating, comment } = parsed.data

  // Fetch order to get the rider's user_id
  const { data: order } = await supabase
    .from('orders')
    .select('status, rider_id, riders!orders_rider_id_fkey(user_id)')
    .eq('id', orderId)
    .eq('customer_id', user.id)
    .single()

  if (!order) return { error: 'Order not found' }
  if (order.status !== 'delivered') return { error: 'Can only review delivered orders' }
  if (!order.rider_id) return { error: 'No rider assigned to this order' }

  const ridersData = order.riders as { user_id: string } | { user_id: string }[] | null
  const riderUserId = Array.isArray(ridersData) ? ridersData[0]?.user_id : ridersData?.user_id
  if (!riderUserId) return { error: 'Rider information not found' }

  const { error } = await supabase.from('reviews').insert({
    order_id: orderId,
    reviewer_id: user.id,
    reviewee_id: riderUserId,
    rating,
    comment: comment ?? null,
  })

  if (error) {
    if (error.code === '23505') return { error: 'You have already reviewed this order' }
    return { error: 'Failed to submit review' }
  }

  revalidatePath(`/orders/${orderId}`)
  return { success: true }
}

export async function checkExistingReview(orderId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .eq('reviewer_id', user.id)
    .maybeSingle()

  return !!data
}
