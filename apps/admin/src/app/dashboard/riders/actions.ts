'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function approveRiderAction(riderId: string) {
  const supabase = await createClient()

  const { data: rider } = await supabase
    .from('riders')
    .select('user_id')
    .eq('id', riderId)
    .single()

  if (!rider) return { error: 'Rider not found' }

  const { error } = await supabase
    .from('riders')
    .update({ status: 'approved' })
    .eq('id', riderId)

  if (error) return { error: 'Failed to approve rider' }

  await supabase.from('notifications').insert({
    user_id: rider.user_id,
    type: 'system',
    title: 'Account Approved! 🎉',
    body: 'Your rider account has been approved. You can now start accepting deliveries.',
    is_read: false,
  })

  revalidatePath('/dashboard/riders')
  return { success: true }
}

export async function suspendRiderAction(riderId: string, reason?: string) {
  const supabase = await createClient()

  const { data: rider } = await supabase
    .from('riders')
    .select('user_id')
    .eq('id', riderId)
    .single()

  if (!rider) return { error: 'Rider not found' }

  const { error } = await supabase
    .from('riders')
    .update({ status: 'suspended', is_online: false })
    .eq('id', riderId)

  if (error) return { error: 'Failed to suspend rider' }

  await supabase.from('notifications').insert({
    user_id: rider.user_id,
    type: 'system',
    title: 'Account Suspended',
    body: reason ?? 'Your account has been suspended. Contact support for more information.',
    is_read: false,
  })

  revalidatePath('/dashboard/riders')
  return { success: true }
}

export async function rejectRiderAction(riderId: string) {
  const supabase = await createClient()

  const { data: rider } = await supabase
    .from('riders')
    .select('user_id')
    .eq('id', riderId)
    .single()

  if (!rider) return { error: 'Rider not found' }

  const { error } = await supabase
    .from('riders')
    .update({ status: 'rejected' })
    .eq('id', riderId)

  if (error) return { error: 'Failed to reject rider' }

  await supabase.from('notifications').insert({
    user_id: rider.user_id,
    type: 'system',
    title: 'Application Not Approved',
    body: 'Your rider application was not approved at this time. You may reapply after 30 days.',
    is_read: false,
  })

  revalidatePath('/dashboard/riders')
  return { success: true }
}
