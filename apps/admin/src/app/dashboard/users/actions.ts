'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function suspendUserAction(userId: string, reason?: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId)

  if (error) return { error: 'Failed to suspend user' }

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'system',
    title: 'Account Suspended',
    body: reason ?? 'Your account has been suspended. Contact support for more information.',
    is_read: false,
  })

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function reactivateUserAction(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('id', userId)

  if (error) return { error: 'Failed to reactivate user' }

  revalidatePath('/dashboard/users')
  return { success: true }
}
